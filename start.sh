#!/usr/bin/env bash
set -e

echo ""
echo " ╔══════════════════════════════════════╗"
echo " ║     个人工作台 v2.29 — 一键启动       ║"
echo " ╚══════════════════════════════════════╝"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "[✗] 未检测到 Node.js，请先安装 Node.js（>=16）"
    echo "    下载地址: https://nodejs.org/"
    exit 1
fi
echo "[✓] Node.js $(node -v) 已就绪"

# 安装依赖
if [ ! -d "node_modules" ]; then
    echo "[→] 正在安装依赖..."
    npm install
    echo "[✓] 依赖安装完成"
else
    echo "[✓] 依赖已就绪"
fi

# 启动服务
echo ""
echo "[→] 正在启动服务..."
echo ""

# 尝试自动打开浏览器
case "$(uname -s)" in
    Darwin*)    open http://localhost:5000 ;;
    Linux*)     xdg-open http://localhost:5000 2>/dev/null || true ;;
    MINGW*|MSYS*|CYGWIN*)  start "" http://localhost:5000 2>/dev/null || true ;;
esac

node server.js
