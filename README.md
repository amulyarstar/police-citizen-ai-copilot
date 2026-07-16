# 🚨 Police & Citizen AI Copilot

An AI-powered incident management platform that explores how large language models, vector search, and sensor intelligence can support emergency-response workflows.

The system helps transform citizen complaints into structured incident reports, correlate them with relevant sensor data, identify potential discrepancies, and assist human operators in making informed dispatch decisions.

## 🚀 Live Demo

**Production Deployment:**  
https://police-citizen-ai-copilot.vercel.app

---

## 📖 Overview

Emergency-response systems often rely on fragmented information from citizens, cameras, sensors, and dispatch operators. Verifying reports and prioritizing incidents can be time-consuming, especially when information is incomplete or inconsistent.

Police & Citizen AI Copilot demonstrates how AI-assisted workflows can help process reports, surface relevant context, and support human decision-making while keeping humans in control of critical actions.

---

## ✨ Features

### 📝 Complaint Processing
Converts free-form citizen reports into structured incident records using AI-powered information extraction.

### 📍 Sensor Correlation
Associates reported incidents with relevant sensor events and contextual information.

### ⚠️ Discrepancy Detection
Highlights inconsistencies between citizen reports and available supporting data.

### 🚔 Dispatch Support
Assists operators in reviewing incidents and prioritizing emergency responses.

### 📊 Incident Dashboard
Provides a centralized interface for monitoring, reviewing, and managing incident workflows.

### 📄 Document Ingestion
Supports the processing of additional documents and evidence related to incidents.

---

## 🏗️ System Architecture

```text
Citizen Report
        │
        ▼
AI Processing
(Gemini + Mastra)
        │
        ▼
Data & Sensor Correlation
(Qdrant)
        │
        ▼
Discrepancy Analysis
        │
        ▼
Human Review
        │
        ▼
Dispatch Decision
```

---

## 🛠️ Tech Stack

| Category | Technology |
|-----------|------------|
| Frontend | Next.js, TypeScript |
| UI | Tailwind CSS |
| AI Model | Google Gemini |
| Agent Framework | Mastra |
| Vector Database | Qdrant Cloud |
| Database | Neon Postgres |
| Deployment | Vercel |

---

## 📸 Screenshots

### Citizen Reporting Portal

<img width="1911" height="882" alt="image" src="https://github.com/user-attachments/assets/dcd6b1fc-29f3-4a5a-b299-fc1372400cbc" />


### Officer Dashboard

<img width="1890" height="311" alt="image" src="https://github.com/user-attachments/assets/23ee9c51-f4a6-4b1a-a057-bd3e4e64fab2" />


---

## 💭 Why I Built This

I built this project to explore how AI systems can assist emergency-response workflows through information extraction, retrieval, and decision support. The goal was not to automate critical decisions, but to design a human-in-the-loop system that helps operators work more efficiently with better context.

---

## 📚 Key Learnings

Through this project I gained experience with:

- AI agent orchestration
- Retrieval and vector databases
- Full-stack application architecture
- Cloud deployment workflows
- Human-in-the-loop AI design
- Building production-ready Next.js applications

---

## ⚡ Getting Started

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## 🔑 Environment Variables

Create a `.env.local` file:

```env
DATABASE_URL=
QDRANT_URL=
QDRANT_API_KEY=
GEMINI_API_KEY=
```

Refer to `.env.example` for the complete configuration.

---

## 🔮 Future Improvements

- Real-time sensor integrations
- Interactive GIS mapping
- Multi-language complaint support
- Advanced incident analytics
- Mobile-first reporting experience

---

## 👤 Author

**Amulya**

Personal project focused on exploring AI-assisted emergency-response systems.
