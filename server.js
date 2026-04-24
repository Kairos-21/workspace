/**
 * 个人工作台后端服务 - 用于部署
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

// 静态文件服务 - 注意路径：从根目录直接找 前端/
app.use(express.static(path.join(__dirname, '前端')));

// 数据文件路径 - 使用环境变量或默认路径
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
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

// 读取默认数据文件
function getDefaultData() {
  const fs = require('fs');
  const path = require('path');
  try {
    const dataPath = path.join(__dirname, 'workspace-backup-2026-04-24-default.json');
    const dataContent = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(dataContent);
  } catch (err) {
    console.error('读取默认数据文件失败:', err);
    // 如果读取失败，返回简单的默认数据
    return {
      todos: [],
      schedules: [],
      shortcuts: [],
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
      ],
      todosByDate: {},
      settings: {}
    };
  }
}

// 默认数据
const DEFAULT_DATA = getDefaultData();

// 加载数据（始终返回默认数据，不读取文件）
function loadData() {
    console.log('[INFO] 加载默认数据');
    return { ...DEFAULT_DATA };
}

// 保存数据
function saveData(data) {
    try {
        const dir = path.dirname(DATA_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        console.log('[DEBUG] 数据已保存到:', DATA_FILE);
        return true;
    } catch (err) {
        console.error('[ERROR] 保存数据失败:', err);
        return false;
    }
}

// 路由：主页 - 注意路径
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '前端', 'index.html'));
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

// 路由：保存数据（现在不真正保存，保持后端数据为默认）
app.post('/api/data', (req, res) => {
    console.log('[INFO] 收到保存请求，但现在只使用 LocalStorage，不保存到后端');
    res.json({
        success: true,
        data: null,
        message: '数据已安全保存在本地浏览器'
    });
});

// 禁用：导出数据
app.get('/api/export', (req, res) => {
    res.status(501).json({
        success: false,
        message: '数据导出已完全迁移到前端，请在浏览器中操作'
    });
});

// 禁用：导入数据
app.post('/api/import', (req, res) => {
    res.status(501).json({
        success: false,
        message: '数据导入已完全迁移到前端，请在浏览器中操作'
    });
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
        
        // 方案0: 直接使用 Google 服务（特别适用于 Google 旗下网站）
        const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
        console.log('[Favicon] 尝试使用 Google 服务:', googleFaviconUrl);
        return res.json({
            success: true,
            data: { faviconUrl: googleFaviconUrl, method: 'google-service' }
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
                message: '没有上传文件'
            });
        }
        
        const iconUrl = `/uploads/icons/${req.file.filename}`;
        console.log('[Upload] 图标上传成功:', iconUrl);
        
        res.json({
            success: true,
            data: {
                filename: req.file.filename,
                url: iconUrl,
                size: req.file.size
            },
            message: '图标上传成功'
        });
    } catch (err) {
        console.error('[Upload] 图标上传失败:', err);
        res.status(500).json({
            success: false,
            message: '图标上传失败'
        });
    }
});

/**
 * 上传提示音
 */
app.post('/api/upload-sound', (req, res) => {
    res.status(501).json({
        success: false,
        message: '提示音上传已完全迁移到前端，请在浏览器中操作'
    });
});

/**
 * 删除上传的文件
 */
app.delete('/api/file', (req, res) => {
    res.status(501).json({
        success: false,
        message: '文件删除已完全迁移到前端，请在浏览器中操作'
    });
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
app.post('/api/upload-background', (req, res) => {
    res.status(501).json({
        success: false,
        message: '背景上传已完全迁移到前端，请在浏览器中操作'
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log('服务器已启动: http://localhost:' + PORT);
    console.log('数据文件: ' + DATA_FILE);
    console.log('上传目录: ' + UPLOADS_DIR);
});
