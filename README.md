<div align="center">

# 🏙️ NagarDrishti

### AI-Powered Urban Intelligence & Digital Twin Platform

**See the city. Understand its problems. Prioritize action. Build smarter infrastructure.**

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react\&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript\&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js\&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb\&logoColor=white)](https://www.mongodb.com/)
[![Groq](https://img.shields.io/badge/AI-Groq-orange)](https://groq.com/)

**Built for Devengers Shinchan Hackathon 2026**

</div>

---

## 🌆 About the Project

NagarDrishti is an AI-powered urban infrastructure monitoring and management platform designed to help cities identify, visualize, prioritize and manage civic issues.

Urban problems such as potholes, garbage accumulation, waterlogging, damaged roads and blocked drainage systems often go unnoticed or remain unresolved because information is scattered across different reporting systems.

NagarDrishti brings these workflows together through an interactive urban dashboard combining AI-powered image analysis, geospatial visualization, a 3D Digital Twin, complaint management and scenario-based flood simulation.

The platform uses Bengaluru as its demonstration city.

## ✨ Key Features

### 1. AI-Powered Urban Issue Detection

* Upload photographs of urban infrastructure problems.
* Analyze actual image content using Groq Vision.
* Identify categories such as potholes, garbage, road damage and waterlogging.
* Provide a manual reporting option when AI analysis is unavailable.
* Keep AI credentials securely on the backend.

### 2. Interactive 2D City Map

* Visualize reported urban issues geographically.
* Explore issue locations and categories.
* Understand the distribution of infrastructure problems.
* Inspect issue details through interactive map elements.

### 3. 3D Digital Twin

* Explore a procedural 3D city environment.
* Visualize urban infrastructure and issue locations.
* Interact with the city through the dashboard.
* Connect spatial visualization with issue monitoring.

### 4. Flood Scenario Simulator

* Experiment with rainfall and drainage-related parameters.
* Explore potential waterlogging scenarios.
* Visualize affected areas and changing risk levels.
* Generate scenario-based recommendations.

**Note:** This is a scenario simulator, not a real-time flood forecasting or government alert system.

### 5. Smart Complaint Management

* Submit civic complaints with supporting information and photographs.
* Track submitted reports through their tracking IDs.
* Monitor complaint status and resolution progress.
* Maintain separate citizen reports even when potential duplicates are identified.

### 6. AI-Assisted Duplicate Detection

* Identify potentially related complaints.
* Consider issue category, location, timestamps, text similarity and image evidence.
* Keep duplicate suggestions advisory.
* Require authorized staff confirmation before linking reports.

### 7. AI-Assisted Priority Management

* Evaluate infrastructure issues using multiple risk factors.
* Help staff identify high-priority problems.
* Present issue information to support better decisions.

### 8. AI Assistant

* Provide an AI-powered conversational interface.
* Answer questions related to the platform and urban issues.
* Use the backend Groq integration.

### 9. Analytics Dashboard

* Explore issue distributions and category breakdowns.
* Monitor complaint and resolution information.
* Understand infrastructure trends through visual analytics.

### 10. Authentication and Staff Management

* Secure user authentication.
* Protected staff operations.
* Role-based access to authorized actions.
* Public read-only dashboard access.
* Authenticated complaint submission and protected status updates.

### 11. Notifications

* Provide notifications for relevant platform events.
* Support communication around complaint and issue workflows.

---

## 🛠️ Technology Stack

| Layer                   | Technologies                         |
| ----------------------- | ------------------------------------ |
| Frontend                | React 18, TypeScript, Vite           |
| Styling                 | Tailwind CSS                         |
| 2D Mapping              | Leaflet, React-Leaflet               |
| 3D Visualization        | Three.js, React Three Fiber, Drei    |
| Charts                  | Recharts                             |
| Backend                 | Node.js, Express.js, TypeScript      |
| Database                | MongoDB Atlas, Mongoose              |
| AI                      | Groq API, Vision and language models |
| Authentication          | JWT, bcrypt                          |
| Real-time Communication | Socket.IO                            |
| File Uploads            | Multer                               |

---

## 🏗️ Architecture

```text
                  NagarDrishti
                       |
          +------------+------------+
          |                         |
       Frontend                  Backend
          |                         |
     React + Vite             Express + Node.js
          |                         |
     +----+-----+          +---------+----------+
     |          |          |         |          |
    2D Map    3D Twin     APIs     AI Services  Socket.IO
     |          |          |         |          |
     +----------+----------+---------+----------+
                               |
                         MongoDB Atlas
                               |
                       Persistent Records
```

### Main application flow

1. A citizen submits an infrastructure complaint.
2. The backend processes the submitted information and image.
3. AI image analysis assists with issue classification.
4. The report and associated issue information are stored.
5. The priority engine helps evaluate the issue.
6. Staff review and manage complaints.
7. Citizens can track their submitted reports.

---

## 📁 Project Structure

```text
NagarDrishti/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   ├── services/
│   │   └── types/
│   │
│   ├── public/
│   ├── .env.example
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── config.ts
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── scripts/
│   │   ├── services/
│   │   └── server.ts
│   │
│   ├── scripts/
│   ├── test/
│   ├── .env.example
│   └── package.json
│
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

Install:

* Node.js 20 or newer
* npm
* MongoDB local installation or MongoDB Atlas account
* Groq API key for AI features

### 1. Clone the repository

```bash
git clone https://github.com/savant0004/NagarDrishti.git

cd NagarDrishti
```

### 2. Install dependencies

```bash
npm run install:all
```

### 3. Configure the backend

Copy the environment template:

**Windows PowerShell**

```powershell
Copy-Item server/.env.example server/.env
```

Configure your backend environment variables:

```env
PORT=5000
NODE_ENV=development

DEMO_MODE=false

MONGODB_URI=your_mongodb_connection_string
MONGODB_DATABASE=nagardrishti

JWT_SECRET=your_secure_random_secret

GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b
GROQ_VISION_MODEL=qwen/qwen3.8-27b

CLIENT_URL=http://localhost:5173
```

Use the database mode and environment variables required by your backend configuration.

**Never commit your actual `.env` file or expose API credentials.**

### 4. Configure the frontend

Copy:

```powershell
Copy-Item client/.env.example client/.env.local
```

For local development, the Vite proxy handles API requests by default.

For deployment, configure:

```env
VITE_API_URL=https://your-backend-domain.com
```

Do not put MongoDB credentials, JWT secrets or Groq API keys in frontend variables.

### 5. Start the application

From the project root:

```bash
npm run dev
```

The frontend and backend start together.

| Service       | Local URL                        |
| ------------- | -------------------------------- |
| Frontend      | http://localhost:5173            |
| Backend       | http://localhost:5000            |
| API Health    | http://localhost:5000/api/health |
| API Readiness | http://localhost:5000/api/ready  |

---

## 🗄️ Database Modes

NagarDrishti supports two application modes.

### Demo Mode

```env
DEMO_MODE=true
```

* Uses seeded Bengaluru demonstration records.
* Does not require a live MongoDB connection.
* Demonstration records are stored in memory.
* Sample records reset when the server restarts.

### Live Mode

```env
DEMO_MODE=false
MONGODB_URI=your_mongodb_atlas_uri
```

* Uses MongoDB for persistent application records.
* Does not silently substitute in-memory sample records when MongoDB is unavailable.
* Requires a valid database connection.

Demonstration records should not be presented as genuine citizen submissions.

---

## 🧪 Testing and Build

### Backend tests

```bash
cd server
npm test
```

### Backend production build

```bash
cd server
npm run build
```

### Frontend production build

```bash
cd client
npm run build
```

### Build the complete application

From the root directory:

```bash
npm run build
```

---

## 🌍 Deployment

The application can be deployed using separate frontend and backend hosting.

Suggested infrastructure:

| Component   | Suggested Service            |
| ----------- | ---------------------------- |
| Frontend    | Vercel or Render Static Site |
| Backend     | Render or Railway            |
| Database    | MongoDB Atlas                |
| AI Services | Groq API                     |

### Production configuration checklist

* Set `NODE_ENV=production`.
* Set `DEMO_MODE=false`.
* Configure the production MongoDB connection.
* Configure a new secure JWT secret.
* Configure the Groq API key on the backend.
* Set `CLIENT_URL` to the deployed frontend domain.
* Configure frontend API and Socket.IO URLs.
* Ensure uploaded files use persistent storage.
* Verify authentication, reporting, AI analysis and staff operations.

---

## 🔐 Security

* Keep all private credentials in environment variables.
* Never expose backend API keys to the browser.
* Use strong JWT secrets.
* Rotate credentials that have been exposed.
* Restrict production CORS to trusted frontend domains.
* Protect staff-only operations with authorization.
* Avoid committing uploaded user files or private environment configurations.

---

## 🎯 Project Vision

NagarDrishti aims to make urban infrastructure management more transparent, data-driven and responsive.

By combining AI-assisted issue identification, geospatial visualization, digital twin technology and structured complaint management, the platform provides a unified foundation for smarter urban operations.

### Future Scope

* Integration with verified municipal datasets.
* IoT-based infrastructure monitoring.
* Advanced geospatial analytics.
* Improved predictive maintenance.
* Integration with official emergency and civic systems.

These are future possibilities, not claims of currently implemented integrations.

---

## 👥 Contributors

Developed as part of **Devengers Shinchan Hackathon 2026**.

## 📄 License

This project is distributed under the MIT License, subject to the repository's included license file.

---

<div align="center">

### NagarDrishti

**A Smarter Vision for Every Street.**

*Think Like Shinchan. Create Fearlessly. Build Something Extraordinary!*

</div>
