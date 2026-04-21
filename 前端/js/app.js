/**
 * 个人工作台 - 主入口
 * 负责：数据加载、API通信、全局状态管理
 * 多用户方案：优先使用 LocalStorage，实现用户隔离
 */

// 全局数据存储
let appData = {
    todos: [],
    schedules: [],
    shortcuts: [],
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

// API 基础路径
const API_BASE = '';

// LocalStorage Key
const STORAGE_KEY = 'personal-workspace-data';

// 保存状态定时器
let saveTimer = null;

// ========================================
// 数据通信（LocalStorage优先）
// ========================================

/**
 * 加载所有数据
 */
async function loadData() {
    try {
        // 1. 先尝试从 LocalStorage 加载
        const localData = localStorage.getItem(STORAGE_KEY);
        if (localData) {
            const parsedData = JSON.parse(localData);
            Object.assign(window.appData, parsedData);
            console.log('✅ 从 LocalStorage 加载数据成功');
            showToast('已加载你的个人数据');
            initBackground();
            initAllModules();
            return;
        }
        
        // 2. LocalStorage 没有数据，从后端加载默认数据
        console.log('ℹ️ LocalStorage 无数据，从后端加载默认数据');
        showToast('欢迎！这是你的第一次访问');
        const response = await fetch(`${API_BASE}/api/data`);
        const result = await response.json();
        
        if (result.success) {
            Object.assign(window.appData, result.data);
            // 保存一份到 LocalStorage，下次直接用
            saveToLocalStorage();
            console.log('✅ 从后端加载数据并保存到 LocalStorage');
        } else {
            console.error('❌ 加载数据失败:', result.message);
            showToast('数据加载失败，使用默认数据');
        }
        
        // 初始化背景和模块
        initBackground();
        initAllModules();
        
    } catch (error) {
        console.error('❌ 加载数据失败:', error);
        showToast('无法连接服务器，使用本地数据');
        initBackground();
        initAllModules();
    }
}

/**
 * 保存数据到 LocalStorage
 */
function saveToLocalStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
        console.log('数据已保存到 LocalStorage');
    } catch (error) {
        console.error('保存到 LocalStorage 失败:', error);
    }
}

/**
 * 保存所有数据（只存 LocalStorage，不碰后端，实现完全用户隔离）
 */
async function saveData() {
    // 只保存到 LocalStorage，完全隔离用户数据
    saveToLocalStorage();
}

/**
 * 延迟保存（防抖）
 */
function debouncedSave() {
    if (saveTimer) {
        clearTimeout(saveTimer);
    }
    saveTimer = setTimeout(() => {
        saveData();
    }, 500);
}

// ========================================
// 全局状态管理
// ========================================

/**
 * 生成唯一ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * 获取当前日期字符串
 */
function getToday() {
    return new Date().toISOString().split('T')[0];
}

// ========================================
// 模态框管理
// ========================================

/**
 * 显示模态框
 */
function showModal(title, bodyHtml, footerHtml) {
    const overlay = document.getElementById('modalOverlay');
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');
    const modalClose = document.getElementById('modalClose');
    
    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHtml;
    modalFooter.innerHTML = footerHtml;
    
    overlay.classList.add('active');
    
    // 关闭事件
    const closeModal = () => {
        overlay.classList.remove('active');
    };
    
    modalClose.onclick = closeModal;
    overlay.onclick = (e) => {
        if (e.target === overlay) closeModal();
    };
    
    return { closeModal };
}

/**
 * 确认对话框
 */
function showConfirm(message, onConfirm) {
    const footerHtml = `
        <button class="btn btn-secondary" id="confirmCancel">取消</button>
        <button class="btn btn-danger" id="confirmOk">确定</button>
    `;
    
    const { closeModal } = showModal('确认操作', `<p>${message}</p>`, footerHtml);
    
    document.getElementById('confirmCancel').onclick = closeModal;
    document.getElementById('confirmOk').onclick = () => {
        closeModal();
        onConfirm();
    };
}

// ========================================
// Toast 提示
// ========================================

let toastTimer = null;

/**
 * 显示Toast提示
 */
function showToast(message, duration = 1500) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    if (toastTimer) {
        clearTimeout(toastTimer);
    }
    
    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// ========================================
// 导入导出功能
// ========================================

/**
 * 导出数据
 */
function exportData() {
    window.location.href = `${API_BASE}/api/export`;
    showToast('正在导出数据...');
}

/**
 * 导入数据
 */
function importData(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    fetch(`${API_BASE}/api/import`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showToast('数据导入成功，正在刷新...');
            setTimeout(() => {
                location.reload();
            }, 1000);
        } else {
            showToast('导入失败: ' + result.message);
        }
    })
    .catch(error => {
        console.error('导入失败:', error);
        showToast('导入失败');
    });
}

// ========================================
// 背景管理功能
// ========================================

/**
 * 应用背景图片
 */
function applyBackground(bgPath) {
    if (bgPath) {
        // 如果是相对路径，添加API_BASE前缀
        const fullPath = bgPath.startsWith('http') ? bgPath : `${API_BASE}${bgPath}`;
        document.body.style.backgroundImage = `url('${fullPath}')`;
    } else {
        document.body.style.backgroundImage = '';
    }
}

/**
 * 初始化背景
 */
function initBackground() {
    if (appData.settings && appData.settings.backgroundPath) {
        applyBackground(appData.settings.backgroundPath);
    }
}

/**
 * 打开背景更换弹窗
 */
function openBgModal() {
    const modal = document.getElementById('bgModal');
    const preview = document.getElementById('bgPreview');
    const previewImg = document.getElementById('bgPreviewImg');
    
    // 显示当前背景预览
    if (appData.settings && appData.settings.backgroundPath) {
        const bgPath = appData.settings.backgroundPath;
        const fullPath = bgPath.startsWith('http') ? bgPath : `${API_BASE}${bgPath}`;
        previewImg.src = fullPath;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
    
    modal.style.display = 'flex';
}

/**
 * 关闭背景更换弹窗
 */
function closeBgModal() {
    document.getElementById('bgModal').style.display = 'none';
    document.getElementById('bgFileInput').value = '';
}

/**
 * 上传并保存背景
 */
function uploadBackground(file) {
    const formData = new FormData();
    formData.append('background', file);
    
    showToast('正在上传背景...');
    
    fetch(`${API_BASE}/api/upload-background`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            // 保存背景路径
            if (!appData.settings) appData.settings = {};
            appData.settings.backgroundPath = result.data.path;
            saveData();
            
            // 应用背景
            applyBackground(result.data.path);
            showToast('背景更换成功');
            closeBgModal();
        } else {
            showToast('上传失败: ' + result.message);
        }
    })
    .catch(error => {
        console.error('上传背景失败:', error);
        showToast('上传失败');
    });
}

/**
 * 重置为默认背景
 */
function resetBackground() {
    if (appData.settings) {
        appData.settings.backgroundPath = '';
        saveData();
    }
    applyBackground('');
    showToast('已恢复默认背景');
    closeBgModal();
}

// ========================================
// 初始化
// ========================================

/**
 * 初始化所有模块
 */
function initAllModules() {
    // 初始化各个模块
    initTodoModule();
    initCalendarModule();
    initShortcutsModule();
    initPomodoroModule();
    initMemoModule();
}

/**
 * 全局初始化
 */
document.addEventListener('DOMContentLoaded', () => {
    // 加载数据（会在加载完成后自动初始化背景和模块）
    loadData();
    
    // 绑定导入导出按钮
    document.getElementById('exportBtn').onclick = exportData;
    document.getElementById('importBtn').onclick = () => {
        document.getElementById('importFile').click();
    };
    document.getElementById('importFile').onchange = (e) => {
        if (e.target.files.length > 0) {
            importData(e.target.files[0]);
            e.target.value = '';
        }
    };
    
    // 绑定背景管理按钮
    document.getElementById('bgBtn').onclick = openBgModal;
    document.getElementById('closeBgModal').onclick = closeBgModal;
    document.getElementById('bgFileInput').onchange = (e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            // 显示预览
            const reader = new FileReader();
            reader.onload = (event) => {
                document.getElementById('bgPreviewImg').src = event.target.result;
                document.getElementById('bgPreview').style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    };
    document.getElementById('saveBgBtn').onclick = () => {
        const fileInput = document.getElementById('bgFileInput');
        if (fileInput.files.length > 0) {
            uploadBackground(fileInput.files[0]);
        } else {
            showToast('请先选择背景图片');
        }
    };
    document.getElementById('resetBgBtn').onclick = resetBackground;
    
    // 点击弹窗外部关闭
    document.getElementById('bgModal').onclick = (e) => {
        if (e.target.id === 'bgModal') {
            closeBgModal();
        }
    };
});

// 导出全局函数供其他模块使用
window.appData = appData;
window.saveData = saveData;
window.debouncedSave = debouncedSave;
window.generateId = generateId;
window.getToday = getToday;
window.showModal = showModal;
window.showConfirm = showConfirm;
window.showToast = showToast;
