# 数据库选型与部署方案

> 生产级 PostgreSQL + pgvector 部署指南

---

## 一、版本选择

### PostgreSQL 版本：17.x（当前最新稳定版）

| 版本 | 发布时间 | EOL | 选择理由 |
|------|---------|-----|---------|
| PG 17 | 2024-09 | 2029-11 | **推荐**。最新稳定版，5 年支持周期，性能优化（增量排序、并行查询增强）、JSON 改进、COPY 性能提升 |
| PG 16 | 2023-09 | 2028-11 | 次选。已经过 1+ 年生产验证，但新项目无必要选旧版 |
| PG 15 | 2022-10 | 2027-11 | 不推荐。无特殊优势，支持周期更短 |

**结论：选 PostgreSQL 17**。原因：
1. 新项目没有历史兼容包袱，直接用最新稳定版
2. PG 17 的 JSONB 性能改进对我们的 `metadata JSONB` 字段有利
3. 5 年支持周期足够覆盖产品生命周期
4. pgvector 0.8.x 已全面支持 PG 17

### pgvector 版本：0.8.0（当前最新稳定版）

| 版本 | 特性 | 说明 |
|------|------|------|
| 0.8.0 | HNSW 索引 + IVFFlat + 半精度、稀疏向量 | **推荐**。HNSW 是当前最佳 ANN 索引，召回率高、查询快 |
| 0.7.x | HNSW 基础支持 | 可用但缺少 0.8 的性能优化 |

**结论：选 pgvector 0.8.0**。原因：
1. HNSW 索引是向量搜索的工业标准，召回率 > 99%
2. 支持 `vector(1536)` 维度（OpenAI embedding 的标准维度）
3. 支持 `halfvec` 半精度向量，Phase 2 可用来节省存储
4. Docker 镜像 `pgvector/pgvector:pg17` 直接集成

### Docker 基础镜像

```
pgvector/pgvector:0.8.0-pg17
```

这是 pgvector 官方镜像，基于 `postgres:17`，预装 pgvector 扩展。无需手动编译安装。

---

## 二、数据持久化方案

### 2.1 核心原则

- **数据卷（Named Volume）** 存储数据库文件，不用 bind mount
- **PG 数据目录** `/var/lib/postgresql/data` 映射到 Docker 卷
- **WAL 日志** 与数据在同一卷内（小型部署足够），大型部署可分离到独立卷/快速磁盘
- **备份文件** 输出到独立的 bind mount 目录，方便主机侧访问和远程同步

### 2.2 卷规划

```yaml
volumes:
  pg_data:          # PostgreSQL 数据文件 + WAL
    driver: local
  pg_backups:       # 备份文件（bind mount 到主机）
```

### 2.3 数据安全配置

```
# postgresql.conf 关键参数
wal_level = replica              # 支持基础备份和 PITR
max_wal_senders = 3              # 备份流复制连接数
archive_mode = on                # 开启 WAL 归档
archive_command = 'cp %p /backups/wal/%f'  # WAL 归档到备份目录

# 数据完整性
fsync = on                       # 确保数据落盘（生产必须开启）
synchronous_commit = on          # 同步提交
full_page_writes = on            # 崩溃恢复保障

# 性能调优（4GB 内存服务器基准）
shared_buffers = 1GB             # 物理内存的 25%
effective_cache_size = 3GB       # 物理内存的 75%
work_mem = 16MB                  # 排序/哈希操作内存
maintenance_work_mem = 256MB     # VACUUM/CREATE INDEX 内存
wal_buffers = 64MB               # WAL 缓冲
random_page_cost = 1.1           # SSD 场景调低
```

### 2.4 向量索引持久化

pgvector 的 HNSW 索引和 IVFFlat 索引 **与普通 PG 索引一样持久化在磁盘上**：
- 创建索引后自动持久化到 `pg_data` 卷
- PG 重启后索引自动加载，无需重建
- 崩溃恢复通过 WAL 日志保障索引一致性
- **无需额外的向量数据持久化策略**——它就是 PG 的一部分

唯一注意点：
- HNSW 索引构建时间较长（百万级向量可能需要几十分钟）
- 建议在 `maintenance_work_mem` 调大到 `1GB` 后再创建大索引
- 索引文件较大（约为原始向量数据的 1.5-2 倍），规划磁盘空间时需考虑

---

## 三、备份策略（生产级）

### 3.1 三层备份体系

| 层级 | 方式 | 频率 | 保留策略 | 用途 |
|------|------|------|----------|------|
| L1 | `pg_dump` 逻辑备份 | 每天凌晨 2:00 | 保留 7 天 | 快速恢复单表/单库，可读性好 |
| L2 | `pg_basebackup` 物理备份 | 每周日凌晨 3:00 | 保留 4 周 | 全量恢复，配合 WAL 做 PITR |
| L3 | WAL 归档 | 实时（每个 WAL 段写满时） | 保留 7 天 | 配合 L2 实现任意时间点恢复 |

### 3.2 备份目录结构

```
/backups/                         # 主机上的备份根目录
├── daily/                        # L1: 每日逻辑备份
│   ├── notebrain_20260208_0200.sql.gz
│   ├── notebrain_20260207_0200.sql.gz
│   └── ...（保留 7 天）
├── weekly/                       # L2: 每周物理备份
│   ├── base_20260208/
│   └── ...（保留 4 周）
├── wal/                          # L3: WAL 归档
│   ├── 000000010000000000000001
│   └── ...（保留 7 天）
└── logs/                         # 备份日志
    ├── backup_20260208.log
    └── ...
```

### 3.3 恢复场景

| 场景 | 恢复方式 | RTO |
|------|---------|-----|
| 误删某张表 | L1 逻辑备份中提取该表 `pg_restore -t table_name` | 分钟级 |
| 数据库损坏 | L1 全量恢复 `gunzip + psql` | 分钟级（取决于数据量） |
| 恢复到某个时间点（如误操作前） | L2 物理备份 + L3 WAL 回放（PITR） | 十分钟级 |
| 服务器完全故障 | L2 物理备份恢复到新服务器 | 小时级（取决于数据量） |

---

## 四、PG 初始化脚本

数据库启动后需要自动执行的初始化操作：

```sql
-- 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 启用 pg_trgm（模糊搜索，Phase 2 可能用到）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 启用 uuid-ossp（UUID 生成）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

---

## 五、性能基准参考

以下是 pgvector HNSW 在不同规模下的性能参考（PG 17 + 4 核 8GB 服务器）：

| 向量数量 | 维度 | 索引构建时间 | 查询延迟 (top-10) | 召回率 |
|----------|------|-------------|-------------------|--------|
| 10,000 | 1536 | ~5 秒 | < 5ms | > 99% |
| 100,000 | 1536 | ~1 分钟 | < 10ms | > 98% |
| 1,000,000 | 1536 | ~20 分钟 | < 20ms | > 97% |

对于个人知识库场景（预估 < 10 万文档，< 50 万向量 chunks），pgvector 完全胜任。

---

## 六、监控建议（可选）

生产环境建议监控以下指标：

- **连接数**：`SELECT count(*) FROM pg_stat_activity`
- **数据库大小**：`SELECT pg_size_pretty(pg_database_size('notebrain'))`
- **最慢查询**：`pg_stat_statements` 扩展
- **WAL 积压**：`SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn) FROM pg_stat_replication`
- **表膨胀**：定期 `VACUUM ANALYZE`
- **向量索引大小**：`SELECT pg_size_pretty(pg_relation_size('entry_chunks_embedding_idx'))`

可以用 `pg_stat_monitor` 或接入 Prometheus + Grafana 做可视化监控。
