import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
# 导入你的数据库配置和模型
from database import engine 
import models 

def init_database():
    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    print(f"🔄 正在尝试连接数据库...")
    print(f"📍 目标地址: {db_url}")
    
    try:
        # 核心建表指令
        models.Base.metadata.create_all(bind=engine)
        print("✅ 建表指令执行完毕！去 PostgreSQL 里输入 \\dt 查看吧！")
    except Exception as e:
        print(f"❌ 致命错误！建表失败，原因如下：\n{e}")

if __name__ == "__main__":
    init_database()