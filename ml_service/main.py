from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from schemas.report_schema import ReportAnalysisRequest, ReportAnalysisResponse
from core.flagging import analyze_flags
from core.predictor import predict_risks
from core.risk_scorer import calculate_composite_score
import uvicorn

app = FastAPI(title="MedX ML microservice", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "ml_service"}

@app.post("/analyze", response_model=ReportAnalysisResponse)
def analyze_report(request: ReportAnalysisRequest):
    try:
        # Convert Pydantic request parameters to standard dict for processing
        raw_params = {k: v.model_dump() for k, v in request.parameters.items()}
        
        # 1. Abnormal value flagging
        flags = analyze_flags(raw_params)
        
        # 2. Predict disease risk probabilities using ML
        disease_risks = predict_risks(raw_params)
        
        # 3. Overall Risk Scoring
        overall_score, risk_tier = calculate_composite_score(flags, disease_risks)
        
        return ReportAnalysisResponse(
            flags=flags,
            disease_risks=disease_risks,
            overall_risk_score=overall_score,
            risk_tier=risk_tier,
            model_version="v1.0.0"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ML Analysis failed: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
