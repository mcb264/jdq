import { useState, useEffect } from "react";

// ─── Tokens ──────────────────────────────────────────────────────────────────
const T = {
  bg: "#0D0A18", card: "#1A1530",
  violet: "#7C3AED", violetLight: "#A78BFA", violetDark: "#4C1D95",
  orange: "#F97316", orangeLight: "#FCD34D",
  red: "#F43F5E",
  text: "#EDE9FE", muted: "#6B5FA0", border: "#2A1E50",
};

// ─── Deck ────────────────────────────────────────────────────────────────────
const SUITS = [
  { symbol: "♥", color: "red",   label: "Cœur" },
  { symbol: "♦", color: "red",   label: "Carreau" },
  { symbol: "♠", color: "black", label: "Pique" },
  { symbol: "♣", color: "black", label: "Trèfle" },
];
const VALUES = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];

function buildDeck() {
  const d = [];
  for (const s of SUITS) for (const v of VALUES) d.push({ suit: s, value: v, id: `${v}${s.symbol}` });
  d.push({ suit: { symbol: "★", color: "red",   label: "Joker" }, value: "JK", id: "JK_r", joker: true });
  d.push({ suit: { symbol: "★", color: "black", label: "Joker" }, value: "JK", id: "JK_b", joker: true });
  return d;
}
function shuffle(a) {
  const d = [...a];
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}
function getDepth(card) {
  if (card.joker) return { level: "joker",  label: "Joker ⭐",     glow: "#D97706" };
  const v = card.value;
  if (["2","3","4","5"].includes(v))      return { level: "light",  label: "Légère 💬",   glow: T.orange };
  if (["6","7","8","9","10"].includes(v)) return { level: "medium", label: "Profonde 🌊", glow: T.violet };
  return                                         { level: "deep",   label: "Marquante 🔮",glow: "#C026D3" };
}
function getPolarity(card) {
  if (card.joker) return { positive: null, label: "Joker" };
  return card.suit.color === "red"
    ? { positive: true,  label: "Positive ❤️" }
    : { positive: false, label: "Négative ♠" };
}

// ─── Default questions ────────────────────────────────────────────────────────
const DEFAULT_Q = {
  light: {
    positive: [
      "Quel est ton meilleur souvenir de vacances ?",
      "Quelle chanson te rend heureux(se) instantanément ?",
      "Si tu pouvais vivre dans une série TV, laquelle ?",
      "Quel plat te rend heureux(se) n'importe quel jour ?",
      "Quelle est la chose la plus drôle qui te soit arrivée récemment ?",
    ],
    negative: [
      "Quelle est ta plus grande peur au quotidien ?",
      "Quelle habitude tu n'arrives pas à perdre ?",
      "Quelle est la chose qui t'énerve le plus chez les gens ?",
      "Qu'est-ce que tu procrastines depuis trop longtemps ?",
      "Quel est le défaut que tu t'avoues difficilement ?",
    ],
  },
  medium: {
    positive: [
      "Quel moment de ta vie voudrais-tu revivre exactement ?",
      "Quelle personne t'a le plus marqué(e) positivement ?",
      "Qu'est-ce qui te donne envie de te lever le matin, vraiment ?",
      "De quoi es-tu le plus fier(e) dans ta façon d'être ?",
      "Quel rêve te tient à cœur mais que tu n'as pas encore réalisé ?",
    ],
    negative: [
      "Quelle décision passée tu regrettes le plus ?",
      "Qu'est-ce que tu portes comme blessure sans l'avoir digéré ?",
      "De quoi as-tu honte dans ton passé, même si personne ne le sait ?",
      "Quelle relation t'a le plus abîmé(e) ?",
      "Quelle limite tu t'es laissé franchir que tu aurais dû tenir ?",
    ],
  },
  deep: {
    positive: [
      "Si tu réussirais à coup sûr, qu'est-ce que tu tenterais dès demain ?",
      "Quelle est la chose la plus courageuse que tu aies faite ?",
      "Comment veux-tu que les gens te décrivent à tes funérailles ?",
      "Qu'est-ce qui te donne le sentiment d'exister vraiment ?",
      "Si tu pouvais laisser une seule chose en héritage, ce serait quoi ?",
    ],
    negative: [
      "Quelle est la chose que tu n'as jamais dite à quelqu'un que tu aimes ?",
      "Si tu mourais demain, quel serait ton plus grand regret ?",
      "Quel mensonge tu te racontes encore à toi-même ?",
      "Quelle douleur tu n'as jamais vraiment traversée — tu l'as juste contournée ?",
      "De quoi as-tu le plus peur concernant qui tu es vraiment ?",
    ],
  },
  joker: [
    "Chaque joueur pose une question à la personne de son choix.",
    "Invente une règle qui s'applique au prochain tour.",
    "Tout le monde répond à la dernière question posée.",
    "La personne la plus âgée pose la question la plus profonde qu'elle connaisse.",
  ],
};

function pickRandom(level, positive, customQ) {
  if (level === "joker") {
    const all = [...DEFAULT_Q.joker, ...(customQ.joker ?? [])];
    return all[Math.floor(Math.random() * all.length)];
  }
  const pol = positive ? "positive" : "negative";
  const all = [...(DEFAULT_Q[level]?.[pol] ?? []), ...(customQ[level]?.[pol] ?? [])];
  return all[Math.floor(Math.random() * all.length)] ?? "Aucune question disponible.";
}

// ─── AI ──────────────────────────────────────────────────────────────────────
async function fetchAI(card, depth, polarity, playerName) {
  // Appel sécurisé via serverless Vercel — clé API côté serveur uniquement
  const r = await fetch("/api/question", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      card,
      depthLevel: depth.level,
      polarityPositive: polarity.positive,
      playerName,
    }),
  });
  if (!r.ok) throw new Error("API error " + r.status);
  const data = await r.json();
  return data.question;
}

// ─── Storage (in-memory, no localStorage) ────────────────────────────────────
const initialStore = {
  players: [],
  customQ: {
    light:  { positive: [], negative: [] },
    medium: { positive: [], negative: [] },
    deep:   { positive: [], negative: [] },
    joker:  [],
  },
};

// ─── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=DM+Sans:ital,wght@0,300;0,400;0,600;0,700;1,400&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
  @keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
  @keyframes glowP{0%,100%{opacity:.35}50%{opacity:.8}}
  @keyframes slideUp{from{opacity:0;transform:translateY(36px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes drawCard{0%{opacity:0;transform:translateY(-48px) rotate(-8deg) scale(.86)}100%{opacity:1;transform:none}}
  @keyframes qReveal{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
  .btn:hover{filter:brightness(1.13);transform:translateY(-2px)!important;}
  .btn:active{transform:scale(.96)!important;filter:brightness(.95);}
  .ghost:hover{background:#1C1640!important;}
  .del:hover{color:#F43F5E!important;}
  input,textarea{outline:none;font-family:'DM Sans',sans-serif;color:#EDE9FE;}
  textarea{resize:none;}
  ::-webkit-scrollbar{width:3px;}
  ::-webkit-scrollbar-thumb{background:#2A1E50;border-radius:2px;}
`;

// ─── Shared components ────────────────────────────────────────────────────────
function Orbs() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {[
        { c: "#7C3AED", x: "12%",  y: "18%", s: 380 },
        { c: "#F97316", x: "82%",  y: "72%", s: 320 },
        { c: "#A21CAF", x: "68%",  y: "8%",  s: 270 },
      ].map((o, i) => (
        <div key={i} style={{
          position: "absolute", borderRadius: "50%", width: o.s, height: o.s,
          background: `radial-gradient(circle, ${o.c}1C 0%, transparent 70%)`,
          left: o.x, top: o.y, transform: "translate(-50%,-50%)",
          animation: `glowP ${3 + i}s ease-in-out infinite`, animationDelay: `${i * .8}s`,
        }} />
      ))}
    </div>
  );
}

function PlayingCard({ card, faceDown = false, small = false, style = {}, onClick }) {
  const sz = small
    ? { w: 62, h: 88, font: 16, pip: 12, br: 8, pad: "5px 7px" }
    : { w: 158, h: 218, font: 52, pip: 21, br: 18, pad: "14px 18px" };
  const isRed = card?.suit.color === "red";
  const accent = isRed ? T.red : T.violetLight;
  if (faceDown) return (
    <div onClick={onClick} style={{
      width: sz.w, height: sz.h, borderRadius: sz.br, flexShrink: 0,
      background: "repeating-linear-gradient(45deg,#1C1540 0,#1C1540 4px,#231B4A 4px,#231B4A 8px)",
      border: `1.5px solid ${T.border}`, boxShadow: "0 8px 28px #000A",
      cursor: onClick ? "pointer" : "default",
      display: "flex", alignItems: "center", justifyContent: "center", ...style,
    }}>
      <span style={{ fontSize: small ? 22 : 48, opacity: .18 }}>🂠</span>
    </div>
  );
  return (
    <div onClick={onClick} style={{
      width: sz.w, height: sz.h, borderRadius: sz.br, flexShrink: 0,
      background: "linear-gradient(150deg,#1E1842 0%,#110D26 100%)",
      border: `1.5px solid ${accent}44`, boxShadow: `0 0 20px ${accent}28, 0 8px 28px #000A`,
      cursor: onClick ? "pointer" : "default",
      display: "flex", flexDirection: "column", justifyContent: "space-between",
      padding: sz.pad, ...style,
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <span style={{ fontSize: sz.pip, fontWeight: 700, color: accent, lineHeight: 1 }}>{card.value}</span>
        <span style={{ color: accent, fontSize: sz.pip * .9, lineHeight: 1 }}>{card.suit.symbol}</span>
      </div>
      <div style={{ textAlign: "center", fontSize: sz.font, opacity: .8, lineHeight: 1 }}>
        {card.joker ? "★" : card.suit.symbol}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1, transform: "rotate(180deg)" }}>
        <span style={{ fontSize: sz.pip, fontWeight: 700, color: accent, lineHeight: 1 }}>{card.value}</span>
        <span style={{ color: accent, fontSize: sz.pip * .9, lineHeight: 1 }}>{card.suit.symbol}</span>
      </div>
    </div>
  );
}

function Badge({ label, glow }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "4px 12px", borderRadius: 100,
      border: `1px solid ${glow}55`, background: `${glow}18`,
      color: T.text, fontSize: 12, fontWeight: 600, letterSpacing: ".03em",
    }}>{label}</span>
  );
}

const PLAYER_COLORS = ["#7C3AED","#F97316","#0EA5E9","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899"];
function PlayerChip({ name, active, score, onRemove }) {
  const c = PLAYER_COLORS[name.charCodeAt(0) % PLAYER_COLORS.length];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 9, padding: "8px 12px", borderRadius: 14,
      background: active ? `${c}28` : "#ffffff08",
      border: `1.5px solid ${active ? c + "88" : T.border}`,
      boxShadow: active ? `0 0 16px ${c}33` : "none",
      transition: "all .25s", flexShrink: 0,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        background: `${c}30`, border: `2px solid ${c}`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <span style={{ color: c, fontWeight: 700, fontSize: 14 }}>{name[0]?.toUpperCase()}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: T.text, fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
        {score !== undefined && <div style={{ color: T.muted, fontSize: 11 }}>{score} carte{score !== 1 ? "s" : ""}</div>}
      </div>
      {onRemove && (
        <button className="del" onClick={e => { e.stopPropagation(); onRemove(); }} style={{
          background: "none", border: "none", cursor: "pointer",
          color: T.muted, fontSize: 20, lineHeight: 1, padding: "0 2px", transition: "color .2s",
        }}>×</button>
      )}
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen]         = useState("home"); // home|setup|game|myquestions
  const [store, setStore]           = useState(initialStore);

  // game
  const [deck, setDeck]             = useState([]);
  const [currentCard, setCurrentCard] = useState(null);
  const [activePlayer, setActivePlayer] = useState(0);
  const [phase, setPhase]           = useState("idle"); // idle|reveal|ai-loading|question
  const [question, setQuestion]     = useState("");
  const [aiError, setAiError]       = useState(false);
  const [scores, setScores]         = useState({});
  const [drawnCount, setDrawnCount] = useState(0);

  // custom q editor
  const [qLevel, setQLevel] = useState("light");
  const [qPol,   setQPol]   = useState("positive");
  const [qInput, setQInput] = useState("");

  // setup
  const [nameInput, setNameInput] = useState("");
  const [nameErr,   setNameErr]   = useState("");

  const players = store.players;
  const customQ = store.customQ;

  function updatePlayers(p) { setStore(s => ({ ...s, players: p })); }
  function updateCustomQ(q) { setStore(s => ({ ...s, customQ: q })); }

  function addPlayer() {
    const n = nameInput.trim();
    if (!n) return;
    if (players.includes(n)) { setNameErr("Ce prénom existe déjà."); return; }
    if (players.length >= 8) { setNameErr("Maximum 8 joueurs."); return; }
    updatePlayers([...players, n]);
    setNameInput("");
    setNameErr("");
  }

  function startGame() {
    const sc = {};
    players.forEach(p => (sc[p] = 0));
    setScores(sc);
    setDeck(shuffle(buildDeck()));
    setDrawnCount(0);
    setCurrentCard(null);
    setPhase("idle");
    setQuestion("");
    setAiError(false);
    setActivePlayer(0);
    setScreen("game");
  }

  function drawCard() {
    if (deck.length === 0) return;
    const [card, ...rest] = deck;
    setDeck(rest);
    setDrawnCount(n => n + 1);
    setCurrentCard(card);
    setPhase("reveal");
    setQuestion("");
    setAiError(false);
    const p = players[activePlayer];
    if (p) setScores(s => ({ ...s, [p]: (s[p] ?? 0) + 1 }));
  }

  function nextTurn() {
    setActivePlayer(i => (i + 1) % Math.max(players.length, 1));
    setCurrentCard(null);
    setPhase("idle");
    setQuestion("");
  }

  async function requestAI() {
    if (!currentCard) return;
    setPhase("ai-loading");
    const depth = getDepth(currentCard);
    const pol   = getPolarity(currentCard);
    const name  = players[activePlayer] || "le joueur";
    try {
      const q = await fetchAI(currentCard, depth, pol, name);
      setQuestion(q || pickRandom(depth.level, pol.positive, customQ));
    } catch {
      setAiError(true);
      setQuestion(pickRandom(depth.level, pol.positive, customQ));
    }
    setPhase("question");
  }

  function useRandom() {
    const depth = getDepth(currentCard);
    const pol   = getPolarity(currentCard);
    setQuestion(pickRandom(depth.level, pol.positive, customQ));
    setPhase("question");
  }

  function addCustomQ() {
    const q = qInput.trim();
    if (!q) return;
    const updated = JSON.parse(JSON.stringify(customQ));
    if (qLevel === "joker") {
      updated.joker.push(q);
    } else {
      updated[qLevel][qPol].push(q);
    }
    updateCustomQ(updated);
    setQInput("");
  }

  function removeCustomQ(level, pol, idx) {
    const updated = JSON.parse(JSON.stringify(customQ));
    if (level === "joker") updated.joker.splice(idx, 1);
    else updated[level][pol].splice(idx, 1);
    updateCustomQ(updated);
  }

  const depth    = currentCard ? getDepth(currentCard)    : null;
  const polarity = currentCard ? getPolarity(currentCard) : null;
  const curPlayer = players[activePlayer] ?? "";
  const nextPlayerName = players[(activePlayer + 1) % Math.max(players.length, 1)] ?? "";

  // ════════════ HOME ══════════════════════════════════════════════════════════
  if (screen === "home") return (
    <div style={{ minHeight: "100svh", background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif", padding: "32px 20px", position: "relative", overflow: "hidden" }}>
      <style>{CSS}</style>
      <Orbs />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 28, animation: "slideUp .8s ease", maxWidth: 400, width: "100%" }}>

        {/* Fanned preview cards */}
        <div style={{ position: "relative", height: 118, width: 210, marginBottom: -8 }}>
          {[
            { r: -20, x: -74, z: 1, card: { value: "A", suit: { symbol: "♠", color: "black", label: "Pique" } } },
            { r: -7,  x: -26, z: 2, card: { value: "K", suit: { symbol: "♥", color: "red",   label: "Cœur" } } },
            { r:  7,  x:  22, z: 3, card: { value: "Q", suit: { symbol: "♦", color: "red",   label: "Carreau" } } },
            { r:  20, x:  70, z: 4, card: { value: "J", suit: { symbol: "♣", color: "black", label: "Trèfle" } } },
          ].map((c, i) => (
            <div key={i} style={{ position: "absolute", left: "50%", transform: `translateX(calc(-50% + ${c.x}px)) rotate(${c.r}deg)`, zIndex: c.z, animation: `floatY ${2.4 + i * .32}s ease-in-out infinite`, animationDelay: `${i * .42}s` }}>
              <PlayingCard card={c.card} small />
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontFamily: "'Cinzel Decorative',serif", fontWeight: 900, fontSize: "clamp(2.8rem,12vw,5rem)", lineHeight: 1.05, letterSpacing: ".08em", background: `linear-gradient(135deg,${T.orange} 0%,${T.violetLight} 55%,${T.orange} 100%)`, backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmer 4s linear infinite" }}>
            JDQ
          </h1>
          <p style={{ color: T.muted, fontSize: 13, marginTop: 8, letterSpacing: ".18em", textTransform: "uppercase", fontWeight: 300 }}>
            Jeu Des Questions
          </p>
        </div>

        {/* Rules card */}
        <div style={{ background: "#ffffff07", border: `1px solid ${T.border}`, borderRadius: 20, padding: "18px 20px", width: "100%", display: "flex", flexDirection: "column", gap: 11 }}>
          {[
            { i: "💬", l: "2–5 · Légère",    d: "Anecdotique, brise-glace" },
            { i: "🌊", l: "6–10 · Profonde",  d: "Plus intime, plus personnelle" },
            { i: "🔮", l: "J–A · Marquante",  d: "Existentielle, qui touche l'essentiel" },
          ].map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{r.i}</span>
              <div>
                <div style={{ fontWeight: 700, color: T.text, fontSize: 14 }}>{r.l}</div>
                <div style={{ color: T.muted, fontSize: 12, marginTop: 1 }}>{r.d}</div>
              </div>
            </div>
          ))}
          <div style={{ height: 1, background: T.border }} />
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: T.muted }}><span style={{ color: T.red }}>♥ ♦</span> Questions positives</span>
            <span style={{ fontSize: 13, color: T.muted }}><span style={{ color: T.violetLight }}>♠ ♣</span> Questions négatives</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
          <button className="btn" onClick={() => setScreen("setup")} style={{ width: "100%", padding: "17px", borderRadius: 100, background: `linear-gradient(135deg,${T.orange},${T.violet})`, border: "none", color: "#fff", fontFamily: "'Cinzel Decorative',serif", fontSize: 17, fontWeight: 700, cursor: "pointer", letterSpacing: ".07em", boxShadow: `0 0 32px ${T.orange}44,0 0 60px ${T.violet}33`, transition: "all .2s" }}>
            Jouer
          </button>
          <button className="btn ghost" onClick={() => setScreen("myquestions")} style={{ width: "100%", padding: "13px", borderRadius: 100, background: "transparent", border: `1px solid ${T.border}`, color: T.muted, fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all .2s" }}>
            ✏️ Mes questions perso
          </button>
        </div>
      </div>
    </div>
  );

  // ════════════ SETUP ═════════════════════════════════════════════════════════
  if (screen === "setup") return (
    <div style={{ minHeight: "100svh", background: T.bg, display: "flex", flexDirection: "column", fontFamily: "'DM Sans',sans-serif", position: "relative", overflow: "hidden" }}>
      <style>{CSS}</style>
      <Orbs />
      <div style={{ position: "relative", zIndex: 2, flex: 1, display: "flex", flexDirection: "column", padding: "0 20px 32px", maxWidth: 440, margin: "0 auto", width: "100%" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0 24px" }}>
          <button onClick={() => setScreen("home")} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 12, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase" }}>← Retour</button>
          <h2 style={{ fontFamily: "'Cinzel Decorative',serif", color: T.text, fontSize: 15, fontWeight: 700 }}>Les joueurs</h2>
          <div style={{ width: 60 }} />
        </div>

        {/* Input */}
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            value={nameInput}
            onChange={e => { setNameInput(e.target.value); setNameErr(""); }}
            onKeyDown={e => { if (e.key === "Enter") addPlayer(); }}
            placeholder="Prénom du joueur…"
            maxLength={20}
            style={{ flex: 1, padding: "13px 16px", borderRadius: 14, background: "#ffffff0A", border: `1px solid ${nameErr ? T.red : T.border}`, fontSize: 15 }}
          />
          <button className="btn" onClick={addPlayer} style={{ padding: "12px 20px", borderRadius: 14, background: `linear-gradient(135deg,${T.orange},${T.violet})`, border: "none", color: "#fff", fontWeight: 700, fontSize: 18, cursor: "pointer", transition: "all .2s" }}>+</button>
        </div>
        {nameErr && <p style={{ color: T.red, fontSize: 12, marginBottom: 8 }}>{nameErr}</p>}

        {/* List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          {players.length === 0 ? (
            <div style={{ textAlign: "center", padding: "36px 0", color: T.muted, fontSize: 14 }}>
              Ajoute au moins un joueur pour commencer
            </div>
          ) : (
            players.map(p => (
              <PlayerChip key={p} name={p} onRemove={() => updatePlayers(players.filter(x => x !== p))} />
            ))
          )}
        </div>

        {/* Info + CTA */}
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          {players.length > 1 && (
            <div style={{ background: "#ffffff07", border: `1px solid ${T.border}`, borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>🔄</span>
              <span style={{ color: T.muted, fontSize: 13 }}>Le jeu alternera entre les {players.length} joueurs automatiquement</span>
            </div>
          )}
          <button className="btn" onClick={startGame} disabled={players.length === 0} style={{ width: "100%", padding: "17px", borderRadius: 100, background: players.length === 0 ? "#1a1535" : `linear-gradient(135deg,${T.orange},${T.violet})`, border: "none", color: players.length === 0 ? T.muted : "#fff", fontFamily: "'Cinzel Decorative',serif", fontSize: 16, fontWeight: 700, cursor: players.length === 0 ? "not-allowed" : "pointer", letterSpacing: ".07em", transition: "all .2s", boxShadow: players.length === 0 ? "none" : `0 0 32px ${T.orange}44,0 0 60px ${T.violet}33` }}>
            {players.length === 0 ? "Ajoute des joueurs" : "Lancer la partie →"}
          </button>
        </div>
      </div>
    </div>
  );

  // ════════════ GAME ══════════════════════════════════════════════════════════
  if (screen === "game") return (
    <div style={{ minHeight: "100svh", background: T.bg, display: "flex", flexDirection: "column", fontFamily: "'DM Sans',sans-serif", position: "relative", overflow: "hidden" }}>
      <style>{CSS}</style>
      {depth && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `radial-gradient(ellipse 70% 50% at 50% 38%,${depth.glow}1A 0%,transparent 70%)`, transition: "background 1.2s" }} />
      )}

      {/* Topbar */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${T.border}` }}>
        <button onClick={() => setScreen("home")} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 12, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase" }}>← Quitter</button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 70, height: 3, background: T.border, borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(drawnCount / 54) * 100}%`, background: `linear-gradient(90deg,${T.violet},${T.orange})`, transition: "width .4s" }} />
          </div>
          <span style={{ color: T.muted, fontSize: 12, fontWeight: 700 }}>{drawnCount}<span style={{ opacity: .4 }}>/54</span></span>
        </div>
        <button onClick={startGame} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 20, padding: "5px 12px", color: T.muted, cursor: "pointer", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>Refaire</button>
      </div>

      {/* Players scroll bar */}
      {players.length > 1 && (
        <div style={{ position: "relative", zIndex: 9, display: "flex", gap: 8, padding: "10px 16px", borderBottom: `1px solid ${T.border}`, overflowX: "auto" }}>
          {players.map((p, i) => (
            <PlayerChip key={p} name={p} active={i === activePlayer} score={scores[p] ?? 0} />
          ))}
        </div>
      )}

      {/* Active player banner */}
      {curPlayer && (
        <div style={{ position: "relative", zIndex: 8, textAlign: "center", padding: "10px 20px", background: "#ffffff05", borderBottom: `1px solid ${T.border}` }}>
          <span style={{ color: T.muted, fontSize: 13 }}>Tour de </span>
          <span style={{ color: T.text, fontWeight: 700, fontSize: 15 }}>{curPlayer}</span>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 18px 32px", gap: 20, position: "relative", zIndex: 2 }}>

        {/* ── IDLE ── */}
        {phase === "idle" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, animation: "fadeIn .4s" }}>
            <div style={{ animation: "floatY 3s ease-in-out infinite" }}>
              <PlayingCard faceDown card={{ suit: { symbol: "?", color: "black" }, value: "?" }} />
            </div>
            {deck.length === 0 ? (
              <>
                <p style={{ color: T.violetLight, fontWeight: 700, fontSize: 18, textAlign: "center" }}>Toutes les cartes ont été tirées !</p>
                <button className="btn" onClick={startGame} style={{ padding: "15px 40px", borderRadius: 100, background: `linear-gradient(135deg,${T.orange},${T.violet})`, border: "none", color: "#fff", fontFamily: "'Cinzel Decorative',serif", fontSize: 15, fontWeight: 700, cursor: "pointer", transition: "all .2s" }}>Nouvelle partie</button>
              </>
            ) : (
              <>
                <div style={{ textAlign: "center" }}>
                  <p style={{ color: T.muted, fontSize: 14, fontWeight: 300 }}>{deck.length} carte{deck.length > 1 ? "s" : ""} restante{deck.length > 1 ? "s" : ""}</p>
                  {curPlayer && <p style={{ color: T.text, fontSize: 15, marginTop: 5, fontWeight: 600 }}>{curPlayer}, c'est ton tour !</p>}
                </div>
                <button className="btn" onClick={drawCard} style={{ padding: "18px 56px", borderRadius: 100, background: `linear-gradient(135deg,${T.orange},${T.violet})`, border: "none", color: "#fff", fontFamily: "'Cinzel Decorative',serif", fontSize: 18, fontWeight: 700, cursor: "pointer", letterSpacing: ".06em", boxShadow: `0 0 32px ${T.orange}44,0 0 60px ${T.violet}33`, transition: "all .25s" }}>
                  Tirer une carte
                </button>
              </>
            )}
          </div>
        )}

        {/* ── REVEAL ── */}
        {phase === "reveal" && currentCard && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, width: "100%", maxWidth: 400 }}>
            <div style={{ animation: "drawCard .5s cubic-bezier(.34,1.56,.64,1)" }}>
              <PlayingCard card={currentCard} />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              <Badge label={depth.label} glow={depth.glow} />
              <Badge label={polarity.label} glow={polarity.positive === true ? T.red : polarity.positive === false ? T.violetLight : T.orangeLight} />
            </div>
            <div style={{ background: "#ffffff07", border: `1px solid ${T.border}`, borderRadius: 20, padding: "18px 20px", width: "100%" }}>
              <p style={{ color: T.muted, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".13em", marginBottom: 13 }}>Que faire ?</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                <button className="btn" onClick={() => setPhase("question")} style={{ padding: "13px 18px", borderRadius: 13, textAlign: "left", background: `linear-gradient(135deg,${T.violet}bb,${T.violetDark}aa)`, border: `1px solid ${T.violet}66`, color: T.text, fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all .2s" }}>
                  ✍️ &nbsp;On a une question
                </button>
                <button className="btn" onClick={requestAI} style={{ padding: "13px 18px", borderRadius: 13, textAlign: "left", background: `linear-gradient(135deg,${T.orange}bb,#92400Eaa)`, border: `1px solid ${T.orange}66`, color: T.text, fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all .2s" }}>
                  ✨ &nbsp;Suggestion IA
                </button>
                <button className="btn ghost" onClick={useRandom} style={{ padding: "10px 18px", borderRadius: 13, textAlign: "left", background: "transparent", border: `1px solid ${T.border}`, color: T.muted, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "background .2s" }}>
                  🎲 &nbsp;Question aléatoire
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── AI LOADING ── */}
        {phase === "ai-loading" && currentCard && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, animation: "fadeIn .3s" }}>
            <PlayingCard card={currentCard} />
            <div style={{ width: 34, height: 34, borderRadius: "50%", border: `3px solid ${T.border}`, borderTopColor: T.orange, animation: "spin .8s linear infinite" }} />
            <p style={{ color: T.muted, fontSize: 14, fontWeight: 300 }}>L'IA prépare la question…</p>
          </div>
        )}

        {/* ── QUESTION ── */}
        {phase === "question" && currentCard && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, width: "100%", maxWidth: 440, animation: "fadeIn .3s" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-end" }}>
              <PlayingCard card={currentCard} small style={{ transform: "rotate(-5deg)", marginBottom: 4 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Badge label={depth.label} glow={depth.glow} />
                <Badge label={polarity.label} glow={polarity.positive === true ? T.red : polarity.positive === false ? T.violetLight : T.orangeLight} />
                {curPlayer && <Badge label={`🎯 ${curPlayer}`} glow={T.orange} />}
              </div>
            </div>

            {question ? (
              <div style={{ background: `linear-gradient(135deg,${depth.glow}1C,#ffffff06)`, border: `1px solid ${depth.glow}44`, borderRadius: 22, padding: "24px", width: "100%", animation: "qReveal .5s ease", boxShadow: `0 0 28px ${depth.glow}22` }}>
                <p style={{ fontSize: "clamp(1rem,3vw,1.25rem)", fontWeight: 400, color: T.text, lineHeight: 1.72, textAlign: "center", fontStyle: "italic" }}>
                  « {question} »
                </p>
                {aiError && <p style={{ color: T.muted, fontSize: 11, textAlign: "center", marginTop: 10 }}>(question locale — IA indisponible)</p>}
              </div>
            ) : (
              <div style={{ background: "#ffffff07", border: `1px solid ${T.border}`, borderRadius: 22, padding: "24px", width: "100%", textAlign: "center" }}>
                <p style={{ color: T.muted, fontSize: 14, fontStyle: "italic" }}>Les joueurs posent leur propre question</p>
                <p style={{ color: T.muted, fontSize: 12, marginTop: 8, opacity: .7 }}>
                  Niveau : <strong style={{ color: depth.glow }}>{depth.label}</strong>
                </p>
              </div>
            )}

            <button className="btn" onClick={nextTurn} style={{ padding: "15px 44px", borderRadius: 100, width: "100%", background: `linear-gradient(135deg,${T.orange},${T.violet})`, border: "none", color: "#fff", fontFamily: "'Cinzel Decorative',serif", fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: ".06em", boxShadow: `0 0 24px ${T.orange}33,0 0 44px ${T.violet}22`, transition: "all .25s" }}>
              {players.length > 1 ? `Tour de ${nextPlayerName} →` : "Carte suivante →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ════════════ MY QUESTIONS ══════════════════════════════════════════════════
  const LEVELS = [
    { k: "light",  l: "💬 Légère (2–5)" },
    { k: "medium", l: "🌊 Profonde (6–10)" },
    { k: "deep",   l: "🔮 Marquante (J–A)" },
    { k: "joker",  l: "⭐ Joker" },
  ];
  const POLS = [
    { k: "positive", l: "❤️ Positive" },
    { k: "negative", l: "♠ Négative" },
  ];
  const currentList = qLevel === "joker"
    ? (customQ.joker ?? [])
    : (customQ[qLevel]?.[qPol] ?? []);
  const totalCustom = Object.entries(customQ).reduce((acc, [k, v]) => {
    if (k === "joker") return acc + v.length;
    return acc + (v.positive?.length ?? 0) + (v.negative?.length ?? 0);
  }, 0);

  return (
    <div style={{ minHeight: "100svh", background: T.bg, display: "flex", flexDirection: "column", fontFamily: "'DM Sans',sans-serif", position: "relative", overflow: "hidden" }}>
      <style>{CSS}</style>
      <Orbs />
      <div style={{ position: "relative", zIndex: 2, flex: 1, display: "flex", flexDirection: "column", padding: "0 18px 32px", maxWidth: 480, margin: "0 auto", width: "100%" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0 22px" }}>
          <button onClick={() => setScreen("home")} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 12, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase" }}>← Retour</button>
          <h2 style={{ fontFamily: "'Cinzel Decorative',serif", color: T.text, fontSize: 15, fontWeight: 700 }}>Mes questions</h2>
          <div style={{ width: 60 }} />
        </div>

        {/* Level tabs */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 12 }}>
          {LEVELS.map(l => (
            <button key={l.k} onClick={() => setQLevel(l.k)} style={{ padding: "7px 13px", borderRadius: 100, border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", background: qLevel === l.k ? `linear-gradient(135deg,${T.orange},${T.violet})` : "#ffffff0A", color: qLevel === l.k ? "#fff" : T.muted, transition: "all .2s" }}>
              {l.l}
            </button>
          ))}
        </div>

        {/* Polarity tabs */}
        {qLevel !== "joker" && (
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {POLS.map(p => (
              <button key={p.k} onClick={() => setQPol(p.k)} style={{ flex: 1, padding: "9px", borderRadius: 12, border: `1.5px solid ${qPol === p.k ? (p.k === "positive" ? T.red : T.violetLight) : T.border}`, background: qPol === p.k ? (p.k === "positive" ? `${T.red}18` : `${T.violetLight}18`) : "transparent", color: qPol === p.k ? T.text : T.muted, cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all .2s" }}>
                {p.l}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <textarea
            value={qInput}
            onChange={e => setQInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addCustomQ(); } }}
            placeholder="Écris ta question ici…"
            rows={2}
            style={{ flex: 1, padding: "11px 14px", borderRadius: 14, background: "#ffffff0A", border: `1px solid ${T.border}`, fontSize: 14, lineHeight: 1.5 }}
          />
          <button className="btn" onClick={addCustomQ} disabled={!qInput.trim()} style={{ padding: "12px 16px", borderRadius: 14, alignSelf: "stretch", background: qInput.trim() ? `linear-gradient(135deg,${T.orange},${T.violet})` : "#1a1535", border: "none", color: qInput.trim() ? "#fff" : T.muted, fontSize: 22, cursor: qInput.trim() ? "pointer" : "not-allowed", transition: "all .2s" }}>
            +
          </button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          {currentList.length === 0 ? (
            <div style={{ textAlign: "center", padding: "36px 0", color: T.muted, fontSize: 14 }}>
              Aucune question perso ici.<br />
              <span style={{ fontSize: 12, opacity: .6 }}>Les questions par défaut seront utilisées.</span>
            </div>
          ) : (
            currentList.map((q, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#ffffff08", border: `1px solid ${T.border}`, borderRadius: 14, padding: "12px 14px" }}>
                <p style={{ flex: 1, color: T.text, fontSize: 14, lineHeight: 1.55, fontStyle: "italic" }}>« {q} »</p>
                <button className="del" onClick={() => removeCustomQ(qLevel, qPol, i)} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 20, lineHeight: 1, flexShrink: 0, paddingTop: 1, transition: "color .2s" }}>×</button>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div style={{ marginTop: 14, padding: "11px 16px", background: "#ffffff06", border: `1px solid ${T.border}`, borderRadius: 14, textAlign: "center" }}>
          <p style={{ color: T.muted, fontSize: 12 }}>
            {totalCustom} question{totalCustom !== 1 ? "s" : ""} perso au total · mélangées aux questions par défaut
          </p>
        </div>
      </div>
    </div>
  );
}
