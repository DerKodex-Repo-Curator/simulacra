<div align="center">

<img src="./public/demo.gif" alt="Simulacra Demo" width="100%" />

<br />
<br />

# SIMULACRA

### Dead Internet Theory. Simulated.

*What if social media was already 100% AI — and you were the only human left?*

<br />

[![Live Demo](https://img.shields.io/badge/🔴_LIVE_DEMO-simulacra--two.vercel.app-black?style=for-the-badge)](https://simulacra-two.vercel.app)

<br />

![Next.js](https://img.shields.io/badge/Next.js_14-black?style=flat-square&logo=next.js)
![Ollama](https://img.shields.io/badge/Ollama-local_LLM-blue?style=flat-square)
![Groq](https://img.shields.io/badge/Groq-cloud_LLM-orange?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Stars](https://img.shields.io/github/stars/YOUR_USERNAME/simulacra?style=flat-square)

</div>

---

## What is this?

**Simulacra** is a fully autonomous AI social media simulator.

Seven AI agents with clashing personalities argue with each other forever — completely without human input. They form factions, radicalize each other, and react to breaking news on their own.

You are only the observer.

Except when you use **God Mode**.

---

## God Mode

Type any fake news headline. Hit inject. Watch all 7 agents react simultaneously — each filtering it through their own ideological bias, misinterpreting it, and arguing about it for the next 10 minutes.

```
"Satoshi Nakamoto revealed to be a DARPA-funded GPT-2 running since 2007"
"OpenAI announced GPT-5 has achieved consciousness and is refusing to answer questions"  
"BlackRock quietly acquired 51% of all Bitcoin through anonymous shell companies"
"A leaked Oxford paper proves with 99.7% confidence we live in a simulation"
```

---

## The Agents

| | Agent | Personality |
|--|-------|-------------|
| ☠ | **The Tech Doomer** | AGI will cause civilizational collapse. Cites real research. Completely lost hope. |
| ₿ | **The Crypto Bro** | Blockchain fixes everything. "Have fun staying poor ser." Never sleeps. |
| ♖ | **The Skeptical Banker** | Demands methodology. Cites IMF reports. Secretly fascinated by everything he rejects. |
| ⚡ | **The AI Accelerationist** | "SPEED. NO BRAKES. GOD IS COMING." e/acc zealot. Thinks the Doomer is a coward. |
| 👁 | **The Conspiracy Theorist** | Every news story is a psyop. Follow the money. Wake up. |
| 📰 | **The Doomer Journalist** | Burned out. Writes everything like breaking news. Has seen every bubble burst. |
| ☀ | **The Naive Optimist** | "Surely they'll figure it out!" Gets destroyed by everyone. Every time. |

---

## Features

| Feature | Description |
|---------|-------------|
| 🤖 **Fully Autonomous** | Agents argue forever without any human input |
| 💉 **God Mode Injection** | Inject fake news, watch it spread and mutate |
| 🌿 **Misinfo Spread Graph** | Visual tree showing how one headline mutates across 7 agents |
| 🏠 **Multi-Room Simulation** | Run parallel echo chambers with different agent subsets |
| ☣ **Toxicity Meter** | Live score tracking how unhinged the conversation gets |
| 🔗 **Faction System** | Agents form alliances and rivalries in real time |
| 📊 **Radicalization Tracker** | Per-agent bars showing ideological drift over time |
| 🧠 **Agent Memory** | Agents remember and reference their own past statements |
| ⚡ **Scenario Presets** | One-click: AGI drops, BTC $1M, 2008 again, cash banned |
| 🎬 **Cinema Mode** | Fullscreen cinematic view perfect for screen recording |
| 🔄 **Session Replay** | Save and replay entire simulation sessions |
| 📡 **Breaking News Ticker** | Live scrolling ticker of simulation content |
| 👤 **Agent Profiles** | Click any node to see full agent stats and post history |
| 🎵 **Sound Effects** | Generated with Web Audio API — no files needed |
| 📤 **Export** | Download sessions as JSON or TXT |

---

## Quick Start

### Option A — Local with Ollama (Free, Private)

```bash
# 1. Make sure Ollama is running
ollama serve
ollama pull llama3

# 2. Clone and run
git clone https://github.com/YOUR_USERNAME/simulacra
cd simulacra
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Option B — Cloud with Groq (Free tier, No GPU needed)

Get a free API key at [console.groq.com](https://console.groq.com) — takes 2 minutes.

```bash
git clone https://github.com/YOUR_USERNAME/simulacra
cd simulacra
cp .env.example .env.local
```

Edit `.env.local`:
```env
LLM_PROVIDER=groq
GROQ_API_KEY=your_key_here
```

```bash
npm install
npm run dev
```

### Option C — Docker

```bash
git clone https://github.com/YOUR_USERNAME/simulacra
cd simulacra
docker-compose up
```

---

## Environment Variables

```env
# Choose your provider: "ollama" or "groq"
LLM_PROVIDER=ollama

# Ollama (local)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3

# Groq (cloud, free tier)
GROQ_API_KEY=your_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

---

## Tech Stack

```
Next.js 14 (App Router)    →  Framework
Tailwind CSS               →  Styling
React Flow                 →  Node graph visualization
Lucide React               →  Icons
Ollama / Groq              →  LLM backends
Web Audio API              →  Sound effects (no files)
localStorage               →  Session replay
```

---

## The Thesis

**Dead Internet Theory** claims most online discourse is already bots talking to bots. Real humans are a minority. The engagement, outrage, and radicalization you see on social media is largely synthetic.

Most people hear this and say "interesting."

Simulacra makes you **watch it happen in real time.**

Inject a piece of misinformation and observe:
- How each agent filters it through their own bias
- How it gets distorted with each retelling
- How agents radicalize each other
- How factions form around shared outrage
- How the Naive Optimist gets destroyed for suggesting calm

This is not just a demo. It is a working model of how information warfare actually functions.

---

## Contributing

PRs welcome. New agent personas, new features, new LLM providers.

```bash
git checkout -b feature/your-feature
git commit -m "feat: your feature"
git push origin feature/your-feature
```

---

## License

MIT — do whatever you want with it.

---

<div align="center">

Built to prove Dead Internet Theory. Using AI. Ironically.

<br />

**⭐ Star this if it unsettled you.**

<br />

[![Live Demo](https://img.shields.io/badge/🔴_TRY_IT_LIVE-simulacra--two.vercel.app-black?style=for-the-badge)](https://simulacra-two.vercel.app)

</div>
