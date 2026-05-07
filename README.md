# JDQ — Jeu Des Questions
## Déployer sur Vercel (lien web gratuit en 5 min)

### Prérequis
- Un compte GitHub (gratuit) → https://github.com
- Un compte Vercel (gratuit) → https://vercel.com
- Une clé API Anthropic → https://console.anthropic.com

---

### Étape 1 — Mets le projet sur GitHub

```bash
# Dans le dossier jdq-web/
git init
git add .
git commit -m "JDQ v1"
```

Va sur github.com → New repository → nomme-le "jdq" → Create

```bash
git remote add origin https://github.com/TON_PSEUDO/jdq.git
git push -u origin main
```

### Étape 2 — Connecte à Vercel

1. Va sur vercel.com → "Add New Project"
2. Importe ton repo GitHub "jdq"
3. Vercel détecte Vite automatiquement → clique "Deploy"

### Étape 3 — Ajoute ta clé API (sécurisé)

Dans Vercel → ton projet → **Settings → Environment Variables**

```
Name  : ANTHROPIC_API_KEY
Value : sk-ant-xxxxxxxxxxxxxxxx
```

→ Sauvegarde → **Redeploy**

### Résultat

Tu obtiens un lien du type :
**https://jdq-ton-pseudo.vercel.app**

Partage ce lien à tes amis, ça marche sur mobile et desktop.
La clé API n'est jamais visible dans le navigateur.

---

### Structure du projet

```
jdq-web/
├── api/
│   └── question.js     ← serverless function (clé API ici, côté serveur)
├── src/
│   ├── main.jsx
│   └── App.jsx         ← tout le jeu
├── index.html
├── package.json
├── vite.config.js
└── vercel.json
