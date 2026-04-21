const https = require('https');
const http = require('http');

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
                if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    let location = response.headers.location;
                    if (location.startsWith('//')) {
                        location = (url.startsWith('https') ? 'https:' : 'http:') + location;
                    } else if (location.startsWith('/')) {
                        const urlObj = new URL(url);
                        location = urlObj.origin + location;
                    }
                    fetchWithRedirect(location, redirects + 1);
                    return;
                }
                
                if (response.statusCode === 200) {
                    const contentType = (response.headers['content-type'] || '').toLowerCase();
                    
                    let isImage = contentType.includes('image') || 
                                 contentType.includes('icon') ||
                                 contentType.includes('favicon');
                    
                    if (!isImage) {
                        const looksLikeImage = url.includes('.png') || 
                                              url.includes('.jpg') || 
                                              url.includes('.jpeg') || 
                                              url.includes('.svg') ||
                                              (url.includes('.ico') && !url.endsWith('/favicon.ico'));
                        
                        if (looksLikeImage) {
                            isImage = true;
                        } else {
                            resolve(null);
                            return;
                        }
                    }
                    
                    resolve(url);
                } else {
                    resolve(null);
                }
            }).on('error', () => resolve(null))
              .on('timeout', function() { this.destroy(); resolve(null); });
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
                        const iconMatch = data.match(/<link[^>]+rel=["'].*icon[^"']*["'][^>]+href=["']([^"']+)["']/i) ||
                                         data.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'].*icon[^"']*["']/i);
                        
                        if (iconMatch && iconMatch[1]) {
                            let iconUrl = iconMatch[1];
                            const finalOrigin = new URL(url).origin;
                            
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

async function getFavicon(url) {
    const parsedUrl = new URL(url.startsWith('http') ? url : 'https://' + url);
    const hostname = parsedUrl.hostname;
    const origin = parsedUrl.origin;
    
    console.log('========================================');
    console.log('获取', url, '的 favicon');
    console.log('========================================\n');
    
    console.log('🔹 方案1: /favicon.ico');
    const favicon1 = await tryFetchFaviconWithRedirect(origin + '/favicon.ico');
    if (favicon1) {
        console.log('✅ 成功!', favicon1);
        return { success: true, faviconUrl: favicon1, method: 'favicon.ico' };
    }
    console.log('❌ 失败\n');
    
    console.log('🔹 方案2: 解析 HTML (跟随重定向)');
    const favicon2 = await fetchHtmlFavicon(origin);
    if (favicon2) {
        console.log('✅ 找到图标!', favicon2);
        console.log('验证中...');
        const verify = await tryFetchFaviconWithRedirect(favicon2);
        if (verify) {
            console.log('✅ 验证成功!', verify);
            return { success: true, faviconUrl: verify, method: 'html-parse' };
        }
        console.log('⚠️ 验证失败，但使用该 URL\n');
        return { success: true, faviconUrl: favicon2, method: 'html-parse' };
    }
    console.log('❌ 失败\n');
    
    console.log('🔹 方案3: 第三方服务 IconHorse');
    const iconHorseUrl = 'https://icon.horse/icon/' + hostname;
    console.log('✅ 使用', iconHorseUrl);
    return { success: true, faviconUrl: iconHorseUrl, method: 'iconhorse' };
}

getFavicon('https://coze.com').then(result => {
    console.log('\n========================================');
    console.log('最终结果:');
    console.log(result);
    console.log('========================================');
}).catch(err => {
    console.error('错误:', err);
});
