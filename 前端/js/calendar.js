/**
 * 个人工作台 - 日历模块（周视图）
 */

// 优先级配置
const PRIORITIES = {
    high: { name: '高', icon: '🔴', color: '#E74C3C' },
    medium: { name: '中', icon: '🟡', color: '#F39C12' },
    low: { name: '低', icon: '🟢', color: '#27AE60' }
};

// 预置日程属性
const DEFAULT_CATEGORIES = ['工作', '学习', '生活', '出差', '会议', '其他'];

// 预置颜色
const PRESET_COLORS = ['#3498DB', '#9B59B6', '#1ABC9C', '#E74C3C', '#F39C12', '#E67E22', '#2ECC71', '#34495E'];

// 当前显示的周
let currentWeekStart = null;

// 跳转模式
let jumpMode = false;

// 选中的日期
let selectedDate = null;

// 月历弹窗状态
let monthPickerYear = null;
let monthPickerMonth = null;

// DOM 元素引用
let calendarBodyEl = null;
let currentMonthEl = null;
let prevWeekBtnEl = null;
let nextWeekBtnEl = null;
let jumpModeBtnEl = null;

/**
 * 初始化日历模块
 */
function initCalendarModule() {
    calendarBodyEl = document.getElementById('calendarBody');
    currentMonthEl = document.getElementById('currentMonth');
    prevWeekBtnEl = document.getElementById('prevWeek');
    nextWeekBtnEl = document.getElementById('nextWeek');
    jumpModeBtnEl = document.getElementById('jumpModeBtn');
    
    // 初始化为当前周的周一
    currentWeekStart = getWeekStart(new Date());
    
    // 绑定事件
    prevWeekBtnEl.onclick = () => changeWeek(-1);
    nextWeekBtnEl.onclick = () => changeWeek(1);
    jumpModeBtnEl.onclick = toggleJumpMode;
    
    // 点击月份显示区域，弹出月历选择器
    currentMonthEl.onclick = showMonthPicker;
    currentMonthEl.style.cursor = 'pointer';
    
    // 渲染日历
    renderCalendar();
}

/**
 * 切换跳转模式
 */
function toggleJumpMode() {
    jumpMode = !jumpMode;
    if (jumpMode) {
        jumpModeBtnEl.classList.add('active');
        jumpModeBtnEl.style.backgroundColor = '#3498DB';
        jumpModeBtnEl.style.color = 'white';
    } else {
        jumpModeBtnEl.classList.remove('active');
        jumpModeBtnEl.style.backgroundColor = '';
        jumpModeBtnEl.style.color = '';
    }
}

/**
 * 获取指定日期所在周的周一
 */
function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * 切换周
 */
function changeWeek(direction) {
    currentWeekStart.setDate(currentWeekStart.getDate() + (direction * 7));
    renderCalendar();
}

/**
 * 渲染日历
 */
function renderCalendar() {
    // 更新月份显示
    const month = currentWeekStart.toLocaleDateString('zh-CN', { 
        year: 'numeric', 
        month: 'long' 
    });
    currentMonthEl.textContent = month;
    
    // 生成一周的日期
    const days = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(date.getDate() + i);
        days.push(date);
    }
    
    // 渲染每一天
    calendarBodyEl.innerHTML = days.map(date => createDayHtml(date)).join('');
    
    // 渲染跨天日程进度条
    renderMultiDayBars(days);
    
    // 绑定日期单元格点击事件
    calendarBodyEl.querySelectorAll('.calendar-day').forEach(dayEl => {
        dayEl.onclick = (e) => {
            const date = dayEl.dataset.date;
            
            // 设置选中日期并重新渲染
            selectedDate = date;
            renderCalendar();
            
            // 跳转模式：切换待办事项日期（保持跳转模式）
            if (jumpMode) {
                switchTodoDate(date);
                return;
            }
            
            // 正常模式
            if (e.target.classList.contains('schedule-item') || e.target.closest('.schedule-item')) {
                // 点击了日程项 → 显示详情
                const scheduleEl = e.target.classList.contains('schedule-item') ? e.target : e.target.closest('.schedule-item');
                const scheduleId = scheduleEl.dataset.id;
                showScheduleDetail(scheduleId);
            } else {
                // 点击了日期 → 添加日程
                showAddScheduleModal(date);
            }
        };
    });
    
    // 绑定多天进度条点击事件
    document.querySelectorAll('.multi-day-bar').forEach(barEl => {
        barEl.onclick = (e) => {
            e.stopPropagation();
            const scheduleId = barEl.dataset.id;
            showScheduleDetail(scheduleId);
        };
    });
}

/**
 * 创建日期单元格HTML
 */
function createDayHtml(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dateStr = formatDate(date);
    const isToday = date.getTime() === today.getTime();
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    
    // 获取该日期的单天日程（非跨天日程）
    const schedules = window.appData.schedules.filter(s => {
        // 单天日程：没有结束日期或结束日期等于开始日期
        const isSingleDay = !s.endDate || s.endDate === s.date;
        return s.date === dateStr && isSingleDay;
    });
    
    const isSelected = selectedDate === dateStr;
    
    const dayClass = [
        'calendar-day',
        isToday ? 'today' : '',
        isWeekend ? 'weekend' : '',
        isSelected ? 'selected' : ''
    ].filter(Boolean).join(' ');
    
    return `
        <div class="${dayClass}" data-date="${dateStr}">
            <span class="day-number">${date.getDate()}</span>
            <div class="day-schedules">
                ${schedules.slice(0, 3).map(s => {
                    const priority = PRIORITIES[s.priority] || PRIORITIES.medium;
                    return `
                    <div class="schedule-item" 
                        data-id="${s.id}" 
                        style="background-color: ${s.color || '#3498DB'}">
                        <span class="schedule-priority">${priority.icon}</span>
                        <span class="schedule-title">${escapeHtml(s.title)}</span>
                    </div>
                `}).join('')}
                ${schedules.length > 3 ? `<div class="schedule-item" style="background-color: #95A5A6">+${schedules.length - 3} 更多</div>` : ''}
            </div>
        </div>
    `;
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 渲染跨天日程进度条
 */
function renderMultiDayBars(days) {
    const weekStart = formatDate(days[0]);
    const weekEnd = formatDate(days[6]);
    
    // 获取本周内的跨天日程
    const multiDaySchedules = window.appData.schedules.filter(s => {
        if (!s.endDate || s.endDate === s.date) return false;
        // 判断是否与本周有交集
        return s.date <= weekEnd && s.endDate >= weekStart;
    });
    
    if (multiDaySchedules.length === 0) {
        // 清空进度条容器
        let barsContainer = document.getElementById('multiDayBars');
        if (barsContainer) {
            barsContainer.innerHTML = '';
        }
        return;
    }
    
    // 创建进度条容器
    let barsContainer = document.getElementById('multiDayBars');
    if (!barsContainer) {
        barsContainer = document.createElement('div');
        barsContainer.id = 'multiDayBars';
        barsContainer.className = 'multi-day-bars-container';
        calendarBodyEl.parentNode.appendChild(barsContainer);
    }
    
    // 计算单元格宽度
    const dayCells = calendarBodyEl.querySelectorAll('.calendar-day');
    if (dayCells.length === 0) return;
    
    const containerWidth = calendarBodyEl.offsetWidth;
    const cellWidth = containerWidth / 7;
    const gap = 4; // gap between cells
    
    // 生成进度条HTML
    barsContainer.innerHTML = multiDaySchedules.map((schedule, index) => {
        // 计算进度条位置
        const scheduleStart = new Date(schedule.date);
        const scheduleEnd = new Date(schedule.endDate);
        const weekStartDate = days[0];
        const weekEndDate = days[6];
        
        // 计算开始位置（相对于本周）
        const visibleStart = scheduleStart < weekStartDate ? weekStartDate : scheduleStart;
        const visibleEnd = scheduleEnd > weekEndDate ? weekEndDate : scheduleEnd;
        
        // 计算天数
        const startOffset = Math.floor((visibleStart - weekStartDate) / (1000 * 60 * 60 * 24));
        const endOffset = Math.floor((visibleEnd - weekStartDate) / (1000 * 60 * 60 * 24));
        
        // 计算位置和宽度
        const left = startOffset * (cellWidth + gap);
        const numDays = endOffset - startOffset + 1;
        let width = numDays * cellWidth + (numDays - 1) * gap;
        
        // 确保不会超出容器
        const maxWidth = containerWidth - left;
        if (width > maxWidth) {
            width = maxWidth;
        }
        
        // 获取优先级信息
        const priority = PRIORITIES[schedule.priority] || PRIORITIES.medium;
        
        return `
            <div class="multi-day-bar" 
                data-id="${schedule.id}"
                style="left: ${left}px; width: ${width}px; background-color: ${schedule.color || '#3498DB'}; top: ${index * 28}px;">
                <span class="bar-title">${escapeHtml(schedule.title)}</span>
                <span class="bar-priority">${priority.icon} ${priority.name} ${schedule.category || ''}</span>
            </div>
        `;
    }).join('');
}

/**
 * 显示新增日程弹窗
 */
function showAddScheduleModal(date) {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().slice(0, 5);
    
    // 获取自定义标签
    const customCategories = window.appData.customCategories || [];
    const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];
    
    // 优先级选项
    const priorityOptions = Object.entries(PRIORITIES).map(([key, val]) => `
        <option value="${key}">${val.icon} ${val.name}</option>
    `).join('');
    
    // 日程属性选项
    const categoryOptions = allCategories.map(cat => `
        <option value="${cat}">${cat}</option>
    `).join('');
    
    // 颜色选项
    const colorOptions = PRESET_COLORS.map(color => `
        <div class="color-option" data-color="${color}" style="background-color: ${color}"></div>
    `).join('');
    
    const bodyHtml = `
        <div class="form-group" style="display: flex; gap: 16px;">
            <div style="flex: 1;">
                <label>开始日期</label>
                <input type="date" id="scheduleDate" value="${date || today}">
            </div>
            <div style="flex: 1;">
                <label>结束日期 <small style="color: #999;">(可选)</small></label>
                <input type="date" id="scheduleEndDate" value="" placeholder="留空表示单天">
            </div>
        </div>
        <div class="form-group">
            <label>标题</label>
            <input type="text" id="scheduleTitle" placeholder="日程标题..." autofocus>
        </div>
        <div class="form-group" style="display: flex; gap: 16px;">
            <div style="flex: 1;">
                <label>开始时间</label>
                <input type="time" id="scheduleStartTime" value="${now}">
            </div>
            <div style="flex: 1;">
                <label>结束时间</label>
                <input type="time" id="scheduleEndTime" value="">
            </div>
        </div>
        <div class="form-group">
            <label>优先级</label>
            <select id="schedulePriority">
                ${priorityOptions}
            </select>
        </div>
        <div class="form-group">
            <label>日程属性</label>
            <div style="display: flex; gap: 8px; align-items: center;">
                <select id="scheduleCategory" style="flex: 1;">
                    ${categoryOptions}
                </select>
                <button type="button" class="btn btn-sm" id="addCategoryBtn" title="添加自定义标签">+</button>
            </div>
        </div>
        <div class="form-group">
            <label>颜色</label>
            <div class="color-picker" id="colorPicker">
                ${colorOptions}
            </div>
        </div>
        <div class="form-group">
            <label>描述</label>
            <textarea id="scheduleDescription" placeholder="日程描述（可选）..."></textarea>
        </div>
    `;
    
    const footerHtml = `
        <button class="btn btn-secondary" id="addScheduleCancel">取消</button>
        <button class="btn btn-primary" id="addScheduleOk">添加</button>
    `;
    
    const { closeModal } = window.showModal('新建日程', bodyHtml, footerHtml);
    
    // 绑定颜色选择
    let selectedColor = PRESET_COLORS[0];
    document.querySelectorAll('#colorPicker .color-option').forEach(opt => {
        opt.onclick = () => {
            document.querySelectorAll('#colorPicker .color-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            selectedColor = opt.dataset.color;
        };
    });
    // 默认选中第一个
    document.querySelector('#colorPicker .color-option').classList.add('selected');
    
    // 添加自定义标签
    document.getElementById('addCategoryBtn').onclick = () => {
        const newCategory = prompt('请输入新的日程属性名称：');
        if (newCategory && newCategory.trim()) {
            const trimmed = newCategory.trim();
            // 检查是否已存在
            const existing = window.appData.customCategories || [];
            if (!DEFAULT_CATEGORIES.includes(trimmed) && !existing.includes(trimmed)) {
                existing.push(trimmed);
                window.appData.customCategories = existing;
                window.debouncedSave();
                // 添加到下拉框
                const select = document.getElementById('scheduleCategory');
                const option = document.createElement('option');
                option.value = trimmed;
                option.textContent = trimmed;
                select.appendChild(option);
                select.value = trimmed;
                window.showToast('已添加新属性：' + trimmed);
            } else {
                window.showToast('该属性已存在');
            }
        }
    };
    
    document.getElementById('addScheduleCancel').onclick = closeModal;
    document.getElementById('addScheduleOk').onclick = () => {
        const title = document.getElementById('scheduleTitle').value.trim();
        const scheduleDate = document.getElementById('scheduleDate').value;
        const endDate = document.getElementById('scheduleEndDate').value;
        const startTime = document.getElementById('scheduleStartTime').value;
        const endTime = document.getElementById('scheduleEndTime').value;
        const priority = document.getElementById('schedulePriority').value;
        const category = document.getElementById('scheduleCategory').value;
        const description = document.getElementById('scheduleDescription').value.trim();
        
        // 验证结束日期
        if (endDate && endDate < scheduleDate) {
            window.showToast('结束日期不能早于开始日期');
            return;
        }
        
        if (title && scheduleDate) {
            addSchedule({
                title,
                date: scheduleDate,
                endDate: endDate || null,
                startTime,
                endTime,
                priority,
                category,
                color: selectedColor,
                description
            });
            closeModal();
            window.showToast('添加成功');
        } else {
            window.showToast('请填写标题');
        }
    };
    
    setTimeout(() => document.getElementById('scheduleTitle').focus(), 100);
}

/**
 * 显示日程详情（查看模式）
 */
function showScheduleDetail(scheduleId) {
    const schedule = window.appData.schedules.find(s => s.id === scheduleId);
    if (!schedule) return;
    
    const priority = PRIORITIES[schedule.priority] || PRIORITIES.medium;
    const dateRange = schedule.endDate 
        ? `${schedule.date} 至 ${schedule.endDate}` 
        : schedule.date;
    const timeRange = schedule.startTime 
        ? `${schedule.startTime}${schedule.endTime ? ' - ' + schedule.endTime : ''}` 
        : '全天';
    
    const bodyHtml = `
        <div class="schedule-detail">
            <h3 class="detail-title">${escapeHtml(schedule.title)}</h3>
            <div class="detail-info">
                <div class="detail-row">
                    <span class="detail-label">📅 日期</span>
                    <span class="detail-value">${dateRange}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">⏰ 时间</span>
                    <span class="detail-value">${timeRange}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">优先级</span>
                    <span class="detail-value">${priority.icon} ${priority.name}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">属性</span>
                    <span class="detail-value">${schedule.category || '其他'}</span>
                </div>
                ${schedule.description ? `
                <div class="detail-row detail-desc">
                    <span class="detail-label">📝 描述</span>
                    <span class="detail-value">${escapeHtml(schedule.description)}</span>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    const footerHtml = `
        <button class="btn btn-danger" id="deleteScheduleBtn">删除</button>
        <button class="btn btn-secondary" id="closeDetailBtn">关闭</button>
        <button class="btn btn-primary" id="editScheduleBtn">编辑</button>
    `;
    
    const { closeModal } = window.showModal('日程详情', bodyHtml, footerHtml);
    
    document.getElementById('closeDetailBtn').onclick = closeModal;
    document.getElementById('editScheduleBtn').onclick = () => {
        closeModal();
        showEditScheduleModal(scheduleId);
    };
    document.getElementById('deleteScheduleBtn').onclick = () => {
        window.showConfirm('确定要删除这个日程吗？', () => {
            deleteSchedule(scheduleId);
            closeModal();
            window.showToast('已删除');
        });
    };
}

/**
 * 显示编辑日程弹窗（编辑模式）
 */
function showEditScheduleModal(scheduleId) {
    const schedule = window.appData.schedules.find(s => s.id === scheduleId);
    if (!schedule) return;
    
    // 获取自定义标签
    const customCategories = window.appData.customCategories || [];
    const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];
    
    // 优先级选项
    const priorityOptions = Object.entries(PRIORITIES).map(([key, val]) => `
        <option value="${key}" ${schedule.priority === key ? 'selected' : ''}>${val.icon} ${val.name}</option>
    `).join('');
    
    // 日程属性选项
    const categoryOptions = allCategories.map(cat => `
        <option value="${cat}" ${schedule.category === cat ? 'selected' : ''}>${cat}</option>
    `).join('');
    
    // 颜色选项
    const colorOptions = PRESET_COLORS.map(color => `
        <div class="color-option ${schedule.color === color ? 'selected' : ''}" 
            data-color="${color}" 
            style="background-color: ${color}"></div>
    `).join('');
    
    const bodyHtml = `
        <div class="form-group" style="display: flex; gap: 16px;">
            <div style="flex: 1;">
                <label>开始日期</label>
                <input type="date" id="editScheduleDate" value="${schedule.date}">
            </div>
            <div style="flex: 1;">
                <label>结束日期 <small style="color: #999;">(可选)</small></label>
                <input type="date" id="editScheduleEndDate" value="${schedule.endDate || ''}" placeholder="留空表示单天">
            </div>
        </div>
        <div class="form-group">
            <label>标题</label>
            <input type="text" id="editScheduleTitle" value="${escapeHtml(schedule.title)}">
        </div>
        <div class="form-group" style="display: flex; gap: 16px;">
            <div style="flex: 1;">
                <label>开始时间</label>
                <input type="time" id="editScheduleStartTime" value="${schedule.startTime || ''}">
            </div>
            <div style="flex: 1;">
                <label>结束时间</label>
                <input type="time" id="editScheduleEndTime" value="${schedule.endTime || ''}">
            </div>
        </div>
        <div class="form-group">
            <label>优先级</label>
            <select id="editSchedulePriority">
                ${priorityOptions}
            </select>
        </div>
        <div class="form-group">
            <label>日程属性</label>
            <div style="display: flex; gap: 8px; align-items: center;">
                <select id="editScheduleCategory" style="flex: 1;">
                    ${categoryOptions}
                </select>
                <button type="button" class="btn btn-sm" id="editAddCategoryBtn" title="添加自定义标签">+</button>
            </div>
        </div>
        <div class="form-group">
            <label>颜色</label>
            <div class="color-picker" id="editColorPicker">
                ${colorOptions}
            </div>
        </div>
        <div class="form-group">
            <label>描述</label>
            <textarea id="editScheduleDescription">${escapeHtml(schedule.description || '')}</textarea>
        </div>
    `;
    
    const footerHtml = `
        <button class="btn btn-secondary" id="editScheduleCancel">取消</button>
        <button class="btn btn-primary" id="editScheduleOk">保存</button>
    `;
    
    const { closeModal } = window.showModal('编辑日程', bodyHtml, footerHtml);
    
    // 绑定颜色选择
    let selectedColor = schedule.color || PRESET_COLORS[0];
    document.querySelectorAll('#editColorPicker .color-option').forEach(opt => {
        opt.onclick = () => {
            document.querySelectorAll('#editColorPicker .color-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            selectedColor = opt.dataset.color;
        };
    });
    
    // 添加自定义标签
    document.getElementById('editAddCategoryBtn').onclick = () => {
        const newCategory = prompt('请输入新的日程属性名称：');
        if (newCategory && newCategory.trim()) {
            const trimmed = newCategory.trim();
            const existing = window.appData.customCategories || [];
            if (!DEFAULT_CATEGORIES.includes(trimmed) && !existing.includes(trimmed)) {
                existing.push(trimmed);
                window.appData.customCategories = existing;
                window.debouncedSave();
                const select = document.getElementById('editScheduleCategory');
                const option = document.createElement('option');
                option.value = trimmed;
                option.textContent = trimmed;
                select.appendChild(option);
                select.value = trimmed;
                window.showToast('已添加新属性：' + trimmed);
            } else {
                window.showToast('该属性已存在');
            }
        }
    };
    
    document.getElementById('editScheduleCancel').onclick = closeModal;
    document.getElementById('editScheduleOk').onclick = () => {
        const title = document.getElementById('editScheduleTitle').value.trim();
        const scheduleDate = document.getElementById('editScheduleDate').value;
        const endDate = document.getElementById('editScheduleEndDate').value;
        const startTime = document.getElementById('editScheduleStartTime').value;
        const endTime = document.getElementById('editScheduleEndTime').value;
        const priority = document.getElementById('editSchedulePriority').value;
        const category = document.getElementById('editScheduleCategory').value;
        const description = document.getElementById('editScheduleDescription').value.trim();
        
        // 验证结束日期
        if (endDate && endDate < scheduleDate) {
            window.showToast('结束日期不能早于开始日期');
            return;
        }
        
        if (title && scheduleDate) {
            editSchedule(scheduleId, {
                title,
                date: scheduleDate,
                endDate: endDate || null,
                startTime,
                endTime,
                priority,
                category,
                color: selectedColor,
                description
            });
            closeModal();
            window.showToast('保存成功');
        }
    };
}

/**
 * 添加日程
 */
function addSchedule(data) {
    const schedule = {
        id: window.generateId(),
        title: data.title,
        date: data.date,
        endDate: data.endDate,
        startTime: data.startTime,
        endTime: data.endTime,
        priority: data.priority || 'medium',
        category: data.category || '其他',
        color: data.color,
        description: data.description,
        createdAt: new Date().toISOString()
    };
    
    window.appData.schedules.push(schedule);
    window.debouncedSave();
    renderCalendar();
}

/**
 * 编辑日程
 */
function editSchedule(id, data) {
    const schedule = window.appData.schedules.find(s => s.id === id);
    if (schedule) {
        schedule.title = data.title;
        schedule.date = data.date;
        schedule.endDate = data.endDate;
        schedule.startTime = data.startTime;
        schedule.endTime = data.endTime;
        schedule.priority = data.priority;
        schedule.category = data.category;
        schedule.color = data.color;
        schedule.description = data.description;
        window.debouncedSave();
        renderCalendar();
    }
}

/**
 * 删除日程
 */
function deleteSchedule(id) {
    const index = window.appData.schedules.findIndex(s => s.id === id);
    if (index > -1) {
        window.appData.schedules.splice(index, 1);
        window.debouncedSave();
        renderCalendar();
    }
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

/**
 * 显示月历选择器
 */
function showMonthPicker() {
    // 初始化为当前显示的月份
    monthPickerYear = currentWeekStart.getFullYear();
    monthPickerMonth = currentWeekStart.getMonth();
    
    const bodyHtml = `
        <div class="month-picker">
            <div class="month-picker-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <button class="month-picker-nav" id="monthPickerPrevYear" style="width: 36px; height: 36px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-primary); cursor: pointer; font-size: 1rem;">◀</button>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <select id="monthPickerYearSelect" style="padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-primary); font-size: 1rem; cursor: pointer;">
                        ${generateYearOptions(monthPickerYear)}
                    </select>
                    <select id="monthPickerMonthSelect" style="padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-primary); font-size: 1rem; cursor: pointer;">
                        ${generateMonthOptions(monthPickerMonth)}
                    </select>
                </div>
                <button class="month-picker-nav" id="monthPickerNextYear" style="width: 36px; height: 36px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-primary); cursor: pointer; font-size: 1rem;">▶</button>
            </div>
            <div class="month-picker-body">
                <div class="month-picker-weekdays" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 8px; text-align: center;">
                    <div style="padding: 8px; color: var(--text-secondary); font-size: 0.8rem;">一</div>
                    <div style="padding: 8px; color: var(--text-secondary); font-size: 0.8rem;">二</div>
                    <div style="padding: 8px; color: var(--text-secondary); font-size: 0.8rem;">三</div>
                    <div style="padding: 8px; color: var(--text-secondary); font-size: 0.8rem;">四</div>
                    <div style="padding: 8px; color: var(--text-secondary); font-size: 0.8rem;">五</div>
                    <div style="padding: 8px; color: #E74C3C; font-size: 0.8rem;">六</div>
                    <div style="padding: 8px; color: #E74C3C; font-size: 0.8rem;">日</div>
                </div>
                <div id="monthPickerDays" class="month-picker-days" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;">
                </div>
            </div>
            <div class="month-picker-footer" style="margin-top: 16px; display: flex; justify-content: center;">
                <button class="btn btn-secondary btn-sm" id="monthPickerToday">📍 今天</button>
            </div>
        </div>
    `;
    
    const footerHtml = `
        <button class="btn btn-secondary" id="monthPickerCancel">取消</button>
    `;
    
    const { closeModal } = window.showModal('选择日期', bodyHtml, footerHtml);
    
    // 渲染日期
    renderMonthPickerDays();
    
    // 绑定事件
    document.getElementById('monthPickerPrevYear').onclick = () => {
        monthPickerYear--;
        updateMonthPickerSelects();
        renderMonthPickerDays();
    };
    
    document.getElementById('monthPickerNextYear').onclick = () => {
        monthPickerYear++;
        updateMonthPickerSelects();
        renderMonthPickerDays();
    };
    
    document.getElementById('monthPickerYearSelect').onchange = (e) => {
        monthPickerYear = parseInt(e.target.value);
        renderMonthPickerDays();
    };
    
    document.getElementById('monthPickerMonthSelect').onchange = (e) => {
        monthPickerMonth = parseInt(e.target.value);
        renderMonthPickerDays();
    };
    
    document.getElementById('monthPickerToday').onclick = () => {
        const today = new Date();
        monthPickerYear = today.getFullYear();
        monthPickerMonth = today.getMonth();
        updateMonthPickerSelects();
        renderMonthPickerDays();
    };
    
    document.getElementById('monthPickerCancel').onclick = closeModal;
    
    // 存储关闭函数
    window._monthPickerClose = closeModal;
}

/**
 * 生成年份选项
 */
function generateYearOptions(selectedYear) {
    const currentYear = new Date().getFullYear();
    let html = '';
    for (let year = currentYear - 5; year <= currentYear + 5; year++) {
        html += `<option value="${year}" ${year === selectedYear ? 'selected' : ''}>${year}年</option>`;
    }
    return html;
}

/**
 * 生成月份选项
 */
function generateMonthOptions(selectedMonth) {
    const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    return months.map((name, index) => `<option value="${index}" ${index === selectedMonth ? 'selected' : ''}>${name}</option>`).join('');
}

/**
 * 更新年月选择框
 */
function updateMonthPickerSelects() {
    document.getElementById('monthPickerYearSelect').value = monthPickerYear;
    document.getElementById('monthPickerMonthSelect').value = monthPickerMonth;
}

/**
 * 渲染月历日期
 */
function renderMonthPickerDays() {
    const container = document.getElementById('monthPickerDays');
    if (!container) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 获取本月第一天和最后一天
    const firstDay = new Date(monthPickerYear, monthPickerMonth, 1);
    const lastDay = new Date(monthPickerYear, monthPickerMonth + 1, 0);
    
    // 计算本月第一天是星期几（0=周日，转换为周一=0）
    let startWeekday = firstDay.getDay();
    startWeekday = startWeekday === 0 ? 6 : startWeekday - 1;
    
    let html = '';
    
    // 填充空白
    for (let i = 0; i < startWeekday; i++) {
        html += '<div style="padding: 8px;"></div>';
    }
    
    // 填充日期
    const daysInMonth = lastDay.getDate();
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(monthPickerYear, monthPickerMonth, day);
        date.setHours(0, 0, 0, 0);
        
        const isToday = date.getTime() === today.getTime();
        const isSelected = selectedDate === formatDate(date);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        
        const classes = ['month-picker-day'];
        if (isToday) classes.push('today');
        if (isSelected) classes.push('selected');
        if (isWeekend) classes.push('weekend');
        
        const style = `
            padding: 8px;
            text-align: center;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            ${isToday ? 'background: var(--primary); color: white; font-weight: 600;' : ''}
            ${isSelected && !isToday ? 'background: rgba(59, 130, 246, 0.2); font-weight: 600;' : ''}
            ${isWeekend && !isToday && !isSelected ? 'color: #E74C3C;' : ''}
        `;
        
        html += `<div class="${classes.join(' ')}" data-date="${formatDate(date)}" style="${style}">${day}</div>`;
    }
    
    container.innerHTML = html;
    
    // 绑定点击事件
    container.querySelectorAll('.month-picker-day[data-date]').forEach(dayEl => {
        dayEl.onclick = () => {
            const dateStr = dayEl.dataset.date;
            
            // 设置选中日期
            selectedDate = dateStr;
            
            // 跳转到包含该日期的周
            const selectedDateObj = new Date(dateStr);
            currentWeekStart = getWeekStart(selectedDateObj);
            renderCalendar();
            
            // 始终触发待办事项跳转（月历选择器本身就是跳转操作）
            switchTodoDate(dateStr);
            
            // 关闭弹窗
            if (window._monthPickerClose) {
                window._monthPickerClose();
            }
        };
        
        // 悬停效果
        dayEl.onmouseenter = () => {
            if (!dayEl.classList.contains('today')) {
                dayEl.style.background = 'var(--bg-secondary)';
            }
        };
        dayEl.onmouseleave = () => {
            if (!dayEl.classList.contains('today') && !dayEl.classList.contains('selected')) {
                dayEl.style.background = '';
            } else if (dayEl.classList.contains('selected') && !dayEl.classList.contains('today')) {
                dayEl.style.background = 'rgba(59, 130, 246, 0.2)';
            }
        };
    });
}

// 导出函数到全局
window.initCalendarModule = initCalendarModule;
window.addSchedule = addSchedule;
window.editSchedule = editSchedule;
window.deleteSchedule = deleteSchedule;
