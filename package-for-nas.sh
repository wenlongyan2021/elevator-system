#!/bin/bash
set -e

echo "=========================================="
echo "  电梯管理系统 - 本地打包工具"
echo "=========================================="

SOURCE_DIR="/Users/guishenghuo/WorkBuddy/2026-05-17-task-6/elevator-system"
OUTPUT_FILE="/Users/guishenghuo/WorkBuddy/elevator-system-deploy.tar.gz"

echo "正在打包项目..."
cd "${SOURCE_DIR}"

tar -czvf "${OUTPUT_FILE}" \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='dist' \
    --exclude='*.log' \
    --exclude='.DS_Store' \
    --exclude='package-lock.json' \
    --exclude='web-admin/node_modules' \
    --exclude='server/node_modules' \
    --exclude='web-admin/dist' \
    --exclude='server/dist' \
    .

echo ""
echo "=========================================="
echo "  🎉 打包完成！"
echo "=========================================="
echo ""
echo "打包文件位置: ${OUTPUT_FILE}"
echo "文件大小: $(du -h ${OUTPUT_FILE} | cut -f1)"
echo ""
echo "下一步："
echo "1. 上传压缩包到 NAS:"
echo "   scp ${OUTPUT_FILE} admin@<NAS-IP>:/share/"
echo ""
echo "2. SSH 连接到 NAS 并解压:"
echo "   ssh admin@<NAS-IP>"
echo "   cd /share"
echo "   tar -xzvf elevator-system-deploy.tar.gz"
echo ""
echo "3. 在 NAS 上运行部署脚本:"
echo "   chmod +x nas-deploy.sh"
echo "   ./nas-deploy.sh"