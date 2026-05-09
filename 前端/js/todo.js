/**
 * 个人工作台 - 待办事项模块
 */

// 优先级配置
const PRIORITY_CONFIG = {
    daily: { label: '日常', color: '#3498DB' },
    high: { label: '高', color: '#E74C3C' },
    medium: { label: '中', color: '#F39C12' },
    low: { label: '低', color: '#27AE60' }
};

// 当前选中的日期
let currentTodoDate = null;

// DOM 元素引用
let todoListEl = null;
let todoInputEl = null;
let todoPriorityEl = null;
let addTodoBtnEl = null;
let todoDateDisplayEl = null;

/**
 * 获取前一天的日期字符串
 */
function getYesterday(todayStr) {
    const today = new Date(todayStr);
    today.setDate(today.getDate() - 1);
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 检查待办事项是否全部完成（包括子任务）
 */
function isTodoFullyCompleted(todo) {
    if (!todo.completed) return false;
    if (todo.subtasks && todo.subtasks.length > 0) {
        return todo.subtasks.every(st => st.completed);
    }
    return true;
}

/**
 * 把前一天的持续待办复制到今天，并添加日常优先级待办
 */
function carryOverContinuousTodos() {
    const today = window.getToday();
    const yesterday = getYesterday(today);
    
    // 获取昨天的待办事项
    if (!window.appData.todosByDate || !window.appData.todosByDate[yesterday]) {
        return;
    }
    const yesterdayTodos = window.appData.todosByDate[yesterday];
    
    // 获取今天的待办事项
    if (!window.appData.todosByDate[today]) {
        window.appData.todosByDate[today] = [];
    }
    const todayTodos = window.appData.todosByDate[today];
    
    // 获取今天已经存在的 continuousId 和日常待办的内容，避免重复添加
    const todayContinuousIds = new Set(todayTodos
        .filter(t => t.continuousId)
        .map(t => t.continuousId));
    const todayDailyContents = new Set(todayTodos
        .filter(t => t.priority === 'daily' && t.dailyId)
        .map(t => t.dailyId));
    
    // 收集昨天的日常优先级待办，准备添加到今天（日常待办每天重置为未完成）
    const dailyTodosToAdd = [];
    
    // 遍历昨天的待办
    yesterdayTodos.forEach(yesterdayTodo => {
        // 处理日常优先级待办
        if (yesterdayTodo.priority === 'daily') {
            // 为日常待办生成或获取 dailyId
            const dailyId = yesterdayTodo.dailyId || window.generateId();
            
            // 避免重复添加
            if (!todayDailyContents.has(dailyId)) {
                // 添加日常待办，重置为未完成状态
                dailyTodosToAdd.push({
                    id: window.generateId(),
                    content: yesterdayTodo.content,
                    priority: 'daily',
                    completed: false,
                    subtasks: yesterdayTodo.subtasks ? yesterdayTodo.subtasks.map(st => ({
                        id: window.generateId(),
                        content: st.content,
                        completed: false  // 日常待办的子任务也重置为未完成
                    })) : [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    continuous: false,  // 日常优先级不需要持续属性
                    continuousId: null,
                    dailyId: dailyId
                });
            }
        }
        
        // 处理持续且未完成的待办
        if (yesterdayTodo.continuous && yesterdayTodo.continuousId && !isTodoFullyCompleted(yesterdayTodo)) {
            // 避免重复添加
            if (!todayContinuousIds.has(yesterdayTodo.continuousId)) {
                // 复制待办事项到今天，只保留未完成的子任务
                const newTodo = {
                    id: window.generateId(),
                    content: yesterdayTodo.content,
                    priority: yesterdayTodo.priority,
                    completed: yesterdayTodo.completed,
                    subtasks: yesterdayTodo.subtasks
                        ? yesterdayTodo.subtasks
                            .filter(st => !st.completed)
                            .map(st => ({
                                id: window.generateId(),
                                content: st.content,
                                completed: false
                            }))
                        : [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    continuous: true,
                    continuousId: yesterdayTodo.continuousId
                };
                
                todayTodos.push(newTodo);
            }
        }
    });
    
    // 把日常待办添加到最前面
    if (dailyTodosToAdd.length > 0) {
        // 倒序添加，保持原来的顺序
        for (let i = dailyTodosToAdd.length - 1; i >= 0; i--) {
            todayTodos.unshift(dailyTodosToAdd[i]);
        }
    }
    
    window.debouncedSave();
}

/**
 * 初始化待办事项模块
 */
function initTodoModule() {
    todoListEl = document.getElementById('todoList');
    todoInputEl = document.getElementById('todoInput');
    todoPriorityEl = document.getElementById('todoPriority');
    addTodoBtnEl = document.getElementById('addTodoBtn');
    todoDateDisplayEl = document.getElementById('todoDateDisplay');
    
    // 初始化为今天
    currentTodoDate = window.getToday();
    
    // 迁移旧数据（如果有）
    migrateOldTodos();
    
    // 把前一天的持续待办复制到今天
    carryOverContinuousTodos();
    
    // Tab 切换优先级（排除日常）
    const tabCycle = ['medium', 'high', 'low'];
    todoInputEl.onkeydown = (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const idx = tabCycle.indexOf(todoPriorityEl.value);
            const next = (idx + 1) % tabCycle.length;
            todoPriorityEl.value = tabCycle[next];
        }
    };

    // 绑定事件
    addTodoBtnEl.onclick = showAddTodoModal;
    todoInputEl.onkeypress = (e) => {
        if (e.key === 'Enter') {
            const content = todoInputEl.value.trim();
            if (content) {
                addTodo(content, todoPriorityEl.value);
                todoInputEl.value = '';
            }
        }
    };
    
    // 渲染列表
    renderTodoList();
}

/**
 * 迁移旧的待办事项数据到今天的日期
 */
function migrateOldTodos() {
    // 如果有旧的 todos 数组但没有 todosByDate
    if (window.appData.todos && window.appData.todos.length > 0) {
        if (!window.appData.todosByDate) {
            window.appData.todosByDate = {};
        }
        const today = window.getToday();
        // 将旧数据迁移到今天
        if (!window.appData.todosByDate[today]) {
            window.appData.todosByDate[today] = window.appData.todos;
        }
        // 清空旧数据
        delete window.appData.todos;
        window.debouncedSave();
    }
}

/**
 * 切换待办事项的日期
 */
function switchTodoDate(date) {
    currentTodoDate = date;
    renderTodoList();
}

/**
 * 获取当前日期的待办事项
 */
function getCurrentTodos() {
    if (!window.appData.todosByDate) {
        window.appData.todosByDate = {};
    }
    if (!window.appData.todosByDate[currentTodoDate]) {
        window.appData.todosByDate[currentTodoDate] = [];
    }
    return window.appData.todosByDate[currentTodoDate];
}

/**
 * 渲染待办列表
 */
function renderTodoList() {
    // 更新日期显示
    if (todoDateDisplayEl) {
        const dateObj = new Date(currentTodoDate);
        const today = window.getToday();
        const isToday = currentTodoDate === today;
        const dateStr = isToday ? '今天' : dateObj.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
        todoDateDisplayEl.textContent = dateStr;
    }
    
    const todos = getCurrentTodos();
    
    if (todos.length === 0) {
        todoListEl.innerHTML = `
            <li class="empty-state">
                <div class="empty-state-icon">📋</div>
                <div class="empty-state-text">暂无待办事项</div>
            </li>
        `;
        return;
    }
    
    // 排序：日常优先级在前，然后未完成的在前，最后按order排序
    const sortedTodos = [...todos].sort((a, b) => {
        // 日常优先级始终在最前面
        if (a.priority === 'daily' && b.priority !== 'daily') {
            return -1;
        }
        if (a.priority !== 'daily' && b.priority === 'daily') {
            return 1;
        }
        // 都是日常优先级的话，按order排序
        if (a.priority === 'daily' && b.priority === 'daily') {
            const orderA = a.order !== undefined ? a.order : new Date(a.createdAt).getTime();
            const orderB = b.order !== undefined ? b.order : new Date(b.createdAt).getTime();
            return orderA - orderB;
        }
        // 非日常优先级，按完成状态排序
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        // 按order排序，没有order的按创建时间
        const orderA = a.order !== undefined ? a.order : new Date(a.createdAt).getTime();
        const orderB = b.order !== undefined ? b.order : new Date(b.createdAt).getTime();
        return orderA - orderB;
    });
    
    // 更新排序后的order
    sortedTodos.forEach((todo, index) => {
        todo.order = index;
    });
    
    todoListEl.innerHTML = sortedTodos.map((todo, index) => createTodoItemHtml(todo, index + 1)).join('');
    
    // 绑定事件
    todoListEl.querySelectorAll('.todo-item').forEach(item => {
        const id = item.dataset.id;
        bindTodoItemEvents(item, id);
    });
    
    // 绑定拖动事件
    bindDragEvents();
    
    // 绑定子任务单击/双击事件
    bindSubtaskClickEvents();

    // 绑定子任务拖拽排序事件
    bindSubtaskDragEvents();
}

/**
 * 创建待办项HTML
 */
function createTodoItemHtml(todo, number) {
    const priority = PRIORITY_CONFIG[todo.priority] || PRIORITY_CONFIG.medium;
    const completedClass = todo.completed ? 'completed' : '';
    const subTasksHtml = todo.subtasks && todo.subtasks.length > 0 
        ? createSubTasksHtml(todo.subtasks, todo.id, number) 
        : '';
    const addSubtaskHtml = !todo.completed 
        ? `
            <div class="add-subtask-area" data-todo-id="${todo.id}">
                <div class="add-subtask-trigger" onclick="showSubtaskInput('${todo.id}')">
                    <span class="add-subtask-icon">+</span>
                    <span class="add-subtask-text">添加子任务...</span>
                </div>
                <div class="add-subtask-input-wrapper" style="display: none;">
                    <textarea class="add-subtask-input"
                        placeholder="输入子任务内容..."
                        data-todo-id="${todo.id}"
                        onkeydown="handleSubtaskInput(event, '${todo.id}')"
                        onblur="hideSubtaskInput('${todo.id}')"
                        rows="1"></textarea>
                </div>
            </div>
        ` 
        : '';
    const continuousBadge = todo.continuous 
        ? '<span class="todo-continuous" title="持续放置在每日待办">🔄</span>' 
        : '';
    
    return `
        <li class="todo-item ${completedClass}" data-id="${todo.id}" draggable="true">
            <span class="todo-number">${number}</span>
            <input type="checkbox" class="todo-checkbox" 
                ${todo.completed ? 'checked' : ''} 
                onchange="toggleTodo('${todo.id}')">
            <div class="todo-content-wrapper">
                <div class="todo-content">${continuousBadge}${escapeHtml(todo.content)}</div>
                <div class="todo-meta">
                    <span class="todo-priority ${todo.priority}" 
                        style="background-color: ${priority.color}">${priority.label}</span>
                </div>
                ${subTasksHtml}
                ${addSubtaskHtml}
            </div>
            <div class="todo-actions">
                <button class="todo-action-btn copy" title="复制到其他日期">📋</button>
                <button class="todo-action-btn edit" title="编辑">✏️</button>
                <button class="todo-action-btn delete" title="删除">🗑️</button>
                <span class="drag-handle" title="拖动排序">⋮⋮</span>
            </div>
        </li>
    `;
}

/**
 * 排序子任务：未完成的在前，已完成的沉底
 */
function sortSubtasks(subtasks) {
    return [...subtasks].sort((a, b) => {
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        // 完成状态相同，按order排序，没有order的按添加顺序
        const orderA = a.order !== undefined ? a.order : subtasks.indexOf(a);
        const orderB = b.order !== undefined ? b.order : subtasks.indexOf(b);
        return orderA - orderB;
    });
}

/**
 * 创建子任务HTML
 */
function createSubTasksHtml(subtasks, todoId, parentNumber) {
    const hasManyClass = subtasks.length >= 3 ? 'has-many' : '';
    // 先排序子任务
    const sortedSubtasks = sortSubtasks(subtasks);
    return `
        <div class="todo-subtasks ${hasManyClass}">
            ${sortedSubtasks.map((st, index) => `
                <div class="subtask-item" data-id="${st.id}" data-todo-id="${todoId}" draggable="true">
                    <span class="subtask-drag-handle" title="拖动排序">⋮⋮</span>
                    <span class="subtask-number">${parentNumber}.${index + 1}</span>
                    <input type="checkbox" class="subtask-checkbox"
                        ${st.completed ? 'checked' : ''}
                        onchange="toggleSubtask('${todoId}', '${st.id}')">
                    <span class="subtask-content ${st.completed ? 'completed' : ''}"
                        data-todo-id="${todoId}"
                        data-subtask-id="${st.id}">${escapeHtml(st.content)}</span>
                    <button class="subtask-delete" onclick="deleteSubtask('${todoId}', '${st.id}')">×</button>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * 绑定待办项事件
 */
function bindTodoItemEvents(item, id) {
    const copyBtn = item.querySelector('.todo-action-btn.copy');
    const editBtn = item.querySelector('.todo-action-btn.edit');
    const deleteBtn = item.querySelector('.todo-action-btn.delete');

    copyBtn.onclick = () => showCopyTodoModal(id);
    editBtn.onclick = () => showEditTodoModal(id);
    deleteBtn.onclick = () => {
        window.showConfirm('确定要删除这个待办事项吗？', () => {
            deleteTodo(id);
        });
    };

    // 双击完成待办（排除子任务和操作按钮区域）
    item.ondblclick = (e) => {
        if (e.target.closest('.subtask-item') ||
            e.target.closest('.add-subtask-area') ||
            e.target.closest('.todo-checkbox') ||
            e.target.closest('.todo-actions')) {
            return;
        }
        toggleTodo(id);
    };
}

/**
 * 绑定拖动事件
 */
function bindDragEvents() {
    const items = todoListEl.querySelectorAll('.todo-item');
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
            saveTodoOrder();
        };
        
        // 拖动经过
        item.ondragover = (e) => {
            e.preventDefault();
            if (!draggedItem || draggedItem === item) return;
            
            const rect = item.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            
            if (e.clientY < midY) {
                item.parentNode.insertBefore(draggedItem, item);
            } else {
                item.parentNode.insertBefore(draggedItem, item.nextSibling);
            }
        };
    });
}

/**
 * 保存待办事项排序
 */
function saveTodoOrder() {
    const items = todoListEl.querySelectorAll('.todo-item');
    const todos = getCurrentTodos();
    
    items.forEach((item, index) => {
        const id = item.dataset.id;
        const todo = todos.find(t => t.id === id);
        if (todo) {
            todo.order = index;
        }
    });
    
    window.debouncedSave();
    renderTodoList(); // 重新渲染以更新编号
}

// 子任务点击定时器
let subtaskClickTimer = null;
let lastClickedSubtask = null;

/**
 * 绑定子任务单击/双击事件
 */
function bindSubtaskClickEvents() {
    const subtaskContents = todoListEl.querySelectorAll('.subtask-content');
    
    subtaskContents.forEach(el => {
        el.onclick = (e) => {
            const todoId = el.dataset.todoId;
            const subtaskId = el.dataset.subtaskId;
            
            // 如果点击的是同一个子任务
            if (lastClickedSubtask === subtaskId) {
                // 清除定时器，执行双击逻辑
                clearTimeout(subtaskClickTimer);
                subtaskClickTimer = null;
                lastClickedSubtask = null;
                toggleSubtask(todoId, subtaskId);
            } else {
                // 第一次点击，启动定时器
                lastClickedSubtask = subtaskId;
                subtaskClickTimer = setTimeout(() => {
                    // 定时器结束，执行单击编辑
                    editSubtaskContent(todoId, subtaskId);
                    subtaskClickTimer = null;
                    lastClickedSubtask = null;
                }, 300); // 300ms 区分单击和双击
            }
        };
    });
}

/**
 * 绑定子任务拖拽排序事件
 */
function bindSubtaskDragEvents() {
    const subtaskItems = todoListEl.querySelectorAll('.subtask-item');
    if (subtaskItems.length < 2) return;

    let draggedItem = null;
    let dragFromHandle = false;

    // 全局 mouseup 重置标志，防止卡死
    const resetFlag = () => { dragFromHandle = false; };

    subtaskItems.forEach(item => {
        const handle = item.querySelector('.subtask-drag-handle');
        if (!handle) return;

        // 只有从手柄按下才开始拖拽
        handle.onmousedown = (e) => {
            dragFromHandle = true;
            document.addEventListener('mouseup', resetFlag, { once: true });
        };

        item.ondragstart = (e) => {
            if (!dragFromHandle) {
                e.preventDefault();
                return;
            }
            draggedItem = item;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', '');
            e.stopPropagation(); // 阻止冒泡到父级 todo-item 的拖拽
        };

        item.ondragend = () => {
            item.classList.remove('dragging');
            if (draggedItem) {
                saveSubtaskOrder(item.dataset.todoId);
            }
            draggedItem = null;
            dragFromHandle = false;
        };

        item.ondragover = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!draggedItem || draggedItem === item) return;
            if (draggedItem.dataset.todoId !== item.dataset.todoId) return;

            const rect = item.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;

            if (e.clientY < midY) {
                item.parentNode.insertBefore(draggedItem, item);
            } else {
                item.parentNode.insertBefore(draggedItem, item.nextSibling);
            }
        };
    });
}

/**
 * 保存子任务排序
 */
function saveSubtaskOrder(todoId) {
    const todos = getCurrentTodos();
    const todo = todos.find(t => t.id === todoId);
    if (!todo || !todo.subtasks) return;

    const container = document.querySelector(`.todo-subtasks[data-todo-id]`);
    if (!container) {
        // 查找该 todo 的 subtask container
        const subtaskItems = document.querySelectorAll(`.subtask-item[data-todo-id="${todoId}"]`);
        if (subtaskItems.length === 0) return;

        subtaskItems.forEach((item, index) => {
            const st = todo.subtasks.find(s => s.id === item.dataset.id);
            if (st) st.order = index;
        });
    }

    todo.updatedAt = new Date().toISOString();
    window.debouncedSave();
}

/**
 * 显示新增待办弹窗
 */
function showAddTodoModal() {
    const bodyHtml = `
        <div class="form-group">
            <label>待办内容</label>
            <input type="text" id="newTodoContent" placeholder="输入待办事项..." autofocus>
        </div>
        <div class="form-group">
            <label>优先级</label>
            <select id="newTodoPriority">
                <option value="daily">日常优先级</option>
                <option value="high">高优先级</option>
                <option value="medium" selected>中优先级</option>
                <option value="low">低优先级</option>
            </select>
        </div>
        <div class="form-group">
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" id="newTodoContinuous">
                <span>持续放置在每日待办直到全部完成</span>
            </label>
        </div>
    `;
    
    const footerHtml = `
        <button class="btn btn-secondary" id="addTodoCancel">取消</button>
        <button class="btn btn-primary" id="addTodoOk">添加</button>
    `;
    
    const { closeModal } = window.showModal('新增待办', bodyHtml, footerHtml);
    
    document.getElementById('addTodoCancel').onclick = closeModal;
    document.getElementById('addTodoOk').onclick = () => {
        const content = document.getElementById('newTodoContent').value.trim();
        const priority = document.getElementById('newTodoPriority').value;
        const continuous = document.getElementById('newTodoContinuous').checked;
        
        if (content) {
            addTodo(content, priority, continuous);
            closeModal();
            window.showToast('添加成功');
        }
    };
    
    // 自动聚焦输入框
    setTimeout(() => {
        document.getElementById('newTodoContent').focus();
    }, 100);
}

/**
 * 显示编辑待办弹窗
 */
function showEditTodoModal(id) {
    const todos = getCurrentTodos();
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    
    const bodyHtml = `
        <div class="form-group">
            <label>待办内容</label>
            <input type="text" id="editTodoContent" value="${escapeHtml(todo.content)}">
        </div>
        <div class="form-group">
            <label>优先级</label>
            <select id="editTodoPriority">
                <option value="daily" ${todo.priority === 'daily' ? 'selected' : ''}>日常优先级</option>
                <option value="high" ${todo.priority === 'high' ? 'selected' : ''}>高优先级</option>
                <option value="medium" ${todo.priority === 'medium' ? 'selected' : ''}>中优先级</option>
                <option value="low" ${todo.priority === 'low' ? 'selected' : ''}>低优先级</option>
            </select>
        </div>
        <div class="form-group">
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" id="editTodoContinuous" ${todo.continuous ? 'checked' : ''}>
                <span>持续放置在每日待办直到全部完成</span>
            </label>
        </div>
    `;
    
    const footerHtml = `
        <button class="btn btn-secondary" id="editTodoCancel">取消</button>
        <button class="btn btn-primary" id="editTodoOk">保存</button>
    `;
    
    const { closeModal } = window.showModal('编辑待办', bodyHtml, footerHtml);
    
    document.getElementById('editTodoCancel').onclick = closeModal;
    document.getElementById('editTodoOk').onclick = () => {
        const content = document.getElementById('editTodoContent').value.trim();
        const priority = document.getElementById('editTodoPriority').value;
        const continuous = document.getElementById('editTodoContinuous').checked;
        
        if (content) {
            editTodo(id, content, priority, continuous);
            closeModal();
            window.showToast('保存成功');
        }
    };
}

/**
 * 添加待办到指定日期
 */
function addTodoToDate(dateStr, content, priority = 'medium', continuous = false, existingContinuousId = null, existingDailyId = null) {
    if (!window.appData.todosByDate) {
        window.appData.todosByDate = {};
    }
    if (!window.appData.todosByDate[dateStr]) {
        window.appData.todosByDate[dateStr] = [];
    }
    
    const todo = {
        id: window.generateId(),
        content: content,
        priority: priority,
        completed: false,
        subtasks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        continuous: continuous,
        continuousId: continuous ? (existingContinuousId || window.generateId()) : null,
        dailyId: priority === 'daily' ? (existingDailyId || window.generateId()) : null
    };
    
    // 如果是日常优先级，添加到最前面
    if (priority === 'daily') {
        window.appData.todosByDate[dateStr].unshift(todo);
    } else {
        window.appData.todosByDate[dateStr].push(todo);
    }
    
    window.debouncedSave();
}

/**
 * 删除指定日期范围内容匹配的待办
 */
function removeTodosByContentInRange(startDate, endDate, content) {
    if (!window.appData.todosByDate) return;
    
    const dates = [];
    let currentDate = new Date(startDate);
    const end = new Date(endDate);
    
    while (currentDate <= end) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        dates.push(`${year}-${month}-${day}`);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    dates.forEach(dateStr => {
        const todos = window.appData.todosByDate[dateStr];
        if (todos) {
            window.appData.todosByDate[dateStr] = todos.filter(todo => todo.content !== content);
        }
    });
}

/**
 * 添加待办
 */
function addTodo(content, priority = 'medium', continuous = false) {
    const todos = getCurrentTodos();
    const todo = {
        id: window.generateId(),
        content: content,
        priority: priority,
        completed: false,
        subtasks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        continuous: continuous,
        continuousId: continuous ? window.generateId() : null,
        dailyId: priority === 'daily' ? window.generateId() : null
    };
    
    // 如果是日常优先级，添加到最前面
    if (priority === 'daily') {
        todos.unshift(todo);
    } else {
        todos.push(todo);
    }
    
    window.debouncedSave();
    renderTodoList();
}

/**
 * 编辑待办
 */
function editTodo(id, content, priority, continuous) {
    const todos = getCurrentTodos();
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.content = content;
        todo.priority = priority;
        todo.continuous = continuous;
        // 如果开启了持续属性但没有 continuousId，则生成一个
        if (continuous && !todo.continuousId) {
            todo.continuousId = window.generateId();
        }
        // 如果改为日常优先级但没有 dailyId，则生成一个
        if (priority === 'daily' && !todo.dailyId) {
            todo.dailyId = window.generateId();
        }
        // 如果从日常优先级改为其他，清除 dailyId
        if (priority !== 'daily' && todo.dailyId) {
            todo.dailyId = null;
        }
        todo.updatedAt = new Date().toISOString();
        window.debouncedSave();
        renderTodoList();
    }
}

/**
 * 删除待办
 */
function deleteTodo(id) {
    const todos = getCurrentTodos();
    const index = todos.findIndex(t => t.id === id);
    if (index > -1) {
        todos.splice(index, 1);
        window.debouncedSave();
        renderTodoList();
        window.showToast('已删除');
    }
}

/**
 * 显示复制待办事项弹窗
 */
function showCopyTodoModal(id) {
    const todo = getCurrentTodos().find(t => t.id === id);
    if (!todo) return;
    
    // 获取最近7天的日期列表
    const today = new Date();
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const dayNum = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${dayNum}`;
        const dayName = i === 0 ? '今天' : i === 1 ? '明天' : ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
        dates.push({ value: dateStr, label: `${month}-${dayNum} (${dayName})` });
    }
    
    const bodyHtml = `
        <div class="form-group">
            <label>复制到日期</label>
            <select id="copyTargetDate" class="form-control">
                ${dates.map(d => `<option value="${d.value}">${d.label}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" id="copyKeepSubtasks" checked>
                <span>同时复制子任务</span>
            </label>
        </div>
        <div class="form-group">
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" id="copyKeepStatus">
                <span>保留子任务完成状态</span>
            </label>
        </div>
    `;
    
    const footerHtml = `
        <button class="btn btn-secondary" id="copyTodoCancel">取消</button>
        <button class="btn btn-primary" id="copyTodoOk">复制</button>
    `;
    
    const { closeModal } = window.showModal('复制待办事项', bodyHtml, footerHtml);
    
    document.getElementById('copyTodoCancel').onclick = closeModal;
    document.getElementById('copyTodoOk').onclick = () => {
        const targetDate = document.getElementById('copyTargetDate').value;
        const keepSubtasks = document.getElementById('copyKeepSubtasks').checked;
        const keepStatus = document.getElementById('copyKeepStatus').checked;
        
        copyTodo(id, targetDate, keepSubtasks, keepStatus);
        closeModal();
    };
}

/**
 * 复制待办事项到指定日期
 */
function copyTodo(id, targetDate, keepSubtasks, keepStatus) {
    const sourceTodos = getCurrentTodos();
    const todo = sourceTodos.find(t => t.id === id);
    if (!todo) return;
    
    // 获取目标日期的待办列表
    if (!window.appData.todosByDate) {
        window.appData.todosByDate = {};
    }
    if (!window.appData.todosByDate[targetDate]) {
        window.appData.todosByDate[targetDate] = [];
    }
    const targetTodos = window.appData.todosByDate[targetDate];
    
    // 创建新的待办事项
    const newTodo = {
        id: window.generateId(),
        content: todo.content,
        priority: todo.priority,
        completed: false, // 新复制的待办默认未完成
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // 复制子任务
    if (keepSubtasks && todo.subtasks && todo.subtasks.length > 0) {
        newTodo.subtasks = todo.subtasks.map(st => ({
            id: window.generateId(),
            content: st.content,
            completed: keepStatus ? st.completed : false
        }));
    }
    
    targetTodos.push(newTodo);
    window.debouncedSave();
    window.showToast(`已复制到 ${targetDate}`);
}

/**
 * 切换待办完成状态
 */
function toggleTodo(id) {
    const todos = getCurrentTodos();
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        todo.updatedAt = new Date().toISOString();
        // 通知游戏系统
        if (todo.completed && window.notifyGame) {
            window.notifyGame('todo_completed', { priority: todo.priority, todoId: todo.id, content: todo.content });
            if (todo.priority === 'daily') {
                window.notifyGame('daily_done', { todoId: todo.id });
            }
        }
        window.debouncedSave();
        renderTodoList();
    }
}

// 标志位：标记是否已经通过回车键添加了子任务
let subtaskAddedByEnter = false;

/**
 * 显示子任务输入框
 */
function showSubtaskInput(todoId) {
    const area = document.querySelector(`.add-subtask-area[data-todo-id="${todoId}"]`);
    if (!area) return;
    
    const trigger = area.querySelector('.add-subtask-trigger');
    const wrapper = area.querySelector('.add-subtask-input-wrapper');
    const input = area.querySelector('.add-subtask-input');
    
    if (trigger && wrapper && input) {
        subtaskAddedByEnter = false; // 重置标志位
        trigger.style.display = 'none';
        wrapper.style.display = 'flex';
        input.focus();
    }
}

/**
 * 隐藏子任务输入框（失焦时保存内容）
 */
function hideSubtaskInput(todoId) {
    const area = document.querySelector(`.add-subtask-area[data-todo-id="${todoId}"]`);
    if (!area) return;
    
    const trigger = area.querySelector('.add-subtask-trigger');
    const wrapper = area.querySelector('.add-subtask-input-wrapper');
    const input = area.querySelector('.add-subtask-input');
    
    if (trigger && wrapper && input) {
        // 只有当不是通过回车键添加时，才尝试保存
        if (!subtaskAddedByEnter) {
            const content = input.value.trim();
            if (content) {
                addSubtask(todoId, content);
            }
        }
        
        // 延迟隐藏，给点击其他元素留时间
        setTimeout(() => {
            subtaskAddedByEnter = false; // 重置标志位
            trigger.style.display = 'flex';
            wrapper.style.display = 'none';
            input.value = ''; // 清空输入
        }, 150);
    }
}


/**
 * 添加子任务
 */
function handleSubtaskInput(event, todoId) {
    if (event.key === 'Enter') {
        if (event.ctrlKey) {
            // Ctrl+回车：显式插入换行
            event.preventDefault();
            const input = event.target;
            const start = input.selectionStart;
            const end = input.selectionEnd;
            const val = input.value;
            input.value = val.substring(0, start) + '\n' + val.substring(end);
            input.selectionStart = input.selectionEnd = start + 1;
            return;
        }
        // 普通回车：完成添加
        event.preventDefault();
        const input = event.target;
        const content = input.value.trim();
        if (content) {
            subtaskAddedByEnter = true;
            addSubtask(todoId, content);
            input.value = '';
        }
    }
}

/**
 * 更新子任务的 order 属性
 */
function updateSubtaskOrder(subtasks) {
    // 先排序
    const sortedSubtasks = sortSubtasks(subtasks);
    // 更新 order
    sortedSubtasks.forEach((st, index) => {
        st.order = index;
    });
    return sortedSubtasks;
}

/**
 * 添加子任务
 */
function addSubtask(todoId, content) {
    const todos = getCurrentTodos();
    const todo = todos.find(t => t.id === todoId);
    if (todo) {
        if (!todo.subtasks) {
            todo.subtasks = [];
        }
        // 找到最后一个未完成子任务的 order，新子任务插在它后面
        const uncompleted = todo.subtasks.filter(st => !st.completed);
        const maxOrder = uncompleted.length > 0
            ? Math.max(...uncompleted.map(st => st.order ?? 0))
            : -1;

        const newSubtask = {
            id: window.generateId(),
            content: content,
            completed: false,
            order: maxOrder + 1
        };
        todo.subtasks.push(newSubtask);
        // 更新所有子任务的 order
        updateSubtaskOrder(todo.subtasks);
        todo.updatedAt = new Date().toISOString();
        window.debouncedSave();
        renderTodoList();
    }
}

/**
 * 编辑子任务内容（单击触发）
 */
function editSubtaskContent(todoId, subtaskId) {
    const contentEl = document.querySelector(`.subtask-item[data-id="${subtaskId}"] .subtask-content`);
    if (!contentEl) return;
    
    const currentContent = contentEl.textContent;
    
    // 创建 textarea（支持多行）
    const ta = document.createElement('textarea');
    ta.className = 'subtask-edit-input';
    ta.value = currentContent;
    ta.rows = 1;
    ta.style.cssText = 'flex: 1; padding: 2px 6px; font-size: 0.85rem; border: 1px solid var(--primary); border-radius: 4px; resize: none; font-family: inherit; overflow: hidden;';

    function autoResize() {
        ta.style.height = 'auto';
        ta.style.height = ta.scrollHeight + 'px';
    }

    // 替换内容
    contentEl.style.display = 'none';
    contentEl.parentNode.insertBefore(ta, contentEl);
    ta.focus();
    ta.select();

    // 保存函数
    const saveEdit = () => {
        const newContent = ta.value.trim();
        if (newContent && newContent !== currentContent) {
            const todos = getCurrentTodos();
            const todo = todos.find(t => t.id === todoId);
            if (todo && todo.subtasks) {
                const subtask = todo.subtasks.find(st => st.id === subtaskId);
                if (subtask) {
                    subtask.content = newContent;
                    todo.updatedAt = new Date().toISOString();
                    window.debouncedSave();
                }
            }
        }
        // 恢复显示
        ta.remove();
        contentEl.style.display = '';
        renderTodoList();
    };

    // 失焦保存
    ta.onblur = saveEdit;

    // 键盘处理
    ta.onkeydown = (e) => {
        if (e.key === 'Enter') {
            if (e.ctrlKey) {
                // Ctrl+回车：显式插入换行
                e.preventDefault();
                const start = ta.selectionStart;
                const end = ta.selectionEnd;
                const val = ta.value;
                ta.value = val.substring(0, start) + '\n' + val.substring(end);
                ta.selectionStart = ta.selectionEnd = start + 1;
                autoResize();
                return;
            }
            // 普通回车：保存
            e.preventDefault();
            ta.blur();
        } else if (e.key === 'Escape') {
            ta.value = currentContent;
            ta.blur();
        }
        // 其他按键：自动调整高度
        setTimeout(autoResize, 0);
    };
}

/**
 * 切换子任务完成状态
 */
function toggleSubtask(todoId, subtaskId) {
    const todos = getCurrentTodos();
    const todo = todos.find(t => t.id === todoId);
    if (todo && todo.subtasks) {
        const subtask = todo.subtasks.find(st => st.id === subtaskId);
        if (subtask) {
            subtask.completed = !subtask.completed;
            // 更新所有子任务的 order
            updateSubtaskOrder(todo.subtasks);
            todo.updatedAt = new Date().toISOString();
            window.debouncedSave();
            renderTodoList();
        }
    }
}

/**
 * 删除子任务
 */
function deleteSubtask(todoId, subtaskId) {
    const todos = getCurrentTodos();
    const todo = todos.find(t => t.id === todoId);
    if (todo && todo.subtasks) {
        const index = todo.subtasks.findIndex(st => st.id === subtaskId);
        if (index > -1) {
            todo.subtasks.splice(index, 1);
            // 更新剩余子任务的 order
            if (todo.subtasks.length > 0) {
                updateSubtaskOrder(todo.subtasks);
            }
            todo.updatedAt = new Date().toISOString();
            window.debouncedSave();
            renderTodoList();
        }
    }
}

/**
 * HTML转义
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 导出函数到全局
window.initTodoModule = initTodoModule;
window.addTodo = addTodo;
window.addTodoToDate = addTodoToDate;
window.removeTodosByContentInRange = removeTodosByContentInRange;
window.editTodo = editTodo;
window.deleteTodo = deleteTodo;
window.toggleTodo = toggleTodo;
window.addSubtask = addSubtask;
window.toggleSubtask = toggleSubtask;
window.deleteSubtask = deleteSubtask;
window.handleSubtaskInput = handleSubtaskInput;
window.showSubtaskInput = showSubtaskInput;
window.hideSubtaskInput = hideSubtaskInput;
window.editSubtaskContent = editSubtaskContent;
window.showCopyTodoModal = showCopyTodoModal;
window.switchTodoDate = switchTodoDate;
