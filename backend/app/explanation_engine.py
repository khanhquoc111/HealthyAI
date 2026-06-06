# backend/app/explanation_engine.py
"""
ExplanationEngine - UPGRADED VERSION
Tạo giải thích chi tiết, dễ hiểu về kết quả đánh giá rủi ro
"""

from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)


class ExplanationEngine:
    """
    Engine để tạo giải thích chi tiết về kết quả rủi ro
    """
    
    def __init__(self, plugin_metadata: Dict[str, Any], risk_result: Dict[str, Any]):
        """
        Args:
            plugin_metadata: Metadata của disease plugin
            risk_result: Kết quả từ RiskStratificationEngine
        """
        self.plugin_metadata = plugin_metadata
        self.risk_result = risk_result
        self.disease_info = plugin_metadata.get("disease_info", {})
        self.explanations = plugin_metadata.get("explanations", {})
    
    def generate_explanation(self) -> Dict[str, Any]:
        """
        Tạo giải thích toàn diện về kết quả đánh giá rủi ro
        
        Returns:
            {
                "summary": "...",
                "risk_level_explanation": "...",
                "score_breakdown": "...",
                "primary_factors": [...],
                "protective_factors": [...],
                "next_steps": [...],
                "severity": "..."
            }
        """
        
        final_score = self.risk_result.get("final_score", 0)
        risk_level = self.risk_result.get("risk_level", "unknown")
        risk_percentile = self.risk_result.get("risk_percentile", 50)
        
        return {
            "summary": self._generate_summary(),
            "risk_level_explanation": self._explain_risk_level(risk_level),
            "score_breakdown": self._explain_score_breakdown(final_score),
            "score_interpretation": self._interpret_score(final_score, risk_percentile),
            "primary_factors": self._list_primary_factors(),
            "protective_factors": self._list_protective_factors(),
            "action_items": self._generate_action_items(),
            "next_steps": self._generate_next_steps(),
            "clinical_notes": self._generate_clinical_notes(),
            "severity_rating": self._rate_severity(final_score, risk_level)
        }
    
    def _generate_summary(self) -> str:
        """
        [NEW] Tạo tóm tắt một dòng về kết quả
        """
        final_score = self.risk_result.get("final_score", 0)
        risk_level = self.risk_result.get("risk_level", "medium")
        baseline_stage = self.risk_result.get("baseline_stage", "unknown")
        
        disease_name = self.disease_info.get("name", "bệnh")
        
        if risk_level == "high":
            return f"Bạn có nguy cơ CAO mắc {disease_name} (điểm: {final_score}). Cần có sự can thiệp tích cực."
        elif risk_level == "medium":
            return f"Bạn có nguy cơ TRUNG BÌNH mắc {disease_name} (điểm: {final_score}). Cần chú ý theo dõi."
        else:
            return f"Bạn có nguy cơ THẤP mắc {disease_name} (điểm: {final_score}). Tiếp tục duy trì lối sống lành mạnh."
    
    def _explain_risk_level(self, risk_level: str) -> str:
        """
        [NEW] Giải thích chi tiết mức độ rủi ro
        """
        explanations = self.explanations.get("risk_levels", {})
        
        if risk_level in explanations:
            return explanations[risk_level]
        
        # Default explanations
        default_explanations = {
            "low": "Nguy cơ mắc bệnh của bạn được đánh giá là thấp. Tuy nhiên, vẫn cần duy trì lối sống lành mạnh và theo dõi định kỳ.",
            "medium": "Nguy cơ mắc bệnh của bạn được đánh giá là trung bình. Bạn nên thay đổi lối sống và có thể cần tư vấn y tế.",
            "high": "Nguy cơ mắc bệnh của bạn được đánh giá là cao. Bạn cần nên liên hệ với bác sĩ để tư vấn và kiểm tra sớm."
        }
        
        return default_explanations.get(risk_level, "Không rõ mức độ rủi ro")
    
    def _explain_score_breakdown(self, final_score: float) -> str:
        """
        [NEW] Giải thích cách tính điểm
        """
        baseline_score = self.risk_result.get("baseline_score", 0)
        modifiers_effect = self.risk_result.get("modifiers_effect", 0)
        protective_effect = self.risk_result.get("protective_effect", 0)
        interaction_multiplier = self.risk_result.get("interaction_multiplier", 1.0)
        
        explanation = f"""
        Điểm của bạn được tính như sau:
        
        1. Điểm cơ bản: {baseline_score:.1f}
           - Dựa trên các thông số sức khỏe hiện tại của bạn
        
        2. Yếu tố tăng rủi ro: +{modifiers_effect:.1f}
           - Tính toán từ các yếu tố nguy hiểm được phát hiện
        
        3. Yếu tố bảo vệ: {protective_effect:.1f}
           - Những yếu tố giúp giảm nguy cơ
        
        4. Tác động kết hợp: ×{interaction_multiplier:.2f}
           - Sự tương tác giữa các yếu tố
        
        Điểm cuối cùng: {final_score:.1f} (trên thang 0-100)
        """
        
        return explanation.strip()
    
    def _interpret_score(self, score: float, percentile: int) -> Dict[str, Any]:
        """
        [NEW] Diễn giải ý nghĩa của điểm
        """
        return {
            "absolute_score": f"Điểm tuyệt đối: {score}/100",
            "percentile_rank": f"Xếp hạng phần trăm: {percentile}% (bạn cao hơn {percentile}% dân số)",
            "interpretation": self._get_score_interpretation(score, percentile)
        }
    
    def _get_score_interpretation(self, score: float, percentile: int) -> str:
        """Diễn giải ý nghĩa điểm"""
        if percentile < 10:
            return "Bạn nằm trong nhóm có rủi ro thấp nhất"
        elif percentile < 25:
            return "Bạn nằm trong nhóm có rủi ro thấp"
        elif percentile < 50:
            return "Bạn nằm trong nhóm có rủi ro dưới trung bình"
        elif percentile < 75:
            return "Bạn nằm trong nhóm có rủi ro trên trung bình"
        elif percentile < 90:
            return "Bạn nằm trong nhóm có rủi ro cao"
        else:
            return "Bạn nằm trong nhóm có rủi ro cao nhất"
    
    def _list_primary_factors(self) -> List[Dict[str, Any]]:
        """
        [NEW] Liệt kê các yếu tố chính tăng rủi ro
        """
        modifiers = self.risk_result.get("breakdown", {}).get("applied_modifiers", [])
        
        # Sort by effect (impact giảm)
        sorted_modifiers = sorted(
            modifiers,
            key=lambda x: abs(x.get("effect_on_score", 0)),
            reverse=True
        )
        
        factors = []
        for modifier in sorted_modifiers[:5]:  # Top 5
            factors.append({
                "name": modifier.get("description", ""),
                "impact": f"+{modifier.get('effect_on_score', 0):.1f}",
                "explanation": self._get_factor_explanation(modifier.get("id", ""))
            })
        
        return factors
    
    def _list_protective_factors(self) -> List[Dict[str, Any]]:
        """
        [NEW] Liệt kê các yếu tố bảo vệ (giảm rủi ro)
        """
        protective = self.risk_result.get("breakdown", {}).get("applied_protective", [])
        
        if not protective:
            return []
        
        factors = []
        for prot in protective:
            factors.append({
                "name": prot.get("description", ""),
                "benefit": f"{prot.get('effect_on_score', 0):.1f}",
                "explanation": self._get_factor_explanation(prot.get("id", ""))
            })
        
        return factors
    
    def _get_factor_explanation(self, factor_id: str) -> str:
        """
        [NEW] Lấy giải thích của một yếu tố
        """
        factor_explanations = self.explanations.get("factor_explanations", {})
        
        return factor_explanations.get(
            factor_id,
            "Yếu tố này ảnh hưởng đến nguy cơ mắc bệnh"
        )
    
    def _generate_action_items(self) -> List[Dict[str, Any]]:
        """
        [NEW] Tạo danh sách hành động cụ thể
        """
        risk_level = self.risk_result.get("risk_level", "medium")
        active_factors = self.risk_result.get("breakdown", {}).get("applied_modifiers", [])
        
        action_items = []
        
        # Thêm actions dựa trên risk level
        if risk_level == "high":
            action_items.append({
                "priority": "URGENT",
                "action": "Liên hệ với bác sĩ để kiểm tra sớm",
                "timeline": "Trong 1-2 tuần"
            })
        
        # Thêm actions dựa trên active factors
        for factor in active_factors[:3]:  # Top 3 factors
            actions = self.explanations.get("recommended_actions", {}).get(
                factor.get("id", ""),
                None
            )
            
            if actions:
                action_items.append({
                    "factor": factor.get("description", ""),
                    "action": actions.get("action", ""),
                    "timeline": actions.get("timeline", "")
                })
        
        return action_items
    
    def _generate_next_steps(self) -> List[str]:
        """
        [NEW] Tạo danh sách bước tiếp theo
        """
        risk_level = self.risk_result.get("risk_level", "medium")
        
        next_steps = []
        
        if risk_level == "high":
            next_steps = [
                "1. Đặt lịch tái khám với bác sĩ chuyên khoa",
                "2. Chuẩn bị danh sách câu hỏi để hỏi bác sĩ",
                "3. Xem xét việc theo dõi sức khỏe thường xuyên",
                "4. Thảo luận về các lựa chọn điều trị"
            ]
        elif risk_level == "medium":
            next_steps = [
                "1. Tái đánh giá nguy cơ trong 3-6 tháng",
                "2. Thực hiện các thay đổi lối sống được khuyến cáo",
                "3. Theo dõi các chỉ số sức khỏe chính",
                "4. Tư vấn với bác sĩ nếu có triệu chứng"
            ]
        else:
            next_steps = [
                "1. Duy trì lối sống lành mạnh hiện tại",
                "2. Tái đánh giá nguy cơ hàng năm",
                "3. Tiếp tục theo dõi các chỉ số sức khỏe",
                "4. Chia sẻ kinh nghiệm với gia đình"
            ]
        
        return next_steps
    
    def _generate_clinical_notes(self) -> Optional[str]:
        """
        [NEW] Tạo các ghi chú lâm sàng bổ sung (nếu có)
        """
        evidence_score = self.risk_result.get("evidence_score", 100)
        confidence = "cao" if evidence_score > 80 else "trung bình" if evidence_score > 60 else "thấp"
        
        notes = f"""
        GHI CHÚ LÂM SÀNG:
        - Độ tin cậy của kết quả: {confidence} ({evidence_score:.1f}%)
        - Mức độ hoàn chỉnh dữ liệu: {evidence_score:.1f}%
        - Kết quả này dựa trên các chỉ số hiện tại và không thay thế tư vấn y tế chuyên nghiệp
        """
        
        return notes.strip()
    
    def _rate_severity(self, score: float, risk_level: str) -> Dict[str, Any]:
        """
        [NEW] Đánh giá mức độ nghiêm trọng
        """
        
        if risk_level == "high":
            severity = {
                "level": "CAO",
                "color": "red",
                "icon": "🔴",
                "recommendation": "CẦN CAN THIỆP Y TẾ"
            }
        elif risk_level == "medium":
            severity = {
                "level": "TRUNG BÌNH",
                "color": "orange",
                "icon": "🟠",
                "recommendation": "CẦN THEO DÕI VÀ THAY ĐỔI LỐI SỐNG"
            }
        else:
            severity = {
                "level": "THẤP",
                "color": "green",
                "icon": "🟢",
                "recommendation": "DUY TRÌ LỐI SỐNG LÀNH MẠNH"
            }
        
        return severity