# AI Court Judgment Summarizer — District Courts

A full-stack application that uses AI to summarize court judgments, extract legal citations, find similar judgments, and manage hearing calendars for district courts.

---

## Architecture

```
AI-Court-Summarizer/
  react-frontend/   ← Pure React SPA (Vite + Tailwind)  — UI only, port 5173
  next-backend/     ← Next.js App Router REST API backend — port 3000
  README.md
```

### Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | React 18, Vite, React Router, Tailwind CSS, Axios |
| Backend    | Next.js 14 (App Router), Route Handlers |
| Database   | PostgreSQL + Prisma ORM                 |
| AI         | Google Gemini API                       |
| Auth       | JWT (jose) + bcryptjs                   |
| PDF/OCR    | pdf-parse + tesseract.js                |

---

## Getting Started

### Prerequisites

- Node.js >= 18
- PostgreSQL running locally (or remote connection string)

---

### 1. Next.js Backend

```bash
cd next-backend

# Install dependencies
npm install

# Copy env file and fill in values
cp .env.example .env

# Generate Prisma client & push schema to DB
npm run db:generate
npm run db:push

# Start dev server (port 3000)
npm run dev
```

**Environment variables** (`.env`):

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/court_summarizer"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
GEMINI_API_KEY="your-gemini-api-key"
NEXT_PUBLIC_APP_NAME="AI Court Summarizer"
```

---

### 2. React Frontend

```bash
cd react-frontend

# Install dependencies
npm install

# Copy env file and fill in values
cp .env.example .env

# Start dev server (port 5173)
npm run dev
```

**Environment variables** (`.env`):

```
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_NAME="AI Court Summarizer"
```

---

## API Endpoints (Next.js Backend)

| Method | Endpoint                     | Description                        |
|--------|------------------------------|------------------------------------|
| POST   | `/api/auth/register`         | Register a new user                |
| POST   | `/api/auth/login`            | Login and receive JWT              |
| GET    | `/api/auth/me`               | Get current authenticated user     |
| POST   | `/api/auth/logout`           | Logout (invalidate session)        |
| GET    | `/api/users/profile`         | Get user profile                   |
| PUT    | `/api/users/profile`         | Update user profile                |
| GET    | `/api/cases`                 | List all cases                     |
| POST   | `/api/cases`                 | Create a new case                  |
| GET    | `/api/cases/[id]`            | Get case details                   |
| PUT    | `/api/cases/[id]`            | Update a case                      |
| DELETE | `/api/cases/[id]`            | Delete a case                      |
| POST   | `/api/upload`                | Upload judgment PDF                |
| POST   | `/api/summarize`             | Generate AI summary for a case     |
| GET    | `/api/citations/[caseId]`    | Get extracted legal citations      |
| GET    | `/api/similar/[caseId]`      | Find similar judgments             |
| GET    | `/api/hearings`              | List hearings                      |
| POST   | `/api/hearings`              | Schedule a new hearing             |
| PUT    | `/api/hearings/[id]`         | Update a hearing                   |
| DELETE | `/api/hearings/[id]`         | Delete a hearing                   |

---

## Frontend Pages

| Route                   | Page                 |
|-------------------------|----------------------|
| `/login`                | Login                |
| `/register`             | Registration         |
| `/dashboard`            | Dashboard            |
| `/upload`               | Upload Judgment      |
| `/cases`                | All Cases            |
| `/cases/:id`            | Case Details         |
| `/cases/:id/summary`    | AI Summary           |
| `/cases/:id/similar`    | Similar Judgments    |
| `/hearings`             | Hearing Calendar     |
| `/profile`              | Profile              |

---

## Project Status

- [x] Project structure initialized
- [x] React frontend scaffolded (Vite + Tailwind CSS)
- [x] Next.js backend scaffolded (App Router + API routes)
- [x] Prisma schema defined
- [ ] Database connection configured
- [ ] Authentication implemented
- [ ] PDF upload & processing
- [ ] Gemini AI integration
- [ ] Legal citation extraction
- [ ] Similar judgment search
