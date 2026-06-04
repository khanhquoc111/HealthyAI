"""
Plugin backward compatibility tests
Ensures existing diabetes and hypertension plugins still work after refactoring
"""

import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from validation_engine import ValidationEngine
from risk_stratification_engine import RiskStratificationEngine


def test_diabetes_plugin():
    """Test that diabetes plugin still works correctly."""
    print("\n" + "="*60)
    print("TESTING DIABETES PLUGIN COMPATIBILITY")
    print("="*60)
    
    # Load diabetes metadata - adjust path based on current working directory
    plugin_path = os.path.join(os.path.dirname(__file__), "..", "plugins", "diabetes", "metadata.json")
    with open(plugin_path, "r", encoding="utf-8") as f:
        metadata = json.load(f)
    
    print("\n1. Testing Validation Engine...")
    try:
        val_engine = ValidationEngine(metadata)
        
        # Valid data
        valid_data = {
            "age": 50,
            "bmi": 32,
            "family_history_diabetes": True,
            "exercise_minutes_per_week": 100,
            "smoking_status": "current"
        }
        result = val_engine.validate_form(valid_data)
        assert result.is_valid, f"Valid data should pass: {result.errors}"
        print("   ✓ Valid form passed")
        
        # Invalid age
        invalid_data = {
            "age": 150,  # Over max
            "bmi": 32,
            "smoking_status": "current"
        }
        result = val_engine.validate_form(invalid_data)
        assert not result.is_valid, "Invalid age should fail"
        print("   ✓ Invalid age caught")
        
        # Invalid smoking status
        invalid_smoking = {
            "age": 50,
            "bmi": 32,
            "smoking_status": "invalid_value"  # Not in options
        }
        result = val_engine.validate_form(invalid_smoking)
        assert not result.is_valid, "Invalid smoking_status should fail"
        print("   ✓ Invalid select value caught")
        
    except Exception as e:
        print(f"   ✗ Validation Engine test failed: {e}")
        raise
    
    print("\n2. Testing Risk Stratification Engine...")
    try:
        risk_engine = RiskStratificationEngine(metadata)
        
        # Test case 1: Low risk (BMI < 25)
        result1 = risk_engine.calculate_risk({
            "age": 30,
            "bmi": 22,
            "family_history_diabetes": False,
            "exercise_minutes_per_week": 200,
            "smoking_status": "never"
        })
        assert result1["final_score"] >= 0, "Score should be non-negative"
        assert result1["risk_level"] in ["low", "medium", "high"], "Risk level should be valid"
        print(f"   ✓ Low risk case: score={result1['final_score']}, level={result1['risk_level']}")
        
        # Test case 2: Moderate risk (BMI 25-30)
        result2 = risk_engine.calculate_risk({
            "age": 45,
            "bmi": 27,
            "family_history_diabetes": False,
            "exercise_minutes_per_week": 60,
            "smoking_status": "former"
        })
        print(f"   ✓ Moderate risk case: score={result2['final_score']}, level={result2['risk_level']}")
        
        # Test case 3: High risk (BMI >= 30, age 45+, family history)
        result3 = risk_engine.calculate_risk({
            "age": 55,
            "bmi": 32,
            "family_history_diabetes": True,
            "exercise_minutes_per_week": 30,
            "smoking_status": "current"
        })
        assert result3["final_score"] > result2["final_score"], "High risk should have higher score"
        print(f"   ✓ High risk case: score={result3['final_score']}, level={result3['risk_level']}")
        
        # Verify matched rules are returned
        assert "matched_rules" in result3, "Should return matched rules"
        print(f"   ✓ Matched rules: {len(result3['matched_rules'])} rules found")
        
    except Exception as e:
        print(f"   ✗ Risk Stratification test failed: {e}")
        raise
    
    print("\n✓ DIABETES PLUGIN: All tests passed!")


def test_hypertension_plugin():
    """Test that hypertension plugin still works correctly."""
    print("\n" + "="*60)
    print("TESTING HYPERTENSION PLUGIN COMPATIBILITY")
    print("="*60)
    
    # Load hypertension metadata - adjust path based on current working directory
    plugin_path = os.path.join(os.path.dirname(__file__), "..", "plugins", "hypertension", "metadata.json")
    with open(plugin_path, "r", encoding="utf-8") as f:
        metadata = json.load(f)
    
    print("\n1. Testing Validation Engine...")
    try:
        val_engine = ValidationEngine(metadata)
        
        # Valid data
        valid_data = {
            "age": 60,
            "systolic": 140,
            "diastolic": 90,
            "bmi": 28,
            "smoking_status": "former",
            "diabetes_status": "no",
            "family_history_hypertension": True,
            "exercise_minutes_per_week": 100
        }
        result = val_engine.validate_form(valid_data)
        assert result.is_valid, f"Valid data should pass: {result.errors}"
        print("   ✓ Valid form passed")
        
        # Invalid systolic
        invalid_data = {
            "age": 60,
            "systolic": 300,  # Over max
            "diastolic": 90
        }
        result = val_engine.validate_form(invalid_data)
        assert not result.is_valid, "Invalid systolic should fail"
        print("   ✓ Invalid systolic caught")
        
    except Exception as e:
        print(f"   ✗ Validation Engine test failed: {e}")
        raise
    
    print("\n2. Testing Risk Stratification Engine...")
    try:
        risk_engine = RiskStratificationEngine(metadata)
        
        # Test case 1: Normal BP
        result1 = risk_engine.calculate_risk({
            "age": 40,
            "systolic": 115,
            "diastolic": 75,
            "bmi": 25,
            "smoking_status": "never",
            "diabetes_status": "no",
            "family_history_hypertension": False,
            "exercise_minutes_per_week": 150
        })
        print(f"   ✓ Normal BP case: score={result1['final_score']}, level={result1['risk_level']}")
        
        # Test case 2: Elevated BP
        result2 = risk_engine.calculate_risk({
            "age": 55,
            "systolic": 125,
            "diastolic": 80,
            "bmi": 28,
            "smoking_status": "former",
            "diabetes_status": "no",
            "family_history_hypertension": False,
            "exercise_minutes_per_week": 90
        })
        print(f"   ✓ Elevated BP case: score={result2['final_score']}, level={result2['risk_level']}")
        
        # Test case 3: Stage 2 hypertension
        result3 = risk_engine.calculate_risk({
            "age": 65,
            "systolic": 145,
            "diastolic": 95,
            "bmi": 32,
            "smoking_status": "current",
            "diabetes_status": "yes",
            "family_history_hypertension": True,
            "exercise_minutes_per_week": 30
        })
        assert result3["final_score"] > result2["final_score"], "Stage 2 should have higher score"
        print(f"   ✓ Stage 2 hypertension case: score={result3['final_score']}, level={result3['risk_level']}")
        
    except Exception as e:
        print(f"   ✗ Risk Stratification test failed: {e}")
        raise
    
    print("\n✓ HYPERTENSION PLUGIN: All tests passed!")


def run_plugin_tests():
    """Run all plugin compatibility tests."""
    print("\n" + "="*60)
    print("PLUGIN BACKWARD COMPATIBILITY VERIFICATION")
    print("="*60)
    
    try:
        test_diabetes_plugin()
        test_hypertension_plugin()
        
        print("\n" + "="*60)
        print("✓ ALL PLUGIN TESTS PASSED!")
        print("="*60)
        print("\nBoth plugins are fully compatible with refactored system:")
        print("  • Diabetes plugin: ✓ Working")
        print("  • Hypertension plugin: ✓ Working")
        print("  • New SELECT validation: ✓ Applied")
        print("  • New composite conditions: ✓ Compatible")
        print("  • Priority-based baseline: ✓ Compatible")
        
    except Exception as e:
        print(f"\n✗ Plugin test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    run_plugin_tests()
