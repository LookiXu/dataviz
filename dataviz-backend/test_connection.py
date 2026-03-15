import requests
import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

def test_server():
    print("\n" + "="*60)
    print("测试 FastAPI 服务器连接")
    print("="*60)
    try:
        response = requests.get('http://localhost:8000/health', timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 服务器状态: {data['status']}")
            print(f"✅ 消息: {data['message']}")
            print(f"✅ API文档: http://localhost:8000/docs")
            return True
        else:
            print(f"❌ 服务器响应异常: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 服务器连接失败: {e}")
        return False

def test_database():
    print("\n" + "="*60)
    print("测试 PostgreSQL 数据库连接")
    print("="*60)
    try:
        conn = psycopg2.connect(os.getenv('DATABASE_URL'))
        cur = conn.cursor()
        
        # 获取数据库版本
        cur.execute("SELECT version();")
        version = cur.fetchone()[0]
        print(f"✅ 数据库版本: {version}")
        
        # 获取表数量
        cur.execute("""
            SELECT COUNT(*) 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        table_count = cur.fetchone()[0]
        print(f"✅ 数据表数量: {table_count}")
        
        # 获取各表记录数
        cur.execute("SELECT COUNT(*) FROM live_records")
        live_count = cur.fetchone()[0]
        print(f"✅ 直播记录数: {live_count}")
        
        cur.execute("SELECT COUNT(*) FROM course_feedbacks")
        course_count = cur.fetchone()[0]
        print(f"✅ 课程反馈数: {course_count}")
        
        cur.close()
        conn.close()
        return True
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        return False

def test_api_endpoints():
    print("\n" + "="*60)
    print("测试核心 API 接口")
    print("="*60)
    
    endpoints = [
        ("/api/metadata", "获取元数据"),
        ("/api/analysis/live_dashboard", "获取直播数据"),
        ("/api/dashboard/course", "获取课程数据")
    ]
    
    success_count = 0
    for endpoint, desc in endpoints:
        try:
            response = requests.get(f"http://localhost:8000{endpoint}", timeout=5)
            if response.status_code == 200:
                print(f"✅ {desc}: {endpoint}")
                success_count += 1
            else:
                print(f"❌ {desc}: {endpoint} (状态码: {response.status_code})")
        except Exception as e:
            print(f"❌ {desc}: {endpoint} (错误: {e})")
    
    return success_count == len(endpoints)

def main():
    print("\n" + "🚀 "*30)
    print("DataVizPro 连接测试工具")
    print("🚀 "*30)
    
    results = {
        "服务器": test_server(),
        "数据库": test_database(),
        "API接口": test_api_endpoints()
    }
    
    print("\n" + "="*60)
    print("测试结果汇总")
    print("="*60)
    
    all_success = True
    for name, success in results.items():
        status = "✅ 正常" if success else "❌ 异常"
        print(f"{name}: {status}")
        if not success:
            all_success = False
    
    print("\n" + "="*60)
    if all_success:
        print("🎉 所有连接测试通过！系统运行正常。")
        print("\n📖 查看完整文档:")
        print("  - API文档: http://localhost:8000/docs")
        print("  - 连接指南: CONNECTION_GUIDE.md")
        print("  - 接口文档: API_DOCUMENTATION.md")
    else:
        print("⚠️  部分连接测试失败，请检查配置。")
        print("\n💡 故障排查:")
        print("  1. 检查 .env 文件配置")
        print("  2. 确认 PostgreSQL 服务运行")
        print("  3. 查看连接指南: CONNECTION_GUIDE.md")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
