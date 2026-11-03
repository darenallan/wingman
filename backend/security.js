// Protection d'accès : mot de passe unique, session signée en cookie HttpOnly,
// limitation de débit en mémoire et contrôle d'origine. Aucune dépendance.
import crypto from 'crypto';

export const COOKIE_NAME = 'wm_session';
const SESSION_DAYS = 30;

const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest();

/** Lit et valide la configuration ; renvoie la liste des problèmes (vide = OK). */
export function checkConfig(env) {
  const problems = [];
  if (!env.WINGMAN_PASSWORD || env.WINGMAN_PASSWORD.length < 12) {
    problems.push('WINGMAN_PASSWORD doit faire au moins 12 caractères');
  }
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
    problems.push('SESSION_SECRET doit faire au moins 32 caractères');
  }
  return problems;
}

/** Compare en temps constant (les empreintes ont toujours la même longueur). */
export function passwordMatches(candidate, expected) {
  if (typeof candidate !== 'string' || candidate.length === 0 || candidate.length > 256) return false;
  return crypto.timingSafeEqual(sha256(candidate), sha256(expected));
}

function sign(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

/** Jeton de session : "<expiration ms>.<aléa>.<signature HMAC>". */
export function createSession(secret, now = Date.now()) {
  const payload = `${now + SESSION_DAYS * 86_400_000}.${crypto.randomBytes(16).toString('base64url')}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySession(token, secret, now = Date.now()) {
  if (typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3 || !/^\d{13}$/.test(parts[0])) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  const expected = Buffer.from(sign(payload, secret));
  const actual = Buffer.from(parts[2]);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return false;
  return Number(parts[0]) > now;
}

export function readCookie(header, name) {
  for (const part of String(header || '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

export function sessionCookie(token, { secure }) {
  return [
    `${COOKIE_NAME}=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Strict',
    `Max-Age=${SESSION_DAYS * 86_400}`, secure ? 'Secure' : null,
  ].filter(Boolean).join('; ');
}

export function clearedCookie({ secure }) {
  return [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=0', secure ? 'Secure' : null]
    .filter(Boolean).join('; ');
}

/**
 * Fenêtre fixe en mémoire. Suffisant pour une instance unique (Render) ;
 * plusieurs instances demanderaient un stockage partagé (Redis).
 */
export function createLimiter({ max, windowMs, maxKeys = 10_000 }) {
  const hits = new Map();
  return function hit(key, now = Date.now()) {
    const entry = hits.get(key);
    if (!entry || now >= entry.resetAt) {
      if (hits.size >= maxKeys) hits.clear(); // borne la mémoire face à un flot d'IP
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return { ok: true, retryAfter: 0 };
    }
    entry.count += 1;
    return entry.count <= max ? { ok: true, retryAfter: 0 } : { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  };
}

/** Refuse une requête d'écriture venue d'un autre site (défense CSRF en plus de SameSite). */
export function sameOrigin(req) {
  const origin = req.get('origin');
  if (!origin) return true; // navigation same-origin ou client non navigateur : le cookie SameSite protège déjà
  try {
    return new URL(origin).host === req.get('host');
  } catch {
    return false;
  }
}
