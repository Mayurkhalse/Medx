from pydantic import BaseModel, Field
from typing import Dict, Optional, Any, List

class ParameterValue(BaseModel):
    value: float
    unit: Optional[str] = None
    ref_range: Optional[str] = None

class ReportAnalysisRequest(BaseModel):
    user_id: str
    report_date: str
    parameters: Dict[str, ParameterValue]
    prior_reports: Optional[List[Dict[str, Any]]] = None

class ReportAnalysisResponse(BaseModel):
    flags: Dict[str, str]
    disease_risks: Dict[str, float]
    overall_risk_score: int
    risk_tier: str
    model_version: str
