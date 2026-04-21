/**
 * 个人工作台 - 待办事项模块
 */

// 优先级配置
const PRIORITY_CONFIG = {
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
    
    // 按order排序，未完成的在前
    const sortedTodos = [...todos].sort((a, b) => {
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
                    <input type="text" class="add-subtask-input" 
                        placeholder="输入子任务内容..."
                        data-todo-id="${todo.id}"
                        onkeypress="handleSubtaskInput(event, '${todo.id}')"
                        onblur="hideSubtaskInput('${todo.id}')">
                </div>
            </div>
        ` 
        : '';
    
    return `
        <li class="todo-item ${completedClass}" data-id="${todo.id}" draggable="true">
            <span class="todo-number">${number}</span>
            <input type="checkbox" class="todo-checkbox" 
                ${todo.completed ? 'checked' : ''} 
                onchange="toggleTodo('${todo.id}')">
            <div class="todo-content-wrapper">
                <div class="todo-content">${escapeHtml(todo.content)}</div>
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
 * 创建子任务HTML
 */
function createSubTasksHtml(subtasks, todoId, parentNumber) {
    const hasManyClass = subtasks.length >= 3 ? 'has-many' : '';
    return `
        <div class="todo-subtasks ${hasManyClass}">
            ${subtasks.map((st, index) => `
                <div class="subtask-item" data-id="${st.id}" data-todo-id="${todoId}">
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
// 标记子任务是否已通过Enter键添加，避免失焦时重复添加
let subtaskAddedByEnter = false;

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
                <option value="high">高优先级</option>
                <option value="medium" selected>中优先级</option>
                <option value="low">低优先级</option>
            </select>
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
        
        if (content) {
            addTodo(content, priority);
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
                <option value="high" ${todo.priority === 'high' ? 'selected' : ''}>高优先级</option>
                <option value="medium" ${todo.priority === 'medium' ? 'selected' : ''}>中优先级</option>
                <option value="low" ${todo.priority === 'low' ? 'selected' : ''}>低优先级</option>
            </select>
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
        
        if (content) {
            editTodo(id, content, priority);
            closeModal();
            window.showToast('保存成功');
        }
    };
}

/**
 * 添加待办
 */
function addTodo(content, priority = 'medium') {
    const todos = getCurrentTodos();
    const todo = {
        id: window.generateId(),
        content: content,
        priority: priority,
        completed: false,
        subtasks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    todos.push(todo);
    window.debouncedSave();
    renderTodoList();
}

/**
 * 编辑待办
 */
function editTodo(id, content, priority) {
    const todos = getCurrentTodos();
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.content = content;
        todo.priority = priority;
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
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = i === 0 ? '今天' : i === 1 ? '明天' : ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
        dates.push({ value: dateStr, label: `${dateStr} (${dayName})` });
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
        window.debouncedSave();
        renderTodoList();
    }
}

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
        // 失焦时保存内容 - 但要检查是否已经通过Enter键添加过
        const content = input.value.trim();
        if (content && !subtaskAddedByEnter) {
            addSubtask(todoId, content);
        }
        
        // 重置标志
        subtaskAddedByEnter = false;
        
        // 延迟隐藏，给点击其他元素留时间
        setTimeout(() => {
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
        const input = event.target;
        const content = input.value.trim();
        
        if (content) {
            addSubtask(todoId, content);
            input.value = '';
            // 标记已通过Enter键添加
            subtaskAddedByEnter = true;
            // 阻止默认行为，避免失焦时再次触发
            event.preventDefault();
            // 立即隐藏输入框，而不是等失焦
            const area = document.querySelector(`.add-subtask-area[data-todo-id="${todoId}"]`);
            if (area) {
                const trigger = area.querySelector('.add-subtask-trigger');
                const wrapper = area.querySelector('.add-subtask-input-wrapper');
                if (trigger && wrapper) {
                    trigger.style.display = 'flex';
                    wrapper.style.display = 'none';
                }
            }
        }
    }
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
        todo.subtasks.push({
            id: window.generateId(),
            content: content,
            completed: false
        });
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
    
    // 创建输入框
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'subtask-edit-input';
    input.value = currentContent;
    input.style.cssText = 'flex: 1; padding: 2px 6px; font-size: 0.85rem; border: 1px solid var(--primary); border-radius: 4px;';
    
    // 替换内容
    contentEl.style.display = 'none';
    contentEl.parentNode.insertBefore(input, contentEl);
    input.focus();
    input.select();
    
    // 保存函数
    const saveEdit = () => {
        const newContent = input.value.trim();
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
        input.remove();
        contentEl.style.display = '';
        renderTodoList();
    };
    
    // 失焦保存
    input.onblur = saveEdit;
    
    // 回车保存
    input.onkeypress = (e) => {
        if (e.key === 'Enter') {
            input.blur();
        }
    };
    
    // ESC 取消
    input.onkeydown = (e) => {
        if (e.key === 'Escape') {
            input.value = currentContent; // 恢复原值
            input.blur();
        }
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
