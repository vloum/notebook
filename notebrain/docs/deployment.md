# NoteBrain 部署指南

> Docker Compose 一键部署：PostgreSQL 17 + pgvector + Next.js

---

## 一、前置条件

- Docker Engine >= 24.0
- Docker Compose >= 2.20
- 服务器：最低 2 核 4GB 内存，推荐 4 核 8GB
- 磁盘：SSD，至少 20GB 可用空间

## 二、快速开始

### 1. 克隆项目

```bash
git clone https://github.com/vloum/notebook.git
cd notebook/notebrain
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，必须修改以下值：

```env
# 数据库密码（使用强密码）
POSTGRES_PASSWORD=your_strong_password_here

# DATABASE_URL 中的密码要保持一致
DATABASE_URL="postgresql://notebrain:your_strong_password_here@postgres:5432/notebrain?schema=public"

# NextAuth 密钥（生成随机值）
# openssl rand -base64 32
NEXTAUTH_SECRET=your_random_secret_here

# 你的域名（如果有）
NEXTAUTH_URL=https://your-domain.com
```

### 3. 启动数据库

```bash
# 先启动 PostgreSQL（等待健康检查通过）
docker compose up -d postgres

# 查看日志确认启动成功
docker compose logs -f postgres
# 看到 "database system is ready to accept connections" 即可
```

### 4. 运行数据库迁移

```bash
docker compose run --rm --profile migration migrator
```

### 5. 启动全部服务

```bash
docker compose up -d
```

### 6. 验证

```bash
# 检查服务状态
docker compose ps

# 应该看到：
# notebrain-postgres   running (healthy)
# notebrain-app        running (healthy)
# notebrain-backup     running

# 访问应用
curl http://localhost:3000
```

### 7. 创建第一个用户

访问 `http://localhost:3000/register` 注册账号。

---

## 三、数据库管理

### 连接数据库

```bash
# 通过 Docker
docker compose exec postgres psql -U notebrain -d notebrain

# 从主机（如果暴露了端口）
psql -h localhost -p 5432 -U notebrain -d notebrain
```

### 查看 pgvector 状态

```sql
-- 确认扩展已安装
SELECT * FROM pg_extension WHERE extname = 'vector';

-- 查看向量索引
SELECT indexname, indexdef FROM pg_indexes WHERE indexdef LIKE '%vector%';

-- 查看数据库大小
SELECT pg_size_pretty(pg_database_size('notebrain'));
```

### 手动执行迁移

```bash
docker compose run --rm --profile migration migrator
```

---

## 四、备份与恢复

### 手动触发备份

```bash
# 执行一次每日逻辑备份
docker compose exec backup /usr/local/bin/backup.sh daily

# 执行一次每周物理备份
docker compose exec backup /usr/local/bin/backup.sh weekly

# 清理过期备份
docker compose exec backup /usr/local/bin/backup.sh cleanup
```

### 查看备份

```bash
ls -la ./backups/daily/
ls -la ./backups/weekly/
ls -la ./backups/logs/
```

### 恢复数据库

```bash
# 列出可用备份
./scripts/restore.sh list

# 从逻辑备份恢复
./scripts/restore.sh daily ./backups/daily/notebrain_20260208_0200.sql.gz

# 物理备份恢复（需要停机，脚本会给出步骤）
./scripts/restore.sh weekly ./backups/weekly/base_20260208_030000
```

### 自动备份计划

backup 容器内置 cron，自动执行：

| 时间 | 任务 | 保留 |
|------|------|------|
| 每天 02:00 | 逻辑备份 (pg_dump) + 清理 | 7 天 |
| 每周日 03:00 | 物理备份 (pg_basebackup) | 4 周 |
| 实时 | WAL 归档 | 7 天 |

---

## 五、MCP Server 配置

MCP Server 不作为 Docker 服务运行（它是 Agent 的子进程）。用户在本地配置：

### 1. 在 Web UI 生成 API Key

访问 `设置 → MCP API 密钥 → 生成新密钥`

### 2. 配置 MCP Client

**Cursor 配置** (`~/.cursor/mcp.json`)：

```json
{
  "mcpServers": {
    "notebrain": {
      "command": "npx",
      "args": ["-y", "notebrain-mcp"],
      "env": {
        "NOTEBRAIN_API_KEY": "nb_sk_your_key_here",
        "NOTEBRAIN_API_URL": "http://your-server:3000/api"
      }
    }
  }
}
```

**或者用 Docker 运行 MCP Server：**

```json
{
  "mcpServers": {
    "notebrain": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "NOTEBRAIN_API_KEY=nb_sk_your_key_here",
        "-e", "NOTEBRAIN_API_URL=http://your-server:3000/api",
        "notebrain-mcp"
      ]
    }
  }
}
```

---

## 六、更新部署

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker compose build app
docker compose up -d app

# 如果有数据库变更
docker compose run --rm --profile migration migrator

# 检查状态
docker compose ps
docker compose logs -f app
```

---

## 七、故障排查

### 应用无法连接数据库

```bash
# 检查 PG 是否健康
docker compose exec postgres pg_isready

# 检查网络
docker compose exec app ping postgres

# 检查连接字符串
docker compose exec app env | grep DATABASE_URL
```

### 容器内存不足

调整 `docker-compose.yml` 中的 `deploy.resources.limits`。

### 查看所有日志

```bash
docker compose logs -f                    # 所有服务
docker compose logs -f postgres --tail 100  # PG 最近 100 行
docker compose logs -f app --tail 100       # App 最近 100 行
```

### 重置所有数据（危险）

```bash
docker compose down -v   # 删除所有容器和卷
docker compose up -d     # 重新开始
```
