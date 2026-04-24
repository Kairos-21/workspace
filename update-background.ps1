
# 读取文件
$content = Get-Content -Path "f:\workspace\workspace-backup-2026-04-22-default.json" -Raw

# 替换背景图路径
$pattern = '"backgroundPath":\s*"[^"]*"'
$replacement = '"backgroundPath": "西湖烟雨.jpg"'
$content = $content -replace $pattern, $replacement

# 保存文件
Set-Content -Path "f:\workspace\workspace-backup-2026-04-22-default.json" -Value $content -Encoding UTF8

Write-Host "已完成！背景图路径已更新。"
