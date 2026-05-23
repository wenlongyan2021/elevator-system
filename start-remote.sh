#!/bin/bash
# 电梯管理系统 - 远程访问启动脚本

echo "=========================================="
echo "  电梯管理系统 - 远程访问部署"
echo "=========================================="
echo ""

# 检查服务是否运行
echo "检查本地服务状态..."

# 检查前端服务
if lsof -ti:8080 >/dev/null; then
    echo "✅ 前端服务运行中: http://localhost:8080"
else
    echo "⚠️  前端服务未运行，正在启动..."
    node proxy.js &
    sleep 3
fi

# 检查后端服务
if lsof -ti:3000 >/dev/null; then
    echo "✅ 后端服务运行中: http://localhost:3000"
else
    echo "⚠️  后端服务未运行，正在启动..."
    cd server
    npm run start:prod &
    sleep 5
    cd ..
fi

# 获取本机 IP
echo ""
echo "=========================================="
echo "  局域网访问地址"
echo "=========================================="

# 获取所有非本地 IP
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n1)

if [ -n "$LOCAL_IP" ]; then
    echo "局域网访问地址："
    echo "  前端: http://$LOCAL_IP:8080"
    echo "  后端: http://$LOCAL_IP:3000"
    echo ""
    echo "提示：确保防火墙已允许 8080 和 3000 端口"
else
    echo "无法获取本机 IP，请手动查看"
fi

echo ""
echo "=========================================="
echo "  公网访问方案"
echo "=========================================="
echo ""
echo "方案 1：使用 ngrok（推荐用于测试）"
echo "  1. 注册账号：https://ngrok.com/signup"
echo "  2. 获取 authtoken：https://dashboard.ngrok.com/get-started/your-authtoken"
echo "  3. 配置 token：ngrok config add-authtoken <你的token>"
echo "  4. 启动隧道：ngrok http 8080"
echo ""
echo "方案 2：使用 Cloudflare Tunnel（推荐长期使用）"
echo "  1. 安装：brew install cloudflare/cloudflare/cloudflared"
echo "  2. 登录：cloudflared tunnel login"
echo "  3. 创建隧道：cloudflared tunnel create elevator"
echo "  4. 配置路由：cloudflared tunnel route dns elevator your-domain.com"
echo "  5. 启动隧道：cloudflared tunnel --url http://localhost:8080 run"
echo ""
echo "方案 3：使用 frp（需要公网服务器）"
echo "  详见 REMOTE_DEPLOY.md"
echo ""
echo "方案 4：路由器端口转发（需要公网 IP）"
echo "  将 8080 和 3000 端口转发到本机 IP"
echo ""
echo "=========================================="
echo "  测试账号"
echo "=========================================="
echo ""
echo "管理员：13800000000 / admin123"
echo "项目经理：13900000001 / 123456"
echo "客服：13900000002 / 123456"
echo ""
echo "详细文档请查看："
echo "  - REMOTE_DEPLOY.md (远程部署)"
echo "  - SOLUTION_SPEC.md (方案说明)"
echo "  - DEPLOY.md (部署指南)"
echo ""
