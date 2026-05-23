#!/bin/bash
set -e

echo "=========================================="
echo "   QNAP 电梯管理系统一键部署脚本"
echo "=========================================="

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ "$(id -u)" != "0" ]; then
    echo -e "${YELLOW}警告：建议以root身份运行此脚本${NC}"
    read -p "是否继续? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误：未找到Docker，请先在Container Station中启用Docker${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}错误：未找到Docker Compose${NC}"
    exit 1
fi

COMPOSE_CMD="docker compose"
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
fi

echo -e "${GREEN}1. 创建目录结构...${NC}"
mkdir -p /share/ElevatorSystem
mkdir -p /share/ElevatorSystem/backups
mkdir -p /share/ElevatorSystem/nginx/ssl

echo -e "${GREEN}2. 复制配置文件...${NC}"
cp -f .env /share/ElevatorSystem/
cp -rf nginx /share/ElevatorSystem/
cp -f docker-compose.prod.yml /share/ElevatorSystem/docker-compose.yml

echo -e "${GREEN}3. 启动服务...${NC}"
cd /share/ElevatorSystem

$COMPOSE_CMD up -d --build

echo -e "${GREEN}4. 等待服务启动...${NC}"
sleep 30

echo -e "${GREEN}5. 检查服务状态...${NC}"
$COMPOSE_CMD ps

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}部署完成！${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo "访问地址："
echo "  - Web管理后台: http://192.168.0.189:8081"
echo "  - API接口: http://192.168.0.189:8081/api/"
echo ""
echo "默认登录账号："
echo "  - 手机号: 13800000001"
echo "  - 密码: admin123"
echo ""
echo "查看日志命令:"
echo "  cd /share/ElevatorSystem"
echo "  docker compose logs -f"
echo ""
echo -e "${YELLOW}注意：生产环境请修改默认密码和JWT_SECRET！${NC}"
