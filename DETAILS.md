# MedX - Implementation Details & Feature Guides

This document provides a detailed breakdown of the architecture, implementation mechanics, and codebase structure for the MedX platform.

---

## 1. System Architecture Overview

MedX is structured as a decoupled monorepo containing three core components:

```
┌────────────────────────────────────────────────────────┐
│                      React Client                      │
│                  (Vite + Tailwind CSS)                 │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ HTTP / REST
                            ▼
┌────────────────────────────────────────────────────────┐
│                 Node.js / Express Server               │
│                  (Port 5000 / Mongoose)                │
└─────────────┬────────────────────────────┬─────────────┘
              │                            │
              │ HTTP / JSON                │ REST / API Key
              ▼                            ▼
┌───────────────────────────┐ ┌──────────────────────────┐
│      FastAPI ML Service   │ │      Google Gemini LLM   │
│     (Port 8000 / Sklearn) │ │       (AI Chat/What-If)  │
└───────────────────────────┘ └──────────────────────────┘
```

1. **Frontend (Client)**: A React Single Page Application (SPA) built using Vite. It communicates exclusively with the Express backend using JSON REST requests.
2. **App Server (Server)**: A Node.js and Express application that manages authentication, user profiles, report records, database state, and integrates with Gemini API for LLM features and FastAPI for ML predictions.
3. **ML Service (ml_service)**: A Python FastAPI microservice that processes blood report parameters to predict disease risk profiles using scikit-learn models and flags abnormal test values.

---

## 2. Component Implementation Details

### 2.1. Authentication Flow
- **Mechanism**: Hybrid JWT-based authentication.
- **Access Tokens**: Short-lived JSON Web Tokens (JWT) signed using `JWT_SECRET`. 
- **Storage**: The token is stored in `localStorage` in the React frontend and sent via the `Authorization: Bearer <token>` header for authenticated requests.
- **Middleware**: The Express server implements a custom authorization verification middleware to secure backend endpoints.

### 2.2. Blood Report Ingestion & Processing
- **Manual Entry**: Users input values for blood report indicators (e.g., Hemoglobin, Fasting Glucose, WBC, Creatinine, Platelets) into a React form.
- **Upload File**: Supported via endpoint routing where files are uploaded, then parsed.
- **Backend Relay**: Once a report payload is received, the Express server forwards the structured data to the FastAPI microservice (`POST /analyze`). The returned ML predictions and flagged values are saved in the `Report` document in MongoDB.

### 2.3. ML Prediction Service (FastAPI)
The FastAPI application handles all numerical analysis and statistical inference.

- **Endpoint**: `POST /analyze` receives raw parameters.
- **Abnormal Flagging (`core/flagging.py`)**: Uses standard clinical reference ranges to tag values as `low`, `normal`, `high`, or `critical`.
- **Risk Scoring (`core/risk_scorer.py`)**: Calculates a composite 0-100 score based on the severity of flags and the probability of predicted risks.

#### ML Pipeline Architecture & Details
The current prediction flow in `core/predictor.py` operates as follows:
1. **Feature Alignment**: On receiving a request, the service extracts five core features: `hemoglobin`, `wbc_count`, `glucose_fasting`, `creatinine`, and `platelets`. If any value is missing, clinical default values are used as fallbacks.
2. **Classifier Design**: The pipeline uses a `MultiOutputClassifier` wrapping a `RandomForestClassifier` from `scikit-learn`. This allows predicting multiple binary risk targets simultaneously:
   - **Anemia**: Predicted from low hemoglobin levels.
   - **Diabetes**: Predicted from elevated fasting glucose levels.
   - **Kidney Dysfunction**: Predicted from high creatinine levels.
   - **Infection**: Predicted from elevated White Blood Cell (WBC) counts.
3. **Synthetic Training Initialization**: If no pre-trained model file (`models/disease_model.joblib`) is found, the service runs a startup script `train_synthetic_model()`.

#### What the Current Pipeline is Doing (Synthetic Generation & Rules)
Before you train on a real dataset, the current model uses the following logic to bootstrap itself on startup:
* **Feature Distributions**:
  - `hemoglobin`: Simulated using a normal distribution ($\mu=14, \sigma=2.5$).
  - `wbc_count`: Simulated using a normal distribution ($\mu=7500, \sigma=3000$).
  - `glucose_fasting`: Simulated using a normal distribution ($\mu=95, \sigma=30$).
  - `creatinine`: Simulated using a normal distribution ($\mu=0.9, \sigma=0.4$).
  - `platelets`: Simulated using a normal distribution ($\mu=300000, \sigma=80000$).
* **Clinical Correlation Rules (Labels)**:
  - **Anemia** label is set to `1` (positive) if `hemoglobin < 12.0`, else `0`.
  - **Diabetes** label is set to `1` (positive) if `glucose_fasting > 125.0`, else `0`.
  - **Kidney Dysfunction** label is set to `1` (positive) if `creatinine > 1.2`, else `0`.
  - **Infection** label is set to `1` (positive) if `wbc_count > 11000.0`, else `0`.

The random forest model then trains on these rules over the 1,000 generated samples. Consequently, the model mimics these clinical logic thresholds when predicting probabilities for unseen reports.

---

## 2.4. Transitioning to Real Blood Test Datasets

To replace the synthetic data model with a model trained on real-world blood test records (e.g., from public health datasets like **NHANES**, clinical research repositories like **MIMIC-IV**, or internal laboratory databases), follow this roadmap:

### Step 1: Prepare the Dataset
Collect historical patient blood reports and store them in a structured format (e.g., a CSV file `blood_data.csv`).
- **Features (Columns)**: `hemoglobin`, `wbc_count`, `glucose_fasting`, `creatinine`, `platelets` (along with optional demographic indicators like `age`, `gender`, `bmi` if desired).
- **Target Labels (Columns)**: Binary variables (0 or 1) representing clinical diagnoses: `anemia`, `diabetes`, `kidney_dysfunction`, `infection`.

### Step 2: Implement a Training Pipeline
Create an offline training script (e.g., `train_real_model.py`) to process the data and output the serialized model:

```python
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.multioutput import MultiOutputClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
import joblib

# 1. Load your real dataset
df = pd.read_csv("blood_data.csv")

# 2. Separate features (X) and multi-labels (y)
feature_cols = ["hemoglobin", "wbc_count", "glucose_fasting", "creatinine", "platelets"]
target_cols = ["anemia", "diabetes", "kidney_dysfunction", "infection"]

X = df[feature_cols]
y = df[target_cols]

# 3. Handle missing values and scale features
preprocessor = Pipeline([
    ('imputer', SimpleImputer(strategy='median')), # Real clinical data often has missing entries
    ('scaler', StandardScaler())
])

X_processed = preprocessor.fit_transform(X)

# 4. Train/Test Split
X_train, X_test, y_train, y_test = train_test_split(X_processed, y, test_size=0.2, random_state=42)

# 5. Fit the Classifier
forest = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')
model = MultiOutputClassifier(forest)
model.fit(X_train, y_train)

# 6. Save the model & preprocessing pipeline
# You can pack both together in a single pipeline object or serialize them separately
# Make sure to overwrite the existing artifact
joblib.dump(model, "models/disease_model.joblib")
print("Real model trained and saved successfully.")
```

### Step 3: Integrate Preprocessing into the FastAPI Server
If your training script uses feature scalers or imputers (e.g., `StandardScaler`), modify `core/predictor.py` to load and apply these transformations prior to calling `model.predict_proba(df)`:

```python
# In core/predictor.py:
# Load the scaler alongside the model
scaler = joblib.load(SCALER_PATH)

def predict_risks(parameters: Dict[str, Any]) -> Dict[str, float]:
    # ... extract features into df ...
    
    # Apply the same scaling pipeline used during training
    scaled_features = scaler.transform(df)
    
    # Run prediction
    prob_list = model.predict_proba(scaled_features)
    # ... construct and return probabilities dictionary ...
```

### Step 4: Handle Class Imbalance
Real-world clinical datasets are frequently imbalanced (far fewer positive disease targets than negative controls). Apply these optimization strategies:
- Use `class_weight='balanced'` in your `RandomForestClassifier`.
- Employ resampling techniques (such as **SMOTE** from the `imblearn` library) on your training split before fitting the model.


### 2.5. What-If Assistant (LLM Integration)
- **Integration**: Communicates with the Google Gemini API.
- **Context Construction**: When a user asks a question, the Express server retrieves their latest blood report values, flagged abnormalities, risk tiers, and baseline profile (such as age/gender).
- **Prompt Design**: A system prompt instructs the Gemini model to behave as an expert healthcare interpreter. It answers lifestyle modification queries while generating medically appropriate disclaimers.
- **Conversation State**: Messages are saved sequentially in the `ChatHistory` schema under a unique `sessionId` to retain context.

---

## 3. Database Schema

The MongoDB databases are mapped using Mongoose ODM schemas:

### User Schema (`server/src/models/User.js`)
```javascript
{
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  dob: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  createdAt: { type: Date, default: Date.now }
}
```

### Report Schema (Express backend model)
Stores raw input parameters, flagging outputs, and ML risk evaluations:
```javascript
{
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sourceType: { type: String, enum: ['manual', 'upload'], required: true },
  parameters: { type: Map, of: Object },
  mlResult: {
    flags: { type: Map, of: String },
    diseaseRisks: { type: Map, of: Number },
    overallRiskScore: { type: Number },
    riskTier: { type: String },
    modelVersion: { type: String }
  },
  reportDate: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
}
```

### ChatHistory Schema (Express backend model)
```javascript
{
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionId: { type: String, required: true },
  messages: [{
    role: { type: String, enum: ['user', 'model', 'system'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
}
```

---

## 4. Run & Setup Instructions (Local Only)

Since Docker has been removed, follow these steps to run all components natively on your system:

### 4.1. Prerequisites
- **Node.js**: Ensure Node.js (version 18+) is installed.
- **Python**: Ensure Python (version 3.10+) is installed.
- **MongoDB**: Ensure MongoDB is running locally at `mongodb://localhost:27017` or use a MongoDB Atlas URI.

### 4.2. Configuration
Create a `.env` file under the `/server` directory:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/medx
JWT_SECRET=supersecretjwtsecretkey123!
JWT_REFRESH_SECRET=supersecretrefreshjwtsecretkey123!
ML_SERVICE_URL=http://localhost:8000
LLM_API_KEY=your_gemini_api_key
```

### 4.3. Step-by-Step Execution

1. **Install Node dependencies** for client and server:
   ```bash
   npm run install:all
   ```

2. **Setup Python Virtual Environment** and install requirements for the ML service:
   ```bash
   # From root directory
   cd ml_service
   python -m venv venv
   
   # Activate Virtual Environment:
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   
   # Install dependencies
   pip install -r requirements.txt
   cd ..
   ```

3. **Start all services concurrently**:
   Ensure your Python virtual environment is active or Python is in path, and run the following in the root directory:
   ```bash
   npm run dev
   ```

4. **Verify Port Mappings**:
   - **Frontend Client**: Runs on [http://localhost:5173/](http://localhost:5173/)
   - **Express Server**: Runs on [http://localhost:5000](http://localhost:5000)
   - **FastAPI ML Service**: Runs on [http://localhost:8000](http://localhost:8000)
