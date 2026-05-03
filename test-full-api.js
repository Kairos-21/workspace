const https = require('https');
const http = require('http');

// 完全复制 server.js 中的代码
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

async function testAPI(url) {
    const parsedUrl = new URL(url.startsWith('http') ? url : 'https://' + url);
    const hostname = parsedUrl.hostname;
    const origin = parsedUrl.origin;
    
    console.log('========================================');
    console.log('测试 /api/favicon?url=' + url);
    console.log('========================================\n');
    
    console.log('[Favicon] 正在获取 ' + hostname + ' 的 favicon\n');
    
    console.log('🔹 方案1: /favicon.ico');
    const favicon1 = await tryFetchFaviconWithRedirect(origin + '/favicon.ico');
    if (favicon1) {
        console.log('[Favicon] 成功 (favicon.ico)\n');
        console.log('返回:', { success: true, data: { faviconUrl: favicon1, method: 'favicon.ico' } });
        return;
    }
    console.log('[Favicon] 方案1 失败\n');
    
    console.log('🔹 方案2: 解析 HTML');
    const favicon2 = await fetchHtmlFavicon(origin);
    if (favicon2) {
        console.log('[Favicon] 成功 (HTML解析)\n');
        console.log('返回:', { success: true, data: { faviconUrl: favicon2, method: 'html-parse' } });
        return;
    }
    console.log('[Favicon] 方案2 失败\n');
    
    console.log('🔹 方案3: IconHorse');
    const iconHorseUrl = 'https://icon.horse/icon/' + hostname;
    console.log('[Favicon] 使用第三方服务:', iconHorseUrl, '\n');
    console.log('返回:', { success: true, data: { faviconUrl: iconHorseUrl, method: 'iconhorse' } });
}

testAPI('https://coze.com').then(() => {
    console.log('\n========================================');
    console.log('测试完成！');
    console.log('========================================');
}).catch(err => {
    console.error('错误:', err);
});
