<div align="center">

<h1>
  <img src="https://img.shields.io/badge/🏙️-NAGARDRISHTI-00f2fe?style=for-the-badge&labelColor=060a12&color=00f2fe" />
</h1>

<h3>
  <strong>AI-Powered Urban Digital Twin — Smart City Infrastructure Intelligence Platform</strong>
</h3>

<p><em>"A Smarter Vision for Every Street."</em></p>

<br/>

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-3D_Engine-white?style=flat-square&logo=three.js&logoColor=black)](https://threejs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--Time-010101?style=flat-square&logo=socket.io&logoColor=white)](https://socket.io/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Live_or_Explicit_Demo-47a248?style=flat-square&logo=mongodb&logoColor=white)](https://mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

<br/>

> 🏆 **Built for Hackathon** · Full-Stack · Explicit demo and live modes

</div>

---

## 🌆 What is NagarDrishti?

**NagarDrishti** (Hindi: *"City Vision"*) is a next-generation **urban infrastructure intelligence platform** that creates a real-time, interactive **digital twin** of a city's street network.

Municipal authorities and field crews can **see every problem, understand its true risk, simulate future disasters, and resolve issues faster** — all from a single command center.

> 💡 **The Core Problem:** Cities receive hundreds of daily reports — potholes, blocked drains, broken lights. Without spatial context or data-driven prioritization, critical failures get missed until they become public disasters.

> ✅ **The Solution:** NagarDrishti connects 2D GIS maps, 3D city models, AI priority scoring, citizen reports, real-time WebSocket updates, and a climate scenario simulator into a unified smart city command platform.

---

## 🎯 Key Highlights

| Capability | Technology | What It Does |
|-----------|-----------|--------------|
| 🏙️ **3D Digital Twin** | Three.js · React Three Fiber | Interactive WebGL city with live issue markers, smoke particles, real-time HUD panels |
| 🗺️ **2D GIS Mapping** | Leaflet · React-Leaflet | Color-coded risk markers, street health overlays, real Bengaluru coordinates |
| 🤖 **AI Priority Engine** | Custom Algorithm | 7-factor weighted risk scoring — severity, population, infrastructure, traffic, weather |
| ⛈️ **Scenario Simulator** | REST API + Live Map | "What If?" climate modeling — rainfall, drainage, traffic sliders with flood risk output |
| 📱 **Citizen Reporter** | Groq Vision API | Photo upload → visually analyzes urban issues; unavailable analysis remains a manual report |
| 📡 **Real-Time Updates** | Socket.IO WebSockets | Dashboard live-updates when issues are created or status changes |
| 🏥 **Street Health Index** | Multi-metric Scoring | Per-street composite scores: Road · Drainage · Lighting · Sanitation · Traffic |
| 📊 **Analytics Command** | Recharts | Issue velocity charts, risk distribution, category breakdown over time ranges |
| 🔍 **Report Tracking** | Lifecycle Management | Citizens track their report ID through 5 resolution stages in real time |

### Groq image analysis configuration

For backend image analysis, set `GROQ_API_KEY` in `server/.env` (see `server/.env.example`). The model defaults to `qwen/qwen3.8-27b`; override it with `GROQ_MODEL` if needed. Keep this key on the server. If Groq analysis is unavailable, reports can still be submitted with a citizen-selected category; those reports are marked `not_analyzed` for review.

## Running demo and live mode

Use Node.js 20 or newer. Install dependencies with `npm install` in both `server` and `client`. Copy `server/.env.example` to the ignored `server/.env` and set a private `JWT_SECRET` of at least 32 bytes.

For the seeded Bengaluru demonstration, set `DEMO_MODE=true`, `DEMO_ADMIN_EMAIL`, and `DEMO_ADMIN_PASSWORD` (at least 12 characters). Demo records are in memory, tagged as sample data, and reset when the server restarts. Start the API with `cd server && npm run dev`; start the client in another terminal with `cd client && npm run dev`. While the demo API is running, `cd server && npm run seed` safely resets only its in-memory sample data.

For live records, set `DEMO_MODE=false` and provide `MONGODB_URI` for a local MongoDB or Atlas database. Live mode does not fall back to in-memory records. The first administrator can be provisioned with `npm run user:create-admin` from `server` after setting `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the ignored `server/.env`; the command refuses demo mode and will not overwrite an existing account. `/api/health` is liveness, while `/api/ready` reports whether required configuration and the active data store are ready.

The client uses `/api` and `/socket.io` through Vite's development proxy by default. Configure `VITE_API_URL` for a deployed API origin, and optionally `VITE_SOCKET_URL` for a separate Socket.IO origin. Do not put server secrets in `VITE_` variables.

Backend checks run with `cd server && npm test` and `npm run build`. The frontend TypeScript check and production bundle run with `cd client && npm run build`.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  NagarDrishti Platform                   │
│                                                         │
│  ┌──────────────────────┐   ┌─────────────────────────┐ │
│  │     FRONTEND         │   │       BACKEND            │ │
│  │  React 18 + Vite     │◄──►   Express + Socket.IO   │ │
│  │  TypeScript          │   │   Node.js + TypeScript   │ │
│  │  Tailwind CSS        │   │   Multer (uploads)       │ │
│  │  Three.js / R3F      │   │   AI Vision Service      │ │
│  │  Leaflet Maps        │   │                          │ │
│  │  Recharts            │   └──────────┬───────────────┘ │
│  └──────────────────────┘              │                  │
│                                        ▼                  │
│                              ┌─────────────────────┐     │
│                              │   MongoDB            │     │
│                              │   Live MongoDB or   │     │
│                              │ Explicit Demo Store │     │
│                              └─────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack

**Frontend**
- React 18 + TypeScript + Vite
- Tailwind CSS (utility-first design system)
- Three.js + `@react-three/fiber` + `@react-three/drei` (3D engine)
- Leaflet + React-Leaflet (2D GIS mapping)
- Recharts (analytics charts)
- Lucide React (icon system)
- Socket.IO Client (real-time)

**Backend**
- Node.js + Express.js + TypeScript
- Socket.IO (WebSocket event hub)
- Mongoose + MongoDB (primary database)
- Explicit in-memory Bengaluru demo dataset (`DEMO_MODE=true`)
- Multer (image upload processing)
- Demo AI Vision Classification Service

---

## 🔑 Core Features In Depth

### 1. 🤖 AI Priority Scoring Engine
Every urban issue gets an objective, explainable priority score (0–100):

```
Priority Score = Σ(
  Severity Weight    × severity_factor   [0–20]
  Traffic Impact     × traffic_density   [0–20]
  Population Impact  × residents_nearby  [0–20]
  Infrastructure     × school/hospital   [0–15]
  Citizen Reports    × report_count      [0–10]
  Duration Risk      × days_unresolved   [0–10]
  Weather Risk       × rainfall_forecast [0–5]
)
```

No guesswork. No politics. **Data drives every dispatch decision.**

### 2. ⛈️ "What If?" Scenario Simulator
Before a monsoon hits, city officials can model:
- Set **Rainfall** to 160mm → Flood risk spikes to 81%
- 6 streets turn to flood-risk overlay on the map
- AI generates emergency recommendation: *"Deploy suction jetter on Sector 4 drainage — 3,240 residents at risk"*

### 3. 🌐 Explicit Demo and Live Modes
Set `DEMO_MODE=true` to serve clearly marked, seeded Bengaluru sample records from memory without requiring MongoDB. Set `DEMO_MODE=false` to serve only MongoDB records; if MongoDB is unavailable, the API reports an error instead of substituting sample data. The `/api/health` endpoint reports the active mode and database connection state.

### 4. 📡 Real-Time WebSocket Hub
- Socket.IO events: `issue:created`, `issue:updated`, `data:reseeded`
- Dashboard updates live without page refresh
- Multi-user ready — all connected clients see the same state

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- MongoDB for live mode (optional when using explicit demo mode)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/nagardrishti.git
cd nagardrishti

# 2. Install ALL dependencies (root + server + client) in one command
npm run install:all

# 3. Configure the backend environment
copy .env.example server\.env
# Keep DEMO_MODE=true for seeded sample data, or set it to false and configure MONGODB_URI for live records.

# 4. Launch everything (frontend + backend simultaneously)
npm run dev
```

### You're Live 🎉
| Service | URL |
|---------|-----|
| 🌐 **Landing Page** | http://localhost:5173 |
| 🏙️ **Command Dashboard** | http://localhost:5173/dashboard |
| ⛈️ **Scenario Simulator** | http://localhost:5173/simulator |
| 📊 **Analytics** | http://localhost:5173/analytics |
| 🏥 **Street Health Index** | http://localhost:5173/street-health |
| 📱 **Report a Problem** | http://localhost:5173/report |
| 📋 **Reports Registry** | http://localhost:5173/reports-list |
| 🔍 **Track My Report** | http://localhost:5173/tracker |
| 🔌 **API Health Check** | http://localhost:5000/api/health |

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | System health check |
| `GET` | `/api/issues` | Fetch all urban issues (priority sorted) |
| `GET` | `/api/issues/:id` | Get single issue with full breakdown |
| `POST` | `/api/issues` | Create new issue |
| `PATCH` | `/api/issues/:id` | Update status / assign team |
| `GET` | `/api/reports` | List all citizen reports |
| `GET` | `/api/reports/:reportId` | Get report by tracking ID |
| `POST` | `/api/reports` | Submit citizen report (multipart/form-data) |
| `POST` | `/api/reports/analyze-image` | Run AI vision classification |
| `GET` | `/api/streets` | Street health index directory |
| `GET` | `/api/analytics` | Full analytics metrics |
| `POST` | `/api/simulation` | Run "What If?" scenario model |
| `POST` | `/api/seed` | Reseed demo data |

---

## 🏆 Hackathon Demo Script

**Recommended 4-minute walkthrough for judges:**

```
01. LANDING PAGE (/)
    → Show 3D interactive city scene in the hero background
    → Point out: "How It Works" pipeline, 9 platform capabilities

02. COMMAND DASHBOARD (/dashboard)
    → Show 2D GIS map with colored risk markers
    → Click ISSUE-001 (Sector 4 Drain Blockage, Priority 87/100)
    → Show: AI-explained priority breakdown, population impact
    → Click "Assign Team" → live status updates via Socket.IO

03. SCENARIO SIMULATOR (/simulator)
    → Drag Rainfall slider to 160mm
    → Watch: Flood Risk jumps to 81%, 6 streets affected
    → Show AI auto-recommendation banner
    → Switch to 3D view — see city react in real time

04. REPORT A PROBLEM (/report)
    → Upload any street/road photo
    → Watch AI Vision Scanner classify issue (91% confidence)
    → Submit → get ST-2026-XXXXX tracking ID

05. TRACK REPORT (/tracker)
    → Enter ST-2026-00482 → see 5-stage progress tracker

06. STREET HEALTH INDEX (/street-health)
    → Show Silk Board Junction (Score: 49 — Critical)
    → Visual progress bars: Drainage 38%, Traffic 14%

07. ANALYTICS (/analytics)
    → Show charts: 8 active issues, 41,840 citizens impacted
    → Incident velocity trend (resolved vs active)
```

---

## 📦 Production Build

```bash
# Build both client (Vite) and server (TypeScript → JS)
npm run build

# Output locations:
# Client: ./client/dist/
# Server: ./server/dist/

# Run production server
node server/dist/server.js
```

---

## 🌍 Deployment Guide

### Option A — Render.com (Recommended for Hackathon)

1. **Backend** → New Web Service → Connect repo → Build: `cd server && npm install && npm run build` → Start: `node dist/server.js`
2. **Frontend** → New Static Site → Build: `cd client && npm install && npm run build` → Publish: `client/dist`
3. Set `VITE_API_URL` in client env vars to your backend Render URL

### Option B — Railway

```bash
# Deploy backend
railway init
railway add --service backend
railway variables set MONGODB_URI=<your_atlas_uri>
railway up

# Deploy frontend separately as a static site
```

### Option C — Vercel (Frontend) + Railway (Backend)

```bash
# Frontend (Vercel)
vercel --prod

# Backend (Railway or Fly.io)
fly launch
fly deploy
```

### ⚠️ Deployment Checklist

- [ ] Set `DEMO_MODE=false` and configure `MONGODB_URI` for live records (or use `DEMO_MODE=true` for labeled sample data)
- [ ] Set `CLIENT_URL` to your deployed frontend domain (for CORS)
- [ ] Set `NODE_ENV=production`
- [ ] Set `PORT=5000` (or let hosting platform assign)
- [ ] Update `vite.config.ts` proxy target to production backend URL

---

## 📁 Project Structure

```
nagardrishti/
├── 📄 package.json              # Root workspace scripts
├── 📄 .env.example              # Environment configuration template
│
├── 📁 client/                   # React + Vite Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── HeroCity3D.tsx   # 3D Digital Twin (Three.js)
│   │   │   ├── DigitalTwin2DMap.tsx  # 2D GIS Map (Leaflet)
│   │   │   ├── IssueDetailModal.tsx  # Issue inspector panel
│   │   │   ├── Header.tsx       # Top navigation bar
│   │   │   └── Sidebar.tsx      # Left navigation
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx  # Hero + How It Works + Features
│   │   │   ├── DashboardPage.tsx # Command center (2D/3D toggle)
│   │   │   ├── SimulatorPage.tsx # Scenario climate simulator
│   │   │   ├── AnalyticsPage.tsx # Charts & KPI metrics
│   │   │   ├── StreetHealthPage.tsx # Per-street health index
│   │   │   ├── CitizenReportPage.tsx # Mobile report form + AI
│   │   │   ├── ReportsListPage.tsx  # Reports registry table
│   │   │   └── ReportTrackerPage.tsx # Tracking timeline
│   │   ├── services/
│   │   │   ├── api.ts           # REST API client
│   │   │   └── socket.ts        # Socket.IO client
│   │   └── types/               # TypeScript type definitions
│
└── 📁 server/                   # Node.js + Express Backend
    └── src/
        ├── server.ts            # Express app + Socket.IO hub
        ├── controllers/         # Route handlers
        ├── models/              # Mongoose schemas
        ├── routes/              # API route definitions
        ├── services/            # AI vision, priority engine
        └── data/                # Seed data
```

---

## 🔬 The AI Priority Engine — Explained

Unlike black-box ML models, NagarDrishti uses a **transparent, auditable scoring algorithm** that municipal officials can understand and trust:

```typescript
function calculatePriorityScore(issue: IIssue): number {
  const weights = {
    severity:       { Critical: 20, High: 16, Medium: 10, Low: 4 },
    traffic:        Math.min(20, issue.trafficVolume / 5),
    population:     Math.min(20, issue.estimatedImpact / 500),
    infrastructure: (schools * 5) + (hospitals * 5) + (busStops * 1),
    reports:        Math.min(10, issue.reportsCount),
    duration:       Math.min(10, issue.daysUnresolved * 2),
    weather:        rainfall > 100 ? 5 : rainfall > 50 ? 3 : 0,
  };
  return Object.values(weights).reduce((sum, w) => sum + w, 0);
}
```

**Every score is fully explainable.** Judges see exactly WHY issue ISSUE-004 scores 89/100.

---

## 👥 Target Users

| User Type | How They Use NagarDrishti |
|-----------|--------------------------|
| 🏛️ **Municipal Authorities** | Monitor city-wide issues, dispatch crews, run disaster simulations |
| 🚧 **Field Repair Crews** | View assigned tasks, update status, see exact GPS location |
| 👤 **Citizens** | Report problems with photos, track resolution in real-time |
| 📈 **City Planners** | Analyze trends, identify recurring hotspots, justify infrastructure budget |

---

## 🤝 Contributing

This is a hackathon project. Issues and PRs are welcome!

```bash
# Fork the repo, create a branch
git checkout -b feature/your-feature

# Make changes, commit
git commit -m "feat: your feature description"

# Push and open a PR
git push origin feature/your-feature
```

---

## 📄 License

MIT License — See [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ for smarter, safer cities.**

*NagarDrishti — Where data meets the street.*

[![Made with React](https://img.shields.io/badge/Made_with-React-61dafb?style=flat-square&logo=react)](https://reactjs.org)
[![Powered by Three.js](https://img.shields.io/badge/Powered_by-Three.js-black?style=flat-square&logo=three.js)](https://threejs.org)
[![Real-Time with Socket.IO](https://img.shields.io/badge/Real--Time-Socket.IO-010101?style=flat-square&logo=socket.io)](https://socket.io)

</div>
