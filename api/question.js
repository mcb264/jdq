// api/question.js — Vercel Serverless Function
// La clé API reste côté serveur, jamais exposée au navigateur

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { card, depthLevel, polarityPositive, playerName } = req.body ?? {};
  if (!card || !depthLevel) return res.status(400).json({ error: "Missing parameters" });

  const lvl = {
    light:  "simple, anecdotique, brise-glace",
    medium: "personnelle, intime",
    deep:   "très profonde, existentielle, marquante",
    joker:  "créative, surprise pour tout le groupe",
  }[depthLevel] ?? "simple";

  const pol = polarityPositive === true
    ? "positive, tournée vers les forces et les bons souvenirs"
    : polarityPositive === false
    ? "négative, introspective, qui explore les regrets"
    : "surprenante";

  const name = playerName || "le joueur";

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: `Tu animes un jeu de cartes psychologique en soirée. Carte: ${card.value} de ${card.suit.label}. Profondeur: ${lvl}. Tonalité: ${pol}. Destinée à ${name}. Génère UNE SEULE question en français, percutante, personnalisée pour ${name}. Réponds uniquement avec la question, sans guillemets ni explication.`,
        }],
      }),
    });

    const data = await response.json();
    const question = data.content?.[0]?.text?.trim();
    if (!question) return res.status(502).json({ error: "Empty response from AI" });
    return res.status(200).json({ question });
  } catch (err) {
    console.error("AI error:", err);
    return res.status(500).json({ error: "AI request failed" });
  }
}
