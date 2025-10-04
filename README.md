## Deployment Link
- Soon to be added after netlify error fixed.

# Nuxt Chat Bot
A modern multimodal AI chat application built with Nuxt 3, supporting text, image, and PDF conversations. Features real-time speech-to-text, Google Gemini AI integration, and persistent chat history with attachments.

## 🚀 Tech Stack
- **Nuxt 3** (Vue 3, TypeScript)
- **Tailwind CSS**
- **Prisma ORM** (PostgreSQL)
- **Google Gemini AI** (Vision & Text)
- **Logto** (Authentication)
- **pdf2json** (PDF text extraction)

## ⚡️ Local Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```
Edit `.env` and set:
- `DATABASE_URL` (PostgreSQL connection string)
- `GOOGLE_API_KEY` (Google Gemini API key)
- `LOGTO_ENDPOINT`, `LOGTO_APP_ID`, `LOGTO_APP_SECRET` (Logto config)
- `NUXT_PUBLIC_BASE_URL` (usually `http://localhost:3000`)

### 3. Run Database Migrations
```bash
npx prisma migrate dev
```

### 4. Start the Application
```bash
npm run dev
```

App will be available at [http://localhost:3000](http://localhost:3000)

## 📝 Features
- Multimodal chat: text, image, PDF
- Real-time speech-to-text (Web Speech API)
- Google Gemini AI for vision & text
- Persistent chat history with attachments
- Authentication via Logto

## 📂 Project Structure
- `pages/` — Main chat UI
- `server/api/` — API endpoints
- `prisma/` — Database schema
- `.env.example` — Environment variable template

## 🛠️ Useful Commands
- Install dependencies: `npm install`
- Run migrations: `npx prisma migrate dev`
- Start dev server: `npm run dev`

---
