import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any
from sklearn.ensemble import RandomForestClassifier
from sklearn.multioutput import MultiOutputClassifier

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "disease_model.joblib")

DISEASE_KEYS = ["anemia", "diabetes", "kidney_dysfunction", "infection"]
FEATURE_KEYS = ["hemoglobin", "wbc_count", "glucose_fasting", "creatinine", "platelets"]

def train_synthetic_model():
    """Generates synthetic data and trains a RandomForestClassifier model for the diseases."""
    print("Training synthetic ML disease model...")
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    np.random.seed(42)
    n_samples = 1000
    
    # Generate random features
    hemoglobin = np.random.normal(14, 2.5, n_samples)
    wbc_count = np.random.normal(7500, 3000, n_samples)
    glucose_fasting = np.random.normal(95, 30, n_samples)
    creatinine = np.random.normal(0.9, 0.4, n_samples)
    platelets = np.random.normal(300000, 80000, n_samples)
    
    X = pd.DataFrame({
        "hemoglobin": hemoglobin,
        "wbc_count": wbc_count,
        "glucose_fasting": glucose_fasting,
        "creatinine": creatinine,
        "platelets": platelets
    })
    
    # Define labels based on clinical correlations
    # anemia: hemoglobin < 12 (female) or < 13.5 (male)
    y_anemia = (X["hemoglobin"] < 12.0).astype(int)
    # diabetes: glucose > 125
    y_diabetes = (X["glucose_fasting"] > 125.0).astype(int)
    # kidney dysfunction: creatinine > 1.2
    y_kidney = (X["creatinine"] > 1.2).astype(int)
    # infection: wbc_count > 11000
    y_infection = (X["wbc_count"] > 11000.0).astype(int)
    
    y = pd.DataFrame({
        "anemia": y_anemia,
        "diabetes": y_diabetes,
        "kidney_dysfunction": y_kidney,
        "infection": y_infection
    })
    
    # Train multi-output random forest
    forest = RandomForestClassifier(n_estimators=50, random_state=42)
    model = MultiOutputClassifier(forest)
    model.fit(X, y)
    
    joblib.dump(model, MODEL_PATH)
    print(f"Synthetic disease model saved to {MODEL_PATH}")
    return model

def load_model():
    if not os.path.exists(MODEL_PATH):
        return train_synthetic_model()
    try:
        return joblib.load(MODEL_PATH)
    except Exception as e:
        print(f"Error loading model: {e}. Retraining...")
        return train_synthetic_model()

# Load the model on module import
model = load_model()

def predict_risks(parameters: Dict[str, Any]) -> Dict[str, float]:
    """
    Predicts disease risk probabilities for a given set of blood report parameters.
    """
    # Extract features or use defaults if missing
    features = {
        "hemoglobin": 14.0,
        "wbc_count": 7000.0,
        "glucose_fasting": 90.0,
        "creatinine": 0.9,
        "platelets": 250000.0
    }
    
    for key in FEATURE_KEYS:
        if key in parameters:
            val = parameters[key].get("value")
            if val is not None:
                features[key] = float(val)
                
    # Prepare input DataFrame for sklearn (expects columns in exact training order)
    df = pd.DataFrame([features], columns=FEATURE_KEYS)
    
    # Run prediction probabilities
    probabilities = {}
    try:
        # predict_proba returns a list of arrays (one per output class label)
        # each array has shape (n_samples, n_classes) => class 0 prob, class 1 prob
        prob_list = model.predict_proba(df)
        for idx, disease in enumerate(DISEASE_KEYS):
            # prob_list[idx][0] gives probabilities for this specific disease
            disease_prob = prob_list[idx][0]
            # If classes are [0, 1], get index 1
            if len(disease_prob[0]) > 1:
                probabilities[disease] = round(float(disease_prob[0][1]), 2)
            else:
                probabilities[disease] = 0.0
    except Exception as e:
        print(f"Inference error: {e}")
        # Fallback values
        probabilities = {d: 0.1 for d in DISEASE_KEYS}
        
    return probabilities
