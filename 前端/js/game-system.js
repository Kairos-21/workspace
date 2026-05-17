/**
 * 个人工作台 - 游戏化自律系统「成长花园」
 * 纯正反馈 RPG：做事 → 赚XP → 升级 → 解锁成就 → 保持连胜
 */

// ========================================
// 常量定义
// ========================================

const ACHIEVEMENT_DEFS = [
    { id: "first_todo",     name: "初出茅庐", desc: "完成第一个待办事项", icon: "🌱",  type: "first" },
    { id: "first_pomodoro", name: "专注初体验", desc: "完成第一个番茄钟",   icon: "🍅",  type: "first" },
    { id: "first_high",     name: "迎难而上",   desc: "完成第一个高优先级待办", icon: "🔥",  type: "first" },
    { id: "todo_50",    name: "任务达人", desc: "累计完成 50 个待办",   icon: "📋", type: "total",  threshold: 50 },
    { id: "todo_100",   name: "任务大师", desc: "累计完成 100 个待办",  icon: "📝", type: "total",  threshold: 100 },
    { id: "todo_500",   name: "任务传说", desc: "累计完成 500 个待办",  icon: "👑", type: "total",  threshold: 500 },
    { id: "pomo_100",   name: "专注学徒", desc: "累计完成 100 个番茄钟", icon: "⏱️", type: "total",  threshold: 100 },
    { id: "pomo_500",   name: "专注大师", desc: "累计完成 500 个番茄钟", icon: "⌛", type: "total",  threshold: 500 },
    { id: "pomo_1000",  name: "专注传说", desc: "累计完成 1000 个番茄钟",icon: "🏆", type: "total",  threshold: 1000 },
    { id: "streak_7",   name: "一周之星", desc: "连续 7 天完美一天",   icon: "🌟", type: "streak", threshold: 7 },
    { id: "streak_30",  name: "月度冠军", desc: "连续 30 天完美一天",  icon: "🌙", type: "streak", threshold: 30 },
    { id: "streak_100", name: "传奇连胜", desc: "连续 100 天完美一天", icon: "💎", type: "streak", threshold: 100 },
    { id: "level_5",   name: "成长之芽", desc: "达到等级 5",  icon: "🌿", type: "level",  threshold: 5 },
    { id: "level_10",  name: "成长之树", desc: "达到等级 10", icon: "🌳", type: "level",  threshold: 10 },
    { id: "level_20",  name: "成长森林", desc: "达到等级 20", icon: "🌲", type: "level",  threshold: 20 },
    { id: "level_50",  name: "传奇花园", desc: "达到等级 50", icon: "🌍", type: "level",  threshold: 50 },
];

const QUEST_DEFS = [
    { id: "todo_3",    name: "完成 3 个待办",      icon: "📝", target: 3, check: "todos" },
    { id: "pomodoro_2",name: "完成 2 个番茄钟",    icon: "🍅", target: 2, check: "pomodoros" },
    { id: "high_1",    name: "完成 1 个高优待办",  icon: "🔥", target: 1, check: "highPriority" },
    { id: "daily_all", name: "完成日常待办（可缺1）", icon: "🔄", target: 1, check: "dailyAll" },
];

// 事件去重集合（防止短时间内同一事件重复处理）
let _recentEvents = {};
const EVENT_DEDUP_MS = 2000;

// ========================================
// 内部工具函数
// ========================================

function _xpForLevel(level) {
    let total = 0;
    for (let i = 1; i < level; i++) {
        total += i * 100;
    }
    return total;
}

function _xpForNextLevel() {
    const gd = window.appData.gameData;
    return gd.level * 100;
}

function _xpInCurrentLevel() {
    const gd = window.appData.gameData;
    const base = _xpForLevel(gd.level);
    return gd.xp - base;
}

function _ensureGameData() {
    if (!window.appData.gameData) {
        window.appData.gameData = {
            xp: 0,
            level: 1,
            todayXP: 0,
            todayXpDate: null,
            streak: 0,
            lastPerfectDate: null,
            dailyQuests: {
                date: "",
                quests: QUEST_DEFS.map(q => ({
                    id: q.id,
                    target: q.target,
                    progress: 0,
                    completed: false
                })),
                allCompleted: false
            },
            achievements: [],
            stats: {
                totalTodosCompleted: 0,
                totalPomodorosCompleted: 0,
                totalHighPriorityCompleted: 0
            }
        };
    }
    const gd = window.appData.gameData;
    if (!gd.stats) {
        gd.stats = { totalTodosCompleted: 0, totalPomodorosCompleted: 0, totalHighPriorityCompleted: 0 };
    }
    if (!gd.achievements) gd.achievements = [];
}

function _checkDayReset() {
    _ensureGameData();
    const gd = window.appData.gameData;
    const today = window.getToday();

    if (gd.todayXpDate !== today) {
        gd.todayXP = 0;
        gd.todayXpDate = today;
        _refreshDailyQuests();
    }
}

function _refreshDailyQuests() {
    const gd = window.appData.gameData;
    const today = window.getToday();

    gd.dailyQuests.date = today;
    gd.dailyQuests.allCompleted = false;
    gd.dailyQuests.fullBonusClaimed = false;
    gd.dailyQuests.dailyAllBonusClaimed = false;

    gd.dailyQuests.quests = QUEST_DEFS.map(q => ({
        id: q.id,
        target: q.target,
        progress: 0,
        completed: false
    }));

    // 根据已有数据回溯计算今天已完成的进度
    const todosToday = (window.appData.todosByDate && window.appData.todosByDate[today]) ? window.appData.todosByDate[today] : [];
    const completedTodos = todosToday.filter(t => t.completed).length;
    const completedHigh = todosToday.filter(t => t.priority === 'high' && t.completed).length;
    const dailyTodos = todosToday.filter(t => t.priority === 'daily');
    // 收集日常待办的考核项：有子任务则以子任务为准，无子任务则以自身为准
    let dailyItems = [];
    dailyTodos.forEach(t => {
        if (t.subtasks && t.subtasks.length > 0) {
            dailyItems = dailyItems.concat(t.subtasks);
        } else {
            dailyItems.push(t);
        }
    });
    const dailyIncomplete = dailyItems.filter(item => !item.completed).length;
    const dailyAllDone = dailyItems.length > 0 && dailyIncomplete === 0;
    // 至多1项子任务未完成即算通过（至少完成1项）
    const dailyMostlyDone = dailyItems.length > 0 && dailyIncomplete <= 1 && dailyIncomplete < dailyItems.length;

    const todayPomo = (window.appData.pomodoroRecords || []).find(r => r.date === today);
    const pomoCompleted = todayPomo ? todayPomo.completed : 0;

    gd.dailyQuests.quests.forEach(q => {
        switch (q.check || q.id) {
            case "todo_3":    q.progress = Math.min(completedTodos, q.target); break;
            case "pomodoro_2":q.progress = Math.min(pomoCompleted, q.target); break;
            case "high_1":    q.progress = Math.min(completedHigh, q.target); break;
            case "daily_all": q.progress = dailyMostlyDone ? 1 : 0; q._allDailyDone = dailyAllDone; break;
        }
        q.completed = q.progress >= q.target;
    });
}

function _updateDailyQuestProgress() {
    const gd = window.appData.gameData;
    const today = window.getToday();

    const todosToday = (window.appData.todosByDate && window.appData.todosByDate[today]) ? window.appData.todosByDate[today] : [];
    const completedTodos = todosToday.filter(t => t.completed).length;
    const completedHigh = todosToday.filter(t => t.priority === 'high' && t.completed).length;
    const dailyTodos = todosToday.filter(t => t.priority === 'daily');
    // 收集日常待办的考核项：有子任务则以子任务为准，无子任务则以自身为准
    let dailyItems = [];
    dailyTodos.forEach(t => {
        if (t.subtasks && t.subtasks.length > 0) {
            dailyItems = dailyItems.concat(t.subtasks);
        } else {
            dailyItems.push(t);
        }
    });
    const dailyIncomplete = dailyItems.filter(item => !item.completed).length;
    const dailyAllDone = dailyItems.length > 0 && dailyIncomplete === 0;
    // 至多1项子任务未完成即算通过（至少完成1项）
    const dailyMostlyDone = dailyItems.length > 0 && dailyIncomplete <= 1 && dailyIncomplete < dailyItems.length;

    const todayPomo = (window.appData.pomodoroRecords || []).find(r => r.date === today);
    const pomoCompleted = todayPomo ? todayPomo.completed : 0;

    gd.dailyQuests.quests.forEach(q => {
        switch (q.id) {
            case "todo_3":    q.progress = Math.min(completedTodos, q.target); break;
            case "pomodoro_2":q.progress = Math.min(pomoCompleted, q.target); break;
            case "high_1":    q.progress = Math.min(completedHigh, q.target); break;
            case "daily_all": q.progress = dailyMostlyDone ? 1 : 0; q._allDailyDone = dailyAllDone; break;
        }
        q.completed = q.progress >= q.target;
    });
}

function _checkPerfectDay() {
    const gd = window.appData.gameData;
    const quests = gd.dailyQuests.quests;
    const allFourDone = quests.every(q => q.completed);

    // 4/4 全部完成 → 完美一天 + 连胜（仅一次）
    if (!gd.dailyQuests.allCompleted && allFourDone) {
        gd.dailyQuests.allCompleted = true;

        const today = window.getToday();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.getFullYear() + '-' +
            String(yesterday.getMonth() + 1).padStart(2, '0') + '-' +
            String(yesterday.getDate()).padStart(2, '0');

        if (gd.lastPerfectDate === yStr) {
            gd.streak += 1;
        } else {
            gd.streak = 1;
        }
        gd.lastPerfectDate = today;

        window.showToast("🔥 完美一天！连胜 ×" + gd.streak, 2500);
        addXP(80);
        _detectAchievements();
        window.debouncedSave();
    }

    // 全部日常待办完成 → 额外奖励（仅一次）
    if (!gd.dailyQuests.dailyAllBonusClaimed) {
        const dailyAllQuest = quests.find(q => q.id === 'daily_all');
        if (dailyAllQuest && dailyAllQuest._allDailyDone) {
            gd.dailyQuests.dailyAllBonusClaimed = true;
            window.showToast("✨ 所有日常待办全部完成！额外经验 +20", 2500);
            addXP(20);
        }
    }
}

function _detectAchievements() {
    const gd = window.appData.gameData;
    const unlockedIds = new Set(gd.achievements.map(a => a.id));

    ACHIEVEMENT_DEFS.forEach(def => {
        if (unlockedIds.has(def.id)) return;

        let unlocked = false;
        switch (def.type) {
            case "first":
                if (def.id === "first_todo" && gd.stats.totalTodosCompleted >= 1) unlocked = true;
                if (def.id === "first_pomodoro" && gd.stats.totalPomodorosCompleted >= 1) unlocked = true;
                if (def.id === "first_high" && gd.stats.totalHighPriorityCompleted >= 1) unlocked = true;
                break;
            case "total":
                if (def.id.startsWith("todo_") && gd.stats.totalTodosCompleted >= def.threshold) unlocked = true;
                if (def.id.startsWith("pomo_") && gd.stats.totalPomodorosCompleted >= def.threshold) unlocked = true;
                break;
            case "streak":
                if (gd.streak >= def.threshold) unlocked = true;
                break;
            case "level":
                if (gd.level >= def.threshold) unlocked = true;
                break;
        }

        if (unlocked) {
            gd.achievements.push({ id: def.id, unlockedAt: new Date().toISOString() });
            _showAchievement(def);
        }
    });
}

function _showAchievement(def) {
    const isLegend = ["todo_500", "pomo_1000", "streak_100", "level_50"].includes(def.id);

    if (isLegend) {
        window.showModal("🏆 成就解锁！", `
            <div style="text-align:center;padding:16px;">
                <div style="font-size:4rem;margin-bottom:12px;">${def.icon}</div>
                <div style="font-size:1.4rem;font-weight:700;color:var(--text-primary);margin-bottom:8px;">${def.name}</div>
                <div style="font-size:0.95rem;color:var(--text-secondary);">${def.desc}</div>
            </div>
        `, `<button class="btn btn-primary" onclick="document.getElementById('modalClose').click()">太棒了！</button>`);
    } else {
        window.showToast(`🏆 ${def.icon} ${def.name}：${def.desc}`, 3000);
    }
}

// 事件去重
function _isDuplicate(eventType, key) {
    const dedupKey = eventType + '_' + key;
    const now = Date.now();
    if (_recentEvents[dedupKey] && now - _recentEvents[dedupKey] < EVENT_DEDUP_MS) {
        return true;
    }
    _recentEvents[dedupKey] = now;
    // 清理过期条目
    for (const k in _recentEvents) {
        if (now - _recentEvents[k] > EVENT_DEDUP_MS) delete _recentEvents[k];
    }
    return false;
}

let _gameSaveTimer = null;
function _gameSave() {
    if (_gameSaveTimer) clearTimeout(_gameSaveTimer);
    _gameSaveTimer = setTimeout(() => {
        window.debouncedSave();
    }, 500);
}

// ========================================
// 核心 API
// ========================================

function addXP(amount) {
    _ensureGameData();
    const gd = window.appData.gameData;
    gd.xp += amount;
    gd.todayXP += amount;

    const oldLevel = gd.level;
    let newLevel = gd.level;
    while (true) {
        const needed = _xpForLevel(newLevel + 1);
        if (gd.xp >= needed) {
            newLevel++;
        } else {
            break;
        }
    }

    if (newLevel > oldLevel) {
        gd.level = newLevel;
        window.showToast(`🎉 升级！达到 Lv.${newLevel}`, 2500);
        _detectAchievements();
        // 升级动画
        setTimeout(() => {
            const badge = document.getElementById('gameLevelBadge');
            if (badge) {
                badge.classList.add('level-up');
                setTimeout(() => badge.classList.remove('level-up'), 600);
            }
        }, 100);
    }

    _gameSave();
    renderGamePanel();
    renderGameHeaderBadge();
}

function notifyGame(eventType, data) {
    _ensureGameData();
    _checkDayReset();

    const gd = window.appData.gameData;
    let xpGained = 0;

    // 事件去重
    const dedupKey = data.subtaskId || data.todoId || '';
    if (_isDuplicate(eventType, dedupKey)) return;

    switch (eventType) {
        case 'todo_completed':
            // 测试样例不增加经验
            if (/^try\d+$/i.test(data.content || '')) {
                window.showToast('🧪 该待办为测试样例，不增加经验值', 2000);
                break;
            }
            xpGained = 10;
            gd.stats.totalTodosCompleted++;
            if (data.priority === 'high') {
                xpGained += 5;
                gd.stats.totalHighPriorityCompleted++;
            } else if (data.priority === 'daily') {
                xpGained += 3;
            }
            break;
        case 'daily_done':
            xpGained = 5;
            break;
        case 'pomodoro_completed':
            xpGained = 25;
            gd.stats.totalPomodorosCompleted++;
            break;
        case 'todo_uncompleted':
            // 误触撤销：扣除经验，回退统计
            if (/^try\d+$/i.test(data.content || '')) {
                break;
            }
            xpGained = -10;
            gd.stats.totalTodosCompleted = Math.max(0, gd.stats.totalTodosCompleted - 1);
            if (data.priority === 'high') {
                xpGained += -5;
                gd.stats.totalHighPriorityCompleted = Math.max(0, gd.stats.totalHighPriorityCompleted - 1);
            } else if (data.priority === 'daily') {
                xpGained += -3;
            }
            break;
        case 'daily_undone':
            xpGained = -5;
            break;
        case 'subtask_completed':
            if (/^try\d+$/i.test(data.content || '')) {
                window.showToast('🧪 该子任务为测试样例，不增加经验值', 2000);
                break;
            }
            xpGained = 5;
            break;
        case 'subtask_uncompleted':
            if (/^try\d+$/i.test(data.content || '')) {
                break;
            }
            xpGained = -5;
            break;
    }

    if (xpGained !== 0) {
        addXP(xpGained);
    }

    _updateDailyQuestProgress();
    _checkPerfectDay();
    _detectAchievements();

    // 统一在所有数据更新后渲染，避免面板显示滞后
    renderGamePanel();
    renderGameHeaderBadge();
}

// ========================================
// UI 渲染
// ========================================

function renderGameHeaderBadge() {
    const el = document.getElementById('gameHeaderLevel');
    if (!el) return;
    _ensureGameData();
    const gd = window.appData.gameData;
    el.textContent = gd.level;
}

function renderGamePanel() {
    _ensureGameData();
    const panel = document.getElementById('gamePanel');
    if (!panel || panel.style.display === 'none') return;

    _updateDailyQuestProgress();
    renderLevelSection();
    renderQuestsSection();
    renderStreakSection();
}

function renderLevelSection() {
    const gd = window.appData.gameData;
    const badge = document.getElementById('gameLevelBadge');
    const xpBar = document.getElementById('gameXpBar');
    const xpText = document.getElementById('gameXpText');
    const statsEl = document.getElementById('gameStats');

    if (badge) badge.textContent = '🌿 Lv.' + gd.level;

    if (xpBar && xpText) {
        const inLevel = _xpInCurrentLevel();
        const needed = _xpForNextLevel();
        const pct = Math.min(100, Math.round((inLevel / needed) * 100));
        xpBar.style.width = pct + '%';
        xpText.textContent = inLevel + ' / ' + needed + ' XP';
    }

    if (statsEl) {
        statsEl.innerHTML = `
            <div class="game-stat-item">📝 ${gd.stats.totalTodosCompleted} 待办</div>
            <div class="game-stat-item">🍅 ${gd.stats.totalPomodorosCompleted} 番茄</div>
            <div class="game-stat-item">🔥 ${gd.stats.totalHighPriorityCompleted} 高优</div>
        `;
    }
}

function renderQuestsSection() {
    const gd = window.appData.gameData;
    const el = document.getElementById('gameQuestsList');
    if (!el) return;

    el.innerHTML = gd.dailyQuests.quests.map(q => {
        const def = QUEST_DEFS.find(d => d.id === q.id);
        const icon = def ? def.icon : '❓';
        const name = def ? def.name : q.id;
        const doneClass = q.completed ? 'completed' : '';
        const allDoneClass = (q.id === 'daily_all' && q._allDailyDone) ? 'all-daily-done' : '';
        return `
            <div class="game-quest-item ${doneClass} ${allDoneClass}">
                <span class="game-quest-icon">${icon}</span>
                <span class="game-quest-name">${name}</span>
                <span class="game-quest-progress">${q.progress}/${q.target}</span>
                ${q._allDailyDone ? '<span class="game-quest-check">✨</span>' : (q.completed ? '<span class="game-quest-check">✅</span>' : '')}
            </div>
        `;
    }).join('');
}

function renderStreakSection() {
    const gd = window.appData.gameData;
    const numEl = document.getElementById('gameStreakNum');
    if (numEl) numEl.textContent = gd.streak;

    const miniEl = document.getElementById('gameAchievementsMini');
    if (miniEl) {
        const unlocked = gd.achievements || [];
        // 显示最近解锁的成就（最多 6 个），用定义补全图标
        const recent = unlocked.slice(-6).reverse();
        miniEl.innerHTML = recent.map(a => {
            const def = ACHIEVEMENT_DEFS.find(d => d.id === a.id);
            return def
                ? `<span class="game-achievement-badge" title="${def.name}: ${def.desc}">${def.icon}</span>`
                : `<span class="game-achievement-badge" title="${a.id}">🏅</span>`;
        }).join('');

        if (recent.length === 0) {
            miniEl.innerHTML = '<span style="font-size:0.8rem;color:var(--text-secondary);">完成操作自动解锁成就</span>';
        }
    }
}

// ========================================
// 面板控制
// ========================================

function toggleGamePanel() {
    const panel = document.getElementById('gamePanel');
    if (!panel) return;
    const isHidden = panel.style.display === 'none';
    panel.style.display = isHidden ? 'block' : 'none';
    if (isHidden) {
        renderGamePanel();
        panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function showAllAchievements() {
    _ensureGameData();
    const gd = window.appData.gameData;
    const unlockedIds = new Set(gd.achievements.map(a => a.id));

    const bodyHtml = `
        <div class="game-all-achievements">
            ${ACHIEVEMENT_DEFS.map(def => {
                const unlocked = unlockedIds.has(def.id);
                const a = gd.achievements.find(a => a.id === def.id);
                return `
                    <div class="game-ach-card ${unlocked ? '' : 'locked'}">
                        <span class="game-ach-icon">${unlocked ? def.icon : '🔒'}</span>
                        <div class="game-ach-name">${def.name}</div>
                        <div class="game-ach-desc">${def.desc}</div>
                        ${unlocked && a ? `<div class="game-ach-date">${new Date(a.unlockedAt).toLocaleDateString('zh-CN')}</div>` : ''}
                    </div>
                `;
            }).join('')}
        </div>
    `;

    window.showModal('🏆 成就徽章', bodyHtml, `
        <button class="btn btn-secondary" onclick="document.getElementById('modalClose').click()">关闭</button>
    `);
}

// ========================================
// 初始化
// ========================================

function initGameSystem() {
    _ensureGameData();
    _checkDayReset();

    // Header 等级按钮
    const entryBtn = document.getElementById('gameEntryBtn');
    if (entryBtn) entryBtn.onclick = toggleGamePanel;

    // 成就按钮
    const achBtn = document.getElementById('achievementsBtn');
    if (achBtn) achBtn.onclick = showAllAchievements;

    // 面板折叠按钮
    const toggleBtn = document.getElementById('gamePanelToggle');
    if (toggleBtn) toggleBtn.onclick = toggleGamePanel;

    // 初始渲染 Header 等级
    renderGameHeaderBadge();

    // 如果面板默认展示，渲染之
    const panel = document.getElementById('gamePanel');
    if (panel && panel.style.display !== 'none') {
        renderGamePanel();
    }

    console.log('✅ 游戏化系统初始化完成');
}

// 导出
window.initGameSystem = initGameSystem;
window.notifyGame = notifyGame;
window.addXP = addXP;
window.renderGamePanel = renderGamePanel;
window.renderGameHeaderBadge = renderGameHeaderBadge;
window._updateDailyQuestProgress = _updateDailyQuestProgress;
window._checkPerfectDay = _checkPerfectDay;
