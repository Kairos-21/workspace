const fs = require('fs');
const path = require('path');

// 读取原始备份文件
const rawData = fs.readFileSync(path.join(__dirname, 'workspace-backup-2026-04-24T07-03-10.json'), 'utf8');
const data = JSON.parse(rawData);

// 确保图标目录存在
const iconsDir = path.join(__dirname, '前端', 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

// 处理本地应用的图标
const appIcons = [];
if (data.shortcuts) {
    data.shortcuts.forEach(shortcut => {
        if (shortcut.type === 'app' && shortcut.customIconPath && shortcut.customIconPath.startsWith('data:image')) {
            // 解析Base64数据
            const matches = shortcut.customIconPath.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches) {
                const mimeType = matches[1];
                const base64Data = matches[2];
                const buffer = Buffer.from(base64Data, 'base64');
                
                // 确定文件扩展名
                let ext = '.png';
                if (mimeType.includes('jpeg')) ext = '.jpg';
                if (mimeType.includes('png')) ext = '.png';
                if (mimeType.includes('gif')) ext = '.gif';
                if (mimeType.includes('svg')) ext = '.svg';
                
                // 生成文件名
                const filename = `app-${shortcut.name}${ext}`;
                const filepath = path.join(iconsDir, filename);
                
                // 保存文件
                fs.writeFileSync(filepath, buffer);
                console.log(`已保存图标: ${filename}`);
                
                // 更新数据
                shortcut.customIconPath = `icons/${filename}`;
                appIcons.push({ name: shortcut.name, path: shortcut.customIconPath });
            }
        }
    });
}

// 保存背景图设置
if (data.settings) {
    data.settings.backgroundPath = '西湖烟雨.jpg';
}

// 写入更新后的默认数据
const outputPath = path.join(__dirname, 'workspace-backup-2026-04-24-default.json');
fs.writeFileSync(
    outputPath,
    JSON.stringify(data, null, 2),
    'utf8'
);

console.log('\n处理完成！');
console.log(`保存了 ${appIcons.length} 个本地应用图标`);
appIcons.forEach(icon => {
    console.log(`  - ${icon.name}: ${icon.path}`);
});
console.log(`默认数据已更新: ${outputPath}`);