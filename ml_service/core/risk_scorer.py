from typing import Dict, List, Any

def calculate_composite_score(flags: Dict[str, str], disease_risks: Dict[str, float]) -> tuple[int, str]:
    """
    Calculates a composite score (0-100) and risk tier based on flags and disease risks.
    """
    score = 15.0  # Base score
    
    # Flags weighting
    for param, flag in flags.items():
        if "critical" in flag:
            score += 25.0
        elif flag in ["high", "low"]:
            score += 10.0
            
    # Disease risk weighting: add based on highest risks
    max_risk = max(disease_risks.values()) if disease_risks else 0.0
    score += max_risk * 45.0
    
    # Cap score
    final_score = min(max(int(score), 0), 100)
    
    # Tiers
    if final_score <= 35:
        tier = "Low"
    elif final_score <= 65:
        tier = "Moderate"
    elif final_score <= 85:
        tier = "High"
    else:
        tier = "Critical"
        
    return final_score, tier
