/**
 * 个人工作台 - 全局待办视图
 * 打平所有日期的待办事项，统一展示
 */

/**
 * 初始化全局待办模块
 */
function initGlobalTodoModule() {
    const btn = document.getElementById('globalTodoBtn');
    if (btn) {
        btn.onclick = openGlobalTodo;
    }

    const overlay = document.getElementById('globalTodoOverlay');
    if (overlay) {
        overlay.onclick = (e) => {
            if (e.target === overlay) closeGlobalTodo();
        };
    }

    const closeBtn = document.getElementById('globalTodoClose');
    if (closeBtn) {
        closeBtn.onclick = closeGlobalTodo;
    }

    const filterEl = document.getElementById('globalDateFilter');
    if (filterEl) {
        filterEl.onchange = () => renderGlobalTodo();
    }

    const hideDoneEl = document.getElementById('globalHideDone');
    if (hideDoneEl) {
        hideDoneEl.onchange = () => renderGlobalTodo();
    }
}

/**
 * 收集所有日期的待办
 */
function collectAllTodos() {
    const todosByDate = window.appData.todosByDate || {};
    const all = [];
    const continuousMap = {}; // continuousId -> { todo, date }，只保留最新日期

    const today = window.getToday();

    // 按日期排序，确保后面的日期覆盖前面的；排除未来日期
    const sortedDates = Object.keys(todosByDate).sort().filter(date => date <= today);

    sortedDates.forEach(date => {
        const todos = todosByDate[date] || [];
        todos.forEach(todo => {
            // 跳过日常优先级
            if (todo.priority === 'daily') return;

            // 持续待办：同名 continuousId 只保留最新日期
            if (todo.continuous && todo.continuousId) {
                continuousMap[todo.continuousId] = { todo, date };
                return;
            }

            all.push({
                ...todo,
                _date: date
            });
        });
    });

    // 将去重后的持续待办并入结果
    Object.values(continuousMap).forEach(({ todo, date }) => {
        all.push({
            ...todo,
            _date: date
        });
    });

    return all;
}

/**
 * 应用筛选条件
 */
function filterTodos(todos) {
    const filterVal = document.getElementById('globalDateFilter')?.value || '7';
    const hideDone = document.getElementById('globalHideDone')?.checked || false;

    let filtered = [...todos];

    // 日期筛选
    if (filterVal !== 'all') {
        const days = parseInt(filterVal);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = formatDateStrGlobal(cutoff);

        // 只保留 cutoff 之后的待办，以及 cutoff 之前但有未完成待办的日期
        const datesWithIncomplete = new Set();
        filtered.forEach(t => {
            if (!t.completed) datesWithIncomplete.add(t._date);
        });

        filtered = filtered.filter(t => {
            return t._date >= cutoffStr || datesWithIncomplete.has(t._date);
        });
    }

    // 隐藏已完成
    if (hideDone) {
        filtered = filtered.filter(t => !t.completed);
    }

    return filtered;
}

/**
 * 排序：未完成在前 → 日期近在前 → 日常优先 → 高优先在前
 */
function sortGlobalTodos(todos) {
    const priorityWeight = { daily: 0, high: 1, medium: 2, low: 3 };
    const today = window.getToday();

    return [...todos].sort((a, b) => {
        // 未完成在前
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        // 日期近在前（今天排最前）
        if (a._date !== b._date) {
            if (a._date === today) return -1;
            if (b._date === today) return 1;
            return a._date > b._date ? -1 : 1;
        }
        // 优先级
        const wa = priorityWeight[a.priority] ?? 2;
        const wb = priorityWeight[b.priority] ?? 2;
        return wa - wb;
    });
}

/**
 * 打开全局视图
 */
function openGlobalTodo() {
    document.getElementById('globalTodoOverlay').style.display = 'flex';
    renderGlobalTodo();
}

/**
 * 关闭全局视图
 */
function closeGlobalTodo() {
    document.getElementById('globalTodoOverlay').style.display = 'none';
}

/**
 * 渲染全局视图
 */
function renderGlobalTodo() {
    const bodyEl = document.getElementById('globalTodoBody');
    const summaryEl = document.getElementById('globalTodoSummary');
    if (!bodyEl) return;

    const all = collectAllTodos();
    const filtered = filterTodos(all);
    const sorted = sortGlobalTodos(filtered);

    // 汇总
    const total = all.length;
    const done = all.filter(t => t.completed).length;
    const visible = sorted.length;
    if (summaryEl) {
        summaryEl.textContent = `共 ${total} 项，完成 ${done} 项${visible !== total ? `，当前显示 ${visible} 项` : ''}`;
    }

    if (sorted.length === 0) {
        bodyEl.innerHTML = '<div class="wr-empty">🎉 没有符合条件的待办事项</div>';
        return;
    }

    bodyEl.innerHTML = sorted.map(todo => createGlobalTodoItem(todo)).join('');

    // 绑定事件
    bodyEl.querySelectorAll('.gt-checkbox').forEach(cb => {
        cb.onchange = (e) => {
            e.stopPropagation();
            toggleGlobalTodo(cb.dataset.date, cb.dataset.id);
        };
    });

    bodyEl.querySelectorAll('.gt-subtask-toggle').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const todoId = btn.dataset.id;
            const date = btn.dataset.date;
            const row = document.getElementById(`gt-subtasks-${date}-${todoId}`);
            if (row) {
                const isHidden = row.style.display === 'none';
                row.style.display = isHidden ? 'block' : 'none';
                btn.textContent = isHidden ? '▲' : '▼';
            }
        };
    });

    bodyEl.querySelectorAll('.gt-sub-check').forEach(cb => {
        cb.onchange = (e) => {
            e.stopPropagation();
            toggleGlobalSubtask(cb.dataset.date, cb.dataset.todoId, cb.dataset.subtaskId);
        };
    });
}

/**
 * 创建单条待办 HTML
 */
function createGlobalTodoItem(todo) {
    const priority = PRIORITY_CONFIG[todo.priority] || PRIORITY_CONFIG.medium;
    const completedClass = todo.completed ? 'gt-completed' : '';
    const dateLabel = formatDateLabel(todo._date);
    const isToday = todo._date === window.getToday();
    const dateClass = isToday ? 'gt-date-today' : '';

    const subtaskCount = todo.subtasks?.length || 0;
    const subtaskDone = todo.subtasks?.filter(s => s.completed).length || 0;
    const hasSubtasks = subtaskCount > 0;

    let subtaskHtml = '';
    if (hasSubtasks) {
        const sortedSubtasks = sortSubtasksGlobal(todo.subtasks);
        subtaskHtml = `
            <div class="gt-subtasks" id="gt-subtasks-${todo._date}-${todo.id}" style="display: none;">
                ${sortedSubtasks.map(st => `
                    <div class="gt-subtask-row ${st.completed ? 'gt-completed' : ''}">
                        <input type="checkbox" class="gt-sub-check"
                            data-date="${todo._date}"
                            data-todo-id="${todo.id}"
                            data-subtask-id="${st.id}"
                            ${st.completed ? 'checked' : ''}>
                        <span>${escapeHtml(st.content)}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    return `
        <div class="gt-item ${completedClass}">
            <div class="gt-item-main">
                <input type="checkbox" class="gt-checkbox"
                    data-date="${todo._date}"
                    data-id="${todo.id}"
                    ${todo.completed ? 'checked' : ''}>
                <span class="gt-date-badge ${dateClass}">${dateLabel}</span>
                <span class="gt-priority-badge" style="background: ${priority.color}">${priority.label}</span>
                <span class="gt-content">${escapeHtml(todo.content)}</span>
                ${hasSubtasks ? `
                    <button class="gt-subtask-toggle" data-date="${todo._date}" data-id="${todo.id}" title="展开/收起子任务">
                        ▼ <span class="gt-subtask-stat">${subtaskDone}/${subtaskCount}</span>
                    </button>
                ` : ''}
            </div>
            ${subtaskHtml}
        </div>
    `;
}

/**
 * 格式化日期标签
 */
function formatDateLabel(dateStr) {
    const today = window.getToday();
    if (dateStr === today) return '今天';

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = formatDateStrGlobal(yesterday);
    if (dateStr === yStr) return '昨天';

    const t = new Date(dateStr);
    const m = t.getMonth() + 1;
    const d = t.getDate();
    return `${m}/${d}`;
}

/**
 * 切换全局视图中的 todo 完成状态
 */
function toggleGlobalTodo(date, todoId) {
    const todosByDate = window.appData.todosByDate || {};
    const todos = todosByDate[date];
    if (!todos) return;

    const todo = todos.find(t => t.id === todoId);
    if (!todo) return;

    todo.completed = !todo.completed;
    todo.updatedAt = new Date().toISOString();
    window.debouncedSave();
    renderGlobalTodo();
}

/**
 * 切换全局视图中的子任务完成状态
 */
function toggleGlobalSubtask(date, todoId, subtaskId) {
    const todosByDate = window.appData.todosByDate || {};
    const todos = todosByDate[date];
    if (!todos) return;

    const todo = todos.find(t => t.id === todoId);
    if (!todo?.subtasks) return;

    const st = todo.subtasks.find(s => s.id === subtaskId);
    if (!st) return;

    st.completed = !st.completed;
    updateSubtaskOrderGlobal(todo.subtasks);
    todo.updatedAt = new Date().toISOString();
    window.debouncedSave();
    renderGlobalTodo();
}

/**
 * 排序子任务
 */
function sortSubtasksGlobal(subtasks) {
    return [...subtasks].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const oa = a.order !== undefined ? a.order : 0;
        const ob = b.order !== undefined ? b.order : 0;
        return oa - ob;
    });
}

function updateSubtaskOrderGlobal(subtasks) {
    sortSubtasksGlobal(subtasks).forEach((st, i) => { st.order = i; });
}

function formatDateStrGlobal(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 确保在 todo.js 之后加载，复用 PRIORITY_CONFIG
if (typeof PRIORITY_CONFIG === 'undefined') {
    var PRIORITY_CONFIG = {
        daily: { label: '日常', color: '#3498DB' },
        high: { label: '高', color: '#E74C3C' },
        medium: { label: '中', color: '#F39C12' },
        low: { label: '低', color: '#27AE60' }
    };
}

// 导出
window.initGlobalTodoModule = initGlobalTodoModule;
