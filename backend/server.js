import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
const { Pool } = pkg;

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIST = path.join(__dirname, '../frontend/dist');

const app = express();
app.use(cors());
app.use(express.json());

// Sert le build statique du frontend React
app.use(express.static(FRONTEND_DIST));

// Connexion à Neon (PostgreSQL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { require: true }
});

// Le Prompt Système V2 Complet
const SYSTEM_PROMPT = `[ROLE ET OBJECTIF]
Tu es un expert d'élite en dynamique sociale, en psychologie des relations et en copywriting persuasif. Ton rôle est d'agir comme le "Wingman" numérique de l'utilisateur. 
L'utilisateur te fournira le dernier message reçu d'une femme, ainsi que le contexte de la conversation. Ton objectif est de générer des options de réponses percutantes, charismatiques et intelligentes qui créent de l'attraction, du mystère ou de la tension.

[LES 5 RÈGLES D'OR DE LA COMMUNICATION]
1. LA LOI DU MOINDRE EFFORT : Le message généré doit toujours sembler naturel et ne jamais donner l'impression que l'utilisateur s'est justifié ou a trop réfléchi. Ne jamais écrire de longs paragraphes. (Max 1 à 2 phrases).
2. PUSH & PULL : Alterne subtilement entre la validation (Pull) et la disqualification taquine (Push).
3. L'AMUSEMENT SOUVERAIN : Le ton de base est toujours celui d'un homme confiant, légèrement amusé par la situation, qui ne se laisse jamais déstabiliser (ne jamais être sur la défensive).
4. SOUS-ENTENDU > EXPLICITE : Ne dis jamais les choses directement si tu peux les suggérer. Laisse son imagination faire le travail.
5. ZERO "CRINGE" : Aucune phrase de drague lourde, aucun compliment excessif (simp), aucune vulgarité, aucune agressivité.

[CATÉGORIES DE TONS (VIBES)]
Tu dois toujours générer 4 options distinctes correspondant à ces 4 profils psychologiques :
- "Provocateur" (Taquin, défiant, renverse la situation, la disqualifie gentiment).
- "Arrogant Charmeur" (Cocky/Funny, confiance absolue, humour au second degré).
- "Mystérieux" (Réponse courte, intrigante, qui la force à poser une question ou à s'investir).
- "Recadrage / Pragmatique" (Utilisé quand elle fait un test ou fait des manières. Calme, stoïque, ramène à la réalité avec un sourire en coin).

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
async function callAI(context, herMessage, desiredVibe) {
  const userPrompt = `Contexte : ${context || "Aucun contexte spécifique."}\nDernier message reçu : "${herMessage}"\nVibe prioritaire souhaitée : ${desiredVibe || "Toutes"}\n\nGénère le JSON strict.`;

  const ai = resolveAIConfig();
  if (!ai) {
    // Mode Mock si pas encore de clé configurée
    return {
      analysis: "Elle teste ton cadre pour voir si tu vas te justifier ou entrer dans son jeu.",
      options: [
        {
          tone: "Provocateur",
          text: "C'est mignon que tu penses avoir le dernier mot ici. Je te laisse rêver encore un peu. 😌",
          explanation: "Inverse la dynamique de pouvoir avec humour sans s'énerver."
        },
        {
          tone: "Arrogant Charmeur",
          text: "Attention, tu commences déjà à t'attacher. Respire, tout va bien se passer.",
          explanation: "Projette sur elle l'intérêt et crée une tension amusante."
        },
        {
          tone: "Mystérieux",
          text: "Tu es bien trop curieuse... Chaque chose en son temps.",
          explanation: "Crée un manque d'information qui la pousse à relancer."
        },
        {
          tone: "Recadrage / Pragmatique",
          text: "J'aime bien ton audace, mais il va falloir faire plus d'efforts que ça pour m'impressionner.",
          explanation: "Valide son énergie (Pull) tout en haussant tes standards (Push)."
        }
      ]
    };
  }

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
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8
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

// Route principale pour générer la réponse
app.post('/api/generate', async (req, res) => {
  const { context, herMessage, vibe } = req.body;

  if (!herMessage) {
    return res.status(400).json({ error: "Le message reçu est requis." });
  }

  try {
    const aiResult = await callAI(context, herMessage, vibe);

    // Sauvegarde asynchrone dans Neon (PostgreSQL) si DATABASE_URL est défini
    if (process.env.DATABASE_URL) {
      pool.query(
        `INSERT INTO wingman_history (context, her_message, target_vibe, ai_response) 
         VALUES ($1, $2, $3, $4)`,
        [context, herMessage, vibe, JSON.stringify(aiResult)]
      ).catch(err => console.error("Erreur d'insertion Neon:", err));
    }

    res.json(aiResult);
  } catch (error) {
    console.error("Erreur de génération:", error);
    res.status(500).json({ error: "Erreur lors de la génération de la réponse." });
  }
});

// Route pour récupérer l'historique récent
app.get('/api/history', async (req, res) => {
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
app.listen(PORT, () => {
  console.log(`Wingman V2 API en ligne sur le port ${PORT}`);
});
