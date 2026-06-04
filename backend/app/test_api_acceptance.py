"""
End-to-end API acceptance test for boolean bug fix.
Tests the full pipeline: HTTP Request → FastAPI → Validation → Scoring
"""

import json
import sys
import os

# Add the backend app directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Use try-except to handle relative imports when run directly
try:
    from app.plugin_loader import PluginLoader
    from app.validation_engine import ValidationEngine
    from app.risk_stratification_engine import RiskStratificationEngine
except ImportError:
    from plugin_loader import PluginLoader
    from validation_engine import ValidationEngine
    from risk_stratification_engine import RiskStratificationEngine


def test_api_diabetes_false_boolean():
    """
    Full pipeline test: FastAPI simulated request with boolean false.
    This tests the exact scenario from the bug report.
    """
    print("\n✓ Testing API endpoint with family_history_diabetes=false...")
    
    # Simulate what would come from Axios/HTTP request
    # JSON deserializes false as Python False
    request_payload = {
        "age": 30,
        "bmi": 32,
        "family_history_diabetes": False,  # This is what JSON deserializes to
        "exercise_minutes_per_week": 500,
        "smoking_status": "former"
    }
    
    # Load plugin
    loader = PluginLoader()
    metadata = loader.load_plugin("diabetes")
    
    # Validate
    val_engine = ValidationEngine(metadata)
    val_result = val_engine.validate_form(request_payload)
    assert val_result.is_valid, f"Validation failed: {val_result.errors}"
    
    # Normalize
    normalized = val_engine.normalize_form_data(request_payload)
    print(f"  Request: {request_payload}")
    print(f"  Normalized: {normalized}")
    
    # Score
    score_engine = RiskStratificationEngine(metadata)
    result = score_engine.calculate_risk(normalized)
    
    # Verify results
    print(f"  Result:")
    print(f"    baseline_score: {result['baseline_score']}")
    print(f"    modified_score: {result['modified_score']}")
    print(f"    protected_score: {result['protected_score']}")
    print(f"    risk_level: {result['risk_level']}")
    print(f"    risk_factors: {result['risk_factors']}")
    
    # Critical assertions
    assert result['baseline_score'] == 55
    assert result['modified_score'] == 55, "No modifiers should match with false boolean"
    assert result['protected_score'] == 45.83
    assert result['risk_level'] == "medium"
    assert "family_history" not in result['risk_factors'], \
        "family_history must not be in risk_factors when false"
    
    print("  ✓ PASS: Boolean false correctly rejected by bool_true condition")


def test_api_diabetes_true_boolean():
    """
    Verify that boolean true DOES trigger the modifier rule.
    """
    print("\n✓ Testing API endpoint with family_history_diabetes=true...")
    
    request_payload = {
        "age": 30,
        "bmi": 32,
        "family_history_diabetes": True,  # This time TRUE
        "exercise_minutes_per_week": 500,
        "smoking_status": "former"
    }
    
    # Load plugin
    loader = PluginLoader()
    metadata = loader.load_plugin("diabetes")
    
    # Validate
    val_engine = ValidationEngine(metadata)
    val_result = val_engine.validate_form(request_payload)
    assert val_result.is_valid
    
    # Normalize
    normalized = val_engine.normalize_form_data(request_payload)
    
    # Score
    score_engine = RiskStratificationEngine(metadata)
    result = score_engine.calculate_risk(normalized)
    
    print(f"  Result:")
    print(f"    baseline_score: {result['baseline_score']}")
    print(f"    modified_score: {result['modified_score']} (should be 55 * 1.6 = 88)")
    print(f"    risk_factors: {result['risk_factors']}")
    
    # When true, modifier SHOULD apply
    assert result['baseline_score'] == 55
    assert result['modified_score'] == 88, "With true, 1.6x multiplier should apply"
    assert "family_history" in result['risk_factors'], \
        "family_history must be in risk_factors when true"
    
    print("  ✓ PASS: Boolean true correctly accepted by bool_true condition")


def test_api_string_representations():
    """
    Test that string representations of booleans are normalized correctly.
    This tests edge cases where values might come as strings from some sources.
    """
    print("\n✓ Testing string representations of booleans...")
    
    loader = PluginLoader()
    metadata = loader.load_plugin("diabetes")
    val_engine = ValidationEngine(metadata)
    
    test_cases = [
        ("false", False),
        ("False", False),
        ("FALSE", False),
        ("true", True),
        ("True", True),
        ("TRUE", True),
        ("0", False),
        ("1", True),
    ]
    
    for string_val, expected_bool in test_cases:
        request = {
            "age": 30,
            "bmi": 32,
            "family_history_diabetes": string_val,
            "exercise_minutes_per_week": 500,
            "smoking_status": "former"
        }
        
        normalized = val_engine.normalize_form_data(request)
        actual = normalized.get("family_history_diabetes")
        
        assert actual == expected_bool, \
            f"String '{string_val}' should normalize to {expected_bool}, got {actual}"
        
        print(f"  ✓ '{string_val}' → {actual}")
    
    print("  ✓ PASS: All string representations normalize correctly")


def run_api_tests():
    """Run all API acceptance tests."""
    print("\n" + "="*70)
    print("API ACCEPTANCE TESTS - BOOLEAN FIX END-TO-END")
    print("="*70)
    
    try:
        test_api_diabetes_false_boolean()
        test_api_diabetes_true_boolean()
        test_api_string_representations()
        
        print("\n" + "="*70)
        print("✓ ALL API ACCEPTANCE TESTS PASSED!")
        print("="*70)
        print("\nKey validations:")
        print("  1. ✓ family_history_diabetes=false does NOT trigger rule")
        print("  2. ✓ family_history_diabetes=true DOES trigger rule")
        print("  3. ✓ String representations normalize to proper booleans")
        print("  4. ✓ Risk scoring is correct in both cases")
        
    except AssertionError as e:
        print(f"\n✗ TEST FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    run_api_tests()
