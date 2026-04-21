/**
 * 个人工作台 - 备忘录模块
 */

// DOM 元素引用
let memoTabsListEl = null;
let memoContentEl = null;
let addMemoBtnEl = null;

// 当前选中的备忘录
let currentMemoId = null;

// 展开状态
let expandedItems = new Set();

// 自动保存定时器
let memoSaveTimer = null;

/**
 * 初始化备忘录模块
 */
function initMemoModule() {
    memoTabsListEl = document.getElementById('memoTabsList');
    memoContentEl = document.getElementById('memoContent');
    addMemoBtnEl = document.getElementById('addMemoBtn');
    
    // 绑定事件
    addMemoBtnEl.onclick = addMemo;
    
    // 确保有至少一个备忘录
    if (window.appData.memos.length === 0) {
        createDefaultMemo();
    }
    
    // 渲染标签页
    renderMemoTabs();
    
    // 选中第一个或当前备忘录
    if (!currentMemoId || !window.appData.memos.find(m => m.id === currentMemoId)) {
        currentMemoId = window.appData.memos[0]?.id;
    }
    
    // 渲染内容
    renderMemoContent();
}

/**
 * 创建默认备忘录
 */
function createDefaultMemo() {
    const memo = {
        id: window.generateId(),
        title: '默认备忘录',
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    window.appData.memos.push(memo);
    window.debouncedSave();
}

/**
 * 渲染备忘录标签页
 */
function renderMemoTabs() {
    const memos = window.appData.memos;
    
    memoTabsListEl.innerHTML = memos.map(memo => `
        <button class="memo-tab ${memo.id === currentMemoId ? 'active' : ''}" 
            data-id="${memo.id}"
            onclick="selectMemo('${memo.id}')">
            ${escapeHtml(memo.title)}
            ${memos.length > 1 ? `<span class="memo-tab-close" onclick="event.stopPropagation(); deleteMemo('${memo.id}')">×</span>` : ''}
        </button>
    `).join('');
}

/**
 * 渲染备忘录内容
 */
function renderMemoContent() {
    const memo = window.appData.memos.find(m => m.id === currentMemoId);
    
    if (!memo) {
        memoContentEl.innerHTML = '<div class="empty-state">暂无备忘录</div>';
        return;
    }
    
    // 初始化 items 数组（兼容旧数据）
    if (!memo.items) {
        memo.items = [];
        if (memo.content) {
            // 将旧内容转为一条备忘
            memo.items.push({
                id: window.generateId(),
                title: '旧备忘',
                content: memo.content,
                createdAt: memo.createdAt,
                updatedAt: memo.updatedAt
            });
            delete memo.content;
        }
        window.debouncedSave();
    }
    
    const items = memo.items || [];
    
    // 排序：置顶的在前面，然后按更新时间排序
    const sortedItems = [...items].sort((a, b) => {
        if (a.pinned !== b.pinned) {
            return a.pinned ? -1 : 1;
        }
        // 同为置顶或非置顶，按order排序，没有order的按更新时间
        const orderA = a.order !== undefined ? a.order : new Date(a.updatedAt).getTime();
        const orderB = b.order !== undefined ? b.order : new Date(b.updatedAt).getTime();
        return orderA - orderB;
    });
    
    memoContentEl.innerHTML = `
        <div class="memo-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <input type="text" 
                class="memo-title-input" 
                value="${escapeHtml(memo.title)}"
                placeholder="备忘录标题..."
                onchange="updateMemoTitle('${memo.id}', this.value)"
                style="flex: 1; border: none; background: transparent; font-size: 1rem; font-weight: 600; color: var(--text-primary); outline: none;">
            <button class="btn btn-sm" onclick="addMemoItem('${memo.id}')" style="margin-left: 8px;">+ 添加条目</button>
        </div>
        <div class="memo-items-list" style="display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto;">
            ${sortedItems.length === 0 ? '<div class="empty-state" style="color: var(--text-secondary); text-align: center; padding: 20px;">暂无条目，点击上方按钮添加</div>' : ''}
            ${sortedItems.map((item, index) => renderMemoItem(memo.id, item, index)).join('')}
        </div>
    `;
    
    // 绑定拖动事件
    bindMemoItemDragEvents(memo.id);
}

/**
 * 渲染单个备忘条目
 */
function renderMemoItem(memoId, item, index) {
    const isExpanded = expandedItems.has(item.id);
    const isPinned = item.pinned;
    
    return `
        <div class="memo-item ${isPinned ? 'pinned' : ''}" data-id="${item.id}" draggable="true" style="background: var(--bg-primary); border-radius: 8px; border: 1px solid var(--border-color); ${isPinned ? 'border-left: 3px solid var(--primary);' : ''}">
            <div class="memo-item-header" 
                onclick="toggleMemoItem('${item.id}')"
                style="display: flex; align-items: center; padding: 12px; cursor: pointer; gap: 8px;">
                <span class="memo-item-toggle" style="color: var(--text-secondary); font-size: 0.8rem; transition: transform 0.2s;">
                    ${isExpanded ? '▼' : '▶'}
                </span>
                <input type="text" 
                    class="memo-item-title" 
                    value="${escapeHtml(item.title)}"
                    placeholder="标题..."
                    onclick="event.stopPropagation();"
                    onchange="updateMemoItemTitle('${memoId}', '${item.id}', this.value)"
                    style="flex: 1; border: none; background: transparent; font-size: 0.9rem; font-weight: 500; color: var(--text-primary); outline: none;">
                ${isPinned ? '<span class="pinned-badge" style="color: var(--primary); font-size: 0.75rem;">📌 置顶</span>' : ''}
                <div style="display: flex; gap: 4px;">
                    <button class="btn-icon btn-sm" onclick="event.stopPropagation(); togglePinMemoItem('${memoId}', '${item.id}')" title="${isPinned ? '取消置顶' : '置顶'}" style="padding: 4px 8px; border: none; background: transparent; cursor: pointer; color: ${isPinned ? 'var(--primary)' : 'var(--text-secondary)'}; font-size: 0.8rem;">📌</button>
                    <button class="btn-icon btn-sm" onclick="event.stopPropagation(); deleteMemoItem('${memoId}', '${item.id}')" title="删除" style="padding: 4px 8px; border: none; background: transparent; cursor: pointer; color: #e74c3c; font-size: 0.8rem;">🗑️</button>
                    <span class="drag-handle" title="拖动排序" style="padding: 4px 8px; color: var(--text-secondary); cursor: grab; font-size: 0.8rem;">⋮⋮</span>
                </div>
            </div>
            <div class="memo-item-content" 
                style="display: ${isExpanded ? 'block' : 'none'}; padding: 0 12px 12px 32px;">
                <textarea 
                    class="memo-item-textarea"
                    placeholder="详细内容..."
                    onchange="updateMemoItemContent('${memoId}', '${item.id}', this.value)"
                    style="width: 100%; min-height: 100px; padding: 8px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.85rem; resize: vertical; font-family: inherit;">${escapeHtml(item.content || '')}</textarea>
            </div>
        </div>
    `;
}

/**
 * 切换备忘条目展开/收起
 */
function toggleMemoItem(itemId) {
    if (expandedItems.has(itemId)) {
        expandedItems.delete(itemId);
    } else {
        expandedItems.add(itemId);
    }
    renderMemoContent();
}

/**
 * 添加备忘条目
 */
function addMemoItem(memoId) {
    const memo = window.appData.memos.find(m => m.id === memoId);
    if (!memo) return;
    
    if (!memo.items) memo.items = [];
    
    const item = {
        id: window.generateId(),
        title: '',
        content: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    memo.items.push(item);
    memo.updatedAt = new Date().toISOString();
    
    // 展开新条目
    expandedItems.add(item.id);
    
    window.debouncedSave();
    renderMemoContent();
}

/**
 * 更新备忘条目标题
 */
function updateMemoItemTitle(memoId, itemId, title) {
    const memo = window.appData.memos.find(m => m.id === memoId);
    if (!memo) return;
    
    const item = memo.items.find(i => i.id === itemId);
    if (item) {
        item.title = title;
        item.updatedAt = new Date().toISOString();
        memo.updatedAt = new Date().toISOString();
        window.debouncedSave();
    }
}

/**
 * 更新备忘条目内容
 */
function updateMemoItemContent(memoId, itemId, content) {
    const memo = window.appData.memos.find(m => m.id === memoId);
    if (!memo) return;
    
    const item = memo.items.find(i => i.id === itemId);
    if (item) {
        item.content = content;
        item.updatedAt = new Date().toISOString();
        memo.updatedAt = new Date().toISOString();
        window.debouncedSave();
    }
}

/**
 * 删除备忘条目
 */
function deleteMemoItem(memoId, itemId) {
    const memo = window.appData.memos.find(m => m.id === memoId);
    if (!memo) return;
    
    const index = memo.items.findIndex(i => i.id === itemId);
    if (index > -1) {
        memo.items.splice(index, 1);
        memo.updatedAt = new Date().toISOString();
        expandedItems.delete(itemId);
        window.debouncedSave();
        renderMemoContent();
        window.showToast('已删除');
    }
}

/**
 * 选中备忘录
 */
function selectMemo(id) {
    currentMemoId = id;
    expandedItems.clear();
    renderMemoTabs();
    renderMemoContent();
}

/**
 * 更新备忘录标题
 */
function updateMemoTitle(id, title) {
    const memo = window.appData.memos.find(m => m.id === id);
    if (memo) {
        memo.title = title.trim() || '未命名';
        memo.updatedAt = new Date().toISOString();
        window.debouncedSave();
        renderMemoTabs();
    }
}

/**
 * 添加新备忘录
 */
function addMemo() {
    const count = window.appData.memos.length + 1;
    const memo = {
        id: window.generateId(),
        title: `备忘录 ${count}`,
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    window.appData.memos.push(memo);
    window.debouncedSave();
    currentMemoId = memo.id;
    expandedItems.clear();
    renderMemoTabs();
    renderMemoContent();
    window.showToast('新建备忘录成功');
}

/**
 * 删除备忘录
 */
function deleteMemo(id) {
    if (window.appData.memos.length <= 1) {
        window.showToast('至少保留一个备忘录');
        return;
    }
    
    window.showConfirm('确定要删除这个备忘录吗？', () => {
        const index = window.appData.memos.findIndex(m => m.id === id);
        if (index > -1) {
            window.appData.memos.splice(index, 1);
            
            // 如果删除的是当前选中的，切换到第一个
            if (currentMemoId === id) {
                currentMemoId = window.appData.memos[0]?.id;
            }
            
            window.debouncedSave();
            renderMemoTabs();
            renderMemoContent();
            window.showToast('已删除');
        }
    });
}

/**
 * 切换备忘条目置顶状态
 */
function togglePinMemoItem(memoId, itemId) {
    const memo = window.appData.memos.find(m => m.id === memoId);
    if (!memo) return;
    
    const item = memo.items.find(i => i.id === itemId);
    if (item) {
        item.pinned = !item.pinned;
        item.updatedAt = new Date().toISOString();
        memo.updatedAt = new Date().toISOString();
        window.debouncedSave();
        renderMemoContent();
        window.showToast(item.pinned ? '已置顶' : '已取消置顶');
    }
}

/**
 * 绑定备忘条目拖动排序事件
 */
function bindMemoItemDragEvents(memoId) {
    const list = memoContentEl.querySelector('.memo-items-list');
    if (!list) return;
    
    const items = list.querySelectorAll('.memo-item');
    let draggedItem = null;
    
    items.forEach(item => {
        const dragHandle = item.querySelector('.drag-handle');
        if (!dragHandle) return;
        
        // 拖动手柄事件
        dragHandle.onmousedown = () => {
            item.setAttribute('draggable', 'true');
        };
        
        dragHandle.onmouseup = () => {
            item.setAttribute('draggable', 'false');
        };
        
        // 拖动开始
        item.ondragstart = (e) => {
            if (!dragHandle.matches(':hover')) {
                e.preventDefault();
                return;
            }
            draggedItem = item;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        };
        
        // 拖动结束
        item.ondragend = () => {
            item.classList.remove('dragging');
            draggedItem = null;
            // 保存排序
            saveMemoItemsOrder(memoId);
        };
        
        // 拖动经过
        item.ondragover = (e) => {
            e.preventDefault();
            if (!draggedItem || draggedItem === item) return;
            
            const rect = item.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            
            if (e.clientY < midY) {
                list.insertBefore(draggedItem, item);
            } else {
                list.insertBefore(draggedItem, item.nextSibling);
            }
        };
    });
}

/**
 * 保存备忘条目排序
 */
function saveMemoItemsOrder(memoId) {
    const memo = window.appData.memos.find(m => m.id === memoId);
    if (!memo) return;
    
    const list = memoContentEl.querySelector('.memo-items-list');
    if (!list) return;
    
    const items = list.querySelectorAll('.memo-item');
    const newOrder = [];
    
    items.forEach((item, index) => {
        const id = item.dataset.id;
        const memoItem = memo.items.find(i => i.id === id);
        if (memoItem) {
            memoItem.order = index;
            newOrder.push(memoItem);
        }
    });
    
    memo.items = newOrder;
    memo.updatedAt = new Date().toISOString();
    window.debouncedSave();
}

/**
 * HTML转义
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 导出函数到全局
window.initMemoModule = initMemoModule;
window.selectMemo = selectMemo;
window.addMemo = addMemo;
window.deleteMemo = deleteMemo;
window.updateMemoTitle = updateMemoTitle;
window.toggleMemoItem = toggleMemoItem;
window.addMemoItem = addMemoItem;
window.updateMemoItemTitle = updateMemoItemTitle;
window.updateMemoItemContent = updateMemoItemContent;
window.deleteMemoItem = deleteMemoItem;
window.togglePinMemoItem = togglePinMemoItem;
