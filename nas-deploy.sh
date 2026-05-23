#!/bin/bash
set -e

echo "=========================================="
echo "  电梯管理系统 - QNAP NAS 一键部署"
echo "=========================================="

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}[信息] 检查环境...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}[错误] 未找到Docker，请先在Container Station中启用Docker${NC}"
    exit 1
fi

COMPOSE_CMD="docker compose"
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
fi

PROJECT_DIR="/share/ElevatorSystem"

echo -e "${GREEN}[1/6] 创建目录结构...${NC}"
mkdir -p ${PROJECT_DIR}/backups
mkdir -p ${PROJECT_DIR}/nginx/ssl

echo -e "${GREEN}[2/6] 配置环境变量...${NC}"
if [ ! -f "${PROJECT_DIR}/server/.env" ]; then
    echo -e "${YELLOW}[警告] 未找到 .env 文件，正在创建...${NC}"
    cat > ${PROJECT_DIR}/server/.env << 'EOF'
DB_PASSWORD=elevator_pass_2024_QNAP
REDIS_PASSWORD=redis_pass_2024_QNAP
JWT_SECRET=ElevatorSystem_Secure_JWT_Secret_2024_Change_This
NODE_ENV=production
PORT=3000
EOF
    echo -e "${GREEN}[完成] 环境变量已创建${NC}"
else
    echo -e "${YELLOW}[跳过] .env 文件已存在${NC}"
fi

echo -e "${GREEN}[3/6] 复制生产环境配置...${NC}"
if [ -f "${PROJECT_DIR}/docker-compose.prod.yml" ]; then
    cp ${PROJECT_DIR}/docker-compose.prod.yml ${PROJECT_DIR}/docker-compose.yml
    echo -e "${GREEN}[完成] docker-compose.yml 已配置${NC}"
else
    echo -e "${RED}[错误] 未找到 docker-compose.prod.yml${NC}"
    exit 1
fi

echo -e "${GREEN}[4/6] 停止旧容器（如有）...${NC}"
cd ${PROJECT_DIR}
${COMPOSE_CMD} down 2>/dev/null || true

echo -e "${GREEN}[5/6] 构建并启动服务...${NC}"
${COMPOSE_CMD} up -d --build

echo -e "${GREEN}[6/6] 等待服务启动...${NC}"
echo "等待数据库就绪..."
for i in {1..30}; do
    if docker exec elevator-postgres pg_isready -U elevator &>/dev/null; then
        echo -e "${GREEN}[完成] 数据库已就绪${NC}"
        break
    fi
    echo -ne "${YELLOW}[等待] 数据库启动中... ($i/30)${NC}\r"
    sleep 2
done

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}     🎉 部署完成！${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo -e "${BLUE}[访问信息]${NC}"
echo "  - Web管理后台: http://$(hostname -I | awk '{print $1}'):80"
echo "  - API接口:     http://$(hostname -I | awk '{print $1}'):80/api/"
echo "  - API文档:     http://$(hostname -I | awk '{print $1}'):80/api/docs"
echo ""
echo -e "${BLUE}[默认登录账号]${NC}"
echo "  - 手机号: 13800000001"
echo "  - 密码:   admin123"
echo ""
echo -e "${YELLOW}[重要] 生产环境请修改以下内容：${NC}"
echo "  1. 修改 server/.env 中的密码"
echo "  2. 修改默认管理员密码"
echo ""
echo -e "${BLUE}[常用命令]${NC}"
echo "  查看日志: cd ${PROJECT_DIR} && ${COMPOSE_CMD} logs -f"
echo "  停止服务: cd ${PROJECT_DIR} && ${COMPOSE_CMD} down"
echo "  重启服务: cd ${PROJECT_DIR} && ${COMPOSE_CMD} restart"
echo "  查看状态: cd ${PROJECT_DIR} && ${COMPOSE_CMD} ps"
echo ""
echo -e "${GREEN}[提示] 如需远程访问，请配置 myQNAPcloud${NC}"
echo ""

read -p "是否现在查看服务状态? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ${COMPOSE_CMD} ps
    echo ""
    echo -e "${BLUE}[测试API]${NC}"
    curl -s http://localhost:80/api | head -c 200 || echo "API响应中..."
fi