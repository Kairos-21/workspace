@echo off
chcp 65001 >nul
title 个人工作台 - 启动中...

echo.
echo  ╔══════════════════════════════════════╗
echo  ║     个人工作台 v2.29 — 一键启动       ║
echo  ╚══════════════════════════════════════╝
echo.

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [✗] 未检测到 Node.js，请先安装 Node.js（>=16）
    echo     下载地址: https://nodejs.org/
    pause
    exit /b 1
)
echo [✓] Node.js 已就绪

:: 检查依赖
if not exist "node_modules" (
    echo [→] 正在安装依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo [✗] 依赖安装失败
        pause
        exit /b 1
    )
    echo [✓] 依赖安装完成
) else (
    echo [✓] 依赖已就绪
)

:: 启动服务
echo.
echo [→] 正在启动服务...
echo.
start "" http://localhost:5000
node server.js

pause
