
const fs = require('fs');
const path = require('path');

// 读取原始备份文件
const rawData = fs.readFileSync(path.join(__dirname, 'workspace-backup-2026-04-24T07-03-10.json'), 'utf8');
const data = JSON.parse(rawData);

// 修改背景图路径为文件引用
if (data.settings) {
    data.settings.backgroundPath = '西湖烟雨.jpg';
}

// 写入新的默认数据文件
fs.writeFileSync(
    path.join(__dirname, 'workspace-backup-2026-04-24-default.json'),
    JSON.stringify(data, null, 2),
    'utf8'
);

console.log('已完成！默认数据文件已更新，背景图已改为文件引用。');
