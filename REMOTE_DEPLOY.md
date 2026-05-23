# 远程局域网外访问部署方案

## 概述

本文档提供将电梯管理系统部署为公网可访问的多种方案。

---

## 方案一：使用 ngrok 临时公网访问（推荐用于测试）

### 1.1 安装 ngrok

**macOS**：
```bash
# 使用 Homebrew 安装
brew install ngrok/ngrok/ngrok

# 或从官网下载：https://ngrok.com/download
```

**Linux**：
```bash
# 使用 APT
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list && sudo apt update && sudo apt install ngrok
```

### 1.2 配置 ngrok

1. 注册 ngrok 账号：https://ngrok.com/
2. 获取 authtoken：登录后在 Dashboard 获取
3. 配置 authtoken：

```bash
ngrok config add-authtoken <your-authtoken>
```

### 1.3 启动隧道

**方式 A：单一隧道（仅前端）**：
```bash
# 暴露前端 8080 端口
ngrok http 8080
```

启动后，ngrok 会提供公网访问地址，如：
```
Forwarding    https://abc123.ngrok-free.app -> http://localhost:8080
```

**方式 B：完整隧道（前端 + 后端）**：
```bash
# 暴露前端
ngrok http 8080 --domain=your-custom-domain.ngrok-free.app

# 新开终端，暴露后端
ngrok http 3000 --domain=your-api-custom-domain.ngrok-free.app
```

### 1.4 配置前端使用公网 API

修改前端的 API 地址，让它使用 ngrok 提供的公网地址。

编辑 `web-admin/src/api/request.ts`，或设置环境变量：

**方案 1：修改 API 配置文件**：

创建或编辑 `web-admin/.env.production`：
```env
VITE_API_BASE_URL=https://your-api-domain.ngrok-free.app/api
```

然后重新构建前端：
```bash
cd web-admin
npm run build
```

**方案 2：使用 nginx 代理（推荐）**：
配置 nginx 让前端和后端使用同一个域名，避免跨域问题。

---

## 方案二：使用 frp 自建内网穿透（推荐用于长期使用）

### 2.1 准备工作

需要：
1. 一台有公网 IP 的服务器（如阿里云、腾讯云）
2. frp 软件：https://github.com/fatedier/frp/releases

### 2.2 服务端配置（公网服务器）

**1. 下载 frp**：
```bash
cd /opt
wget https://github.com/fatedier/frp/releases/download/v0.52.3/frp_0.52.3_linux_amd64.tar.gz
tar -zxvf frp_0.52.3_linux_amd64.tar.gz
cd frp_0.52.3_linux_amd64
```

**2. 创建服务端配置 `frps.toml`**：

```toml
[common]
bindPort = 7000
vhostHTTPPort = 8080
vhostHTTPSPort = 8443

# 配置认证
auth.token = "your-secure-token-here-change-this"

# 仪表盘（可选）
webServer.addr = "0.0.0.0"
webServer.port = 7500
webServer.user = "admin"
webServer.password = "admin-password-change-this"
```

**3. 启动服务端**：
```bash
./frps -c ./frps.toml
```

**4. 使用 systemd 服务（生产环境）**：
创建 `/etc/systemd/system/frps.service`：
```ini
[Unit]
Description=frp server
After=network.target

[Service]
Type=simple
User=root
Restart=on-failure
RestartSec=5s
ExecStart=/opt/frp/frps -c /opt/frp/frps.toml

[Install]
WantedBy=multi-user.target
```

启动服务：
```bash
systemctl daemon-reload
systemctl start frps
systemctl enable frps
```

### 2.3 客户端配置（本地开发机器）

**1. 创建客户端配置 `frpc.toml`**：

在项目目录下创建 `frpc.toml`：

```toml
[common]
serverAddr = "your-public-server-ip"
serverPort = 7000
auth.token = "your-secure-token-here-change-this"

# 前端服务
[[proxies]]
name = "elevator-web"
type = "http"
localPort = 8080
customDomains = ["elevator.yourdomain.com"]

# 后端 API
[[proxies]]
name = "elevator-api"
type = "http"
localPort = 3000
customDomains = ["api.elevator.yourdomain.com"]
```

**2. 下载并启动客户端**：
```bash
# 下载 frp（如果还没下载）
# 解压后，在项目目录

./frpc -c ./frpc.toml
```

### 2.4 配置 DNS

将域名指向公网服务器 IP：
```
A 记录：
elevator.yourdomain.com    ->  公网服务器IP
api.elevator.yourdomain.com ->  公网服务器IP
```

---

## 方案三：使用端口转发（如果有公网 IP）

如果您的网络环境有公网 IP：

### 3.1 路由器端口转发

登录路由器管理页面，配置端口转发：

| 外部端口 | 内部IP | 内部端口 | 协议 | 说明 |
|---------|--------|---------|------|------|
| 8080 | 192.168.x.x | 8080 | TCP | 前端服务 |
| 3000 | 192.168.x.x | 3000 | TCP | 后端服务 |

### 3.2 使用 DDNS（动态 DNS）

如果公网 IP 是动态的，使用 DDNS 服务：

| 服务商 | 说明 |
|--------|------|
| 花生壳 | 国内常用，免费版有限制 |
| 阿里云 DDNS | 配合阿里云域名使用 |
| 腾讯云 DDNS | 配合腾讯云域名使用 |
| no-ip | 国外免费 DDNS |

---

## 方案四：使用 Cloudflare Tunnel（推荐）

### 4.1 安装 cloudflared

```bash
# macOS
brew install cloudflare/cloudflare/cloudflared

# Linux
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
dpkg -i cloudflared-linux-amd64.deb
```

### 4.2 登录并创建隧道

```bash
# 登录
cloudflared tunnel login

# 创建隧道
cloudflared tunnel create elevator-system

# 配置路由
cloudflared tunnel route dns elevator-system elevator.yourdomain.com
```

### 4.3 创建配置文件

创建 `config.yml`：

```yaml
tunnel: your-tunnel-id-here
credentials-file: /path/to/.cloudflared/your-tunnel-id.json

ingress:
  - hostname: elevator.yourdomain.com
    service: http://localhost:8080
  - hostname: api.elevator.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

### 4.4 启动隧道

```bash
cloudflared tunnel --config config.yml run
```

---

## 安全配置

### 1. 启用 HTTPS

**使用 Let's Encrypt**：

```bash
# 安装 certbot
apt install certbot -y

# 获取证书
certbot certonly --standalone -d elevator.yourdomain.com -d api.elevator.yourdomain.com
```

### 2. 配置 Nginx（推荐）

创建 Nginx 配置文件 `/etc/nginx/sites-available/elevator`：

```nginx
server {
    listen 80;
    server_name elevator.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name elevator.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/elevator.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/elevator.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

启用站点：
```bash
ln -s /etc/nginx/sites-available/elevator /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### 3. 防火墙配置

```bash
# UFW (Ubuntu/Debian)
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 7000/tcp  # frp
ufw enable

# Firewalld (CentOS/RHEL)
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-port=7000/tcp
firewall-cmd --reload
```

---

## 快速测试方案（当前可用）

如果您想立即测试公网访问，我推荐使用 **ngrok**，这是最快的方式。

### 快速开始：

1. **安装 ngrok**：
```bash
brew install ngrok/ngrok/ngrok
```

2. **启动隧道（简单模式）**：
```bash
# 暴露前端
ngrok http 8080
```

3. **访问系统**：
ngrok 启动后会显示公网地址，例如：
```
Forwarding    https://abc123.ngrok-free.app -> http://localhost:8080
```

访问该地址即可从公网访问系统！

---

## 方案对比

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| ngrok | 配置简单、无需服务器、免费可用 | 免费版有域名限制、速度一般 | 临时测试、演示 |
| frp | 完全控制、可自定义域名、性能好 | 需要公网服务器 | 长期使用、生产环境 |
| Cloudflare Tunnel | 免费、安全、无需公网IP | 需要Cloudflare账号、略复杂 | 长期使用 |
| 端口转发 | 简单直接、性能好 | 需要公网IP、路由器配置 | 有公网IP的环境 |

---

## 当前系统状态

| 服务 | 本地地址 | 状态 |
|------|----------|------|
| 前端 | http://localhost:8080 | ✅ 运行中 |
| 后端 | http://localhost:3000 | ✅ 运行中 |

您可以选择以上任一方案进行公网部署。推荐先从 **ngrok** 开始测试，确认无误后再考虑长期方案！