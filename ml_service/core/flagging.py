import re
from typing import Dict, Any

def parse_ref_range(ref_str: str):
    """
    Parses common reference range formats:
    - "13-17" or "13.5 - 17.5"
    - "<100" or "<= 100"
    - ">40" or ">= 40"
    Returns (min_val, max_val) which can be float or None.
    """
    if not ref_str:
        return None, None
    
    ref_str = ref_str.strip()
    
    # Check for <= or <
    match_less = re.match(r'^(<=|<)\s*([\d\.]+)', ref_str)
    if match_less:
        val = float(match_less.group(2))
        return None, val
        
    # Check for >= or >
    match_greater = re.match(r'^(>=|>)\s*([\d\.]+)', ref_str)
    if match_greater:
        val = float(match_greater.group(2))
        return val, None
        
    # Check for range: e.g. "70-100" or "70 - 100"
    match_range = re.match(r'^([\d\.]+)\s*-\s*([\d\.]+)', ref_str)
    if match_range:
        low = float(match_range.group(1))
        high = float(match_range.group(2))
        return low, high
        
    return None, None

def flag_parameter(val: float, ref_str: str) -> str:
    """
    Flags a parameter based on its value and reference range string.
    Returns: 'low', 'normal', 'high', 'critical' (if extremely off) or 'normal' as fallback.
    """
    low, high = parse_ref_range(ref_str)
    
    if low is not None and high is not None:
        if val < low:
            # Check critical low (e.g. 30% below lower bound)
            if val < low * 0.7:
                return "critical_low"
            return "low"
        elif val > high:
            # Check critical high (e.g. 40% above upper bound)
            if val > high * 1.4:
                return "critical_high"
            return "high"
        return "normal"
        
    if low is not None:  # Value should be > low (e.g. HDL > 40)
        if val < low:
            if val < low * 0.7:
                return "critical_low"
            return "low"
        return "normal"
        
    if high is not None:  # Value should be < high (e.g. Cholesterol < 200)
        if val > high:
            if val > high * 1.4:
                return "critical_high"
            return "high"
        return "normal"
        
    return "normal"

def analyze_flags(parameters: Dict[str, Any]) -> Dict[str, str]:
    flags = {}
    for param_name, param_data in parameters.items():
        val = param_data.get("value")
        ref_range = param_data.get("ref_range")
        if val is not None and ref_range:
            flags[param_name] = flag_parameter(val, ref_range)
        else:
            flags[param_name] = "normal"
    return flags
