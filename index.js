/**
 * 项目启动入口 - 确保路径正确
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// 中间件
app.use(cors());
app.use(express.json());

// 静态文件服务 - 直接指向前端目录
app.use(express.static(path.join(__dirname, '前端')));

// 确保数据目录存在
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DATA_FILE = path.join(DATA_DIR, 'data.json');

// 确保上传目录存在
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const ICONS_DIR = path.join(UPLOADS_DIR, 'icons');
const SOUNDS_DIR = path.join(UPLOADS_DIR, 'sounds');
const BACKGROUNDS_DIR = path.join(UPLOADS_DIR, 'backgrounds');
[UPLOADS_DIR, ICONS_DIR, SOUNDS_DIR, BACKGROUNDS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// 默认数据
const DEFAULT_DATA = {
    todos: [],
    schedules: [],
    shortcuts: [
        { id: 's1', name: 'GitHub', url: 'https://github.com', icon: 'github', type: 'web', iconType: 'default' },
        { id: 's2', name: 'Google', url: 'https://google.com', icon: 'google', type: 'web', iconType: 'default' },
        { id: 's3', name: 'Bilibili', url: 'https://bilibili.com', icon: 'bilibili', type: 'web', iconType: 'default' },
        { id: 's4', name: '知乎', url: 'https://zhihu.com', icon: 'zhihu', type: 'web', iconType: 'default' },
        { id: 's5', name: '掘金', url: 'https://juejin.cn', icon: 'juejin', type: 'web', iconType: 'default' },
        { id: 's6', name: 'Notion', url: 'https://notion.so', icon: 'notion', type: 'web', iconType: 'default' }
    ],
    pomodoroSettings: {
        workDuration: 25,
        shortBreak: 5,
        longBreak: 15,
        longBreakInterval: 4,
        soundEnabled: true
    },
    pomodoroRecords: [],
    memos: []
};

// 读取数据
function readData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            return data;
        }
    } catch (e) {
        console.error('读取数据失败:', e);
    }
    return DEFAULT_DATA;
}

// 保存数据
function saveData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('保存数据失败:', e);
        return false;
    }
}

// API - 获取数据
app.get('/api/data', (req, res) => {
    res.json({
        success: true,
        data: readData()
    });
});

// API - 保存数据
app.post('/api/data', (req, res) => {
    const success = saveData(req.body);
    res.json({ success, message: success ? '保存成功' : '保存失败' });
});

// 启动服务器
app.listen(PORT, () => {
    console.log('🚀 服务器已启动: http://localhost:' + PORT);
});
