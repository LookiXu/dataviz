"""
Flask 应用主入口
"""
from flask import Flask, jsonify
from flask_cors import CORS
import os
import sys

# 添加当前目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import config
from app.api.upload import upload_bp
from app.api.analysis import analysis_bp
from app.api.ai import ai_bp


def create_app(config_name: str = None) -> Flask:
    """
    应用工厂函数
    
    Args:
        config_name: 配置环境名称
        
    Returns:
        Flask: Flask 应用实例
    """
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')
    
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # 配置 CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": [app.config['FRONTEND_URL'], "http://localhost:*"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })
    
    # 注册蓝图
    app.register_blueprint(upload_bp)
    app.register_blueprint(analysis_bp)
    app.register_blueprint(ai_bp)
    
    # 健康检查
    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'healthy',
            'service': 'live-course-analytics-api'
        })
    
    # 错误处理
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'success': False,
            'error': '接口不存在'
        }), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            'success': False,
            'error': '服务器内部错误'
        }), 500
    
    return app


# 创建应用实例
app = create_app()


if __name__ == '__main__':
    port = int(os.getenv('PORT', 8000))  # 服务运行在 8000 端口
    app.run(host='0.0.0.0', port=port, debug=app.config['DEBUG'])
