const https = require('https');

function testVisit(url) {
    console.log('正在访问:', url);
    
    const req = https.get(url, { 
        timeout: 5000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    }, (res) => {
        console.log('状态码:', res.statusCode);
        console.log('Content-Type:', res.headers['content-type']);
        console.log('Location:', res.headers.location);
        console.log('');
        
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            let location = res.headers.location;
            if (location.startsWith('//')) {
                location = 'https:' + location;
            }
            console.log('跟随重定向到:', location);
            console.log('');
            testVisit(location);
            return;
        }
        
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log('HTML 长度:', data.length);
            console.log('');
            
            // 搜索 icon
            const iconMatch = data.match(/<link[^>]+rel=["'].*icon[^"']*["'][^>]+href=["']([^"']+)["']/i) ||
                             data.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'].*icon[^"']*["']/i);
            
            if (iconMatch) {
                console.log('✅ 找到图标:', iconMatch[1]);
            } else {
                console.log('❌ 未找到图标');
                console.log('');
                console.log('打印前 5000 字符:');
                console.log(data.substring(0, 5000));
            }
        });
    });
    
    req.on('error', (err) => console.log('错误:', err));
    req.on('timeout', () => {
        req.destroy();
        console.log('超时');
    });
}

testVisit('https://coze.com');
