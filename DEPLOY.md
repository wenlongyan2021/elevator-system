# 部署指南

## 环境要求

- QNAP NAS ts-464C 或类似 x86 Linux 设备
- Docker + Docker Compose (QNAP Container Station)
- Git
- 域名（可选，用于 HTTPS）

---

## 一、首次部署

### 1.1 NAS 上准备目录

```bash
# 通过 SSH 连接到 NAS
ssh admin@<nas-ip>

# 创建项目目录
mkdir -p /share/ElevatorSystem
cd /share/ElevatorSystem

# 克隆代码
git clone <repository-url> .
```

### 1.2 配置环境变量

```bash
cp server/.env.example server/.env.production
# 编辑 .env.production 修改密码和密钥
vi server/.env.production
```

关键变量：

| 变量 | 说明 | 示例 |
|------|------|------|
| `DB_PASSWORD` | PostgreSQL 密码 | 随机生成 |
| `REDIS_PASSWORD` | Redis 密码 | 随机生成 |
| `JWT_SECRET` | JWT 签名密钥 | 随机字符串（>=32字符） |

### 1.3 配置 SSL 证书

```bash
mkdir -p nginx/ssl
```

**方式 A：Let's Encrypt（推荐，需域名）**

```bash
# 安装 certbot
docker run -it --rm -p 80:80 -v /share/ElevatorSystem/nginx/ssl:/etc/letsencrypt certbot/certbot \
  certonly --standalone -d api.your-domain.com -d admin.your-domain.com
```

**方式 B：自签名证书（开发/内网使用）**

```bash
docker run --rm -v /share/ElevatorSystem/nginx/ssl:/certs alpine sh -c \
  "apk add openssl && openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
   -keyout /certs/key.pem -out /certs/cert.pem \
   -subj '/CN=localhost'"
```

### 1.4 启动服务

```bash
cd /share/ElevatorSystem

# 首次启动（构建镜像 + 初始化数据库）
docker compose -f docker-compose.prod.yml up -d

# 查看启动日志
docker compose -f docker-compose.prod.yml logs -f

# 验证服务状态
docker compose -f docker-compose.prod.yml ps
```

### 1.5 初始化数据

服务启动后会自动运行数据库迁移和种子数据。也可手动执行：

```bash
docker exec elevator-api npx prisma migrate deploy
docker exec elevator-api node prisma/seed.js
```

---

## 二、日常运维

### 2.1 更新代码

```bash
cd /share/ElevatorSystem
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```

### 2.2 查看日志

```bash
# 所有服务
docker compose -f docker-compose.prod.yml logs -f

# 仅 API
docker compose -f docker-compose.prod.yml logs -f api

# 最近 100 行
docker compose -f docker-compose.prod.yml logs --tail=100 api
```

### 2.3 数据库备份

```bash
# 手动备份
docker exec elevator-postgres pg_dump -U elevator elevator_system > \
  /share/ElevatorSystem/backups/backup-$(date +%Y%m%d).sql

# 恢复
cat backup-20240101.sql | docker exec -i elevator-postgres psql -U elevator elevator_system
```

推荐设置 crontab 定时备份：

```bash
# 每天凌晨 3 点备份，保留 30 天
0 3 * * * docker exec elevator-postgres pg_dump -U elevator elevator_system | \
  gzip > /share/ElevatorSystem/backups/db-$(date +\%Y\%m\%d).sql.gz && \
  find /share/ElevatorSystem/backups -name "db-*.sql.gz" -mtime +30 -delete
```

### 2.4 文件存储

所有上传文件存储在 Docker 卷 `elevator_uploads` 中，映射到 NAS 目录：

```
/share/Container/elevator_uploads/
├── photos/          # 巡查/维修照片
├── videos/          # 报修视频
├── contracts/       # 合同扫描件
└── exports/         # Excel 导出
```

可用 `docker volume inspect elevator_uploads` 查看实际路径。

---

## 三、访问地址

| 服务 | 地址 | 说明 |
|------|------|------|
| Web 管理后台 | `https://<nas-ip>/` 或 `https://admin.your-domain.com/` |
| API | `https://<nas-ip>/api/` | 通过 Nginx 反向代理 |
| API 文档 (Swagger) | `https://<nas-ip>/api/docs` |
| 数据库 | `localhost:5432` | 仅容器内部访问 |
| Redis | `localhost:6379` | 仅容器内部访问 |

### 默认管理员账号

首次部署后，种子数据会创建以下用户供测试：

| 手机号 | 密码 | 角色 |
|--------|------|------|
| 13800000001 | admin123 | ADMIN（系统管理员） |
| 13800000002 | admin123 | ELEVATOR_MAINTAINER（维保员） |
| 13800000003 | admin123 | CUSTOMER_SERVICE（客服管家） |

**⚠️ 生产环境务必修改默认密码！**

---

## 四、GitHub Actions 自动部署

### 4.1 配置 Secrets

在 GitHub 仓库 Settings → Secrets and variables → Actions 中添加：

| Secret | 说明 |
|--------|------|
| `NAS_HOST` | NAS IP 地址 |
| `NAS_PORT` | SSH 端口（默认 22） |
| `NAS_USER` | SSH 用户名 |
| `NAS_SSH_KEY` | SSH 私钥内容 |

### 4.2 自动部署流程

推送代码到 `main` 分支后，GitHub Actions 自动：

1. 运行 CI（构建 + 测试）
2. SSH 登录 NAS
3. 拉取最新代码
4. 构建 Docker 镜像
5. 重启服务

---

## 五、系统架构图

```
Internet
    │
    ▼
┌─────────────┐   HTTPS/443      ┌──────────┐
│  用户浏览器   │ ──────────────▶ │  Nginx   │
│  Web Admin   │                 │ 反向代理  │
└─────────────┘                  └────┬─────┘
                                      │
    ┌──────────────┐                  │
    │ 微信小程序    │ ─── HTTPS ──────┘
    └──────────────┘
                                      │
                         ┌────────────┼────────────┐
                         ▼            ▼            ▼
                   ┌──────────┐ ┌──────────┐ ┌──────────┐
                   │ Nest API │ │ Vue Admin│ │  Uploads │
                   │ :3000    │ │ :8080    │ │  /uploads│
                   └────┬─────┘ └──────────┘ └──────────┘
                        │
              ┌─────────┼─────────┐
              ▼                   ▼
       ┌──────────┐        ┌──────────┐
       │PostgreSQL│        │  Redis   │
       │ :5432    │        │ :6379    │
       └──────────┘        └──────────┘
```

---

## 六、故障排查

### API 无法启动

```bash
# 检查日志
docker compose -f docker-compose.prod.yml logs api

# 手动运行迁移
docker exec elevator-api npx prisma migrate deploy

# 检查数据库连接
docker exec elevator-api npx prisma db execute --stdin <<< "SELECT 1"
```

### 数据库连接失败

```bash
# 验证数据库运行
docker compose -f docker-compose.prod.yml ps postgres

# 直接连接测试
docker exec elevator-postgres pg_isready -U elevator -d elevator_system
```

### 文件上传 413 错误

Nginx 已配置 `client_max_body_size 50m;`。如需调整，修改 `nginx/nginx.conf` 后重启：

```bash
docker compose -f docker-compose.prod.yml restart nginx
```
