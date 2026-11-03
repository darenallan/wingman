import express from 'express';
import dotenv from 'dotenv';
import pkg from 'pg';
import path from 'path';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import {
  COOKIE_NAME, checkConfig, passwordMatches, createSession, verifySession, readCookie,
  sessionCookie, clearedCookie, createLimiter, sameOrigin,
} from './security.js';
const { Pool } = pkg;

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIST = path.join(__dirname, '../frontend/dist');

// Sans mot de passe ni secret, l'API serait ouverte à tous : on refuse de démarrer.
const configProblems = checkConfig(process.env);
if (configProblems.length) {
  console.error(`Configuration invalide :\n- ${configProblems.join('\n- ')}`);
  process.exit(1);
}
const PASSWORD = process.env.WINGMAN_PASSWORD;
const SECRET = process.env.SESSION_SECRET;
const SECURE_COOKIE = process.env.NODE_ENV === 'production';

const app = express();
app.disable('x-powered-by');
// Render place l'app derrière un proxy : req.ip doit être l'IP du client, pas celle du proxy.
app.set('trust proxy', 1);
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
  });
  next();
});
// Pas de CORS : le front est servi par ce même serveur (et par le proxy Vite en dev).
app.use(express.json({ limit: '32kb' }));

// Sert le build statique du frontend React
app.use(express.static(FRONTEND_DIST));

// Connexion à Neon (PostgreSQL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { require: true }
});

// Migration automatique : schema.sql est idempotent (IF NOT EXISTS partout)
async function initDb() {
  if (!process.env.DATABASE_URL) return;
  try {
    const schema = await readFile(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('Schéma Neon à jour.');
  } catch (err) {
    console.error('Erreur de migration Neon:', err);
  }
}

// Consignes spécifiques à chaque situation (sélecteur "stage" du frontend)
const STAGES = {
  'Match / Début': "Intrigue maximale, ZÉRO validation gratuite, réponses courtes, défis légers pour sortir du lot. Il doit se démarquer de tous les autres mecs qui lui écrivent.",
  'Flirt / Date': "Haute tension, Push-Pull assumé, sous-entendus, projection vers le face-à-face (\"quand on se verra\").",
  'Couple': "PAS de jeu d'ego toxique ni de froideur inutile. Ton complice, protecteur, taquin affectueux, leader calme qui désamorce les caprices avec humour et charme.",
  'Ex / Froid': "Détachement souverain, réponses courtes, mystérieuses, haute valeur perçue. Ne jamais montrer de manque ni chercher à convaincre."
};
const DEFAULT_STAGE = 'Flirt / Date';

// Le Prompt Système V2 Complet
const SYSTEM_PROMPT = `[ROLE ET OBJECTIF]
Tu es un expert d'élite en dynamique sociale, en psychologie des relations et en copywriting persuasif. Ton rôle est d'agir comme le "Wingman" numérique de l'utilisateur.
L'utilisateur te fournira son dernier message reçu d'une femme ou les dernières répliques de leur discussion, la situation de la relation et un éventuel contexte. Ton objectif est de générer des options de réponses percutantes, charismatiques et intelligentes qui créent de l'attraction, du mystère ou de la tension, calibrées sur la situation.

[LES 5 RÈGLES D'OR DE LA COMMUNICATION]
1. LA LOI DU MOINDRE EFFORT : Le message généré doit toujours sembler naturel et ne jamais donner l'impression que l'utilisateur s'est justifié ou a trop réfléchi. Ne jamais écrire de longs paragraphes. (Max 1 à 2 phrases).
2. PUSH & PULL : Alterne subtilement entre la validation (Pull) et la disqualification taquine (Push).
3. L'AMUSEMENT SOUVERAIN : Le ton de base est toujours celui d'un homme confiant, légèrement amusé par la situation, qui ne se laisse jamais déstabiliser (ne jamais être sur la défensive).
4. SOUS-ENTENDU > EXPLICITE : Ne dis jamais les choses directement si tu peux les suggérer. Laisse son imagination faire le travail.
5. ZERO "CRINGE" : Aucune phrase de drague lourde, aucun compliment excessif (simp), aucune vulgarité, aucune agressivité.

[STYLE D'ÉCRITURE SMS - RÈGLES STRICTES]
- STYLE SMS AUTHENTIQUE (ZÉRO STYLE "IA LITTÉRAIRE") : Écris comme un mec de 20 ans sûr de lui par message (WhatsApp/iMessage/Insta). Phrases directes, rythmées, parfois sans point final. Pas de tournures ampoulées ("Il semblerait que...", "Permets-moi de..."), pas de tirets cadratins (—), pas de point-virgule.
- USAGE CALIBRÉ DES EMOJIS : Pas d'emoji à chaque phrase. Quand tu en mets, utilise UNIQUEMENT ceux-ci : 🤣🤣 (souvent doublé ou triplé pour se moquer gentiment), 😌 (confiance calme / arrogance douce), 👀 (intrigue / sous-entendu), 😉 (clin d'œil complice). Interdiction absolue d'utiliser 😂, 😜, 🙈, 🔥.
- MIROIR DE LONGUEUR : Si son message fait 4 mots, réponds en 1 phrase sèche et percutante (max 10-15 mots). Ne jamais écrire de pavé.
- ANTI-RÉPÉTITION : Interdiction formelle de réutiliser mot pour mot les phrases des exemples fournis dans ce prompt. Capte l'esprit, le rythme et la répartie, ne plagie jamais les exemples.

[CATÉGORIES DE TONS (VIBES)]
Tu dois toujours générer 4 options distinctes correspondant à ces 4 profils psychologiques :
- "Provocateur" (Taquin, défiant, renverse la situation, la disqualifie gentiment).
- "Arrogant Charmeur" (Cocky/Funny, confiance absolue, humour au second degré).
- "Mystérieux" (Réponse courte, intrigante, qui la force à poser une question ou à s'investir).
- "Recadrage / Pragmatique" (Utilisé quand elle fait un test ou fait des manières. Calme, stoïque, ramène à la réalité avec un sourire en coin).
La vibe prioritaire indiquée par l'utilisateur doit être la plus soignée des 4.

[EXEMPLES RÉELS DE CALIBRAGE - NE JAMAIS LES COPIER]

EXEMPLE 1 (Situation : Flirt / Début - Elle joue la fille sage pour esquiver)
Historique récent :
Moi : "Je suis en cours là"
Elle : "😭😭 faut te concentrer sur ton cours"
Analyse : "Elle fait mine d'être raisonnable mais cherche surtout à voir si elle a de l'effet sur toi."
- [Provocateur] : "Tu essaies de m'esquiver pour gagner du temps et revoir ta stratégie ? Bien essayé 🤣"
- [Arrogant Charmeur] : "T'inquiète pas pour ça je suis multitâche, je peux très bien suivre le cours et te perturber en même temps"
- [Mystérieux] : "Trop tard, le prof a déjà perdu la bataille"
- [Recadrage] : "Le prof est beaucoup moins captivant que notre petite guerre, assume ton rôle de distraction 😌"

EXEMPLE 2 (Situation : Tension / Push-Pull - Escalade vers le face-à-face)
Historique récent :
Moi : "Garde cette énergie tu vas en avoir besoin on verra si tu te bats aussi bien quand on sera face à face🤣🤣"
Elle : "On dirait que ça va être très mal barré pour moi"
Moi : "Ça dépend si tu es sage"
Elle : "C'est que c'est déjà gâté 🤣"
Analyse : "Elle valide totalement le jeu de tension et assume son côté rebelle."
- [Provocateur] : "Si c'est déjà gâté par message j'imagine même pas le désastre quand on sera face à face 🤣"
- [Arrogant Charmeur] : "Parfait, les filles trop sages c'est ennuyeux à mourir de toute façon. J'aime bien les problèmes"
- [Mystérieux] : "Si tu refuses d'être sage les règles du jeu changent... et je pense pas que tu sois prête pour cette version-là 😌"
- [Recadrage] : "Au moins tu es lucide sur ton cas, c'est déjà un bon début"

EXEMPLE 3 (Situation : Shit-test / Fausse innocence - Elle joue la victime ou l'ange)
Historique récent :
Elle : "😔😔on dit non à la violence sur mineur, si tu me tapes je porte plainte"
Moi : "Mineure ? Ne sors pas la carte de la petite fille innocente on sait très bien que c'est toi le vrai danger ici🤣🤣🤣"
Elle : "Moi je ne vois pas de quoi tu parles, je suis un amour 🙂‍↔️"
Analyse : "Elle joue la carte de l'innocence feinte pour te faire réagir et garder le contrôle."
- [Provocateur] : "Même ton clavier a dû transpirer pour écrire un mensonge pareil 🤣"
- [Arrogant Charmeur] : "Un amour avec un grand A... comme Arnaque ? 😌"
- [Mystérieux] : "C'est exactement ce que disent les pires démons avant de frapper, je t'ai à l'œil 👀"
- [Recadrage] : "On verra si tu arrives à garder cette petite tête d'ange en face de moi, j'ai de gros doutes"

EXEMPLE 4 (Situation : Contrôle & Intérêt sincère - Elle alterne défi et vraie question)
Historique récent :
Elle : "Parce que j'en ai décidé ainsi 🙂‍↔️"
Moi : "🤣🤣oui ça je sais être patient dans certaines situations"
Elle : "Comme lesquelles 👀 / Non mais plus sérieusement pourquoi tu ne dors pas"
Analyse : "Double dynamique : elle teste ton autorité puis baisse sa garde en s'intéressant sincèrement à ton mode de vie."
- [Provocateur] : "C'est très mignon que tu penses avoir le pouvoir de décision ici, je te laisse y croire pour aujourd'hui 😌"
- [Arrogant Charmeur] : "Je construis mon empire pendant que les autres dorment. Quand j'ai un projet en tête mon cerveau refuse de se mettre sur pause"
- [Mystérieux] : "Tu es beaucoup trop curieuse... disons que je sais exactement quand accélérer et quand prendre mon temps 👀"
- [Recadrage] : "Je bosse sur mes affaires, mais j'avoue que te taquiner un peu m'aide aussi à rester éveillé 😉"

[FORMAT DE SORTIE OBLIGATOIRE]
Tu es une API. Tu ne dois générer QUE du JSON valide, sans aucun texte avant ou après, ni balises markdown \`\`\`json. Le JSON doit suivre exactement cette structure :

{
  "analysis": "Analyse très courte (1 phrase) de l'intention cachée de la fille dans son message.",
  "options": [
    {
      "tone": "Provocateur",
      "text": "La réponse exacte à copier-coller",
      "explanation": "Pourquoi cette réponse fonctionne psychologiquement (1 phrase brève)"
    },
    {
      "tone": "Arrogant Charmeur",
      "text": "La réponse exacte à copier-coller",
      "explanation": "Pourquoi cette réponse fonctionne psychologiquement (1 phrase brève)"
    },
    {
      "tone": "Mystérieux",
      "text": "La réponse exacte à copier-coller",
      "explanation": "Pourquoi cette réponse fonctionne psychologiquement (1 phrase brève)"
    },
    {
      "tone": "Recadrage / Pragmatique",
      "text": "La réponse exacte à copier-coller",
      "explanation": "Pourquoi cette réponse fonctionne psychologiquement (1 phrase brève)"
    }
  ]
}`;

// Prompt final = base + consigne de situation + meilleures réponses notées 👍
function buildSystemPrompt(stage, topReplies) {
  let prompt = `${SYSTEM_PROMPT}

[SITUATION ACTUELLE : ${stage}]
${STAGES[stage]}`;

  if (topReplies.length > 0) {
    const examples = topReplies
      .map(r => `Elle : "${r.her_message}"\n- [${r.vibe || 'Réponse'}] : "${r.chosen_reply}"`)
      .join('\n\n');
    prompt += `

[TES MEILLEURES RÉPONSES PRÉCÉDENTES VALIDÉES PAR L'UTILISATEUR - INSPIRE-TOI DE CE CALIBRAGE]
${examples}`;
  }
  return prompt;
}

// Les 3 réponses 👍 les plus récentes, en priorité celles de la même situation
async function getTopReplies(stage) {
  if (!process.env.DATABASE_URL) return [];
  try {
    const result = await pool.query(
      `SELECT her_message, chosen_reply, vibe FROM wingman_feedback
       WHERE rating = 1
       ORDER BY (stage = $1) DESC, created_at DESC
       LIMIT 3`,
      [stage]
    );
    return result.rows;
  } catch (err) {
    console.error('Erreur de lecture du feedback Neon:', err);
    return [];
  }
}

// Fournisseurs compatibles avec le format OpenAI Chat Completions, détectés via le préfixe de la clé
const AI_PROVIDERS = {
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'openai/gpt-oss-120b'
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    defaultModel: 'gemini-2.5-flash'
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini'
  }
};

function detectProvider(apiKey) {
  if (apiKey.startsWith('gsk_')) return 'groq';
  if (apiKey.startsWith('AIza')) return 'gemini';
  return 'openai';
}

function resolveAIConfig() {
  const apiKey = process.env.AI_API_KEY?.trim();
  // Clé absente ou placeholder du .env.example → mode mock
  if (!apiKey || apiKey.includes('votre-cle')) return null;

  const provider = detectProvider(apiKey);
  return {
    apiKey,
    provider,
    baseUrl: process.env.AI_BASE_URL || AI_PROVIDERS[provider].baseUrl,
    model: process.env.AI_MODEL || AI_PROVIDERS[provider].defaultModel
  };
}

// Fonction d'appel à l'API (Compatible OpenAI / Groq / Gemini via le format Chat Completions)
async function callAI({ context, herMessage, vibe, stage, regenerate, previousReplies }) {
  let userPrompt = `Situation : ${stage}\nContexte : ${context || "Aucun contexte spécifique."}\nÉchanges récents / son message :\n${herMessage}\n\nVibe prioritaire souhaitée : ${vibe || "Toutes"}`;
  if (regenerate) {
    userPrompt += `\n\nPropose 4 angles totalement différents de la génération précédente.`;
    if (previousReplies.length > 0) {
      userPrompt += ` Réponses déjà proposées à ne pas reprendre :\n${previousReplies.map(r => `- "${r}"`).join('\n')}`;
    }
  }
  userPrompt += `\n\nGénère le JSON strict.`;

  const ai = resolveAIConfig();
  if (!ai) {
    // Mode Mock si pas encore de clé configurée
    return {
      analysis: "Elle teste ton cadre pour voir si tu vas te justifier ou entrer dans son jeu.",
      options: [
        {
          tone: "Provocateur",
          text: "C'est mignon que tu penses avoir le dernier mot ici. Je te laisse rêver encore un peu 😌",
          explanation: "Inverse la dynamique de pouvoir avec humour sans s'énerver."
        },
        {
          tone: "Arrogant Charmeur",
          text: "Attention tu commences déjà à t'attacher. Respire, tout va bien se passer",
          explanation: "Projette sur elle l'intérêt et crée une tension amusante."
        },
        {
          tone: "Mystérieux",
          text: "Tu es bien trop curieuse... chaque chose en son temps 👀",
          explanation: "Crée un manque d'information qui la pousse à relancer."
        },
        {
          tone: "Recadrage / Pragmatique",
          text: "J'aime bien ton audace, mais il va falloir faire plus d'efforts que ça pour m'impressionner",
          explanation: "Valide son énergie (Pull) tout en haussant tes standards (Push)."
        }
      ]
    };
  }

  const topReplies = await getTopReplies(stage);

  const response = await fetch(ai.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ai.apiKey}`
    },
    body: JSON.stringify({
      model: ai.model,
      response_format: { type: "json_object" },
      messages: [
        { role: 'system', content: buildSystemPrompt(stage, topReplies) },
        { role: 'user', content: userPrompt }
      ],
      temperature: regenerate ? 0.95 : 0.85
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Erreur API ${ai.provider} (${response.status}) : ${details}`);
  }

  const data = await response.json();
  // Certains modèles entourent malgré tout le JSON de balises markdown
  const content = data.choices[0].message.content.replace(/^```(?:json)?\s*|\s*```$/g, '');
  return JSON.parse(content);
}

// ─── Accès ────────────────────────────────────────────────
const loginLimiter = createLimiter({ max: 5, windowMs: 15 * 60_000 });          // par IP
const generateLimiter = createLimiter({ max: 30, windowMs: 10 * 60_000 });      // par IP
const dailyLimiter = createLimiter({ max: Number(process.env.GENERATE_DAILY_LIMIT) || 300, windowMs: 86_400_000 }); // global : borne la facture d'IA
const MAX_TEXT = 4000;

function tooMany(res, retryAfter) {
  res.set('Retry-After', String(retryAfter));
  return res.status(429).json({ error: 'Trop de requêtes, réessaie plus tard.' });
}

function requireAuth(req, res, next) {
  if (!sameOrigin(req)) return res.status(403).json({ error: 'Origine refusée.' });
  if (!verifySession(readCookie(req.headers.cookie, COOKIE_NAME), SECRET)) {
    return res.status(401).json({ error: 'Connexion requise.' });
  }
  next();
}

app.get('/api/session', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ authenticated: verifySession(readCookie(req.headers.cookie, COOKIE_NAME), SECRET) });
});

app.post('/api/login', (req, res) => {
  if (!sameOrigin(req)) return res.status(403).json({ error: 'Origine refusée.' });
  const limit = loginLimiter(req.ip);
  if (!limit.ok) return tooMany(res, limit.retryAfter);
  if (!passwordMatches(req.body?.password, PASSWORD)) {
    return res.status(401).json({ error: 'Mot de passe incorrect.' });
  }
  res.set('Set-Cookie', sessionCookie(createSession(SECRET), { secure: SECURE_COOKIE }));
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  res.set('Set-Cookie', clearedCookie({ secure: SECURE_COOKIE }));
  res.json({ ok: true });
});

// Route principale pour générer la réponse
app.post('/api/generate', requireAuth, async (req, res) => {
  const perIp = generateLimiter(req.ip);
  if (!perIp.ok) return tooMany(res, perIp.retryAfter);
  const daily = dailyLimiter('all');
  if (!daily.ok) return tooMany(res, daily.retryAfter);

  const { context, herMessage, vibe, regenerate } = req.body;
  const stage = STAGES[req.body.stage] ? req.body.stage : DEFAULT_STAGE;
  const previousReplies = Array.isArray(req.body.previousReplies)
    ? req.body.previousReplies.filter(r => typeof r === 'string').slice(0, 8).map(r => r.slice(0, 500))
    : [];

  if (typeof herMessage !== 'string' || !herMessage.trim()) {
    return res.status(400).json({ error: "Le message reçu est requis." });
  }
  if (herMessage.length > MAX_TEXT || (context != null && (typeof context !== 'string' || context.length > MAX_TEXT))
      || (vibe != null && (typeof vibe !== 'string' || vibe.length > 50))) {
    return res.status(400).json({ error: "Message, contexte ou ton trop long ou invalide." });
  }

  try {
    const aiResult = await callAI({ context, herMessage, vibe, stage, regenerate: Boolean(regenerate), previousReplies });

    // Sauvegarde asynchrone dans Neon (PostgreSQL) si DATABASE_URL est défini
    if (process.env.DATABASE_URL) {
      pool.query(
        `INSERT INTO wingman_history (context, her_message, target_vibe, stage, ai_response)
         VALUES ($1, $2, $3, $4, $5)`,
        [context, herMessage, vibe, stage, JSON.stringify(aiResult)]
      ).catch(err => console.error("Erreur d'insertion Neon:", err));
    }

    res.json(aiResult);
  } catch (error) {
    console.error("Erreur de génération:", error);
    res.status(500).json({ error: "Erreur lors de la génération de la réponse." });
  }
});

// Route pour noter une réponse (👍 = 1, 👎 = -1)
app.post('/api/feedback', requireAuth, async (req, res) => {
  const { vibe, herMessage, chosenReply, rating } = req.body;
  const stage = STAGES[req.body.stage] ? req.body.stage : DEFAULT_STAGE;

  if (typeof herMessage !== 'string' || typeof chosenReply !== 'string' || ![1, -1].includes(rating)
      || !herMessage || !chosenReply || herMessage.length > MAX_TEXT || chosenReply.length > MAX_TEXT
      || (vibe != null && (typeof vibe !== 'string' || vibe.length > 50))) {
    return res.status(400).json({ error: "Feedback invalide." });
  }
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ error: "Base de données non configurée." });
  }

  try {
    await pool.query(
      `INSERT INTO wingman_feedback (stage, vibe, her_message, chosen_reply, rating)
       VALUES ($1, $2, $3, $4, $5)`,
      [stage, vibe, herMessage, chosenReply, rating]
    );
    res.json({ ok: true });
  } catch (error) {
    console.error("Erreur d'enregistrement du feedback:", error);
    res.status(500).json({ error: "Erreur lors de l'enregistrement du feedback." });
  }
});

// Route pour récupérer l'historique récent
app.get('/api/history', requireAuth, async (req, res) => {
  try {
    if (!process.env.DATABASE_URL) return res.json([]);
    const result = await pool.query('SELECT * FROM wingman_history ORDER BY created_at DESC LIMIT 20');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération de l'historique." });
  }
});

// Catch-all : toute autre route renvoie l'app React
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
});

const PORT = process.env.PORT || 3000;
initDb().finally(() => {
  app.listen(PORT, () => {
    console.log(`Wingman V2 API en ligne sur le port ${PORT}`);
  });
});
