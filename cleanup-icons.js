const fs = require('fs');
const path = require('path');

// 读取默认数据文件
const dataPath = path.join(__dirname, 'workspace-backup-2026-04-24-default.json');
const rawData = fs.readFileSync(dataPath, 'utf8');
const data = JSON.parse(rawData);

// 处理本地应用的图标
if (data.shortcuts) {
    data.shortcuts.forEach(shortcut => {
        if (shortcut.type === 'app' && shortcut.customIconPath && shortcut.customIconPath.startsWith('data:image')) {
            // 移除 Base64 图标，使用默认图标
            shortcut.icon = 'default';
            shortcut.iconType = 'default';
            shortcut.customIconPath = null;
            console.log(`已处理本地应用图标: ${shortcut.name}`);
        }
    });
}

// 写入更新后的数据
fs.writeFileSync(
    dataPath,
    JSON.stringify(data, null, 2),
    'utf8'
);

console.log('已完成！本地应用的 Base64 图标已移除，使用默认图标。');