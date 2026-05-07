/**
 * 个人工作台 - 周报模块
 * 自动汇总每周数据 + 手写总结
 */

// 当前正在查看的周（周一日期）
let viewingWeekStart = null;

// 是否已从自动提醒打开
let autoOpened = false;

/**
 * 获取指定日期所在周的周一
 */
function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * 获取指定日期所在周的周日
 */
function getSunday(monday) {
    const d = new Date(monday);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDateStr(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 初始化周报模块
 */
function initWeeklyReportModule() {
    // 绑定 header 按钮
    const btn = document.getElementById('weeklyReportBtn');
    if (btn) {
        btn.onclick = () => openWeeklyReport();
    }

    // 绑定弹窗关闭
    const overlay = document.getElementById('weeklyReportOverlay');
    if (overlay) {
        overlay.onclick = (e) => {
            if (e.target === overlay) closeWeeklyReport();
        };
    }

    // 绑定保存按钮
    const saveBtn = document.getElementById('wrSaveBtn');
    if (saveBtn) {
        saveBtn.onclick = saveReport;
    }

    // 绑定关闭按钮
    const closeBtn = document.getElementById('wrCloseBtn');
    if (closeBtn) {
        closeBtn.onclick = closeWeeklyReport;
    }

    // 绑定导航
    const prevBtn = document.getElementById('wrPrevWeek');
    const nextBtn = document.getElementById('wrNextWeek');
    if (prevBtn) prevBtn.onclick = () => navigateWeek(-1);
    if (nextBtn) nextBtn.onclick = () => navigateWeek(1);

    // 检测新周
    setTimeout(() => checkNewWeek(), 500);
}

/**
 * 新周检测：每周第一次打开时提醒
 */
function checkNewWeek() {
    const today = window.getToday();
    const todayMonday = getMonday(new Date(today));
    const thisMondayStr = formatDateStr(todayMonday);

    const settings = window.appData.settings || {};
    const lastCheck = settings.lastWeeklyCheck;

    // 本周已检查过，跳过
    if (lastCheck) {
        const lastMonday = getMonday(new Date(lastCheck));
        if (formatDateStr(lastMonday) === thisMondayStr) return;
    }

    // 更新检查标记
    if (!window.appData.settings) window.appData.settings = {};
    window.appData.settings.lastWeeklyCheck = today;
    window.debouncedSave();

    // 计算上周范围
    const lastMonday = new Date(todayMonday);
    lastMonday.setDate(lastMonday.getDate() - 7);
    const lastMondayStr = formatDateStr(lastMonday);
    const lastSundayStr = formatDateStr(getSunday(lastMonday));

    // 上周一在今天之前才需要提醒（避免在同周内弹窗）
    if (lastMondayStr >= thisMondayStr) return;

    // 已有报告则跳过
    const reports = window.appData.weeklyReports || [];
    const existing = reports.find(r => r.weekStart === lastMondayStr);
    if (existing) return;

    // 弹窗询问
    const bodyHtml = `
        <div style="text-align: center; padding: 24px 0;">
            <div style="font-size: 3rem; margin-bottom: 16px;">📊</div>
            <p style="font-size: 1.1rem; margin-bottom: 8px;">
                上周（<strong>${lastMondayStr}</strong> ~ <strong>${lastSundayStr}</strong>）已结束
            </p>
            <p style="color: var(--text-secondary);">是否生成上周的工作报告？</p>
        </div>
    `;

    const footerHtml = `
        <button class="btn btn-secondary" id="wrRemindCancel">暂不</button>
        <button class="btn btn-primary" id="wrRemindOk">生成周报</button>
    `;

    const { closeModal } = window.showModal('新周提醒', bodyHtml, footerHtml);

    document.getElementById('wrRemindCancel').onclick = closeModal;
    document.getElementById('wrRemindOk').onclick = () => {
        closeModal();
        autoOpened = true;
        openWeeklyReport(lastMondayStr);
    };
}

/**
 * 打开周报弹窗
 */
function openWeeklyReport(weekStart) {
    const today = window.getToday();
    const thisMonday = formatDateStr(getMonday(new Date(today)));

    if (!weekStart) {
        // 默认：优先查看本周已有报告，否则查上周
        const reports = window.appData.weeklyReports || [];
        const thisWeekReport = reports.find(r => r.weekStart === thisMonday);
        if (thisWeekReport) {
            weekStart = thisMonday;
        } else {
            // 查是否有上周报告
            const lastMonday = new Date(getMonday(new Date(today)));
            lastMonday.setDate(lastMonday.getDate() - 7);
            const lastMondayStr = formatDateStr(lastMonday);
            const lastWeekReport = reports.find(r => r.weekStart === lastMondayStr);
            weekStart = lastWeekReport ? lastMondayStr : thisMonday;
        }
    }

    viewingWeekStart = weekStart;
    const existing = (window.appData.weeklyReports || []).find(r => r.weekStart === weekStart);
    const report = existing || generateReport(weekStart);

    document.getElementById('weeklyReportOverlay').style.display = 'flex';
    renderReport(report);
}

/**
 * 关闭周报弹窗
 */
function closeWeeklyReport() {
    document.getElementById('weeklyReportOverlay').style.display = 'none';
    autoOpened = false;
}

/**
 * 导航到上一周/下一周
 */
function navigateWeek(direction) {
    const monday = new Date(viewingWeekStart);
    monday.setDate(monday.getDate() + direction * 7);
    const newStart = formatDateStr(monday);
    viewingWeekStart = newStart;

    const existing = (window.appData.weeklyReports || []).find(r => r.weekStart === newStart);
    const report = existing || generateReport(newStart);
    renderReport(report);
}

/**
 * 自动汇总生成报告
 */
function generateReport(weekStart) {
    const weekStartDate = new Date(weekStart);
    const weekEndDate = getSunday(weekStartDate);
    const weekStartStr = formatDateStr(weekStartDate);
    const weekEndStr = formatDateStr(weekEndDate);

    const report = {
        id: window.generateId(),
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
        pomodorosCompleted: 0,
        totalWorkMinutes: 0,
        todosCompleted: 0,
        todosByPriority: { high: 0, medium: 0, low: 0, daily: 0 },
        todosCreated: 0,
        schedulesCount: 0,
        newShortcuts: [],
        gitCommits: [],
        gitCategories: { fixes: [], improvements: [], features: [], other: [] },
        manualSummary: '',
        nextWeekPlan: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    // 1. 番茄钟统计
    const records = window.appData.pomodoroRecords || [];
    const workMin = window.appData.pomodoroSettings?.workDuration || 25;
    records.forEach(r => {
        if (r.date >= weekStartStr && r.date <= weekEndStr) {
            report.pomodorosCompleted += (r.completed || 0);
        }
    });
    report.totalWorkMinutes = report.pomodorosCompleted * workMin;

    // 2. 待办事项统计
    const todosByDate = window.appData.todosByDate || {};
    Object.keys(todosByDate).forEach(date => {
        if (date >= weekStartStr && date <= weekEndStr) {
            const todos = todosByDate[date] || [];
            todos.forEach(todo => {
                // 统计完成
                if (todo.completed) {
                    report.todosCompleted++;
                    const p = todo.priority || 'medium';
                    if (report.todosByPriority[p] !== undefined) {
                        report.todosByPriority[p]++;
                    }
                }
                // 统计新增（按 createdAt 在本周）
                if (todo.createdAt) {
                    const createdDate = todo.createdAt.slice(0, 10);
                    if (createdDate >= weekStartStr && createdDate <= weekEndStr) {
                        report.todosCreated++;
                    }
                }
            });
        }
    });

    // 3. 日程统计
    const schedules = window.appData.schedules || [];
    schedules.forEach(s => {
        if (s.createdAt) {
            const createdDate = s.createdAt.slice(0, 10);
            if (createdDate >= weekStartStr && createdDate <= weekEndStr) {
                report.schedulesCount++;
            }
        }
    });

    // 4. 新增工具
    const shortcuts = window.appData.shortcuts || [];
    shortcuts.forEach(s => {
        if (s.type === 'folder') return; // 跳过文件夹本身
        if (s.createdAt) {
            const createdDate = s.createdAt.slice(0, 10);
            if (createdDate >= weekStartStr && createdDate <= weekEndStr) {
                report.newShortcuts.push({
                    name: s.name,
                    type: s.type,
                    url: s.url || ''
                });
            }
        }
    });
    // 也检查文件夹内的快捷方式
    shortcuts.forEach(s => {
        if (s.type === 'folder' && s.children) {
            s.children.forEach(child => {
                if (child.createdAt) {
                    const createdDate = child.createdAt.slice(0, 10);
                    if (createdDate >= weekStartStr && createdDate <= weekEndStr) {
                        report.newShortcuts.push({
                            name: child.name,
                            type: child.type,
                            url: child.url || ''
                        });
                    }
                }
            });
        }
    });

    return report;
}

/**
 * 渲染报告内容到弹窗
 */
function renderReport(report) {
    if (!report) return;

    // 更新导航信息
    const rangeEl = document.getElementById('wrWeekRange');
    if (rangeEl) {
        rangeEl.textContent = `${report.weekStart} ~ ${report.weekEnd}`;
    }

    // 检查是否是本周或未来周（不能编辑）
    const today = window.getToday();
    const isCurrentOrFuture = report.weekStart >= formatDateStr(getMonday(new Date(today)));

    // 导航按钮：能不能往前/后
    const prevBtn = document.getElementById('wrPrevWeek');
    const nextBtn = document.getElementById('wrNextWeek');
    if (prevBtn) {
        // 只要有更早的周就可以点（或无限制）
    }
    if (nextBtn) {
        const nextMondayStr = formatDateStr(new Date(new Date(report.weekStart).getTime() + 7 * 86400000));
        nextBtn.style.visibility = nextMondayStr <= formatDateStr(getMonday(new Date(today))) ? 'visible' : 'hidden';
    }

    // 渲染统计卡片
    const bodyEl = document.getElementById('wrBody');
    if (!bodyEl) return;

    bodyEl.innerHTML = `
        <!-- 统计卡片区 -->
        <div class="wr-section-title">📈 数据统计</div>
        <div class="wr-stats-grid">
            <div class="wr-stat-card tomato">
                <div class="wr-stat-num">${report.pomodorosCompleted}</div>
                <div class="wr-stat-label">完成番茄钟</div>
                <div class="wr-stat-sub">累计 ${report.totalWorkMinutes} 分钟</div>
            </div>
            <div class="wr-stat-card todo">
                <div class="wr-stat-num">${report.todosCompleted}</div>
                <div class="wr-stat-label">完成待办事项</div>
                <div class="wr-stat-sub">
                    高${report.todosByPriority.high} 中${report.todosByPriority.medium} 低${report.todosByPriority.low} 日常${report.todosByPriority.daily}
                </div>
            </div>
            <div class="wr-stat-card create">
                <div class="wr-stat-num">${report.todosCreated}</div>
                <div class="wr-stat-label">新建待办事项</div>
            </div>
            <div class="wr-stat-card schedule">
                <div class="wr-stat-num">${report.schedulesCount}</div>
                <div class="wr-stat-label">新建日程</div>
            </div>
        </div>

        <!-- 新增工具 -->
        ${report.newShortcuts.length > 0 ? `
        <div class="wr-section-title">🔗 本周新增工具</div>
        <div class="wr-shortcut-list">
            ${report.newShortcuts.map(s => `
                <span class="wr-shortcut-tag">${escapeHtml(s.name)}</span>
            `).join('')}
        </div>
        ` : ''}

        <!-- Git 活动 -->
        <div class="wr-section-title">💻 代码活动 <span class="wr-git-loading" id="wrGitLoading">加载中...</span></div>
        <div id="wrGitContent"></div>

        <!-- 手写总结 -->
        <div class="wr-section-title">📝 本周总结</div>
        <textarea class="wr-textarea" id="wrSummary"
            placeholder="这周做了什么优化？解决了什么问题？有什么收获？..."
            ${isCurrentOrFuture ? '' : ''}>${escapeHtml(report.manualSummary || '')}</textarea>

        <!-- 下周计划 -->
        <div class="wr-section-title">🎯 下周计划</div>
        <textarea class="wr-textarea" id="wrNextPlan"
            placeholder="下周的主要目标和计划...">${escapeHtml(report.nextWeekPlan || '')}</textarea>
    `;

    // 尝试加载 git 数据
    loadGitActivity(report, bodyEl);
}

/**
 * 加载 git 活动数据
 */
async function loadGitActivity(report, bodyEl) {
    const gitContentEl = document.getElementById('wrGitContent');
    const gitLoadingEl = document.getElementById('wrGitLoading');
    if (!gitContentEl) return;

    try {
        const since = report.weekStart;
        const until = report.weekEnd + 'T23:59:59';
        const resp = await fetch(`/api/git-log?since=${since}&until=${until}`);
        const result = await resp.json();

        if (gitLoadingEl) gitLoadingEl.style.display = 'none';

        if (result.success && result.data) {
            const { commits, categories } = result.data;

            if (commits.length === 0) {
                gitContentEl.innerHTML = '<div class="wr-empty">本周无代码提交记录</div>';
                return;
            }

            // 保存 git 数据到报告
            report.gitCommits = commits;
            report.gitCategories = categories;

            const catDefs = [
                { key: 'features', label: '新功能', color: '#27AE60', icon: '✨' },
                { key: 'improvements', label: '优化改进', color: '#3498DB', icon: '🔧' },
                { key: 'fixes', label: '问题修复', color: '#E74C3C', icon: '🐛' },
                { key: 'other', label: '其他', color: '#95A5A6', icon: '📌' }
            ];

            let html = '<div class="wr-git-summary">';
            catDefs.forEach(cat => {
                const count = (categories[cat.key] || []).length;
                if (count > 0) {
                    html += `<span class="wr-git-cat">${cat.icon} ${cat.label}: ${count}</span>`;
                }
            });
            html += '</div>';

            html += '<div class="wr-git-timeline">';
            commits.forEach(c => {
                html += `
                    <div class="wr-git-item">
                        <span class="wr-git-hash">${c.hash}</span>
                        <span class="wr-git-msg">${escapeHtml(c.message)}</span>
                        <span class="wr-git-date">${c.date ? c.date.slice(0, 10) : ''}</span>
                    </div>
                `;
            });
            html += '</div>';

            gitContentEl.innerHTML = html;
        } else {
            gitContentEl.innerHTML = '<div class="wr-empty">Git 记录获取失败</div>';
        }
    } catch (err) {
        if (gitLoadingEl) gitLoadingEl.style.display = 'none';
        gitContentEl.innerHTML = '<div class="wr-empty">Git 记录不可用（离线模式）</div>';
    }
}

/**
 * 保存当前报告
 */
function saveReport() {
    if (!viewingWeekStart) return;

    const reports = window.appData.weeklyReports || [];
    let report = reports.find(r => r.weekStart === viewingWeekStart);

    // 如果没有，创建新的
    if (!report) {
        report = generateReport(viewingWeekStart);
        reports.push(report);
        window.appData.weeklyReports = reports;
    }

    // 读取手动编辑的内容
    const summaryEl = document.getElementById('wrSummary');
    const planEl = document.getElementById('wrNextPlan');
    if (summaryEl) report.manualSummary = summaryEl.value;
    if (planEl) report.nextWeekPlan = planEl.value;
    report.updatedAt = new Date().toISOString();

    window.debouncedSave();
    window.showToast('周报已保存');
}

/**
 * HTML 转义
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 导出到全局
window.initWeeklyReportModule = initWeeklyReportModule;
window.openWeeklyReport = openWeeklyReport;
