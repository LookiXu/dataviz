"""
AI 互补推荐 API
基于主播数据调用 LLM 生成互补合作建议
"""
from flask import Blueprint, request, jsonify
import os
import sys

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

ai_bp = Blueprint('ai', __name__, url_prefix='/api/ai')


@ai_bp.route('/recommendation', methods=['POST'])
def generate_recommendation():
    """
    生成主播互补推荐建议
    
    请求参数:
    {
        "hostA": {
            "name": "主播A",
            "scores": [92, 95, 88, 65, 78],  // 专业、节奏、转化、互动、留存
            "strengths": ["专业度高", "节奏稳"],
            "weaknesses": ["互动较少"]
        },
        "hostB": {
            "name": "主播B", 
            "scores": [75, 68, 82, 94, 70],
            "strengths": ["亲和力强", "擅长促单"],
            "weaknesses": ["内容深度不够"]
        }
    }
    
    返回:
    {
        "success": true,
        "recommendation": "建议主播A与主播B组合直播...",
        "expectedImprovement": "预计转化率可提升15%"
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'hostA' not in data or 'hostB' not in data:
            return jsonify({
                'success': False,
                'error': '缺少必需参数: hostA 和 hostB'
            }), 400
        
        host_a = data['hostA']
        host_b = data['hostB']
        
        # 构建提示词
        prompt = f"""你是一位直播运营专家，请基于以下两位主播的能力数据，分析他们的优势互补性，并给出合作建议。

【主播A：{host_a['name']}】
- 五维能力评分（满分100）：
  * 专业度：{host_a['scores'][0]}
  * 节奏感：{host_a['scores'][1]}
  * 转化率：{host_a['scores'][2]}
  * 互动率：{host_a['scores'][3]}
  * 留存率：{host_a['scores'][4]}
- 核心优势：{', '.join(host_a.get('strengths', []))}
- 主要不足：{', '.join(host_a.get('weaknesses', []))}

【主播B：{host_b['name']}】
- 五维能力评分（满分100）：
  * 专业度：{host_b['scores'][0]}
  * 节奏感：{host_b['scores'][1]}
  * 转化率：{host_b['scores'][2]}
  * 互动率：{host_b['scores'][3]}
  * 留存率：{host_b['scores'][4]}
- 核心优势：{', '.join(host_b.get('strengths', []))}
- 主要不足：{', '.join(host_b.get('weaknesses', []))}

请按以下格式输出：

1. 互补分析：分析两位主播的能力互补性（100字以内）

2. 合作建议：具体的直播分工建议（100字以内）

3. 预期效果：量化预期提升效果（如"预计转化率可提升X%"）

输出要求：
- 语言简洁专业
- 重点突出互补价值
- 预期效果要有具体数字"""

        # 检查 SDK 是否可用
        try:
            from coze_coding_dev_sdk import LLMClient, Config
            
            config = Config()
            client = LLMClient(config)
            
            messages = [
                {
                    'role': 'system',
                    'content': '你是一位资深的直播运营专家，擅长分析主播能力模型并给出精准的合作建议。'
                },
                {
                    'role': 'user',
                    'content': prompt
                }
            ]
            
            # 调用 LLM
            response = client.invoke(
                messages,
                {
                    'model': 'doubao-seed-1-6-lite-251015',
                    'temperature': 0.7,
                    'thinking': 'enabled'
                }
            )
            
            ai_content = response.content
            
            # 解析响应，提取预期效果
            expected_improvement = '预计转化率可提升10-15%'
            if '预计' in ai_content and '提升' in ai_content:
                # 尝试提取具体的预期效果
                import re
                match = re.search(r'预计[^。]*?提升[^。]*?\d+%', ai_content)
                if match:
                    expected_improvement = match.group(0)
            
            return jsonify({
                'success': True,
                'recommendation': ai_content,
                'expectedImprovement': expected_improvement
            })
            
        except ImportError:
            # SDK 不可用，返回模拟数据
            return jsonify({
                'success': True,
                'recommendation': f"""建议【{host_a['name']}】与【{host_b['name']}】组合直播

{host_a['name']}负责专业内容输出和节奏把控，发挥其在专业度和节奏感方面的优势；{host_b['name']}负责气氛带动和促单转化，利用其强互动能力和成交技巧。

两人能力高度互补：{host_a['name']}的内容深度可以弥补{host_b['name']}的专业短板，而{host_b['name']}的互动促单能力可以弥补{host_a['name']}的用户 engagement 不足。

建议采用"内容讲解+互动促单"的双主播模式，A主讲B互动，形成良好的直播节奏。""",
                'expectedImprovement': '预计转化率可提升15%',
                'note': '这是模拟数据，实际部署后将调用真实 LLM API'
            })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'生成推荐失败: {str(e)}'
        }), 500
