# MedX — Low-Level Design Document

## 1. Project Overview

MedX is a health-intelligence platform that lets users upload or enter their blood
report data, runs that data through a machine learning pipeline to flag abnormal
values, predict possible disease risk, and score overall risk — then surfaces all
of this through a dashboard and an interactive "What If" assistant powered by an
LLM that can explain results in plain language and answer hypothetical
health-improvement questions ("If I walk 10k steps a day, how does that affect my
risk profile?").

### Core capabilities (v1)
1. **Authentication** — Email/password + Google OAuth.
2. **Blood Report Ingestion** — Upload PDF/image (OCR-parsed) or manual entry.
3. **ML Analysis Module** — Abnormal value flagging, disease-risk prediction, risk scoring.
4. **Dashboard** — Visualize current + historical blood report data and risk trends.
5. **What-If / AI Insights** — LLM interprets ML output + medical history and answers
   free-form health questions.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), TailwindCSS, Recharts/Chart.js for visualizations |
| Backend (App layer) | Node.js + Express.js |
| Database | MongoDB (Mongoose ODM) |
| ML Service | Python + FastAPI |
| ML/DS Libraries | scikit-learn / XGBoost, pandas, numpy, joblib (model persistence) |
| OCR | Tesseract OCR / Google Vision API / AWS Textract (for scanned PDFs & images) |
| Auth | Passport.js (Google OAuth 2.0 strategy) + JWT for session management |
| LLM Integration | Google Gemini API (free tier) called from Node backend or FastAPI |
| File Storage | AWS S3 / Cloudinary (for uploaded report PDFs/images) |
| Deployment | Docker containers — separate containers for Node app, FastAPI ML service, MongoDB |

**Key architectural rule:** All ML inference (prediction, classification, risk
scoring) happens exclusively inside the FastAPI service. The Node/Express backend
never runs model code directly — it only calls FastAPI over an internal REST API
and relays results. This keeps ML dependencies isolated from the JS runtime and
allows the ML service to be scaled/deployed independently.

---

## 3. High-Level Architecture

```
                       ┌─────────────────────────┐
                       │        React SPA         │
                       │  (Auth UI, Dashboard,     │
                       │   Upload, What-If Chat)   │
                       └───────────┬───────────────┘
                                   │ HTTPS (REST/JWT)
                                   ▼
                       ┌─────────────────────────┐
                       │   Node.js + Express API   │
                       │ ───────────────────────── │
                       │ - Auth (Google OAuth+JWT) │
                       │ - User/Profile mgmt        │
                       │ - Report upload handling   │
                       │ - OCR trigger + parsing    │
                       │ - Calls FastAPI for ML     │
                       │ - Calls LLM for What-If    │
                       │ - Persists to MongoDB      │
                       └───────┬───────────┬────────┘
                               │           │
                 Internal REST │           │ LLM API call
                               ▼           ▼
                  ┌────────────────────┐ ┌────────────────────┐
                  │  FastAPI ML Service │ │  Claude/LLM API     │
                  │ ──────────────────  │ │ (What-If reasoning, │
                  │ - Abnormal value     │ │  report interpret., │
                  │   flagging           │ │  Q&A on lifestyle)  │
                  │ - Disease risk model │ └────────────────────┘
                  │ - Risk scoring       │
                  │ - Returns JSON       │
                  └────────────────────┘
                               │
                               ▼
                       ┌─────────────────┐
                       │    MongoDB       │
                       │ users, reports,  │
                       │ predictions,     │
                       │ chat_history     │
                       └─────────────────┘
```

---

## 4. Module Breakdown

### 4.1 Authentication Module (MERN)

**Responsibilities:**
- Email/password signup + login (bcrypt-hashed passwords).
- Google OAuth 2.0 login via Passport.js `passport-google-oauth20`.
- JWT issuance (access token + refresh token) stored as httpOnly cookies.
- Route protection middleware (`verifyToken`) for all authenticated API routes.
- Password reset via email (nodemailer + reset token with expiry).

**Data model — `User`:**
```js
{
  _id: ObjectId,
  name: String,
  email: { type: String, unique: true },
  passwordHash: String,          // null if user signed up via Google
  authProvider: { type: String, enum: ["local", "google"] },
  googleId: String,               // present if authProvider === "google"
  avatarUrl: String,
  dob: Date,
  gender: String,
  createdAt: Date,
  updatedAt: Date
}
```

**Key endpoints:**
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register with email/password |
| POST | `/api/auth/login` | Login with email/password |
| GET | `/api/auth/google` | Initiate Google OAuth |
| GET | `/api/auth/google/callback` | Google OAuth callback, issues JWT |
| POST | `/api/auth/logout` | Clear cookies/session |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Get current logged-in user |

---

### 4.2 Blood Report Analysis Module (FastAPI + ML)

**Input paths (both supported):**
1. **Manual entry** — user fills a structured form (e.g., Hemoglobin, WBC, RBC,
   Platelets, Glucose, Cholesterol panel, Liver enzymes, Creatinine, etc.). Sent
   directly as JSON — no OCR needed.
2. **File upload (PDF/image)** — Node backend stores the file (S3/Cloudinary),
   then sends it to an OCR step:
   - PDFs: extract text via `pdf-parse` (if text-based) or rasterize + OCR if scanned.
   - Images: OCR via Tesseract/Cloud Vision.
   - The raw OCR text is then parsed with regex/NLP rules (or a lightweight
     LLM-assisted parser) into a structured key-value JSON of test names + values
     + units + reference ranges.

**Structured report schema (post-parsing, sent to FastAPI):**
```json
{
  "user_id": "abc123",
  "report_date": "2026-07-20",
  "parameters": {
    "hemoglobin": {"value": 10.2, "unit": "g/dL", "ref_range": "13-17"},
    "wbc_count": {"value": 11200, "unit": "/uL", "ref_range": "4000-11000"},
    "glucose_fasting": {"value": 132, "unit": "mg/dL", "ref_range": "70-100"},
    "creatinine": {"value": 1.1, "unit": "mg/dL", "ref_range": "0.6-1.3"}
    // ... rest of panel
  }
}
```

**FastAPI ML pipeline responsibilities:**

1. **Abnormal Value Flagging**
   - Rule-based first pass: compare each parameter to its reference range,
     flag as `low` / `normal` / `high` / `critical`.
   - This gives immediate, explainable flags independent of the ML model.

2. **Disease Risk Prediction**
   - A trained classification model (e.g., XGBoost/RandomForest, one model per
     disease category or a multi-label model) takes the full parameter vector
     (+ age, gender, BMI if available) and outputs probability scores for
     conditions such as: Anemia, Diabetes risk, Kidney dysfunction, Liver
     dysfunction, Infection/Inflammation, Cardiovascular risk, etc.
   - Model trained offline on labeled datasets (e.g., public blood-test/disease
     datasets), versioned and loaded via `joblib`/`pickle` at FastAPI startup.

3. **Overall Risk Scoring**
   - Weighted composite score (0–100) combining: number/severity of abnormal
     values, disease-risk probabilities, and historical trend (worsening vs.
     improving vs. stable across past reports).
   - Returned with a risk tier: `Low / Moderate / High / Critical`.

**FastAPI service structure:**
```
ml_service/
├── main.py                  # FastAPI app entrypoint
├── routers/
│   ├── analyze.py           # POST /analyze endpoint
│   └── health.py            # GET /health
├── models/
│   ├── disease_model.pkl
│   └── risk_scaler.pkl
├── core/
│   ├── flagging.py          # rule-based abnormal value logic
│   ├── predictor.py         # loads model, runs inference
│   └── risk_scorer.py       # composite scoring logic
├── schemas/
│   └── report_schema.py     # Pydantic request/response models
├── requirements.txt
└── Dockerfile
```

**Key FastAPI endpoint:**
```
POST /analyze
Request:  structured report JSON (as above) + optional prior reports for trend
Response:
{
  "flags": {
    "hemoglobin": "low",
    "wbc_count": "high",
    "glucose_fasting": "high"
  },
  "disease_risks": {
    "anemia": 0.78,
    "diabetes": 0.64,
    "kidney_dysfunction": 0.12
  },
  "overall_risk_score": 67,
  "risk_tier": "High",
  "model_version": "v1.2.0"
}
```

Node backend calls this via internal HTTP (e.g.,
`http://ml-service:8000/analyze`), then persists the response alongside the
report in MongoDB.

**Data model — `Report`:**
```js
{
  _id: ObjectId,
  userId: ObjectId,
  sourceType: { type: String, enum: ["manual", "upload"] },
  fileUrl: String,              // if uploaded
  parameters: Object,           // structured parsed values
  mlResult: {
    flags: Object,
    diseaseRisks: Object,
    overallRiskScore: Number,
    riskTier: String,
    modelVersion: String
  },
  reportDate: Date,
  createdAt: Date
}
```

---

### 4.3 Dashboard (MERN Frontend)

**Purpose:** Visualize the user's current health snapshot and historical trends.

**Components:**
- **Summary cards** — overall risk score/tier, key flagged abnormalities.
- **Trend charts** — line charts per parameter across report history (e.g.,
  glucose over last 6 reports) using Recharts.
- **Disease risk radar/bar chart** — visualize probability across disease
  categories from the latest report.
- **Report history list** — table of past reports, tap to view detail/re-run.
- **Upload/Manual Entry CTA** — prominent action to add a new report.

**Backend endpoints supporting dashboard:**
| Method | Route | Description |
|---|---|---|
| POST | `/api/reports/upload` | Upload file, triggers OCR + ML pipeline |
| POST | `/api/reports/manual` | Submit manual entry, triggers ML pipeline |
| GET | `/api/reports` | List user's reports (paginated) |
| GET | `/api/reports/:id` | Get single report + ML result |
| GET | `/api/reports/trends` | Aggregated trend data for charts |

---

### 4.4 What-If Feature (LLM Integration)

**Purpose:** Let the user ask natural-language questions about their health and
get answers grounded in their actual medical history + latest ML output.

**Flow:**
1. User opens "What If" chat on the dashboard.
2. Node backend assembles context:
   - Latest N reports (structured parameters + ML flags/risk).
   - User's basic profile (age, gender, existing conditions if provided).
   - The user's chat question (e.g., "If I do 10k steps a day, how would my
     diabetes risk change?").
3. Node backend sends this context + question to the LLM (Gemini API) with a
   system prompt instructing it to:
   - Interpret the medical data in plain language.
   - Reason about the hypothetical lifestyle change conservatively (this is
     not a diagnosis — includes appropriate disclaimers).
   - Suggest general, non-prescriptive improvement directions.
4. LLM response is streamed back to the frontend chat UI and also saved to
   `chat_history` for context continuity in future turns.

**Data model — `ChatHistory`:**
```js
{
  _id: ObjectId,
  userId: ObjectId,
  sessionId: String,
  messages: [
    { role: "user", content: String, timestamp: Date },
    { role: "assistant", content: String, timestamp: Date }
  ],
  createdAt: Date
}
```

**Key endpoint:**
| Method | Route | Description |
|---|---|---|
| POST | `/api/whatif/ask` | Send question + context, get LLM answer |
| GET | `/api/whatif/history/:sessionId` | Retrieve chat session |

**System prompt design (for the Gemini API call) should include:**
- The user's structured latest report + risk output (as data, not prose).
- A short medical-history summary.
- Clear instruction: give informative, educational answers; avoid definitive
  diagnosis; recommend consulting a doctor for medical decisions; keep tone
  supportive and clear.

---

## 5. UI/UX Direction

**Vibe:** Clean, clinical, trustworthy — "white and medical."

- **Color palette:** White/off-white base (#FFFFFF / #F7F9FA), primary accent in
  a calming medical blue or teal (#2F80ED / #14B8A6), soft red/amber only for
  alerts (abnormal flags), soft grey for secondary text.
- **Typography:** Clean sans-serif (Inter/Roboto), generous whitespace, rounded
  cards with subtle shadows — avoid harsh borders.
- **Iconography:** Simple line icons (medical cross, heart pulse, droplet for
  blood, etc.) — avoid overly playful illustration styles.
- **Dashboard layout:** Card-based grid, top summary strip (risk score + key
  alerts), charts below, report history at the bottom.
- **Chat (What-If) UI:** Minimal chat bubble interface, assistant messages
  visually distinct (light blue background), disclaimers styled subtly under
  each AI response.

---

## 6. Folder Structure (Monorepo suggestion)

```
medx/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/ (Login, Signup, Dashboard, Upload, WhatIf)
│   │   ├── hooks/
│   │   ├── api/              # axios instances
│   │   └── context/          # auth context
│   └── package.json
│
├── server/                  # Node/Express backend
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── models/           # Mongoose schemas
│   │   ├── middleware/       # auth, error handling
│   │   ├── services/         # ocrService, mlService (calls FastAPI), llmService
│   │   └── config/           # passport.js, db.js
│   └── package.json
│
├── ml_service/               # FastAPI ML microservice
│   └── (structure detailed in section 4.2)
│
├── docker-compose.yml
└── README.md
```

---

## 7. Environment Variables (indicative)

**server/.env**
```
PORT=5000
MONGO_URI=
JWT_SECRET=
JWT_REFRESH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
ML_SERVICE_URL=http://localhost:8000
LLM_API_KEY=
CLOUDINARY_URL= (or AWS_S3 credentials)
```

**ml_service/.env**
```
MODEL_PATH=./models/disease_model.pkl
LOG_LEVEL=info
```

---

## 8. Suggested Build Order (Milestones)

1. **M1 — Auth module**: signup/login, Google OAuth, JWT middleware, protected routes.
2. **M2 — Report ingestion**: manual entry form + upload with OCR parsing → structured JSON.
3. **M3 — FastAPI ML service**: rule-based flagging first (fast win), then train/integrate disease-risk model, then risk scoring.
4. **M4 — Node ↔ FastAPI integration**: `/analyze` call wired into report submission flow, results persisted.
5. **M5 — Dashboard**: summary cards, trend charts, report history.
6. **M6 — What-If LLM feature**: context assembly, Claude API integration, chat UI.
7. **M7 — Polish**: UI styling pass (white/medical theme), error handling, loading states, responsive design.

---

## 9. Key Design Decisions & Rationale

- **Separate FastAPI service instead of a Node ML library:** Python has the
  mature ML/data-science ecosystem (scikit-learn, pandas, model training
  tooling); isolating it also lets the ML service be scaled, retrained, and
  redeployed independently of the web app.
- **Rule-based flagging + ML risk model, not ML-only:** Reference-range flagging
  is deterministic and instantly explainable to users/doctors; the ML layer adds
  predictive value (disease risk, composite scoring) on top rather than
  replacing transparent logic.
- **LLM only for interpretation/Q&A, not for raw prediction:** The LLM never
  computes risk scores itself — it receives already-computed structured ML
  output and explains/reasons over it. This keeps predictions consistent,
  auditable, and not hallucination-prone.
- **JWT + httpOnly cookies over localStorage:** Reduces XSS token theft risk.

---

## 10. Open Items / Future Enhancements

- Doctor/clinician view (share report + AI summary with a physician).
- Notification system for critical flags.
- Wearable integration (steps, heart rate) to feed real lifestyle data into
  the What-If feature instead of hypothetical-only reasoning.
- Multi-language support for reports and LLM responses.
- Model retraining pipeline + versioning/monitoring dashboard.
