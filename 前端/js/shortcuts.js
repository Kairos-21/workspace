/**
 * 个人工作台 - 常用工具模块
 * 支持网页链接和本地应用（通过 URI Scheme）
 */

// 预置图标库
const PRESET_ICONS = {
    // 网站图标
    github: '🐙',
    google: '🔍',
    bilibili: '📺',
    zhihu: '💬',
    juejin: '✍️',
    notion: '📓',
    vscode: '💻',
    stackoverflow: '🔧',
    wechat: '💬',
    douyin: '🎵',
    taobao: '🛒',
    jd: '📦',
    baidu: '🔎',
    csdn: '📝',
    npm: '📦',
    figma: '🎨',
    twitter: '🐦',
    youtube: '▶️',
    reddit: '🤖',
    // 本地应用图标
    app_vscode: '💻',
    app_wechat: '💬',
    app_qq: '🐧',
    app_dingtalk: '📌',
    app_zoom: '📹',
    app_feishu: '✈️',
    app_telegram: '✈️',
    app_spotify: '🎵',
    app_discord: '🎮',
    app_steam: '🎮',
    app_baidunetdisk: '☁️',
    default: '🔗',
    app_default: '📱'
};

// 预置网站
const PRESET_SITES = [
    { name: 'GitHub', url: 'https://github.com', icon: 'github', type: 'web' },
    { name: 'Google', url: 'https://google.com', icon: 'google', type: 'web' },
    { name: 'Bilibili', url: 'https://bilibili.com', icon: 'bilibili', type: 'web' },
    { name: '知乎', url: 'https://zhihu.com', icon: 'zhihu', type: 'web' },
    { name: '掘金', url: 'https://juejin.cn', icon: 'juejin', type: 'web' },
    { name: 'Notion', url: 'https://notion.so', icon: 'notion', type: 'web' },
    { name: 'VS Code', url: 'https://code.visualstudio.com', icon: 'vscode', type: 'web' },
    { name: 'Stack Overflow', url: 'https://stackoverflow.com', icon: 'stackoverflow', type: 'web' },
    { name: '微信读书', url: 'https://weread.qq.com', icon: 'wechat', type: 'web' },
    { name: 'Figma', url: 'https://figma.com', icon: 'figma', type: 'web' }
];

// 预置本地应用（使用 URI Scheme）
const PRESET_APPS = [
    { name: 'VS Code', url: 'vscode://', icon: 'app_vscode', type: 'app' },
    { name: '微信', url: 'weixin://', icon: 'app_wechat', type: 'app' },
    { name: 'QQ', url: 'tencent://', icon: 'app_qq', type: 'app' },
    { name: '钉钉', url: 'dingtalk://', icon: 'app_dingtalk', type: 'app' },
    { name: 'Zoom', url: 'zoommtg://', icon: 'app_zoom', type: 'app' },
    { name: '飞书', url: 'feishu://', icon: 'app_feishu', type: 'app' },
    { name: 'Telegram', url: 'tg://', icon: 'app_telegram', type: 'app' },
    { name: 'Spotify', url: 'spotify://', icon: 'app_spotify', type: 'app' },
    { name: 'Discord', url: 'discord://', icon: 'app_discord', type: 'app' },
    { name: 'Steam', url: 'steam://', icon: 'app_steam', type: 'app' },
    { name: '百度网盘', url: 'baidunetdisk://', icon: 'app_baidunetdisk', type: 'app' }
];

// DOM 元素引用
let shortcutsGridEl = null;
let addShortcutBtnEl = null;
let addFolderBtnEl = null;

// 当前编辑状态
let currentEditingId = null;
let currentIconType = 'default';
let currentFaviconUrl = null;
let currentCustomIconPath = null;

/**
 * 初始化常用工具模块
 */
function initShortcutsModule() {
    shortcutsGridEl = document.getElementById('shortcutsGrid');
    addShortcutBtnEl = document.getElementById('addShortcutBtn');
    addFolderBtnEl = document.getElementById('addFolderBtn');
    
    // 绑定按钮事件
    if (addShortcutBtnEl) addShortcutBtnEl.onclick = showAddShortcutModal;
    if (addFolderBtnEl) addFolderBtnEl.onclick = showAddFolderModal;
    
    // 渲染快捷方式
    renderShortcuts();
}

/**
 * 渲染快捷方式列表
 */
function renderShortcuts() {
    const shortcuts = window.appData.shortcuts;
    
    if (shortcuts.length === 0) {
        shortcutsGridEl.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">🔗</div>
                <div class="empty-state-text">暂无快捷方式，点击上方按钮添加</div>
            </div>
        `;
        return;
    }
    
    // 分离文件夹和普通快捷方式（保持原有顺序）
    const folders = shortcuts.filter(s => s.type === 'folder');
    const normalShortcuts = shortcuts.filter(s => s.type !== 'folder');
    
    let html = '';
    
    // 网格模式 - 先渲染文件夹，再渲染普通快捷方式
    folders.forEach(folder => {
        html += createFolderHtml(folder);
    });
    normalShortcuts.forEach(shortcut => {
        html += createShortcutHtml(shortcut);
    });
    
    shortcutsGridEl.innerHTML = html;
    
    // 绑定点击事件
    bindShortcutEvents();
    
    // 绑定拖动事件
    bindShortcutDragEvents();
}

/**
 * 绑定快捷方式事件
 */
function bindShortcutEvents() {
    shortcutsGridEl.querySelectorAll('.shortcut-item').forEach(item => {
        const id = item.dataset.id;
        const isFolder = item.dataset.type === 'folder';
        
        if (isFolder) {
            const isPreviewMode = item.classList.contains('folder-preview-mode');
            const isClickable = item.classList.contains('clickable-items');
            
            if (isPreviewMode && isClickable) {
                // 预览模式 + ≤4个工具：点击工具直接打开，点击其他区域打开弹窗
                item.querySelectorAll('.folder-preview-item').forEach(toolItem => {
                    toolItem.onclick = (e) => {
                        e.stopPropagation();
                        const toolId = toolItem.dataset.id;
                        const shortcut = findShortcutById(toolId);
                        if (shortcut) {
                            openShortcut(shortcut);
                        }
                    };
                    
                    // 预览模式下的 folder-preview-item 也支持拖拽插入位置
                    toolItem.ondragover = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const draggedId = e.dataTransfer.getData('text/plain');
                        if (draggedId && draggedId !== toolItem.dataset.id) {
                            // 计算插入位置
                            const rect = toolItem.getBoundingClientRect();
                            const midX = rect.left + rect.width / 2;
                            const midY = rect.top + rect.height / 2;
                            
                            // 获取该 item 在文件夹 children 中的索引
                            const folder = window.appData.shortcuts.find(s => s.id === id);
                            const toolIndex = folder.children ? folder.children.findIndex(c => c.id === toolItem.dataset.id) : -1;
                            
                            if (toolIndex > -1) {
                                // 根据鼠标位置决定插入在这个 item 的前面还是后面
                                if (e.clientX < midX && e.clientY < midY) {
                                    targetFolderInsertIndex = toolIndex;
                                } else {
                                    targetFolderInsertIndex = toolIndex + 1;
                                }
                            }
                            
                            item.classList.add('drag-over');
                            toolItem.classList.add('drag-over-item');
                        }
                    };
                    
                    toolItem.ondragleave = (e) => {
                        toolItem.classList.remove('drag-over-item');
                        if (!item.contains(e.relatedTarget)) {
                            item.classList.remove('drag-over');
                            targetFolderInsertIndex = null;
                        }
                    };
                });
                
                // 点击其他区域（非图标）打开弹窗
                item.onclick = (e) => {
                    if (!e.target.closest('.folder-preview-item')) {
                        showFolderModal(id);
                    }
                };
            } else {
                // 图标模式 或 预览模式+>4个工具：点击任意位置打开弹窗
                item.onclick = () => {
                    showFolderModal(id);
                };
            }
            
            // 文件夹作为拖放目标 - 加强拖拽处理
            item.ondragover = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // 如果是预览模式且有 folder-preview-item，让他们自己处理
                if (isPreviewMode && isClickable) {
                    const hoveredPreviewItem = e.target.closest('.folder-preview-item');
                    if (!hoveredPreviewItem) {
                        targetFolderInsertIndex = null;  // 没有悬停在 item 上，插入到最后
                    }
                } else {
                    // 图标模式，总是插入到最后
                    targetFolderInsertIndex = null;
                }
                
                item.classList.add('drag-over');
            };
            
            item.ondragleave = (e) => {
                // 只有当真正离开文件夹元素时才移除样式
                if (!item.contains(e.relatedTarget)) {
                    item.classList.remove('drag-over');
                    // 清除所有 folder-preview-item 的样式
                    item.querySelectorAll('.folder-preview-item').forEach(pi => pi.classList.remove('drag-over-item'));
                    targetFolderInsertIndex = null;
                }
            };
            
            item.ondrop = (e) => {
                e.preventDefault();
                e.stopPropagation();
                item.classList.remove('drag-over');
                item.querySelectorAll('.folder-preview-item').forEach(pi => pi.classList.remove('drag-over-item'));
                
                const draggedId = e.dataTransfer.getData('text/plain');
                if (draggedId && draggedId !== id) {
                    wasDroppedToFolder = true;  // 标记已经拖到文件夹
                    moveShortcutToFolder(draggedId, id, targetFolderInsertIndex);
                }
                
                targetFolderInsertIndex = null;
            };
        } else {
            // 普通快捷方式
            item.onclick = (e) => {
                if (!e.target.closest('.shortcut-actions')) {
                    const shortcut = findShortcutById(id);
                    if (shortcut) {
                        openShortcut(shortcut);
                    }
                }
            };
            
            const editBtn = item.querySelector('.shortcut-action-btn:not(.delete)');
            const deleteBtn = item.querySelector('.shortcut-action-btn.delete');
            
            if (editBtn) {
                editBtn.onclick = () => showEditShortcutModal(id);
            }
            
            if (deleteBtn) {
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    window.showConfirm('确定要删除这个快捷方式吗？', () => {
                        deleteShortcut(id);
                    });
                };
            }
        }
    });
}

/**
 * 显示文件夹弹窗
 */
function showFolderModal(folderId) {
    const folder = window.appData.shortcuts.find(s => s.id === folderId);
    if (!folder) return;
    
    const children = folder.children || [];
    
    const bodyHtml = `
        <div class="folder-modal-content">
            <div class="folder-modal-header" style="display: flex; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border-color);">
                <span style="font-size: 1.5rem; margin-right: 8px;">${folder.icon || '📁'}</span>
                <span style="font-size: 1.1rem; font-weight: 600;">${escapeHtml(folder.name)}</span>
                <div style="margin-left: auto; display: flex; gap: 8px;">
                    <button class="btn btn-sm" id="editFolderBtn">✏️ 编辑</button>
                    <button class="btn btn-sm btn-danger" id="deleteFolderBtn">🗑️ 删除</button>
                </div>
            </div>
            <div class="folder-tools-grid" id="folderToolsGrid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; min-height: 100px; padding: 8px; border: 2px dashed var(--border-color); border-radius: 8px;">
                ${children.length === 0 ? '<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 20px;">拖动工具到这里添加</div>' : ''}
                ${children.map(child => createFolderToolHtml(child, folderId)).join('')}
            </div>
            <div style="margin-top: 12px; color: var(--text-secondary); font-size: 0.8rem; text-align: center;">
                💡 提示：直接拖动工具到文件夹即可添加
            </div>
        </div>
    `;
    
    const footerHtml = `
        <button class="btn btn-secondary" id="closeFolderModal">关闭</button>
    `;
    
    const { closeModal } = window.showModal(folder.name, bodyHtml, footerHtml, { width: '500px' });
    
    // 关闭按钮
    document.getElementById('closeFolderModal').onclick = closeModal;
    
    // 编辑按钮
    document.getElementById('editFolderBtn').onclick = () => {
        closeModal();
        setTimeout(() => showEditFolderModal(folderId), 100);
    };
    
    // 删除按钮
    document.getElementById('deleteFolderBtn').onclick = () => {
        window.showConfirm('确定要删除这个文件夹吗？文件夹内的快捷方式将移回根目录。', () => {
            deleteFolder(folderId);
            closeModal();
        });
    };
    
    // 绑定弹窗内工具的事件和拖放
    bindFolderModalEvents(folderId);
}

/**
 * 创建文件夹内工具的HTML
 */
function createFolderToolHtml(shortcut, folderId) {
    const iconHtml = getIconContent(shortcut);
    const type = shortcut.type || 'web';
    
    return `
        <div class="folder-tool-item" data-id="${shortcut.id}" draggable="true" style="display: flex; flex-direction: column; align-items: center; padding: 12px 8px; background: var(--bg-primary); border-radius: 8px; cursor: pointer; position: relative;">
            <div class="folder-tool-icon" style="font-size: 1.5rem; margin-bottom: 4px;">${iconHtml}</div>
            <span class="folder-tool-name" style="font-size: 0.8rem; text-align: center; word-break: break-all; max-width: 70px;">${escapeHtml(shortcut.name)}</span>
            <button class="folder-tool-remove" data-id="${shortcut.id}" title="移出文件夹" style="position: absolute; top: 2px; right: 2px; border: none; background: var(--bg-secondary); cursor: pointer; font-size: 0.7rem; padding: 2px 4px; border-radius: 2px; opacity: 0;">✕</button>
        </div>
    `;
}

/**
 * 绑定文件夹弹窗内的事件
 */
function bindFolderModalEvents(folderId) {
    const grid = document.getElementById('folderToolsGrid');
    if (!grid) return;
    
    // 拖放到弹窗区域添加工具
    grid.ondragover = (e) => {
        e.preventDefault();
        grid.style.borderColor = 'var(--primary)';
        grid.style.background = 'var(--bg-secondary)';
    };
    
    grid.ondragleave = () => {
        grid.style.borderColor = 'var(--border-color)';
        grid.style.background = 'transparent';
    };
    
    grid.ondrop = (e) => {
        e.preventDefault();
        grid.style.borderColor = 'var(--border-color)';
        grid.style.background = 'transparent';
        
        const draggedId = e.dataTransfer.getData('text/plain');
        if (draggedId) {
            moveShortcutToFolder(draggedId, folderId);
            // 刷新弹窗
            showFolderModal(folderId);
        }
    };
    
    // 绑定工具事件
    grid.querySelectorAll('.folder-tool-item').forEach(item => {
        const id = item.dataset.id;
        
        // 点击打开
        item.onclick = (e) => {
            if (!e.target.closest('.folder-tool-remove')) {
                const shortcut = findShortcutById(id);
                if (shortcut) {
                    openShortcut(shortcut);
                }
            }
        };
        
        // 悬停显示移除按钮
        item.onmouseenter = () => {
            item.querySelector('.folder-tool-remove').style.opacity = '1';
        };
        item.onmouseleave = () => {
            item.querySelector('.folder-tool-remove').style.opacity = '0';
        };
        
        // 移除按钮
        const removeBtn = item.querySelector('.folder-tool-remove');
        if (removeBtn) {
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                moveShortcutToRoot(id);
                showFolderModal(folderId); // 刷新弹窗
            };
        }
    });
}

/**
 * 根据ID查找快捷方式（包括文件夹内的）
 */
function findShortcutById(id) {
    const shortcuts = window.appData.shortcuts;
    
    // 先在根目录找
    let found = shortcuts.find(s => s.id === id);
    if (found) return found;
    
    // 再在文件夹里找
    for (const folder of shortcuts.filter(s => s.type === 'folder')) {
        if (folder.children) {
            found = folder.children.find(s => s.id === id);
            if (found) return found;
        }
    }
    
    return null;
}

/**
 * 打开快捷方式（区分网页和本地应用）
 */
function openShortcut(shortcut) {
    const type = shortcut.type || 'web';
    
    if (type === 'app') {
        // 本地应用：使用 location.href 触发协议
        try {
            window.location.href = shortcut.url;
        } catch (e) {
            window.showToast('无法打开应用，请确认已安装');
        }
    } else {
        // 网页：新标签页打开
        window.open(shortcut.url, '_blank');
    }
}

/**
 * 创建快捷方式HTML
 */
function createShortcutHtml(shortcut, inFolder = false) {
    const iconHtml = getIconContent(shortcut);
    const type = shortcut.type || 'web';
    const typeBadge = type === 'app' ? '<span class="shortcut-type-badge">📱</span>' : '';
    const isFolder = shortcut.type === 'folder';
    const folderClass = isFolder ? 'folder' : '';
    
    return `
        <div class="shortcut-item ${type === 'app' ? 'app-shortcut' : ''} ${inFolder ? 'in-folder' : ''} ${folderClass}" data-id="${shortcut.id}" draggable="false" data-type="${type}" title="${escapeHtml(shortcut.name)}${type === 'app' ? ' (本地应用)' : ''}">
            <div class="shortcut-icon">${iconHtml}</div>
            <span class="shortcut-name">${escapeHtml(shortcut.name)}</span>
            ${typeBadge}
            <div class="shortcut-actions">
                <button class="shortcut-action-btn" title="编辑">✏️</button>
                <button class="shortcut-action-btn delete" title="删除">🗑️</button>
                <span class="drag-handle" title="拖动排序">⋮⋮</span>
            </div>
        </div>
    `;
}

/**
 * 创建文件夹HTML
 */
function createFolderHtml(folder) {
    const children = folder.children || [];
    const displayMode = folder.displayMode || 'icon'; // 'icon' 或 'preview'
    
    // 如果是预览模式，直接显示预览样式（即使children为空）
    if (displayMode === 'preview') {
        return createFolderPreviewHtml(folder, children);
    } else {
        // 图标模式
        return createFolderIconHtml(folder, children);
    }
}

/**
 * 创建文件夹HTML - 图标模式
 */
function createFolderIconHtml(folder, children) {
    const folderIcon = folder.customIcon || folder.icon || '📁';
    const isCustomIcon = folder.customIcon ? true : false;
    
    return `
        <div class="shortcut-item folder folder-icon-mode" data-id="${folder.id}" draggable="false" data-type="folder">
            <div class="folder-content" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 20px; cursor: pointer;">
                ${isCustomIcon 
                    ? `<img src="${folderIcon}" style="width: 64px; height: 64px; object-fit: contain; margin-bottom: 12px;">`
                    : `<span class="folder-icon" style="font-size: 3.5rem; margin-bottom: 12px;">${folderIcon}</span>`
                }
                <span class="folder-name" style="font-size: 1rem; text-align: center; font-weight: 500;">${escapeHtml(folder.name)}</span>
                ${children.length > 0 ? `<span style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 6px;">${children.length} 个工具</span>` : ''}
            </div>
            <div class="shortcut-actions">
                <span class="drag-handle" title="拖动排序">⋮⋮</span>
            </div>
        </div>
    `;
}

/**
 * 创建文件夹HTML - 工具预览模式
 */
function createFolderPreviewHtml(folder, children) {
    const showAll = children.length <= 4;
    const displayChildren = showAll ? children : children.slice(0, 3);
    
    // 根据工具数量决定布局
    const itemCount = displayChildren.length;
    const isSingleRow = itemCount <= 2;
    const isOneItem = itemCount === 1;
    
    let itemsHtml = displayChildren.map(child => {
        const iconHtml = getIconContent(child);
        return `
            <div class="folder-preview-item" data-id="${child.id}" style="display: flex; align-items: center; justify-content: center; background: var(--bg-primary); border-radius: 10px; cursor: pointer; min-height: 70px; padding: 8px;">
                <span style="font-size: 3rem; line-height: 1;">${iconHtml}</span>
            </div>
        `;
    }).join('');
    
    // 超过4个工具时，最后一个位置显示省略号
    if (!showAll) {
        itemsHtml += `
            <div class="folder-preview-more" style="display: flex; align-items: center; justify-content: center; background: var(--bg-primary); border-radius: 10px; cursor: pointer; min-height: 70px; padding: 8px;">
                <span style="font-size: 2.2rem; color: var(--text-secondary);">•••</span>
            </div>
        `;
    }
    
    // 动态设置grid - 1个工具时居中，2个工具时并排放置，3-4个工具填满
    let gridStyle;
    let itemStyle = '';
    
    if (isOneItem) {
        // 只有1个图标时，居中显示，限制适当宽度
        itemStyle = 'min-width: 100px; max-width: 140px; width: 100%;';
        gridStyle = 'display: flex; justify-content: center; align-items: center;';
    } else if (isSingleRow) {
        // 2个图标时，适当限制宽度并居中
        gridStyle = 'display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; justify-content: center; max-width: 240px; margin: 0 auto;';
    } else {
        // 3-4个图标时，填满空间
        gridStyle = 'display: grid; grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(2, 1fr); gap: 10px;';
    }
    
    // 更新itemsHtml，为单个图标添加样式
    if (isOneItem) {
        itemsHtml = displayChildren.map(child => {
            const iconHtml = getIconContent(child);
            return `
                <div class="folder-preview-item" data-id="${child.id}" style="display: flex; align-items: center; justify-content: center; background: var(--bg-primary); border-radius: 10px; cursor: pointer; min-height: 70px; padding: 8px; ${itemStyle}">
                    <span style="font-size: 3rem; line-height: 1;">${iconHtml}</span>
                </div>
            `;
        }).join('');
    }
    
    return `
        <div class="shortcut-item folder folder-preview-mode ${showAll ? 'clickable-items' : ''}" data-id="${folder.id}" draggable="false" data-type="folder">
            <div style="display: flex; flex-direction: column; justify-content: center; height: 100%; min-height: 200px; padding: 16px;">
                <div style="${gridStyle}">
                    ${itemsHtml}
                </div>
                <div style="text-align: center; padding-top: 10px; margin-top: 10px; border-top: 1px solid var(--border-color);">
                    <span style="font-size: 1rem; font-weight: 500; color: var(--text-primary);">${escapeHtml(folder.name)}</span>
                </div>
            </div>
            <div class="shortcut-actions">
                <span class="drag-handle" title="拖动排序">⋮⋮</span>
            </div>
        </div>
    `;
}

/**
 * 显示添加文件夹弹窗
 */
function showAddFolderModal() {
    const bodyHtml = `
        <div class="folder-modal-content">
            <!-- 基本信息卡片 -->
            <div class="folder-card">
                <div class="folder-card-header">
                    <span class="folder-card-icon">📝</span>
                    <span class="folder-card-title">基本信息</span>
                </div>
                <div class="folder-card-body">
                    <div class="form-row">
                        <label class="form-label">文件夹名称</label>
                        <input type="text" id="folderName" class="form-input" placeholder="例如：工作工具" autofocus>
                    </div>
                </div>
            </div>
            
            <!-- 显示模式卡片 -->
            <div class="folder-card">
                <div class="folder-card-header">
                    <span class="folder-card-icon">📋</span>
                    <span class="folder-card-title">显示模式</span>
                </div>
                <div class="folder-card-body">
                    <div class="display-mode-selector">
                        <label class="display-mode-card" data-mode="icon">
                            <input type="radio" name="displayMode" value="icon" checked>
                            <div class="display-mode-card-inner">
                                <div class="display-mode-preview icon-preview">📁</div>
                                <div class="display-mode-info">
                                    <span class="display-mode-name">图标模式</span>
                                    <span class="display-mode-desc">简洁展示文件夹图标</span>
                                </div>
                            </div>
                            <div class="display-mode-check">✓</div>
                        </label>
                        <label class="display-mode-card" data-mode="preview">
                            <input type="radio" name="displayMode" value="preview">
                            <div class="display-mode-card-inner">
                                <div class="display-mode-preview preview-preview">
                                    <span>🔗</span><span>📄</span><span>📊</span>
                                </div>
                                <div class="display-mode-info">
                                    <span class="display-mode-name">工具预览</span>
                                    <span class="display-mode-desc">显示内部工具图标（≤4个）</span>
                                </div>
                            </div>
                            <div class="display-mode-check">✓</div>
                        </label>
                    </div>
                </div>
            </div>
            
            <!-- 图标设置卡片 -->
            <div class="folder-card" id="iconSettingsGroup">
                <div class="folder-card-header">
                    <span class="folder-card-icon">🎨</span>
                    <span class="folder-card-title">自定义图标</span>
                </div>
                <div class="folder-card-body">
                    <div class="icon-setting-row">
                        <div class="icon-emoji-input">
                            <label class="form-label">表情图标</label>
                            <div class="emoji-input-wrapper">
                                <input type="text" id="folderIcon" value="📁" class="emoji-input" maxlength="2">
                                <span class="emoji-preview" id="folderIconPreviewLarge">📁</span>
                            </div>
                        </div>
                        <div class="icon-divider">或</div>
                        <div class="icon-upload">
                            <label class="form-label">上传图片</label>
                            <label class="upload-btn">
                                <span>📷</span> 选择图片
                                <input type="file" id="folderIconFile" accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/gif" style="display: none;">
                            </label>
                        </div>
                    </div>
                    <div class="icon-preview-area" id="folderIconPreview" style="display: none;"></div>
                </div>
            </div>
        </div>
    `;
    
    const footerHtml = `
        <button class="btn btn-secondary" id="addFolderCancel">取消</button>
        <button class="btn btn-primary" id="addFolderOk">创建文件夹</button>
    `;
    
    const { closeModal } = window.showModal('新建文件夹', bodyHtml, footerHtml, { width: '480px' });
    
    let customIconPath = null;
    
    // 显示模式卡片选择
    document.querySelectorAll('.display-mode-card').forEach(card => {
        card.onclick = () => {
            document.querySelectorAll('.display-mode-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            // 图标设置仅在图标模式下显示
            const iconGroup = document.getElementById('iconSettingsGroup');
            iconGroup.style.display = card.dataset.mode === 'icon' ? 'block' : 'none';
        };
    });
    document.querySelector('.display-mode-card[data-mode="icon"]').classList.add('selected');
    
    // 表情图标预览
    document.getElementById('folderIcon').oninput = (e) => {
        document.getElementById('folderIconPreviewLarge').textContent = e.target.value || '📁';
    };
    
    // 图标上传（前端处理）
    document.getElementById('folderIconFile').onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const preview = document.getElementById('folderIconPreview');
        preview.style.display = 'flex';
        preview.innerHTML = '<span style="color: var(--text-secondary);">处理中...</span>';
        
        const reader = new FileReader();
        reader.onload = (event) => {
            customIconPath = event.target.result;
            preview.innerHTML = `
                <div class="uploaded-icon-wrapper">
                    <img src="${event.target.result}" class="uploaded-icon-img">
                    <span class="uploaded-icon-name">${file.name}</span>
                </div>
            `;
            window.showToast(`已选择: ${file.name}`);
        };
        reader.onerror = () => {
            preview.innerHTML = '<span style="color: #e74c3c;">处理失败</span>';
        };
        reader.readAsDataURL(file);
    };
    
    document.getElementById('addFolderCancel').onclick = closeModal;
    document.getElementById('addFolderOk').onclick = () => {
        const name = document.getElementById('folderName').value.trim();
        const icon = document.getElementById('folderIcon').value.trim() || '📁';
        const displayMode = document.querySelector('input[name="displayMode"]:checked').value;
        
        if (name) {
            addFolder(name, icon, displayMode, customIconPath);
            closeModal();
            window.showToast('文件夹创建成功');
        } else {
            window.showToast('请输入文件夹名称');
        }
    };
}

/**
 * 添加文件夹
 */
function addFolder(name, icon, displayMode = 'icon', customIcon = null) {
    const folder = {
        id: window.generateId(),
        name: name,
        icon: icon,
        type: 'folder',
        displayMode: displayMode,
        children: [],
        createdAt: new Date().toISOString()
    };
    
    if (customIcon) {
        folder.customIcon = customIcon;
    }
    
    window.appData.shortcuts.push(folder);
    window.debouncedSave();
    renderShortcuts();
}

/**
 * 显示编辑文件夹弹窗
 */
function showEditFolderModal(id) {
    const folder = window.appData.shortcuts.find(s => s.id === id);
    if (!folder) return;
    
    const displayMode = folder.displayMode || 'icon';
    const isCustomIcon = folder.customIcon ? true : false;
    const folderIcon = folder.icon || '📁';
    
    const bodyHtml = `
        <div class="folder-modal-content">
            <!-- 基本信息卡片 -->
            <div class="folder-card">
                <div class="folder-card-header">
                    <span class="folder-card-icon">📝</span>
                    <span class="folder-card-title">基本信息</span>
                </div>
                <div class="folder-card-body">
                    <div class="form-row">
                        <label class="form-label">文件夹名称</label>
                        <input type="text" id="editFolderName" class="form-input" value="${escapeHtml(folder.name)}">
                    </div>
                </div>
            </div>
            
            <!-- 显示模式卡片 -->
            <div class="folder-card">
                <div class="folder-card-header">
                    <span class="folder-card-icon">📋</span>
                    <span class="folder-card-title">显示模式</span>
                </div>
                <div class="folder-card-body">
                    <div class="display-mode-selector">
                        <label class="display-mode-card ${displayMode === 'icon' ? 'selected' : ''}" data-mode="icon">
                            <input type="radio" name="editDisplayMode" value="icon" ${displayMode === 'icon' ? 'checked' : ''}>
                            <div class="display-mode-card-inner">
                                <div class="display-mode-preview icon-preview">📁</div>
                                <div class="display-mode-info">
                                    <span class="display-mode-name">图标模式</span>
                                    <span class="display-mode-desc">简洁展示文件夹图标</span>
                                </div>
                            </div>
                            <div class="display-mode-check">✓</div>
                        </label>
                        <label class="display-mode-card ${displayMode === 'preview' ? 'selected' : ''}" data-mode="preview">
                            <input type="radio" name="editDisplayMode" value="preview" ${displayMode === 'preview' ? 'checked' : ''}>
                            <div class="display-mode-card-inner">
                                <div class="display-mode-preview preview-preview">
                                    <span>🔗</span><span>📄</span><span>📊</span>
                                </div>
                                <div class="display-mode-info">
                                    <span class="display-mode-name">工具预览</span>
                                    <span class="display-mode-desc">显示内部工具图标（≤4个）</span>
                                </div>
                            </div>
                            <div class="display-mode-check">✓</div>
                        </label>
                    </div>
                </div>
            </div>
            
            <!-- 图标设置卡片 -->
            <div class="folder-card" id="editIconSettingsGroup" style="display: ${displayMode === 'icon' ? 'block' : 'none'};">
                <div class="folder-card-header">
                    <span class="folder-card-icon">🎨</span>
                    <span class="folder-card-title">自定义图标</span>
                </div>
                <div class="folder-card-body">
                    <div class="icon-setting-row">
                        <div class="icon-emoji-input">
                            <label class="form-label">表情图标</label>
                            <div class="emoji-input-wrapper">
                                <input type="text" id="editFolderIcon" value="${folderIcon}" class="emoji-input" maxlength="2">
                                <span class="emoji-preview" id="editFolderIconPreviewLarge">${folderIcon}</span>
                            </div>
                        </div>
                        <div class="icon-divider">或</div>
                        <div class="icon-upload">
                            <label class="form-label">上传图片</label>
                            <label class="upload-btn">
                                <span>📷</span> 选择图片
                                <input type="file" id="editFolderIconFile" accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/gif" style="display: none;">
                            </label>
                        </div>
                    </div>
                    <div class="icon-preview-area" id="editFolderIconPreview">
                        ${isCustomIcon ? `
                            <div class="uploaded-icon-wrapper">
                                <img src="${folder.customIcon}" class="uploaded-icon-img">
                                <span class="uploaded-icon-name">自定义图标</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const footerHtml = `
        <button class="btn btn-secondary" id="editFolderCancel">取消</button>
        <button class="btn btn-primary" id="editFolderOk">保存更改</button>
    `;
    
    const { closeModal } = window.showModal('编辑文件夹', bodyHtml, footerHtml, { width: '480px' });
    
    let customIconPath = folder.customIcon || null;
    
    // 显示模式卡片选择
    document.querySelectorAll('.display-mode-card').forEach(card => {
        card.onclick = () => {
            document.querySelectorAll('.display-mode-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            const iconGroup = document.getElementById('editIconSettingsGroup');
            iconGroup.style.display = card.dataset.mode === 'icon' ? 'block' : 'none';
        };
    });
    
    // 表情图标预览
    document.getElementById('editFolderIcon').oninput = (e) => {
        document.getElementById('editFolderIconPreviewLarge').textContent = e.target.value || '📁';
    };
    
    // 图标上传（前端处理）
    document.getElementById('editFolderIconFile').onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const preview = document.getElementById('editFolderIconPreview');
        preview.style.display = 'flex';
        preview.innerHTML = '<span style="color: var(--text-secondary);">处理中...</span>';
        
        const reader = new FileReader();
        reader.onload = (event) => {
            customIconPath = event.target.result;
            preview.innerHTML = `
                <div class="uploaded-icon-wrapper">
                    <img src="${event.target.result}" class="uploaded-icon-img">
                    <span class="uploaded-icon-name">${file.name}</span>
                </div>
            `;
            window.showToast(`已选择: ${file.name}`);
        };
        reader.onerror = () => {
            preview.innerHTML = '<span style="color: #e74c3c;">处理失败</span>';
        };
        reader.readAsDataURL(file);
    };
    
    document.getElementById('editFolderCancel').onclick = closeModal;
    document.getElementById('editFolderOk').onclick = () => {
        const name = document.getElementById('editFolderName').value.trim();
        const icon = document.getElementById('editFolderIcon').value.trim() || '📁';
        const newDisplayMode = document.querySelector('input[name="editDisplayMode"]:checked').value;
        
        if (name) {
            editFolder(id, name, icon, newDisplayMode, customIconPath);
            closeModal();
            window.showToast('保存成功');
        } else {
            window.showToast('请输入文件夹名称');
        }
    };
}

/**
 * 编辑文件夹
 */
function editFolder(id, name, icon, displayMode, customIcon) {
    const folder = window.appData.shortcuts.find(s => s.id === id);
    if (folder) {
        folder.name = name;
        folder.icon = icon;
        folder.displayMode = displayMode;
        if (customIcon) {
            folder.customIcon = customIcon;
        } else {
            delete folder.customIcon;
        }
        window.debouncedSave();
        renderShortcuts();
    }
}

/**
 * 删除文件夹
 */
function deleteFolder(id) {
    const folder = window.appData.shortcuts.find(s => s.id === id);
    if (!folder) return;
    
    // 将文件夹内的工具移回根目录
    if (folder.children && folder.children.length > 0) {
        const index = window.appData.shortcuts.indexOf(folder);
        // 在文件夹位置插入其子项
        window.appData.shortcuts.splice(index, 1, ...folder.children);
    } else {
        const index = window.appData.shortcuts.indexOf(folder);
        window.appData.shortcuts.splice(index, 1);
    }
    
    window.debouncedSave();
    renderShortcuts();
    window.showToast('文件夹已删除');
}

/**
 * 获取图标内容（支持三种类型：default/favicon/custom）
 */
function getIconContent(shortcut) {
    const iconType = shortcut.iconType || 'default';
    
    // 1. 自定义图标（优先级最高）
    if (iconType === 'custom' && shortcut.customIconPath) {
        return `<img src="${shortcut.customIconPath}" alt="" style="width:28px;height:28px;border-radius:4px;object-fit:contain;">`;
    }
    
    // 2. Favicon（次优先级）
    if (iconType === 'favicon' && shortcut.faviconUrl) {
        return `<img src="${shortcut.faviconUrl}" alt="" style="width:28px;height:28px;border-radius:4px;object-fit:contain;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
                <span style="display:none;">${PRESET_ICONS[shortcut.icon] || PRESET_ICONS.default}</span>`;
    }
    
    // 3. 默认 emoji 图标
    return PRESET_ICONS[shortcut.icon] || PRESET_ICONS.default;
}

/**
 * 获取预置图标列表HTML
 */
function getPresetIconsHtml(type = 'web') {
    const icons = type === 'app' 
        ? Object.entries(PRESET_ICONS).filter(([k]) => k.startsWith('app_'))
        : Object.entries(PRESET_ICONS).filter(([k]) => !k.startsWith('app_'));
    
    return icons.map(([key, emoji]) => `
        <div class="color-option preset-icon ${key === (type === 'app' ? 'app_default' : 'default') ? 'selected' : ''}" 
            data-icon="${key}"
            style="background: var(--bg-primary); font-size: 1.2rem; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
            ${emoji}
        </div>
    `).join('');
}

/**
 * 获取图标类型选择HTML
 */
function getIconTypeSelector(selectedType = 'default') {
    return `
        <div class="icon-type-selector" style="margin-bottom: 12px;">
            <label style="display: block; margin-bottom: 8px; color: var(--text-secondary); font-size: 0.85rem;">图标来源</label>
            <div class="icon-type-tabs" style="display: flex; gap: 8px;">
                <button class="icon-type-tab ${selectedType === 'default' ? 'active' : ''}" data-type="default" 
                    style="flex:1; padding: 8px 12px; border: 1px solid var(--border-color); background: ${selectedType === 'default' ? 'var(--primary)' : 'var(--bg-primary)'}; color: ${selectedType === 'default' ? 'white' : 'var(--text)'}; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
                    😊 默认图标
                </button>
                <button class="icon-type-tab ${selectedType === 'favicon' ? 'active' : ''}" data-type="favicon" 
                    style="flex:1; padding: 8px 12px; border: 1px solid var(--border-color); background: ${selectedType === 'favicon' ? 'var(--primary)' : 'var(--bg-primary)'}; color: ${selectedType === 'favicon' ? 'white' : 'var(--text)'}; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
                    🌐 自动抓取
                </button>
                <button class="icon-type-tab ${selectedType === 'custom' ? 'active' : ''}" data-type="custom" 
                    style="flex:1; padding: 8px 12px; border: 1px solid var(--border-color); background: ${selectedType === 'custom' ? 'var(--primary)' : 'var(--bg-primary)'}; color: ${selectedType === 'custom' ? 'white' : 'var(--text)'}; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
                    📷 自定义
                </button>
            </div>
        </div>
        <div class="icon-type-content">
            <div class="icon-content-default ${selectedType === 'default' ? 'active' : ''}" style="display: ${selectedType === 'default' ? 'block' : 'none'};">
                <div class="color-picker" id="iconPicker">
                    ${getPresetIconsHtml('web')}
                </div>
            </div>
            <div class="icon-content-favicon ${selectedType === 'favicon' ? 'active' : ''}" style="display: ${selectedType === 'favicon' ? 'block' : 'none'};">
                <div id="faviconPreview" style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px; margin-bottom: 8px;">
                    <span style="color: var(--text-secondary); font-size: 0.85rem;">输入网址后将自动获取网站图标</span>
                </div>
                <button id="refreshFaviconBtn" class="btn btn-secondary" style="width: 100%; font-size: 0.85rem;">
                    🔄 重新获取图标
                </button>
            </div>
            <div class="icon-content-custom ${selectedType === 'custom' ? 'active' : ''}" style="display: ${selectedType === 'custom' ? 'block' : 'none'};">
                <div id="customIconPreview" style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px; margin-bottom: 8px;">
                    <span style="color: var(--text-secondary); font-size: 0.85rem;">请上传图片作为图标</span>
                </div>
                <input type="file" id="customIconFile" accept="image/png,image/jpeg,image/jpg,image/svg+xml" style="display: none;">
                <button id="uploadIconBtn" class="btn btn-secondary" style="width: 100%; font-size: 0.85rem;">
                    📁 选择图片文件
                </button>
                <small style="color: var(--text-secondary); font-size: 0.75rem; display: block; text-align: center; margin-top: 4px;">
                    支持 PNG、JPG、SVG 格式，最大 2MB
                </small>
            </div>
        </div>
    `;
}

/**
 * 显示添加快捷方式弹窗
 */
function showAddShortcutModal() {
    const presetSitesOptions = PRESET_SITES.map(site => `
        <option value="${site.url}|${site.icon}|${site.type}">${site.name}</option>
    `).join('');
    
    const presetAppsOptions = PRESET_APPS.map(app => `
        <option value="${app.url}|${app.icon}|${app.type}">${app.name}</option>
    `).join('');
    
    const bodyHtml = `
        <div class="form-group">
            <label>类型</label>
            <select id="shortcutType" class="shortcut-type-select">
                <option value="web">🌐 网页</option>
                <option value="app">📱 本地应用</option>
            </select>
        </div>
        <div class="form-group" id="presetWebGroup">
            <label>快速添加网站</label>
            <select id="presetSites">
                <option value="">-- 选择预置网站 --</option>
                ${presetSitesOptions}
            </select>
        </div>
        <div class="form-group" id="presetAppsGroup" style="display: none;">
            <label>快速添加应用</label>
            <select id="presetApps">
                <option value="">-- 选择预置应用 --</option>
                ${presetAppsOptions}
            </select>
        </div>
        <div class="form-group">
            <label id="nameLabel">网站名称</label>
            <input type="text" id="shortcutName" placeholder="例如：GitHub">
        </div>
        <div class="form-group">
            <label id="urlLabel">网址 URL</label>
            <input type="url" id="shortcutUrl" placeholder="https://github.com">
            <small class="form-hint" id="urlHint"></small>
        </div>
        <div class="form-group">
            <label>选择图标</label>
            ${getIconTypeSelector('default')}
        </div>
    `;
    
    const footerHtml = `
        <button class="btn btn-secondary" id="addShortcutCancel">取消</button>
        <button class="btn btn-primary" id="addShortcutOk">添加</button>
    `;
    
    const { closeModal } = window.showModal('添加快捷方式', bodyHtml, footerHtml);
    
    // 重置状态
    currentEditingId = null;
    currentIconType = 'default';
    currentFaviconUrl = null;
    currentCustomIconPath = null;
    let currentType = 'web';
    let selectedIcon = 'default';
    
    // 绑定图标类型切换
    function bindIconTypeTabs() {
        document.querySelectorAll('.icon-type-tab').forEach(tab => {
            tab.onclick = () => {
                const type = tab.dataset.type;
                currentIconType = type;
                
                // 更新标签样式
                document.querySelectorAll('.icon-type-tab').forEach(t => {
                    t.classList.remove('active');
                    t.style.background = 'var(--bg-primary)';
                    t.style.color = 'var(--text)';
                });
                tab.classList.add('active');
                tab.style.background = 'var(--primary)';
                tab.style.color = 'white';
                
                // 更新内容显示
                document.querySelectorAll('.icon-type-content > div').forEach(content => {
                    content.style.display = 'none';
                });
                document.querySelector(`.icon-content-${type}`).style.display = 'block';
                
                // 如果切换到 favicon 且有 URL，尝试获取
                if (type === 'favicon') {
                    tryFetchFavicon();
                }
            };
        });
    }
    bindIconTypeTabs();
    
    // 类型切换
    document.getElementById('shortcutType').onchange = (e) => {
        currentType = e.target.value;
        document.getElementById('presetWebGroup').style.display = currentType === 'web' ? 'block' : 'none';
        document.getElementById('presetAppsGroup').style.display = currentType === 'app' ? 'block' : 'none';
        document.getElementById('nameLabel').textContent = currentType === 'web' ? '网站名称' : '应用名称';
        document.getElementById('urlLabel').textContent = currentType === 'web' ? '网址 URL' : '协议地址';
        document.getElementById('urlHint').textContent = currentType === 'app' ? '例如：vscode:// 或 weixin://' : '';
        
        // 更新图标选择器
        const iconPicker = document.getElementById('iconPicker');
        if (iconPicker) {
            iconPicker.innerHTML = getPresetIconsHtml(currentType);
            bindIconClick();
        }
        
        // 如果是应用，禁用自动抓取
        if (currentType === 'app') {
            const faviconTab = document.querySelector('.icon-type-tab[data-type="favicon"]');
            if (faviconTab) faviconTab.style.display = 'none';
        } else {
            const faviconTab = document.querySelector('.icon-type-tab[data-type="favicon"]');
            if (faviconTab) faviconTab.style.display = 'block';
        }
    };
    
    // 图标选择
    function bindIconClick() {
        document.querySelectorAll('.preset-icon').forEach(opt => {
            opt.onclick = () => {
                document.querySelectorAll('.preset-icon').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                selectedIcon = opt.dataset.icon;
            };
        });
    }
    bindIconClick();
    
    // 自动获取 favicon
    function tryFetchFavicon() {
        const url = document.getElementById('shortcutUrl').value.trim();
        if (!url) return;
        
        const preview = document.getElementById('faviconPreview');
        if (!preview) return;
        
        preview.innerHTML = '<span style="color: var(--text-secondary);">⏳ 正在获取网站图标...</span>';
        
        fetch(`/api/favicon?url=${encodeURIComponent(url)}`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.data && data.data.faviconUrl) {
                    currentFaviconUrl = data.data.faviconUrl;
                    preview.innerHTML = `<img src="${currentFaviconUrl}" style="width:48px;height:48px;border-radius:8px;object-fit:contain;" onerror="this.parentElement.innerHTML='<span style=color:var(--text-secondary);font-size:0.85rem;>❌ 抓取失败，可选择手动上传</span>'">`;
                } else {
                    preview.innerHTML = '<span style="color: var(--text-secondary); font-size: 0.85rem;">❌ 抓取失败，可选择手动上传</span>';
                }
            })
            .catch(err => {
                console.error('获取 favicon 失败:', err);
                preview.innerHTML = '<span style="color: var(--text-secondary); font-size: 0.85rem;">❌ 抓取失败，可选择手动上传</span>';
            });
    }
    
    // 重新获取 favicon 按钮
    const refreshBtn = document.getElementById('refreshFaviconBtn');
    if (refreshBtn) {
        refreshBtn.onclick = tryFetchFavicon;
    }
    
    // 自定义图标上传
    const uploadBtn = document.getElementById('uploadIconBtn');
    const fileInput = document.getElementById('customIconFile');
    
    if (uploadBtn && fileInput) {
        uploadBtn.onclick = () => fileInput.click();
        
        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const preview = document.getElementById('customIconPreview');
            if (!preview) return;
            
            preview.innerHTML = '<span style="color: var(--text-secondary);">⏳ 处理中...</span>';
            
            const reader = new FileReader();
            reader.onload = (event) => {
                currentCustomIconPath = event.target.result;
                preview.innerHTML = `<img src="${event.target.result}" style="width:48px;height:48px;border-radius:8px;object-fit:contain;">`;
                window.showToast(`✓ 已选择: ${file.name}`);
            };
            reader.onerror = () => {
                preview.innerHTML = '<span style="color: var(--text-secondary); font-size: 0.85rem;">❌ 处理失败</span>';
                window.showToast('处理失败');
            };
            reader.readAsDataURL(file);
        };
    }
    
    // 预置网站选择
    document.getElementById('presetSites').onchange = (e) => {
        if (e.target.value) {
            const [url, icon, type] = e.target.value.split('|');
            document.getElementById('shortcutUrl').value = url;
            const option = e.target.options[e.target.selectedIndex];
            document.getElementById('shortcutName').value = option.text;
            selectedIcon = icon;
            currentIconType = 'default';
            document.querySelector('.icon-type-tab[data-type="default"]').click();
            document.querySelectorAll('.preset-icon').forEach(i => {
                i.classList.toggle('selected', i.dataset.icon === icon);
            });
        }
    };
    
    // 预置应用选择
    document.getElementById('presetApps').onchange = (e) => {
        if (e.target.value) {
            const [url, icon, type] = e.target.value.split('|');
            document.getElementById('shortcutUrl').value = url;
            const option = e.target.options[e.target.selectedIndex];
            document.getElementById('shortcutName').value = option.text;
            selectedIcon = icon;
            document.querySelectorAll('.preset-icon').forEach(i => {
                i.classList.toggle('selected', i.dataset.icon === icon);
            });
        }
    };
    
    // URL 输入时自动获取 favicon
    let faviconDebounce = null;
    document.getElementById('shortcutUrl').oninput = () => {
        clearTimeout(faviconDebounce);
        if (currentType === 'web' && currentIconType === 'favicon') {
            faviconDebounce = setTimeout(tryFetchFavicon, 800);
        }
    };
    
    document.getElementById('addShortcutCancel').onclick = closeModal;
    document.getElementById('addShortcutOk').onclick = () => {
        const name = document.getElementById('shortcutName').value.trim();
        const url = document.getElementById('shortcutUrl').value.trim();
        
        if (name && url) {
            // 根据类型处理 URL
            let finalUrl = url;
            if (currentType === 'web' && !url.startsWith('http')) {
                finalUrl = 'https://' + url;
            }
            
            // 构建快捷方式数据
            const shortcutData = {
                name,
                url: finalUrl,
                icon: selectedIcon,
                type: currentType,
                iconType: currentIconType
            };
            
            // 添加 favicon 或自定义图标路径
            if (currentIconType === 'favicon' && currentFaviconUrl) {
                shortcutData.faviconUrl = currentFaviconUrl;
            }
            if (currentIconType === 'custom' && currentCustomIconPath) {
                shortcutData.customIconPath = currentCustomIconPath;
            }
            
            addShortcut(shortcutData);
            closeModal();
            window.showToast('添加成功');
        } else {
            window.showToast(currentType === 'web' ? '请填写名称和网址' : '请填写名称和协议地址');
        }
    };
    
    setTimeout(() => document.getElementById('shortcutName').focus(), 100);
}

/**
 * 显示编辑快捷方式弹窗
 */
function showEditShortcutModal(id) {
    const shortcut = window.appData.shortcuts.find(s => s.id === id);
    if (!shortcut) return;
    
    const type = shortcut.type || 'web';
    const iconType = shortcut.iconType || 'default';
    
    const bodyHtml = `
        <div class="form-group">
            <label>类型</label>
            <select id="editShortcutType" class="shortcut-type-select">
                <option value="web" ${type === 'web' ? 'selected' : ''}>🌐 网页</option>
                <option value="app" ${type === 'app' ? 'selected' : ''}>📱 本地应用</option>
            </select>
        </div>
        <div class="form-group">
            <label id="editNameLabel">${type === 'web' ? '网站名称' : '应用名称'}</label>
            <input type="text" id="editShortcutName" value="${escapeHtml(shortcut.name)}">
        </div>
        <div class="form-group">
            <label id="editUrlLabel">${type === 'web' ? '网址 URL' : '协议地址'}</label>
            <input type="url" id="editShortcutUrl" value="${escapeHtml(shortcut.url)}">
        </div>
        <div class="form-group">
            <label>选择图标</label>
            ${getIconTypeSelector(iconType)}
        </div>
    `;
    
    const footerHtml = `
        <button class="btn btn-secondary" id="editShortcutCancel">取消</button>
        <button class="btn btn-primary" id="editShortcutOk">保存</button>
    `;
    
    const { closeModal } = window.showModal('编辑快捷方式', bodyHtml, footerHtml);
    
    // 设置当前编辑状态
    currentEditingId = id;
    currentIconType = iconType;
    currentFaviconUrl = shortcut.faviconUrl || null;
    currentCustomIconPath = shortcut.customIconPath || null;
    let selectedIcon = shortcut.icon;
    
    // 如果是本地应用，隐藏自动抓取标签
    if (type === 'app') {
        setTimeout(() => {
            const faviconTab = document.querySelector('.icon-type-tab[data-type="favicon"]');
            if (faviconTab) faviconTab.style.display = 'none';
        }, 50);
    }
    
    // 初始化 favicon 预览
    if (iconType === 'favicon' && shortcut.faviconUrl) {
        setTimeout(() => {
            const preview = document.getElementById('faviconPreview');
            if (preview) {
                preview.innerHTML = `<img src="${shortcut.faviconUrl}" style="width:48px;height:48px;border-radius:8px;object-fit:contain;" onerror="this.parentElement.innerHTML='<span style=color:var(--text-secondary);font-size:0.85rem;>❌ 图标加载失败</span>'">`;
            }
        }, 100);
    }
    
    // 初始化自定义图标预览
    if (iconType === 'custom' && shortcut.customIconPath) {
        setTimeout(() => {
            const preview = document.getElementById('customIconPreview');
            if (preview) {
                preview.innerHTML = `<img src="${shortcut.customIconPath}" style="width:48px;height:48px;border-radius:8px;object-fit:contain;">`;
            }
        }, 100);
    }
    
    // 绑定图标类型切换
    function bindIconTypeTabs() {
        document.querySelectorAll('.icon-type-tab').forEach(tab => {
            tab.onclick = () => {
                const type = tab.dataset.type;
                currentIconType = type;
                
                // 更新标签样式
                document.querySelectorAll('.icon-type-tab').forEach(t => {
                    t.classList.remove('active');
                    t.style.background = 'var(--bg-primary)';
                    t.style.color = 'var(--text)';
                });
                tab.classList.add('active');
                tab.style.background = 'var(--primary)';
                tab.style.color = 'white';
                
                // 更新内容显示
                document.querySelectorAll('.icon-type-content > div').forEach(content => {
                    content.style.display = 'none';
                });
                document.querySelector(`.icon-content-${type}`).style.display = 'block';
            };
        });
    }
    bindIconTypeTabs();
    
    // 类型切换
    document.getElementById('editShortcutType').onchange = (e) => {
        const newType = e.target.value;
        document.getElementById('editNameLabel').textContent = newType === 'web' ? '网站名称' : '应用名称';
        document.getElementById('editUrlLabel').textContent = newType === 'web' ? '网址 URL' : '协议地址';
        
        if (newType === 'app') {
            currentIconType = 'default';
            // 禁用自动抓取标签
            const faviconTab = document.querySelector('.icon-type-tab[data-type="favicon"]');
            if (faviconTab) faviconTab.style.display = 'none';
            document.querySelector('.icon-content-default').style.display = 'block';
            document.querySelector('.icon-content-favicon').style.display = 'none';
            document.querySelector('.icon-content-custom').style.display = 'none';
            document.querySelector('.icon-type-tab[data-type="default"]').click();
            selectedIcon = 'app_default';
        } else {
            // 恢复自动抓取标签
            const faviconTab = document.querySelector('.icon-type-tab[data-type="favicon"]');
            if (faviconTab) faviconTab.style.display = 'block';
        }
        bindEditIconClick();
    };
    
    // 图标选择
    function bindEditIconClick() {
        document.querySelectorAll('.preset-icon').forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.icon === shortcut.icon);
            opt.onclick = () => {
                document.querySelectorAll('.preset-icon').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                selectedIcon = opt.dataset.icon;
            };
        });
    }
    bindEditIconClick();
    
    // 自动获取 favicon
    function tryFetchFavicon() {
        const url = document.getElementById('editShortcutUrl').value.trim();
        if (!url) return;
        
        const preview = document.getElementById('faviconPreview');
        if (!preview) return;
        
        preview.innerHTML = '<span style="color: var(--text-secondary);">⏳ 正在获取网站图标...</span>';
        
        fetch(`/api/favicon?url=${encodeURIComponent(url)}`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.data && data.data.faviconUrl) {
                    currentFaviconUrl = data.data.faviconUrl;
                    preview.innerHTML = `<img src="${currentFaviconUrl}" style="width:48px;height:48px;border-radius:8px;object-fit:contain;" onerror="this.parentElement.innerHTML='<span style=color:var(--text-secondary);font-size:0.85rem;>❌ 抓取失败，可选择手动上传</span>'">`;
                } else {
                    preview.innerHTML = '<span style="color: var(--text-secondary); font-size: 0.85rem;">❌ 抓取失败，可选择手动上传</span>';
                }
            })
            .catch(err => {
                console.error('获取 favicon 失败:', err);
                preview.innerHTML = '<span style="color: var(--text-secondary); font-size: 0.85rem;">❌ 抓取失败，可选择手动上传</span>';
            });
    }
    
    // 重新获取 favicon 按钮
    const refreshBtn = document.getElementById('refreshFaviconBtn');
    if (refreshBtn) {
        refreshBtn.onclick = tryFetchFavicon;
    }
    
    // 自定义图标上传
    const uploadBtn = document.getElementById('uploadIconBtn');
    const fileInput = document.getElementById('customIconFile');
    
    if (uploadBtn && fileInput) {
        uploadBtn.onclick = () => fileInput.click();
        
        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const preview = document.getElementById('customIconPreview');
            if (!preview) return;
            
            preview.innerHTML = '<span style="color: var(--text-secondary);">⏳ 处理中...</span>';
            
            const reader = new FileReader();
            reader.onload = (event) => {
                currentCustomIconPath = event.target.result;
                preview.innerHTML = `<img src="${currentCustomIconPath}" style="width:48px;height:48px;border-radius:8px;object-fit:contain;">`;
                window.showToast(`✓ 已选择: ${file.name}`);
            };
            reader.onerror = () => {
                preview.innerHTML = '<span style="color: var(--text-secondary); font-size: 0.85rem;">❌ 处理失败</span>';
                window.showToast('处理失败');
            };
            reader.readAsDataURL(file);
        };
    }
    
    // URL 输入时自动获取 favicon
    let faviconDebounce = null;
    document.getElementById('editShortcutUrl').oninput = () => {
        clearTimeout(faviconDebounce);
        if (currentIconType === 'favicon') {
            faviconDebounce = setTimeout(tryFetchFavicon, 800);
        }
    };
    
    document.getElementById('editShortcutCancel').onclick = closeModal;
    document.getElementById('editShortcutOk').onclick = () => {
        const name = document.getElementById('editShortcutName').value.trim();
        const url = document.getElementById('editShortcutUrl').value.trim();
        const newType = document.getElementById('editShortcutType').value;
        
        if (name && url) {
            let finalUrl = url;
            if (newType === 'web' && !url.startsWith('http')) {
                finalUrl = 'https://' + url;
            }
            
            // 构建更新数据
            const updateData = {
                name,
                url: finalUrl,
                icon: selectedIcon,
                type: newType,
                iconType: currentIconType
            };
            
            // 添加 favicon 或自定义图标路径
            if (currentIconType === 'favicon' && currentFaviconUrl) {
                updateData.faviconUrl = currentFaviconUrl;
            } else {
                updateData.faviconUrl = null;
            }
            
            if (currentIconType === 'custom' && currentCustomIconPath) {
                updateData.customIconPath = currentCustomIconPath;
            } else {
                updateData.customIconPath = null;
            }
            
            editShortcut(id, updateData);
            closeModal();
            window.showToast('保存成功');
        } else {
            window.showToast('请填写完整信息');
        }
    };
}

/**
 * 添加快捷方式
 */
function addShortcut(data) {
    const shortcut = {
        id: window.generateId(),
        name: data.name,
        url: data.url,
        icon: data.icon,
        type: data.type || 'web',
        iconType: data.iconType || 'default'
    };
    
    // 添加 favicon 或自定义图标
    if (data.iconType === 'favicon' && data.faviconUrl) {
        shortcut.faviconUrl = data.faviconUrl;
    }
    if (data.iconType === 'custom' && data.customIconPath) {
        shortcut.customIconPath = data.customIconPath;
    }
    
    window.appData.shortcuts.push(shortcut);
    window.debouncedSave();
    renderShortcuts();
}

/**
 * 编辑快捷方式
 */
function editShortcut(id, data) {
    const shortcut = window.appData.shortcuts.find(s => s.id === id);
    if (shortcut) {
        shortcut.name = data.name;
        shortcut.url = data.url;
        shortcut.icon = data.icon;
        shortcut.type = data.type || 'web';
        shortcut.iconType = data.iconType || 'default';
        
        // 更新 favicon 或自定义图标
        if (data.iconType === 'favicon' && data.faviconUrl) {
            shortcut.faviconUrl = data.faviconUrl;
        } else {
            shortcut.faviconUrl = null;
        }
        
        if (data.iconType === 'custom' && data.customIconPath) {
            shortcut.customIconPath = data.customIconPath;
        } else {
            shortcut.customIconPath = null;
        }
        
        window.debouncedSave();
        renderShortcuts();
    }
}

/**
 * 删除快捷方式
 */
function deleteShortcut(id) {
    const shortcuts = window.appData.shortcuts;
    
    // 先在根目录找
    let index = shortcuts.findIndex(s => s.id === id);
    if (index > -1) {
        shortcuts.splice(index, 1);
        window.debouncedSave();
        renderShortcuts();
        window.showToast('已删除');
        return;
    }
    
    // 再在文件夹里找
    for (const folder of shortcuts.filter(s => s.type === 'folder')) {
        if (folder.children) {
            index = folder.children.findIndex(s => s.id === id);
            if (index > -1) {
                folder.children.splice(index, 1);
                window.debouncedSave();
                renderShortcuts();
                window.showToast('已删除');
                return;
            }
        }
    }
}


// 拖拽状态管理
let draggedItem = null;
let dropPlaceholder = null;
let dragAllowed = false;
let dragProtectionInitialized = false;
let targetFolderInsertIndex = null;  // 新增：记录文件夹内的插入位置
let wasDroppedToFolder = false;       // 新增：标记是否已经拖到文件夹里

/**
 * 绑定快捷方式拖动排序事件
 */
function bindShortcutDragEvents() {
    const items = shortcutsGridEl.querySelectorAll('.shortcut-item:not(.in-folder)');
    
    items.forEach(item => {
        const dragHandle = item.querySelector('.drag-handle');
        if (!dragHandle) return;
        
        // 网格模式下的拖动
        bindGridDragEvents(item);
    });
    
    // 绑定文件夹头部的拖放（用于将工具移出文件夹）
    bindFolderHeaderDropEvents();
    
    // 绑定容器级别的拖拽事件（用于检测空位放置）
    bindContainerDragEvents();
}

/**
 * 绑定容器级别的拖拽事件（用于检测空位放置）
 */
function bindContainerDragEvents() {
    
    // 确保只初始化一次全局防护
    if (dragProtectionInitialized) {
        return;
    }
    dragProtectionInitialized = true;
    
    // ==================== 简化的全局拖拽防护 ====================
    // 在任何时候mouseup都重置
    document.addEventListener('mouseup', () => {
        dragAllowed = false;
        // 确保所有快捷方式都恢复为不可拖拽
        const allItems = document.querySelectorAll('.shortcut-item');
        allItems.forEach(item => {
            item.setAttribute('draggable', 'false');
        });
    });
    document.addEventListener('dragend', () => {
        dragAllowed = false;
        // 确保所有快捷方式都恢复为不可拖拽
        const allItems = document.querySelectorAll('.shortcut-item');
        allItems.forEach(item => {
            item.setAttribute('draggable', 'false');
        });
    });
    shortcutsGridEl.ondragover = (e) => {
        if (!draggedItem) return;
        
        // 严格检查鼠标是否在shortcuts-grid容器内
        const containerRect = shortcutsGridEl.getBoundingClientRect();
        if (e.clientX < containerRect.left || e.clientX > containerRect.right ||
            e.clientY < containerRect.top || e.clientY > containerRect.bottom) {
            clearDropPlaceholder();
            clearAllDropIndicators();
            return;
        }
        
        // 检查是否拖拽到了文件夹（需要优先处理文件夹的拖放）
        const targetFolder = e.target.closest('.shortcut-item.folder');
        if (targetFolder) {
            // 让文件夹自己的 ondragover 处理
            clearDropPlaceholder();
            return;
        }
        
        // 检查是否拖拽到了其他普通图标
        const targetItem = e.target.closest('.shortcut-item:not(.folder):not(.in-folder)');
        if (targetItem) {
            // 让 item 的 ondragover 处理
            clearDropPlaceholder();
            return;
        }
        
        e.preventDefault();
        
        // 计算网格坐标和空位
        const gridInfo = calculateGridDropPosition(e.clientX, e.clientY);
        
        // 清除之前的占位符
        clearDropPlaceholder();
        clearAllDropIndicators();
        
        if (gridInfo && gridInfo.isEmpty) {
            // 显示空位放置预览
            showDropPlaceholder(gridInfo);
        }
    };
    
    shortcutsGridEl.ondrop = (e) => {
        if (!draggedItem) return;
        
        // 严格检查是否在容器内
        const containerRect = shortcutsGridEl.getBoundingClientRect();
        if (e.clientX < containerRect.left || e.clientX > containerRect.right ||
            e.clientY < containerRect.top || e.clientY > containerRect.bottom) {
            clearDropPlaceholder();
            clearAllDropIndicators();
            return;
        }
        
        // 检查是否放置到文件夹上
        const targetFolder = e.target.closest('.shortcut-item.folder');
        if (targetFolder) {
            // 让文件夹自己的 ondrop 处理
            clearDropPlaceholder();
            clearAllDropIndicators();
            return;
        }
        
        // 检查是否放置到其他图标上
        const targetItem = e.target.closest('.shortcut-item:not(.folder):not(.in-folder)');
        if (targetItem) {
            clearDropPlaceholder();
            clearAllDropIndicators();
            return;
        }
        
        e.preventDefault();
        
        // 计算空位位置并放置
        const gridInfo = calculateGridDropPosition(e.clientX, e.clientY);
        
        if (gridInfo && gridInfo.isEmpty) {
            // 放置到空位
            placeItemInEmptySlot(draggedItem, gridInfo);
        }
        
        clearDropPlaceholder();
        clearAllDropIndicators();
    };
    
    shortcutsGridEl.ondragleave = (e) => {
        // 只有真正离开容器时才清除
        if (!shortcutsGridEl.contains(e.relatedTarget)) {
            clearDropPlaceholder();
            clearAllDropIndicators();
        }
    };
    
    // 简单的body防护
    document.body.ondragover = (e) => {
        if (draggedItem) {
            e.preventDefault();
        }
    };
    document.body.ondrop = (e) => {
        if (draggedItem) {
            e.preventDefault();
        }
    };
}

/**
 * 计算网格中的放置位置
 * @param {number} clientX - 鼠标X坐标
 * @param {number} clientY - 鼠标Y坐标
 * @returns {Object|null} - 网格信息，包含位置、是否空位等
 */
function calculateGridDropPosition(clientX, clientY) {
    const container = shortcutsGridEl;
    const containerRect = container.getBoundingClientRect();
    const style = window.getComputedStyle(container);
    
    // 检查鼠标是否在容器范围内
    if (clientX < containerRect.left || clientX > containerRect.right ||
        clientY < containerRect.top || clientY > containerRect.bottom) {
        return null; // 超出容器范围，返回null
    }
    
    // 获取网格列数
    const gridTemplateColumns = style.gridTemplateColumns;
    const columnCount = gridTemplateColumns.split(' ').length;
    
    // 计算图标尺寸（使用第一个图标的尺寸作为参考）
    const firstItem = container.querySelector('.shortcut-item:not(.in-folder)');
    if (!firstItem) {
        // 没有图标，整个网格都是空的
        const rect = container.getBoundingClientRect();
        return {
            column: 0,
            row: 0,
            index: 0,
            isEmpty: true,
            x: rect.left,
            y: rect.top
        };
    }
    
    const itemRect = firstItem.getBoundingClientRect();
    const itemWidth = itemRect.width;
    const itemHeight = itemRect.height;
    const gap = parseInt(style.gap) || 16;
    
    // 计算鼠标在容器内的相对位置
    const relX = clientX - containerRect.left;
    const relY = clientY - containerRect.top;
    
    // 计算网格坐标
    const col = Math.floor(relX / (itemWidth + gap));
    const row = Math.floor(relY / (itemHeight + gap));
    
    // 转换为数组索引
    const items = Array.from(container.querySelectorAll('.shortcut-item:not(.in-folder)'));
    const targetIndex = row * columnCount + col;
    
    // 检查该位置是否有图标
    const existingItem = items[targetIndex];
    const isEmpty = !existingItem;
    
    // 计算该位置的坐标
    const x = containerRect.left + col * (itemWidth + gap);
    const y = containerRect.top + row * (itemHeight + gap);
    
    return {
        column: col,
        row: row,
        index: targetIndex,
        isEmpty: isEmpty,
        x: x,
        y: y,
        itemWidth: itemWidth,
        itemHeight: itemHeight,
        columnCount: columnCount,
        gap: gap
    };
}

/**
 * 显示空位放置占位符
 * @param {Object} gridInfo - 网格信息
 */
function showDropPlaceholder(gridInfo) {
    clearDropPlaceholder();
    
    // 创建占位符
    dropPlaceholder = document.createElement('div');
    dropPlaceholder.className = 'drop-placeholder';
    dropPlaceholder.style.cssText = `
        position: absolute;
        left: ${gridInfo.x - shortcutsGridEl.getBoundingClientRect().left}px;
        top: ${gridInfo.y - shortcutsGridEl.getBoundingClientRect().top}px;
        width: ${gridInfo.itemWidth}px;
        height: ${gridInfo.itemHeight}px;
        border: 2px dashed var(--primary-color, #4a90d9);
        border-radius: var(--radius-md, 8px);
        background: rgba(74, 144, 217, 0.1);
        pointer-events: none;
        z-index: 10;
        transition: all 0.15s ease;
    `;
    
    shortcutsGridEl.appendChild(dropPlaceholder);
}

/**
 * 清除放置占位符
 */
function clearDropPlaceholder() {
    if (dropPlaceholder && dropPlaceholder.parentNode) {
        dropPlaceholder.parentNode.removeChild(dropPlaceholder);
        dropPlaceholder = null;
    }
}

/**
 * 清除所有放置指示器
 */
function clearAllDropIndicators() {
    document.querySelectorAll('.drop-indicator').forEach(el => {
        el.classList.remove('drop-indicator');
    });
}

/**
 * 将拖拽的图标放置到空位
 * @param {HTMLElement} item - 拖拽的元素
 * @param {Object} gridInfo - 网格信息
 */
function placeItemInEmptySlot(item, gridInfo) {
    const container = shortcutsGridEl;
    const items = Array.from(container.querySelectorAll('.shortcut-item:not(.in-folder):not(.dragging)'));
    
    if (gridInfo.index >= items.length) {
        // 放置到末尾
        container.appendChild(item);
    } else {
        // 插入到指定位置
        container.insertBefore(item, items[gridInfo.index]);
    }
    
    // 触发保存
    saveShortcutsOrder();
}

/**
 * 网格模式下的拖动事件
 */
function bindGridDragEvents(item) {
    const dragHandle = item.querySelector('.drag-handle');
    if (!dragHandle) return;
    
    // 拖拽手柄的mousedown - 启用拖拽并设置全局允许状态
    dragHandle.onmousedown = (e) => {
        item.setAttribute('draggable', 'true');  // 关键：启用拖拽
        dragAllowed = true;
        e.stopPropagation();
    };
    
    // 拖动开始
    item.ondragstart = (e) => {
        // 额外检查一下dragAllowed
        if (!dragAllowed) {
            e.preventDefault();
            return;
        }
        draggedItem = item;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.dataset.id);
        
        // 重置标志
        wasDroppedToFolder = false;
        targetFolderInsertIndex = null;
    };
    
    // 拖动结束
    item.ondragend = () => {
        item.classList.remove('dragging');
        item.setAttribute('draggable', 'false');  // 关键：禁用拖拽
        dragAllowed = false;
        
        // 如果已经拖到文件夹里，就不继续处理
        if (wasDroppedToFolder) {
            wasDroppedToFolder = false;
            draggedItem = null;
            clearDropPlaceholder();
            clearAllDropIndicators();
            return;
        }
        
        // 检查拖拽元素是否还在容器内，如果不在则移回容器
        if (draggedItem && !shortcutsGridEl.contains(draggedItem)) {
            shortcutsGridEl.appendChild(draggedItem);
        }
        
        draggedItem = null;
        clearDropPlaceholder();
        clearAllDropIndicators();
        saveShortcutsOrder();
    };
    
    // 拖动经过
    item.ondragover = (e) => {
        e.preventDefault();
        if (!draggedItem || draggedItem === item) return;
        
        if (item.classList.contains('in-folder')) return;
        
        // 检查鼠标是否在容器内
        const containerRect = shortcutsGridEl.getBoundingClientRect();
        if (e.clientX < containerRect.left || e.clientX > containerRect.right ||
            e.clientY < containerRect.top || e.clientY > containerRect.bottom) {
            return; // 鼠标在容器外，不处理
        }
        
        // 清除空位预览
        clearDropPlaceholder();
        
        const rect = item.getBoundingClientRect();
        const midX = rect.left + rect.width / 2;
        
        if (e.clientX < midX) {
            item.parentNode.insertBefore(draggedItem, item);
        } else {
            item.parentNode.insertBefore(draggedItem, item.nextSibling);
        }
    };
    
    // 拖动进入
    item.ondragenter = (e) => {
        if (draggedItem && draggedItem !== item) {
            item.classList.add('drop-indicator');
        }
    };
    
    // 拖动离开
    item.ondragleave = () => {
        item.classList.remove('drop-indicator');
    };
}

/**
 * 绑定文件夹头部的拖放事件（移出文件夹）
 */
function bindFolderHeaderDropEvents() {
    const folders = shortcutsGridEl.querySelectorAll('.shortcut-item.folder');
    
    folders.forEach(folder => {
        const header = folder.querySelector('.folder-header');
        if (!header) return;
        
        header.ondragover = (e) => {
            e.preventDefault();
            // 只有从文件夹内拖出的才高亮
            const draggedId = e.dataTransfer.getData('text/plain');
            if (draggedId) {
                header.style.background = 'var(--bg-tertiary, #e0e0e0)';
            }
        };
        
        header.ondragleave = () => {
            header.style.background = 'var(--bg-primary)';
        };
        
        header.ondrop = (e) => {
            e.preventDefault();
            header.style.background = 'var(--bg-primary)';
            
            const draggedId = e.dataTransfer.getData('text/plain');
            if (draggedId) {
                moveShortcutToRoot(draggedId);
            }
        };
    });
}

/**
 * 将快捷方式移动到文件夹
 */
function moveShortcutToFolder(shortcutId, folderId, targetIndex = null) {
    const shortcuts = window.appData.shortcuts;
    const folder = shortcuts.find(s => s.id === folderId);
    if (!folder || folder.type !== 'folder') return;
    
    // 查找快捷方式
    let shortcut = null;
    let sourceIndex = -1;
    let sourceArray = shortcuts;
    
    // 先在根目录找
    sourceIndex = shortcuts.findIndex(s => s.id === shortcutId);
    if (sourceIndex > -1) {
        shortcut = shortcuts[sourceIndex];
        // 不能把文件夹移入文件夹
        if (shortcut.type === 'folder') {
            window.showToast('不能将文件夹移入另一个文件夹');
            return;
        }
    } else {
        // 在其他文件夹里找
        for (const f of shortcuts.filter(s => s.type === 'folder')) {
            if (f.children) {
                sourceIndex = f.children.findIndex(s => s.id === shortcutId);
                if (sourceIndex > -1) {
                    shortcut = f.children[sourceIndex];
                    sourceArray = f.children;
                    break;
                }
            }
        }
    }
    
    if (!shortcut) return;
    
    // 如果目标文件夹不同，才移动
    if (sourceArray !== folder.children) {
        // 从源数组移除
        sourceArray.splice(sourceIndex, 1);
        
        // 添加到目标文件夹
        if (!folder.children) folder.children = [];
        
        if (targetIndex !== null && targetIndex >= 0 && targetIndex <= folder.children.length) {
            folder.children.splice(targetIndex, 0, shortcut);  // 插入到指定位置
        } else {
            folder.children.push(shortcut);  // 插入到最后
        }
        
        window.debouncedSave();
        renderShortcuts();
        window.showToast('已移动到文件夹');
    }
}

/**
 * 将快捷方式移回根目录
 */
function moveShortcutToRoot(shortcutId) {
    const shortcuts = window.appData.shortcuts;
    
    // 在文件夹里找这个快捷方式
    for (const folder of shortcuts.filter(s => s.type === 'folder')) {
        if (folder.children) {
            const index = folder.children.findIndex(s => s.id === shortcutId);
            if (index > -1) {
                const shortcut = folder.children.splice(index, 1)[0];
                
                shortcuts.push(shortcut);
                window.debouncedSave();
                renderShortcuts();
                window.showToast('已移出文件夹');
                return;
            }
        }
    }
}

/**
 * 保存快捷方式排序
 */
function saveShortcutsOrder() {
    const items = shortcutsGridEl.querySelectorAll('.shortcut-item');
    const shortcuts = window.appData.shortcuts;
    const newOrder = [];
    
    items.forEach(item => {
        const id = item.dataset.id;
        const type = item.dataset.type;
        
        if (type === 'folder') {
            // 文件夹直接添加
            const folder = shortcuts.find(s => s.id === id);
            if (folder) {
                newOrder.push(folder);
            }
        } else if (!item.classList.contains('in-folder')) {
            // 只有根目录的快捷方式才处理
            const shortcut = shortcuts.find(s => s.id === id);
            if (shortcut) {
                newOrder.push(shortcut);
            }
        }
    });
    
    // 更新数组顺序
    window.appData.shortcuts = newOrder;
    window.debouncedSave();
}

/**
 * HTML 实体转义
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
