import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkConfig, passwordMatches, createSession, verifySession, readCookie,
  sessionCookie, createLimiter, sameOrigin,
} from './security.js';

const SECRET = 'x'.repeat(40);

test('refuse une configuration sans mot de passe ou secret solides', () => {
  assert.equal(checkConfig({}).length, 2);
  assert.equal(checkConfig({ WINGMAN_PASSWORD: 'court', SESSION_SECRET: SECRET }).length, 1);
  assert.deepEqual(checkConfig({ WINGMAN_PASSWORD: 'un-mot-de-passe-long', SESSION_SECRET: SECRET }), []);
});

test('compare le mot de passe exactement', () => {
  assert.equal(passwordMatches('un-mot-de-passe-long', 'un-mot-de-passe-long'), true);
  assert.equal(passwordMatches('un-mot-de-passe-lonG', 'un-mot-de-passe-long'), false);
  assert.equal(passwordMatches('', 'x'), false);
  assert.equal(passwordMatches(undefined, 'x'), false);
  assert.equal(passwordMatches({ $ne: '' }, 'x'), false);
  assert.equal(passwordMatches('a'.repeat(1000), 'a'.repeat(1000)), false); // borne de taille
});

test('session : valide, signée, expirante', () => {
  const now = Date.now();
  const token = createSession(SECRET, now);
  assert.equal(verifySession(token, SECRET, now), true);
  assert.equal(verifySession(token, 'y'.repeat(40), now), false, 'autre secret');
  assert.equal(verifySession(token, SECRET, now + 31 * 86_400_000), false, 'expirée');
  const [exp, rnd, sig] = token.split('.');
  assert.equal(verifySession(`${Number(exp) + 1}.${rnd}.${sig}`, SECRET, now), false, 'expiration modifiée');
  assert.equal(verifySession(`${exp}.${rnd}.${sig.slice(1)}`, SECRET, now), false, 'signature tronquée');
  assert.equal(verifySession('n.importe.quoi', SECRET, now), false);
  assert.equal(verifySession(undefined, SECRET, now), false);
});

test('cookie : HttpOnly, SameSite=Strict, Secure en production', () => {
  const c = sessionCookie('t', { secure: true });
  assert.match(c, /HttpOnly/);
  assert.match(c, /SameSite=Strict/);
  assert.match(c, /Secure/);
  assert.doesNotMatch(sessionCookie('t', { secure: false }), /Secure/);
  assert.equal(readCookie('a=1; wm_session=abc.def; b=2', 'wm_session'), 'abc.def');
  assert.equal(readCookie(undefined, 'wm_session'), undefined);
});

test('limiteur : bloque au-delà du maximum puis se réinitialise', () => {
  const hit = createLimiter({ max: 2, windowMs: 1000 });
  assert.equal(hit('ip', 0).ok, true);
  assert.equal(hit('ip', 10).ok, true);
  const blocked = hit('ip', 20);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.retryAfter, 1);
  assert.equal(hit('autre', 20).ok, true, 'clés indépendantes');
  assert.equal(hit('ip', 1000).ok, true, 'nouvelle fenêtre');
});

test('origine : refuse un autre site', () => {
  const req = (origin, host = 'wingman.onrender.com') => ({ get: (h) => ({ origin, host })[h] });
  assert.equal(sameOrigin(req(undefined)), true);
  assert.equal(sameOrigin(req('https://wingman.onrender.com')), true);
  assert.equal(sameOrigin(req('https://evil.example')), false);
  assert.equal(sameOrigin(req('null')), false);
});
