# DataVizPro 服务器与数据库连接指南

## 📊 当前连接状态

### ✅ 服务器状态
- **状态**: 运行中
- **地址**: http://localhost:8000
- **API文档**: http://localhost:8000/docs
- **健康检查**: http://localhost:8000/health

### ✅ 数据库状态
- **数据库类型**: PostgreSQL 16.9
- **主机**: localhost
- **端口**: 5432
- **数据库名**: dataviz_db
- **用户名**: postgres
- **密码**: 123456
- **状态**: 连接正常

### ✅ 数据表
- `live_records` - 直播记录表
- `course_feedbacks` - 课程反馈表
- `ai_summaries` - AI摘要表

---

## 🔧 连接配置

### 1. 数据库连接字符串

**格式:**
```
postgresql://用户名:密码@主机:端口/数据库名
```

**当前配置:**
```
postgresql://postgres:123456@localhost:5432/dataviz_db
```

**配置文件位置:** `.env`

---

## 🚀 启动服务器

### 方法1: 使用 uvicorn（推荐）

```bash
# 开发模式（自动重载）
python3 -m uvicorn main:app --reload

# 生产模式
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### 方法2: 直接运行

```bash
python3 main.py
```

---

## 🗄️ 数据库操作

### 连接数据库

```bash
# 命令行连接
psql -U postgres -h localhost -p 5432 -d dataviz_db

# 查看所有表
\dt

# 查看表结构
\d live_records
\d course_feedbacks

# 退出
\q
```

### 常用SQL查询

```sql
-- 查看直播记录数量
SELECT COUNT(*) FROM live_records;

-- 查看课程反馈数量
SELECT COUNT(*) FROM course_feedbacks;

-- 查看所有主播
SELECT DISTINCT "hostName" FROM live_records;

-- 查看所有课程
SELECT DISTINCT "courseName" FROM course_feedbacks;

-- 查看最新的直播记录
SELECT * FROM live_records ORDER BY "liveDate" DESC LIMIT 10;

-- 查看课程评价统计
SELECT 
    "courseName",
    COUNT(*) as student_count,
    AVG(satisfaction) as avg_satisfaction
FROM course_feedbacks
GROUP BY "courseName";
```

---

## 📡 API 测试

### 1. 健康检查

```bash
curl http://localhost:8000/health
```

**返回:**
```json
{
  "status": "ok",
  "message": "DataVizPro Backend Foundation is solid"
}
```

### 2. 获取主播列表

```bash
curl http://localhost:8000/api/metadata
```

### 3. 获取直播数据

```bash
curl http://localhost:8000/api/analysis/live_dashboard
```

### 4. 上传文件

```bash
curl -X POST http://localhost:8000/api/upload \
  -F "file=@直播数据.xlsx" \
  -F "upload_type=live"
```

### 5. AI课程诊断

```bash
curl "http://localhost:8000/api/ai/course_diagnosis?course_name=公众演讲"
```

---

## 🔍 连接问题排查

### 问题1: 服务器无法启动

**检查端口占用:**
```bash
lsof -i :8000
```

**解决方法:**
```bash
# 杀死占用端口的进程
kill -9 <PID>

# 或使用其他端口
python3 -m uvicorn main:app --port 8001
```

### 问题2: 数据库连接失败

**检查PostgreSQL服务:**
```bash
# macOS (Homebrew)
brew services list
brew services start postgresql@16

# 或手动启动
pg_ctl -D /usr/local/var/postgres start
```

**检查数据库是否存在:**
```bash
psql -U postgres -l
```

**创建数据库:**
```bash
createdb -U postgres dataviz_db
```

### 问题3: 环境变量未加载

**检查.env文件:**
```bash
cat .env
```

**手动加载环境变量:**
```bash
export DATABASE_URL="postgresql://postgres:123456@localhost:5432/dataviz_db"
export LLM_API_KEY="your_api_key"
export LLM_BASE_URL="https://api.deepseek.com/v1"
```

---

## 🛠️ 数据库管理工具

### 推荐工具

1. **pgAdmin 4** - PostgreSQL官方管理工具
   - 下载: https://www.pgadmin.org/download/

2. **DBeaver** - 通用数据库管理工具
   - 下载: https://dbeaver.io/download/

3. **TablePlus** - 现代化数据库管理工具
   - 下载: https://tableplus.com/

### 连接配置（以DBeaver为例）

```
主机: localhost
端口: 5432
数据库: dataviz_db
用户名: postgres
密码: 123456
```

---

## 📱 前端连接配置

### React/Axios 示例

```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

// 获取直播数据
const getLiveData = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/analysis/live_dashboard`);
    return response.data;
  } catch (error) {
    console.error('获取数据失败:', error);
  }
};

// 上传文件
const uploadFile = async (file, uploadType) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_type', uploadType);

  try {
    const response = await axios.post(`${API_BASE_URL}/api/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('上传失败:', error);
  }
};
```

---

## 🔐 安全建议

### 生产环境配置

1. **修改默认密码**
```bash
# 修改数据库密码
psql -U postgres
ALTER USER postgres WITH PASSWORD 'your_strong_password';
```

2. **使用环境变量**
```bash
# 不要在代码中硬编码密码
# 使用.env文件并添加到.gitignore
```

3. **启用HTTPS**
```bash
# 使用nginx反向代理
# 或使用Let's Encrypt证书
```

4. **限制CORS**
```python
# main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # 只允许特定域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 📊 性能监控

### 查看服务器日志

```bash
# 实时查看日志
tail -f /var/log/postgresql/postgresql-16-main.log

# 或在代码中添加日志
import logging
logging.basicConfig(level=logging.INFO)
```

### 数据库性能查询

```sql
-- 查看活跃连接
SELECT * FROM pg_stat_activity;

-- 查看表大小
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public';

-- 查看索引使用情况
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes;
```

---

## 🎯 快速测试脚本

创建 `test_connection.py`:

```python
import requests
import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

def test_server():
    try:
        response = requests.get('http://localhost:8000/health')
        print(f"✅ 服务器状态: {response.json()}")
    except Exception as e:
        print(f"❌ 服务器连接失败: {e}")

def test_database():
    try:
        conn = psycopg2.connect(os.getenv('DATABASE_URL'))
        cur = conn.cursor()
        cur.execute("SELECT version();")
        print(f"✅ 数据库版本: {cur.fetchone()[0]}")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")

if __name__ == "__main__":
    print("开始测试连接...")
    test_server()
    test_database()
```

运行测试:
```bash
python3 test_connection.py
```

---

## 📞 技术支持

如遇问题，请检查：
1. ✅ PostgreSQL服务是否运行
2. ✅ 数据库是否存在
3. ✅ .env配置是否正确
4. ✅ 端口是否被占用
5. ✅ 依赖包是否安装完整

**安装依赖:**
```bash
pip install -r requirements.txt
```
