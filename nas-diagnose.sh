#!/bin/bash
# NAS网络诊断脚本 — 在QNAP NAS上直接运行
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

echo "=========================================="
echo "  NAS 网络诊断"
echo "=========================================="

echo ""
echo "=== DNS配置 ==="
cat /etc/resolv.conf 2>/dev/null || echo "没有 resolv.conf"

echo ""
echo "=== 网络接口 ==="
ip addr show 2>/dev/null || ifconfig 2>/dev/null || echo "没有网络接口信息"

echo ""
echo "=== 默认网关 ==="
ip route 2>/dev/null | grep default || route -n 2>/dev/null | grep "^0.0.0.0" || echo "没有默认网关"

echo ""
echo "=== DNS解析测试 ==="
echo -n "  github.com → "; nslookup github.com 2>&1 | awk '/^Name:/ { next }; /^Address/ {print $2}' | head -3 || echo "DNS解析失败"
echo -n "  google.com → "; nslookup google.com 2>&1 | awk '/^Address/ {print $2}' | head -3 || echo "DNS解析失败"
echo -n "  8.8.8.8 → "; nslookup 8.8.8.8 2>&1 | awk '/^Name:/ { next }; /^Address/ {print $2}' | head -3 || echo "DNS解析失败"

echo ""
echo "=== 连通性测试 ==="
echo -n "  ping github.com → "
ping -c 2 -W 5 github.com 2>&1 | tail -1 || echo "超时/失败"
echo -n "  ping 8.8.8.8 → "
ping -c 2 -W 5 8.8.8.8 2>&1 | tail -1 || echo "超时/失败"
echo -n "  curl github.com:443 → "
timeout 10 curl -s -o /dev/null -w "HTTP %{http_code} (%{time_total}s)" https://github.com 2>&1 || echo "连接失败"

echo ""
echo "=== Docker DNS ==="
if command -v docker &>/dev/null; then
  echo -n "  docker run DNS测试 → "
  docker run --rm alpine:3.19 nslookup github.com 2>&1 | tail -3 || echo "DNS测试失败"
  echo -n "  docker run (dns=8.8.8.8) → "
  docker run --rm --dns 8.8.8.8 alpine:3.19 nslookup github.com 2>&1 | tail -3 || echo "DNS测试失败"
else
  echo "  Docker不可用"
fi

echo ""
echo "=== Runner容器 ==="
docker ps --filter "name=runner" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}" 2>/dev/null || echo "没有找到runner容器"

echo ""
echo "=== MTU ==="
ip link 2>/dev/null | grep -v lo | head -10 || true

echo ""
echo "=== 建议 ==="
echo "  DNS问题: 在 Container Station > Docker > 设置 中添加 8.8.8.8 为DNS"
echo "  或: docker run --dns 8.8.8.8 ... 来临时解决"
echo "  MTU问题: Docker > 设置 > Docker Engine 中添加 \"mtu\": 1400"
echo ""
echo -e "${GREEN}诊断完成${NC}"
