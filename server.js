/**
 * 个人工作台后端服务
 * Node.js + Express
 */
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 5000;

// 中间件
app.use(cors());
app.use(express.json());

// 静态文件服务
app.use(express.static(path.join(__dirname, '..', '前端')));

// 数据文件路径 - 使用环境变量或默认路径
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'data.json');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 上传目录
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
const ICONS_DIR = path.join(UPLOADS_DIR, 'icons');
const SOUNDS_DIR = path.join(UPLOADS_DIR, 'sounds');
const BACKGROUNDS_DIR = path.join(UPLOADS_DIR, 'backgrounds');

// 确保上传目录存在
function ensureUploadsDir() {
    [UPLOADS_DIR, ICONS_DIR, SOUNDS_DIR, BACKGROUNDS_DIR].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}
ensureUploadsDir();

// 静态文件服务 - 上传的文件
app.use('/uploads', express.static(UPLOADS_DIR));

// Multer 配置 - 图标上传
const iconStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, ICONS_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename = 'icon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9) + ext;
        cb(null, filename);
    }
});
const iconUpload = multer({ 
    storage: iconStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('仅支持 PNG、JPG、SVG 格式'));
        }
    }
});

// Multer 配置 - 声音上传
const soundStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, SOUNDS_DIR),
    filename: (req, file, cb) => {
        let ext = path.extname(file.originalname);
        if (!ext) ext = '.mp3';
        const filename = 'sound_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9) + ext;
        cb(null, filename);
    }
});
const soundUpload = multer({ 
    storage: soundStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('仅支持 MP3、WAV、OGG 格式'));
        }
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
        targetCount: 4,
        soundEnabled: true,
        sounds: [
            { id: 'qing', name: '磬声（默认）', type: 'preset', file: 'sounds/qing.wav' }
        ],
        selectedSoundId: 'qing'
    },
    pomodoroRecords: [],
    memos: [
        { id: 'm1', title: '默认备忘录', content: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ]
};

// 加载数据
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
            
            // 向后兼容：将 shortcuts 迁移到新结构
            if (data.shortcuts && data.shortcuts.length > 0) {
                data.shortcuts = data.shortcuts.map(s => ({
                    ...s,
                    iconType: s.iconType || 'default'
                }));
            }
            
            // 向后兼容：将 pomodoroSettings 迁移到新结构
            if (data.pomodoroSettings) {
                if (!data.pomodoroSettings.sounds) {
                    data.pomodoroSettings.sounds = [
                        { id: 'qing', name: '磬声（默认）', type: 'preset', file: 'sounds/qing.wav' }
                    ];
                }
                if (!data.pomodoroSettings.selectedSoundId) {
                    data.pomodoroSettings.selectedSoundId = 'qing';
                }
            }
            
            console.log('[DEBUG] 从文件加载数据成功');
            return data;
        }
    } catch (err) {
        console.error('[ERROR] 加载数据失败:', err);
    }
    return { ...DEFAULT_DATA };
}

// 保存数据
function saveData(data) {
    try {
        const dir = path.dirname(DATA_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
        console.log('[DEBUG] 数据已保存到:', DATA_FILE);
        return true;
    } catch (err) {
        console.error('[ERROR] 保存数据失败:', err);
        return false;
    }
}

// 路由：主页
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '前端', 'index.html'));
});

// 路由：获取数据
app.get('/api/data', (req, res) => {
    console.log('[DEBUG] 收到获取数据请求');
    const data = loadData();
    res.json({
        success: true,
        data: data,
        message: '数据获取成功'
    });
});

// 路由：保存数据
app.post('/api/data', (req, res) => {
    console.log('[DEBUG] ========== 收到保存请求 ==========');
    console.log('[DEBUG] 数据路径:', DATA_FILE);
    console.log('[DEBUG] 请求体类型:', typeof req.body);
    console.log('[DEBUG] 待办数量:', req.body && req.body.todos ? req.body.todos.length : 0);
    console.log('[DEBUG] 完整请求体:', JSON.stringify(req.body).substring(0, 500));
    
    if (req.body) {
        const success = saveData(req.body);
        console.log('[DEBUG] 保存结果:', success);
        if (success) {
            res.json({
                success: true,
                data: null,
                message: '数据保存成功'
            });
        } else {
            res.status(500).json({
                success: false,
                data: null,
                message: '保存数据失败'
            });
        }
    } else {
        res.status(400).json({
            success: false,
            data: null,
            message: '未收到有效数据'
        });
    }
});

// 路由：导出数据（包含上传的文件）
app.get('/api/export', (req, res) => {
    const data = loadData();
    
    // 创建导出数据副本
    const exportData = JSON.parse(JSON.stringify(data));
    
    // 辅助函数：将文件转为 base64
    function fileToBase64(relativePath) {
        if (!relativePath) return null;
        try {
            // relativePath 格式: /uploads/icons/xxx.png
            const filePath = path.join(__dirname, relativePath);
            if (fs.existsSync(filePath)) {
                const fileBuffer = fs.readFileSync(filePath);
                const ext = path.extname(filePath).toLowerCase();
                const mimeType = {
                    '.png': 'image/png',
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.svg': 'image/svg+xml',
                    '.gif': 'image/gif',
                    '.mp3': 'audio/mpeg',
                    '.wav': 'audio/wav',
                    '.ogg': 'audio/ogg',
                    '.m4a': 'audio/mp4'
                }[ext] || 'application/octet-stream';
                return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
            }
        } catch (err) {
            console.error('读取文件失败:', relativePath, err.message);
        }
        return null;
    }
    
    // 导出自定义图标
    if (exportData.shortcuts) {
        exportData.shortcuts.forEach(shortcut => {
            if (shortcut.customIconPath) {
                const base64 = fileToBase64(shortcut.customIconPath);
                if (base64) {
                    shortcut.customIconBase64 = base64;
                }
            }
            // 处理文件夹内的快捷方式
            if (shortcut.type === 'folder' && shortcut.children) {
                shortcut.children.forEach(child => {
                    if (child.customIconPath) {
                        const base64 = fileToBase64(child.customIconPath);
                        if (base64) {
                            child.customIconBase64 = base64;
                        }
                    }
                });
            }
        });
    }
    
    // 导出背景图片
    if (exportData.settings && exportData.settings.backgroundPath) {
        const base64 = fileToBase64(exportData.settings.backgroundPath);
        if (base64) {
            exportData.settings.backgroundBase64 = base64;
        }
    }
    
    // 导出自定义提示音
    if (exportData.settings && exportData.settings.customSoundPath) {
        const base64 = fileToBase64(exportData.settings.customSoundPath);
        if (base64) {
            exportData.settings.customSoundBase64 = base64;
        }
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = 'workspace_backup_' + timestamp + '.json';
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
    res.send(JSON.stringify(exportData, null, 2));
});

// 路由：导入数据（恢复上传的文件）
const upload = multer({ dest: 'uploads/' });
app.post('/api/import', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '未收到文件'
            });
        }
        
        const fileContent = fs.readFileSync(req.file.path, 'utf-8');
        const data = JSON.parse(fileContent);
        
        // 辅助函数：从 base64 恢复文件
        function base64ToFile(base64Data, type) {
            if (!base64Data) return null;
            try {
                // base64Data 格式: data:image/png;base64,xxxxx
                const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
                if (!matches) return null;
                
                const mimeType = matches[1];
                const base64 = matches[2];
                const buffer = Buffer.from(base64, 'base64');
                
                // 根据类型确定目录和扩展名
                let dir, ext;
                if (mimeType.startsWith('image/')) {
                    dir = ICONS_DIR;
                    ext = mimeType.split('/')[1];
                    if (ext === 'svg+xml') ext = 'svg';
                    if (ext === 'jpeg') ext = 'jpg';
                } else if (mimeType.startsWith('audio/')) {
                    dir = SOUNDS_DIR;
                    ext = mimeType.split('/')[1];
                    if (ext === 'mpeg') ext = 'mp3';
                } else {
                    return null;
                }
                
                // 特殊处理背景图片
                if (type === 'background') {
                    dir = BACKGROUNDS_DIR;
                }
                
                const filename = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
                const filePath = path.join(dir, filename);
                fs.writeFileSync(filePath, buffer);
                
                return `/uploads/${type === 'background' ? 'backgrounds' : (mimeType.startsWith('image/') ? 'icons' : 'sounds')}/${filename}`;
            } catch (err) {
                console.error('恢复文件失败:', err.message);
                return null;
            }
        }
        
        // 恢复自定义图标
        if (data.shortcuts) {
            data.shortcuts.forEach(shortcut => {
                if (shortcut.customIconBase64) {
                    const newPath = base64ToFile(shortcut.customIconBase64, 'icon');
                    if (newPath) {
                        shortcut.customIconPath = newPath;
                    }
                    delete shortcut.customIconBase64;
                }
                // 处理文件夹内的快捷方式
                if (shortcut.type === 'folder' && shortcut.children) {
                    shortcut.children.forEach(child => {
                        if (child.customIconBase64) {
                            const newPath = base64ToFile(child.customIconBase64, 'icon');
                            if (newPath) {
                                child.customIconPath = newPath;
                            }
                            delete child.customIconBase64;
                        }
                    });
                }
            });
        }
        
        // 恢复背景图片
        if (data.settings && data.settings.backgroundBase64) {
            const newPath = base64ToFile(data.settings.backgroundBase64, 'background');
            if (newPath) {
                data.settings.backgroundPath = newPath;
            }
            delete data.settings.backgroundBase64;
        }
        
        // 恢复自定义提示音
        if (data.settings && data.settings.customSoundBase64) {
            const newPath = base64ToFile(data.settings.customSoundBase64, 'sound');
            if (newPath) {
                data.settings.customSoundPath = newPath;
            }
            delete data.settings.customSoundBase64;
        }
        
        saveData(data);
        fs.unlinkSync(req.file.path); // 删除临时文件
        
        res.json({
            success: true,
            message: '数据导入成功'
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: '导入失败: ' + err.message
        });
    }
});

// ==================== 新增 API ====================

/**
 * 获取网站 favicon
 * 使用多个第三方服务提高成功率
 */
app.get('/api/favicon', async (req, res) => {
    const { url } = req.query;
    
    if (!url) {
        return res.status(400).json({
            success: false,
            message: '缺少 url 参数'
        });
    }
    
    try {
        // 解析 URL 获取域名
        const parsedUrl = new URL(url.startsWith('http') ? url : 'https://' + url);
        const hostname = parsedUrl.hostname;
        const origin = parsedUrl.origin;
        
        console.log('[Favicon] 正在获取 ' + hostname + ' 的 favicon');
        
        // 方案1: 尝试直接获取 /favicon.ico（跟随重定向）
        const favicon1 = await tryFetchFaviconWithRedirect(origin + '/favicon.ico');
        if (favicon1) {
            console.log('[Favicon] 成功 (favicon.ico)');
            return res.json({
                success: true,
                data: { faviconUrl: favicon1, method: 'favicon.ico' }
            });
        }
        
        // 方案2: 解析 HTML 页面获取 favicon link
        const favicon2 = await fetchHtmlFavicon(origin);
        if (favicon2) {
            console.log('[Favicon] 成功 (HTML解析)');
            return res.json({
                success: true,
                data: { faviconUrl: favicon2, method: 'html-parse' }
            });
        }
        
        // 方案3: 使用第三方服务（不验证，直接返回URL让前端尝试）
        // IconHorse 服务可以访问被墙的网站
        const iconHorseUrl = 'https://icon.horse/icon/' + hostname;
        console.log('[Favicon] 使用第三方服务:', iconHorseUrl);
        return res.json({
            success: true,
            data: { faviconUrl: iconHorseUrl, method: 'iconhorse' }
        });
        
    } catch (err) {
        console.error('[Favicon] 获取失败:', err.message);
        return res.json({
            success: true,
            data: null,
            message: '抓取失败，可选择手动上传'
        });
    }
});

/**
 * 获取 favicon（跟随重定向）
 */
function tryFetchFaviconWithRedirect(faviconUrl, maxRedirects = 5) {
    return new Promise((resolve) => {
        const fetchWithRedirect = (url, redirects) => {
            if (redirects > maxRedirects) {
                resolve(null);
                return;
            }
            
            const protocol = url.startsWith('https') ? https : http;
            
            protocol.get(url, { 
                timeout: 5000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            }, (response) => {
                // 处理重定向
                if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    let location = response.headers.location;
                    // 处理相对路径
                    if (location.startsWith('//')) {
                        location = (url.startsWith('https') ? 'https:' : 'http:') + location;
                    } else if (location.startsWith('/')) {
                        const urlObj = new URL(url);
                        location = urlObj.origin + location;
                    }
                    console.log('[Favicon] 跟随重定向到:', location);
                    fetchWithRedirect(location, redirects + 1);
                    return;
                }
                
                // 检查是否成功且是图片类型
                if (response.statusCode === 200) {
                    const contentType = (response.headers['content-type'] || '').toLowerCase();
                    console.log('[Favicon] Content-Type:', contentType);
                    
                    // 1. 首先检查 Content-Type 是否明确是图片
                    let isImage = contentType.includes('image') || 
                                 contentType.includes('icon') ||
                                 contentType.includes('favicon');
                    
                    // 2. 如果 Content-Type 不明确（可能是空的或 text/plain），但 URL 看起来像图片，且 URL 不是 /favicon.ico
                    if (!isImage) {
                        const looksLikeImage = url.includes('.png') || 
                                              url.includes('.jpg') || 
                                              url.includes('.jpeg') || 
                                              url.includes('.svg') ||
                                              (url.includes('.ico') && !url.endsWith('/favicon.ico'));
                        
                        if (looksLikeImage) {
                            console.log('[Favicon] URL 看起来像图片，尝试使用:', url);
                            isImage = true;
                        } else {
                            console.log('[Favicon] 不是有效图片，跳过:', contentType);
                            resolve(null);
                            return;
                        }
                    }
                    
                    if (isImage) {
                        console.log('[Favicon] 成功找到有效图标:', url);
                        resolve(url);  // 返回最终URL
                    } else {
                        resolve(null);
                    }
                } else {
                    resolve(null);
                }
            }).on('error', (err) => {
                console.log('[Favicon] 请求错误:', err.message);
                resolve(null);
            })
              .on('timeout', function() { 
                  console.log('[Favicon] 请求超时');
                  this.destroy(); 
                  resolve(null); 
              });
        };
        
        fetchWithRedirect(faviconUrl, 0);
    });
}

/**
 * 尝试获取 favicon 图片
 * @param {string} faviconUrl - favicon URL
 * @param {boolean} skipVerify - 是否跳过验证（第三方服务直接信任）
 */
function tryFetchFavicon(faviconUrl, skipVerify = false) {
    return new Promise((resolve) => {
        const protocol = faviconUrl.startsWith('https') ? https : http;
        
        const req = protocol.get(faviconUrl, { 
            timeout: 5000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }, (res) => {
            // 第三方服务直接信任，或者状态码 200 且是图片类型
            if (skipVerify) {
                resolve(faviconUrl);
            } else if (res.statusCode === 200) {
                const contentType = res.headers['content-type'] || '';
                // 放宽验证：只要是 200 就认为成功（很多 favicon 没有正确的 content-type）
                resolve(faviconUrl);
            } else {
                resolve(null);
            }
        });
        
        req.on('error', () => resolve(null));
        req.on('timeout', () => {
            req.destroy();
            resolve(null);
        });
    });
}

/**
 * 从 HTML 页面中提取 favicon 链接
 */
function fetchHtmlFavicon(origin, maxRedirects = 5) {
    return new Promise((resolve) => {
        const fetchWithRedirect = (url, redirects) => {
            if (redirects > maxRedirects) {
                resolve(null);
                return;
            }
            
            const protocol = url.startsWith('https') ? https : http;
            
            const req = protocol.get(url, { 
                timeout: 5000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            }, (res) => {
                // 处理重定向
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    let location = res.headers.location;
                    if (location.startsWith('//')) {
                        location = (url.startsWith('https') ? 'https:' : 'http:') + location;
                    } else if (location.startsWith('/')) {
                        const urlObj = new URL(url);
                        location = urlObj.origin + location;
                    } else if (!location.startsWith('http')) {
                        const urlObj = new URL(url);
                        location = urlObj.origin + '/' + location;
                    }
                    fetchWithRedirect(location, redirects + 1);
                    return;
                }
                
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        // 匹配 <link rel="icon"> 或 <link rel="apple-touch-icon">
                        const iconMatch = data.match(/<link[^>]+rel=["'].*icon[^"']*["'][^>]+href=["']([^"']+)["']/i) ||
                                         data.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'].*icon[^"']*["']/i);
                        
                        if (iconMatch && iconMatch[1]) {
                            let iconUrl = iconMatch[1];
                            const finalOrigin = new URL(url).origin;
                            
                            // 处理相对路径
                            if (iconUrl.startsWith('//')) {
                                iconUrl = (finalOrigin.startsWith('https') ? 'https:' : 'http:') + iconUrl;
                            } else if (iconUrl.startsWith('/')) {
                                iconUrl = finalOrigin + iconUrl;
                            } else if (!iconUrl.startsWith('http')) {
                                iconUrl = finalOrigin + '/' + iconUrl;
                            }
                            
                            resolve(iconUrl);
                        } else {
                            resolve(null);
                        }
                    } catch (e) {
                        resolve(null);
                    }
                });
            });
            
            req.on('error', () => resolve(null));
            req.on('timeout', () => {
                req.destroy();
                resolve(null);
            });
        };
        
        fetchWithRedirect(origin, 0);
    });
}

/**
 * 上传自定义图标
 */
app.post('/api/upload-icon', iconUpload.single('icon'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '未收到文件'
            });
        }
        
        const filePath = 'uploads/icons/' + req.file.filename;
        const originalName = req.file.originalname;
        
        console.log('[Icon] 上传成功: ' + filePath);
        
        res.json({
            success: true,
            data: {
                path: filePath,
                filename: req.file.filename,
                originalName: originalName
            },
            message: '图标上传成功'
        });
    } catch (err) {
        console.error('[Icon] 上传失败:', err);
        res.status(500).json({
            success: false,
            message: err.message || '上传失败'
        });
    }
});

/**
 * 上传提示音
 */
app.post('/api/upload-sound', soundUpload.single('sound'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '未收到文件'
            });
        }
        
        const filePath = 'uploads/sounds/' + req.file.filename;
        const originalName = req.file.originalname;
        const soundId = 'custom_' + Date.now();
        
        console.log('[Sound] 上传成功: ' + filePath);
        
        res.json({
            success: true,
            data: {
                id: soundId,
                path: filePath,
                filename: req.file.filename,
                originalName: originalName,
                type: 'custom'
            },
            message: '提示音上传成功'
        });
    } catch (err) {
        console.error('[Sound] 上传失败:', err);
        res.status(500).json({
            success: false,
            message: err.message || '上传失败'
        });
    }
});

/**
 * 删除上传的文件
 */
app.delete('/api/file', (req, res) => {
    const { path: filePath, type } = req.query;
    
    if (!filePath) {
        return res.status(400).json({
            success: false,
            message: '缺少文件路径'
        });
    }
    
    // 安全检查：只允许删除 uploads 目录下的文件
    if (!filePath.startsWith('uploads/')) {
        return res.status(403).json({
            success: false,
            message: '非法路径'
        });
    }
    
    const fullPath = path.join(__dirname, filePath);
    
    try {
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            console.log('[File] 已删除: ' + filePath);
            res.json({
                success: true,
                message: '文件删除成功'
            });
        } else {
            res.status(404).json({
                success: false,
                message: '文件不存在'
            });
        }
    } catch (err) {
        console.error('[File] 删除失败:', err);
        res.status(500).json({
            success: false,
            message: '删除失败'
        });
    }
});

// Multer 配置 - 背景图片上传
const bgStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, BACKGROUNDS_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename = 'bg_' + Date.now() + ext;
        cb(null, filename);
    }
});
const bgUpload = multer({
    storage: bgStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('只支持图片文件'));
    }
});

// API: 上传背景图片
app.post('/api/upload-background', bgUpload.single('background'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '未收到文件'
            });
        }
        
        const filePath = '/uploads/backgrounds/' + req.file.filename;
        
        res.json({
            success: true,
            data: {
                path: filePath,
                filename: req.file.filename
            },
            message: '背景图片上传成功'
        });
    } catch (err) {
        console.error('[Background] 上传失败:', err);
        res.status(500).json({
            success: false,
            message: err.message || '上传失败'
        });
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log('服务器已启动: http://localhost:' + PORT);
    console.log('数据文件: ' + DATA_FILE);
    console.log('上传目录: ' + UPLOADS_DIR);
});
