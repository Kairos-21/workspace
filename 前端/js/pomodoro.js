/**
 * 个人工作台 - 番茄钟模块
 */

// 番茄钟状态
const PomodoroState = {
    IDLE: 'idle',
    WORKING: 'working',
    BREAK: 'break',
    PAUSED: 'paused'
};

// 当前状态
let pomodoroState = PomodoroState.IDLE;
let currentTime = 25 * 60; // 秒
let totalTime = 25 * 60;
let endTime = null; // 番茄钟结束的时间戳
let timer = null;
let completedPomodoros = 0;

// 音频上下文
let audioContext = null;

// 当前播放的音频
let currentPlayingAudio = null;
let currentPlayingBtnId = null;

// 预加载的音频对象
let preloadedAudio = null;

// 待播放标记 - 用于后台标签页
let pendingPlayback = false;

// 最后播放时间
let lastPlayTime = 0;

// 声音类型配置（预设）
const PRESET_SOUNDS = {
    qing: { name: '磬声', type: 'preset', file: 'sounds/qing.wav' }
};

// DOM 元素引用
let pomodoroTimeEl = null;
let pomodoroStatusEl = null;
let pomodoroStartBtnEl = null;
let pomodoroResetBtnEl = null;
let pomodoroSkipBtnEl = null;
let pomodoroBackfillBtnEl = null;
let pomodoroCircleEl = null;
let progressRingEl = null;
let currentCountEl = null;
let totalCountEl = null;
let pomodoroSettingsBtnEl = null;
let pomodoroSettingsPanelEl = null;

// 设置相关元素
let workDurationEl = null;
let shortBreakEl = null;
let longBreakEl = null;
let longBreakIntervalEl = null;
let targetCountEl = null;
let soundEnabledEl = null;
let soundVolumeEl = null;
let soundListEl = null;
let soundUploadInputEl = null;
let soundUploadBtnEl = null;

/**
 * 初始化番茄钟模块
 */
function initPomodoroModule() {
    // 获取DOM元素
    pomodoroTimeEl = document.getElementById('pomodoroTime');
    pomodoroStatusEl = document.getElementById('pomodoroStatus');
    pomodoroStartBtnEl = document.getElementById('pomodoroStartBtn');
    pomodoroResetBtnEl = document.getElementById('pomodoroResetBtn');
    pomodoroSkipBtnEl = document.getElementById('pomodoroSkipBtn');
    pomodoroBackfillBtnEl = document.getElementById('pomodoroBackfillBtn');
    pomodoroCircleEl = document.getElementById('pomodoroCircle');
    progressRingEl = document.getElementById('progressRing');
    currentCountEl = document.getElementById('currentCount');
    totalCountEl = document.getElementById('totalCount');
    pomodoroSettingsBtnEl = document.getElementById('pomodoroSettingsBtn');
    pomodoroSettingsPanelEl = document.getElementById('pomodoroSettingsPanel');
    
    // 设置滑块
    workDurationEl = document.getElementById('workDuration');
    shortBreakEl = document.getElementById('shortBreak');
    longBreakEl = document.getElementById('longBreak');
    longBreakIntervalEl = document.getElementById('longBreakInterval');
    targetCountEl = document.getElementById('targetCount');
    soundEnabledEl = document.getElementById('soundEnabled');
    soundVolumeEl = document.getElementById('soundVolume');
    soundListEl = document.getElementById('soundList');
    soundUploadInputEl = document.getElementById('soundUploadInput');
    soundUploadBtnEl = document.getElementById('soundUploadBtn');
    
    // 初始化音频上下文（需要用户交互）
    initAudioContext();
    
    // 加载设置
    loadPomodoroSettings();
    
    // 绑定事件
    pomodoroStartBtnEl.onclick = togglePomodoro;
    pomodoroResetBtnEl.onclick = resetPomodoro;
    pomodoroSkipBtnEl.onclick = skipBreak;
    pomodoroBackfillBtnEl.onclick = backfillPomodoro;
    pomodoroCircleEl.onclick = togglePomodoro;
    pomodoroSettingsBtnEl.onclick = toggleSettingsPanel;
    
    // 设置滑块事件
    workDurationEl.oninput = () => {
        document.getElementById('workDurationVal').textContent = workDurationEl.value;
    };
    workDurationEl.onchange = savePomodoroSettings;
    
    shortBreakEl.oninput = () => {
        document.getElementById('shortBreakVal').textContent = shortBreakEl.value;
    };
    shortBreakEl.onchange = savePomodoroSettings;
    
    longBreakEl.oninput = () => {
        document.getElementById('longBreakVal').textContent = longBreakEl.value;
    };
    longBreakEl.onchange = savePomodoroSettings;
    
    longBreakIntervalEl.oninput = () => {
        document.getElementById('longBreakIntervalVal').textContent = longBreakIntervalEl.value;
    };
    longBreakIntervalEl.onchange = savePomodoroSettings;
    
    targetCountEl.oninput = () => {
        document.getElementById('targetCountVal').textContent = targetCountEl.value;
    };
    targetCountEl.onchange = savePomodoroSettings;
    
    soundEnabledEl.onchange = () => {
        updateSoundManagementVisibility();
        savePomodoroSettings();
    };
    
    // 音量滑块事件
    if (soundVolumeEl) {
        soundVolumeEl.oninput = () => {
            document.getElementById('soundVolumeVal').textContent = soundVolumeEl.value;
            // 实时更新设置中的音量值
            window.appData.pomodoroSettings.soundVolume = parseInt(soundVolumeEl.value);
            // 动态更新正在播放的音频音量
            if (currentPlayingAudio) {
                currentPlayingAudio.volume = soundVolumeEl.value / 100;
            }
        };
        soundVolumeEl.onchange = savePomodoroSettings;
    }
    
    // 初始化提示音管理区域显示状态
    updateSoundManagementVisibility();
    
    // 提示音上传
    if (soundUploadBtnEl && soundUploadInputEl) {
        soundUploadBtnEl.onclick = () => soundUploadInputEl.click();
        
        soundUploadInputEl.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const formData = new FormData();
            formData.append('sound', file);
            
            try {
                const res = await fetch('/api/upload-sound', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                
                if (data.success && data.data) {
                    // 添加到提示音列表
                    const settings = window.appData.pomodoroSettings;
                    if (!settings.sounds) {
                        settings.sounds = [...Object.entries(PRESET_SOUNDS).map(([id, s]) => ({ id, ...s }))];
                    }
                    
                    settings.sounds.push({
                        id: data.data.id,
                        name: data.data.originalName.replace(/\.[^.]+$/, ''), // 去掉扩展名
                        type: 'custom',
                        path: data.data.path
                    });
                    
                    // 保存并刷新列表
                    savePomodoroSettings();
                    renderSoundList();
                    
                    // 重新预加载音频
                    preloadNotificationSound();
                    
                    window.showToast(`✓ 已上传: ${file.name}`);
                } else {
                    window.showToast('上传失败: ' + (data.message || '未知错误'));
                }
            } catch (err) {
                console.error('上传提示音失败:', err);
                window.showToast('上传失败');
            }
            
            // 清空 input 以便再次选择同一文件
            e.target.value = '';
        };
    }
    
    // 监听页面可见性变化 - 修复后台标签页播放问题
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 预加载通知音
    preloadNotificationSound();
    
    // 从今日记录中恢复 completedPomodoros
    const today = window.getToday();
    const todayRecord = (window.appData.pomodoroRecords || []).find(r => r.date === today);
    if (todayRecord) {
        completedPomodoros = todayRecord.completed;
        currentCountEl.textContent = completedPomodoros;
        console.log('📊 从今日记录恢复完成数:', completedPomodoros);
    }
    
    // 尝试恢复之前的番茄钟状态
    restorePomodoroState();
    
    // 初始化显示
    updatePomodoroDisplay();
}

/**
 * 初始化音频上下文
 */
function initAudioContext() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.log('无法创建音频上下文:', e);
    }
}

/**
 * 确保音频上下文已激活
 */
function ensureAudioContext() {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

/**
 * 处理页面可见性变化
 */
function handleVisibilityChange() {
    if (!document.hidden) {
        console.log('📱 页面变为可见');
        
        // 确保音频上下文激活
        ensureAudioContext();
        
        // 如果有待播放的提示音，立即播放
        if (pendingPlayback) {
            console.log('🔔 播放待播的提示音');
            pendingPlayback = false;
            playNotificationSound();
        }
    }
}

/**
 * 预加载通知音
 */
function preloadNotificationSound() {
    const settings = window.appData.pomodoroSettings;
    const sounds = settings.sounds || [];
    const selectedSound = sounds.find(s => s.id === settings.selectedSoundId);
    
    if (!selectedSound) return;
    
    const filePath = selectedSound.type === 'preset' ? selectedSound.file : selectedSound.path;
    if (!filePath) return;
    
    // 确保路径正确
    let fullPath = filePath;
    if (!filePath.startsWith('http') && !filePath.startsWith('/')) {
        fullPath = '/' + filePath;
    }
    
    // 预加载音频
    preloadedAudio = new Audio(fullPath);
    preloadedAudio.load();
    
    console.log('🎵 预加载提示音完成:', fullPath);
}

/**
 * 加载番茄钟设置
 */
function loadPomodoroSettings() {
    const settings = window.appData.pomodoroSettings || {
        workDuration: 25,
        shortBreak: 5,
        longBreak: 15,
        longBreakInterval: 4,
        targetCount: 4,
        soundEnabled: true,
        soundVolume: 80,
        sounds: [],
        selectedSoundId: 'qing'
    };
    
    console.log('加载番茄钟设置，音量值:', settings.soundVolume, '原始数据:', window.appData.pomodoroSettings);
    
    // 初始化提示音列表（如果为空，使用默认值）
    if (!settings.sounds || settings.sounds.length === 0) {
        settings.sounds = [
            { id: 'qing', name: '磬声（默认）', type: 'preset', file: 'sounds/qing.wav' }
        ];
    }
    
    // 确保有默认选中的提示音
    if (!settings.selectedSoundId) {
        settings.selectedSoundId = settings.sounds[0]?.id || 'qing';
    }
    
    // 确保音量有默认值
    if (settings.soundVolume === undefined) {
        settings.soundVolume = 80;
    }
    
    window.appData.pomodoroSettings = settings;
    
    // 更新滑块值
    workDurationEl.value = settings.workDuration;
    shortBreakEl.value = settings.shortBreak;
    longBreakEl.value = settings.longBreak;
    longBreakIntervalEl.value = settings.longBreakInterval;
    targetCountEl.value = settings.targetCount || 4;
    soundEnabledEl.checked = settings.soundEnabled;
    if (soundVolumeEl) soundVolumeEl.value = settings.soundVolume;
    
    // 更新显示值
    document.getElementById('workDurationVal').textContent = settings.workDuration;
    document.getElementById('shortBreakVal').textContent = settings.shortBreak;
    document.getElementById('longBreakVal').textContent = settings.longBreak;
    document.getElementById('longBreakIntervalVal').textContent = settings.longBreakInterval;
    document.getElementById('targetCountVal').textContent = settings.targetCount || 4;
    if (document.getElementById('soundVolumeVal')) {
        document.getElementById('soundVolumeVal').textContent = settings.soundVolume;
    }
    
    // 渲染提示音列表
    renderSoundList();
    
    // 更新提示音管理区域显示状态
    updateSoundManagementVisibility();
    
    // 预加载通知音
    preloadNotificationSound();
    
    // 重置时间
    currentTime = settings.workDuration * 60;
    totalTime = settings.workDuration * 60;
    totalCountEl.textContent = settings.targetCount || 4;
    
    updatePomodoroDisplay();
}

/**
 * 更新提示音管理区域的显示状态
 */
function updateSoundManagementVisibility() {
    const soundManagement = document.getElementById('soundManagement');
    if (soundManagement) {
        soundManagement.style.display = soundEnabledEl.checked ? 'flex' : 'none';
    }
}

/**
 * 渲染提示音列表
 */
function renderSoundList() {
    const settings = window.appData.pomodoroSettings;
    const sounds = settings.sounds || [];
    const selectedId = settings.selectedSoundId || sounds[0]?.id;
    
    if (!soundListEl) return;
    
    if (sounds.length === 0) {
        soundListEl.innerHTML = '<div style="color: var(--text-secondary); font-size: 0.85rem; padding: 8px;">暂无提示音</div>';
        return;
    }
    
    soundListEl.innerHTML = sounds.map(sound => {
        const isSelected = sound.id === selectedId;
        const isPreset = sound.type === 'preset';
        const isPlaying = currentPlayingBtnId === sound.id;
        
        return `
            <div class="sound-item ${isSelected ? 'selected' : ''}" data-id="${sound.id}" 
                style="display: flex; align-items: center; padding: 10px 12px; border: 1px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}; border-radius: 8px; margin-bottom: 8px; background: ${isSelected ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)'}; cursor: pointer; transition: all 0.2s;">
                <div style="flex: 1;">
                    <div class="sound-name" data-id="${sound.id}" style="font-size: 0.9rem; font-weight: ${isSelected ? '600' : '400'}; color: ${isSelected ? 'var(--primary)' : 'var(--text)'}; cursor: ${isPreset ? 'default' : 'pointer'};">
                        ${escapeHtml(sound.name)}${!isPreset ? ' ✏️' : ''}
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px;">
                        ${isPreset ? '🎵 预设提示音' : '📁 自定义提示音'}
                    </div>
                </div>
                <button class="sound-play-btn" data-id="${sound.id}" title="${isPlaying ? '暂停' : '播放测试'}" 
                    style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--border-color); background: ${isPlaying ? 'var(--primary)' : 'var(--bg-primary)'}; cursor: pointer; margin-right: 8px; display: flex; align-items: center; justify-content: center; color: ${isPlaying ? 'white' : 'inherit'};">
                    ${isPlaying ? '⏸' : '▶'}
                </button>
                ${!isPreset ? `
                    <button class="sound-delete-btn" data-id="${sound.id}" title="删除" 
                        style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--border-color); background: var(--bg-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; color: #e74c3c;">
                        🗑️
                    </button>
                ` : ''}
            </div>
        `;
    }).join('');
    
    // 绑定选择事件
    soundListEl.querySelectorAll('.sound-item').forEach(item => {
        item.onclick = (e) => {
            if (e.target.closest('.sound-play-btn') || e.target.closest('.sound-delete-btn') || e.target.closest('.sound-name')) return;
            
            const soundId = item.dataset.id;
            settings.selectedSoundId = soundId;
            savePomodoroSettings();
            renderSoundList();
        };
    });
    
    // 绑定改名事件（双击或点击编辑图标）
    soundListEl.querySelectorAll('.sound-name').forEach(nameEl => {
        nameEl.onclick = (e) => {
            e.stopPropagation();
            const soundId = nameEl.dataset.id;
            const sound = sounds.find(s => s.id === soundId);
            if (sound && sound.type !== 'preset') {
                const newName = prompt('请输入新的名称:', sound.name);
                if (newName && newName.trim()) {
                    sound.name = newName.trim();
                    savePomodoroSettings();
                    renderSoundList();
                    window.showToast('已重命名');
                }
            }
        };
    });
    
    // 绑定播放/暂停事件
    soundListEl.querySelectorAll('.sound-play-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const soundId = btn.dataset.id;
            
            // 如果正在播放同一个，则停止
            if (currentPlayingBtnId === soundId && currentPlayingAudio) {
                stopCurrentAudio();
                renderSoundList();
                return;
            }
            
            // 停止之前的播放
            stopCurrentAudio();
            
            // 播放新的
            playSoundById(soundId, btn);
        };
    });
    
    // 绑定删除事件
    soundListEl.querySelectorAll('.sound-delete-btn').forEach(btn => {
        btn.onclick = async (e) => {
            e.stopPropagation();
            const soundId = btn.dataset.id;
            
            // 停止正在播放的
            if (currentPlayingBtnId === soundId) {
                stopCurrentAudio();
            }
            
            // 确认删除
            window.showConfirm('确定要删除这个提示音吗？', async () => {
                const sound = sounds.find(s => s.id === soundId);
                if (!sound) return;
                
                // 如果删除的是当前选中的，先切换到其他
                if (settings.selectedSoundId === soundId) {
                    const otherSound = sounds.find(s => s.id !== soundId);
                    settings.selectedSoundId = otherSound?.id || 'qing';
                }
                
                // 从列表中移除
                const index = settings.sounds.findIndex(s => s.id === soundId);
                if (index > -1) {
                    settings.sounds.splice(index, 1);
                }
                
                // 删除服务器文件
                if (sound.path) {
                    try {
                        await fetch(`/api/file?path=${encodeURIComponent(sound.path)}&type=sound`, {
                            method: 'DELETE'
                        });
                    } catch (err) {
                        console.error('删除提示音文件失败:', err);
                    }
                }
                
                savePomodoroSettings();
                renderSoundList();
                window.showToast('已删除');
            });
        };
    });
}

/**
 * 停止当前播放的音频
 */
function stopCurrentAudio() {
    if (currentPlayingAudio) {
        currentPlayingAudio.pause();
        currentPlayingAudio.currentTime = 0;
        currentPlayingAudio = null;
    }
    currentPlayingBtnId = null;
}

/**
 * 根据 ID 播放提示音
 */
function playSoundById(soundId, btn) {
    const settings = window.appData.pomodoroSettings;
    const sounds = settings.sounds || [];
    const sound = sounds.find(s => s.id === soundId);
    
    if (!sound) {
        console.error('未找到提示音:', soundId);
        return;
    }
    
    const filePath = sound.type === 'preset' ? sound.file : sound.path;
    if (!filePath) return;
    
    // 创建新的音频实例
    currentPlayingAudio = new Audio(filePath);
    currentPlayingAudio.volume = (settings.soundVolume || 80) / 100; // 使用设置中的音量
    currentPlayingBtnId = soundId;
    
    // 播放结束后更新按钮状态
    currentPlayingAudio.onended = () => {
        stopCurrentAudio();
        renderSoundList();
    };
    
    currentPlayingAudio.onerror = () => {
        stopCurrentAudio();
        renderSoundList();
        window.showToast('播放失败');
    };
    
    // 播放
    currentPlayingAudio.play().catch(err => {
        console.error('播放失败:', err);
        stopCurrentAudio();
        renderSoundList();
    });
    
    // 更新按钮显示
    renderSoundList();
}

/**
 * 保存番茄钟设置
 */
function savePomodoroSettings() {
    const settings = window.appData.pomodoroSettings;
    
    // 保存时间设置
    settings.workDuration = parseInt(workDurationEl.value);
    settings.shortBreak = parseInt(shortBreakEl.value);
    settings.longBreak = parseInt(longBreakEl.value);
    settings.longBreakInterval = parseInt(longBreakIntervalEl.value);
    settings.targetCount = parseInt(targetCountEl.value);
    settings.soundEnabled = soundEnabledEl.checked;
    settings.soundVolume = parseInt(soundVolumeEl.value); // 保存音量
    
    console.log('保存番茄钟设置，音量值:', settings.soundVolume);
    
    window.appData.pomodoroSettings = settings;
    window.debouncedSave();
    
    // 如果是空闲状态，更新显示
    if (pomodoroState === PomodoroState.IDLE) {
        currentTime = settings.workDuration * 60;
        totalTime = settings.workDuration * 60;
        totalCountEl.textContent = settings.targetCount;
        updatePomodoroDisplay();
    }
}

/**
 * 切换设置面板
 */
function toggleSettingsPanel() {
    const isVisible = pomodoroSettingsPanelEl.style.display !== 'none';
    
    if (isVisible) {
        // 隐藏设置面板
        pomodoroSettingsPanelEl.style.display = 'none';
        // 恢复待办事项高度限制
        const todoList = document.querySelector('.todo-list');
        if (todoList) todoList.style.maxHeight = '300px';
        // 恢复日程隐藏
        document.querySelectorAll('.day-schedules').forEach(el => {
            el.style.overflow = 'hidden';
        });
    } else {
        // 显示设置面板
        pomodoroSettingsPanelEl.style.display = 'block';
        // 展开待办事项显示完整内容
        const todoList = document.querySelector('.todo-list');
        if (todoList) todoList.style.maxHeight = 'none';
        // 展开日程显示完整内容
        document.querySelectorAll('.day-schedules').forEach(el => {
            el.style.overflow = 'visible';
        });
    }
}

/**
 * 计时器滴答函数 - 使用结束时间戳计算剩余时间
 */
function tick() {
    if (endTime === null) return;
    
    const now = Date.now();
    const remaining = Math.ceil((endTime - now) / 1000);
    
    if (remaining <= 0) {
        currentTime = 0;
        updatePomodoroDisplay();
        completePomodoro();
        return;
    }
    
    currentTime = remaining;
    updatePomodoroDisplay();
}

/**
 * 切换番茄钟状态
 */
function togglePomodoro() {
    // 确保音频上下文已激活（需要用户交互）
    ensureAudioContext();
    
    if (pomodoroState === PomodoroState.IDLE || pomodoroState === PomodoroState.PAUSED) {
        startPomodoro();
    } else if (pomodoroState === PomodoroState.WORKING || pomodoroState === PomodoroState.BREAK) {
        pausePomodoro();
    }
}

/**
 * 开始番茄钟
 */
function startPomodoro() {
    const settings = window.appData.pomodoroSettings;
    
    if (pomodoroState === PomodoroState.IDLE) {
        // 检查是否已完成目标
        if (completedPomodoros >= settings.targetCount) {
            window.showToast('🎉 今日目标已完成！点击重置开始新的一天');
            return;
        }
        
        // 判断是工作还是休息
        if (completedPomodoros > 0 && completedPomodoros % settings.longBreakInterval === 0) {
            // 应该休息了
            pomodoroState = PomodoroState.BREAK;
            currentTime = settings.longBreak * 60;
            totalTime = settings.longBreak * 60;
            pomodoroStatusEl.textContent = '长休息';
            pomodoroCircleEl.classList.remove('work');
            pomodoroCircleEl.classList.add('break');
        } else {
            pomodoroState = PomodoroState.WORKING;
            currentTime = settings.workDuration * 60;
            totalTime = settings.workDuration * 60;
            pomodoroStatusEl.textContent = '工作中';
            pomodoroCircleEl.classList.add('work');
            pomodoroCircleEl.classList.remove('break');
        }
    } else {
        // 从暂停恢复，根据 totalTime 判断原来是工作还是休息
        const workSeconds = settings.workDuration * 60;
        pomodoroState = totalTime === workSeconds ? PomodoroState.WORKING : PomodoroState.BREAK;
    }
    
    pomodoroStartBtnEl.textContent = '⏸ 暂停';
    
    // 计算结束时间
    endTime = Date.now() + (currentTime * 1000);
    
    // 保存状态
    savePomodoroState();
    
    // 立即更新显示并开始计时
    updatePomodoroDisplay();
    timer = setInterval(tick, 100); // 使用更频繁的更新间隔
}

/**
 * 暂停番茄钟
 */
function pausePomodoro() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    // currentTime 已经在 tick 中更新为最新剩余时间
    endTime = null;
    pomodoroState = PomodoroState.PAUSED;
    pomodoroStartBtnEl.textContent = '▶ 继续';
    
    // 保存暂停状态
    savePomodoroState();
}

/**
 * 重置番茄钟
 */
function resetPomodoro() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    endTime = null;
    pomodoroState = PomodoroState.IDLE;
    completedPomodoros = 0;
    const settings = window.appData.pomodoroSettings;
    currentTime = settings.workDuration * 60;
    totalTime = settings.workDuration * 60;
    currentCountEl.textContent = '0';
    totalCountEl.textContent = settings.targetCount;
    pomodoroStartBtnEl.textContent = '▶ 开始';
    pomodoroStatusEl.textContent = '工作';
    pomodoroCircleEl.classList.add('work');
    pomodoroCircleEl.classList.remove('break');
    
    // 清除 session
    resetPomodoroSession();
    
    updatePomodoroDisplay();
}

/**
 * 跳过休息，直接开始下一个番茄钟
 */
function skipBreak() {
    if (pomodoroState !== PomodoroState.BREAK && pomodoroState !== PomodoroState.PAUSED) return;

    // 检测状态：如果是从 BREAK 暂停的，totalTime 会是休息时长
    const settings = window.appData.pomodoroSettings;
    const workSeconds = settings.workDuration * 60;
    const wasBreak = totalTime !== workSeconds;
    if (!wasBreak && pomodoroState === PomodoroState.PAUSED) return; // 暂停的工作，不是休息

    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    endTime = null;

    window.showToast('⏩ 跳过休息，开始下一个番茄钟');

    // 切换到工作
    pomodoroState = PomodoroState.WORKING;
    currentTime = workSeconds;
    totalTime = workSeconds;
    pomodoroStatusEl.textContent = '工作中';
    pomodoroCircleEl.classList.add('work');
    pomodoroCircleEl.classList.remove('break');
    pomodoroStartBtnEl.textContent = '⏸ 暂停';
    pomodoroSkipBtnEl.style.display = 'none';

    // 自动开始工作计时
    endTime = Date.now() + (currentTime * 1000);
    savePomodoroState();
    updatePomodoroDisplay();
    timer = setInterval(tick, 100);
}

/**
 * 时间补录：暂停后忘记继续时，将已实际工作的时间从剩余时间中扣除
 */
function backfillPomodoro() {
    const remainingMin = Math.ceil(currentTime / 60);
    const input = prompt(`当前剩余 ${remainingMin} 分钟，请输入已实际工作的分钟数：`, '');
    if (!input) return;
    const workedMin = parseInt(input);
    if (isNaN(workedMin) || workedMin <= 0) {
        window.showToast('请输入有效的分钟数', 2000);
        return;
    }
    const workedSec = workedMin * 60;
    currentTime = Math.max(0, currentTime - workedSec);

    if (currentTime <= 0) {
        // 时间已耗尽，切回工作状态后完成
        currentTime = 0;
        pomodoroState = PomodoroState.WORKING;
        window.showToast(`已扣除 ${workedMin} 分钟，番茄钟完成`, 2000);
        completePomodoro();
    } else {
        // 保存新的剩余时间
        if (pomodoroState === PomodoroState.PAUSED) {
            endTime = null;
        } else {
            endTime = Date.now() + (currentTime * 1000);
        }
        savePomodoroState();
        updatePomodoroDisplay();
        window.showToast(`已扣除 ${workedMin} 分钟，剩余 ${Math.ceil(currentTime / 60)} 分钟`, 2000);
    }
}

/**
 * 完成一个番茄钟
 */
function completePomodoro() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    endTime = null;
    
    const settings = window.appData.pomodoroSettings;
    
    // 播放提示音
    if (settings.soundEnabled) {
        playNotificationSound();
    }
    
    if (pomodoroState === PomodoroState.WORKING) {
        // 工作完成
        completedPomodoros++;
        currentCountEl.textContent = completedPomodoros;
        console.log('🍅 工作完成，completedPomodoros:', completedPomodoros);
        
        // 记录完成
        recordCompletedPomodoro();
        
        // 检查是否完成目标
        if (completedPomodoros >= settings.targetCount) {
            window.showToast(`🎉 恭喜！已完成今日目标 ${settings.targetCount} 个番茄钟！`);
            pomodoroState = PomodoroState.IDLE;
            pomodoroStartBtnEl.textContent = '▶ 开始';
            pomodoroStatusEl.textContent = '已完成';
            updatePomodoroDisplay();
            return;
        }
        
        window.showToast(`🍅 番茄钟完成！已工作 ${completedPomodoros}/${settings.targetCount} 个`);
        
        // 判断休息类型
        const isLongBreak = completedPomodoros % settings.longBreakInterval === 0;
        const breakDuration = isLongBreak ? settings.longBreak : settings.shortBreak;
        console.log('⏸️ 判断休息类型: isLongBreak:', isLongBreak, 'breakDuration:', breakDuration, 
            'longBreakInterval:', settings.longBreakInterval,
            'shortBreak:', settings.shortBreak, 'longBreak:', settings.longBreak);
        
        // 如果休息时间为0，跳过休息直接开始下一个番茄钟
        if (breakDuration === 0) {
            pomodoroState = PomodoroState.WORKING;
            currentTime = settings.workDuration * 60;
            totalTime = settings.workDuration * 60;
            pomodoroStatusEl.textContent = '工作';
            pomodoroCircleEl.classList.add('work');
            pomodoroCircleEl.classList.remove('break');
            pomodoroStartBtnEl.textContent = '⏸ 暂停';

            // 自动开始下一个番茄钟
            endTime = Date.now() + (currentTime * 1000);
            savePomodoroState();
            updatePomodoroDisplay();
            timer = setInterval(tick, 100);
            window.showToast('⏩ 跳过休息，开始下一个番茄钟');
        } else {
            // 开始休息
            pomodoroState = PomodoroState.BREAK;
            currentTime = breakDuration * 60;
            totalTime = breakDuration * 60;
            pomodoroStatusEl.textContent = isLongBreak ? '长休息' : '短休息';
            pomodoroCircleEl.classList.remove('work');
            pomodoroCircleEl.classList.add('break');
            pomodoroStartBtnEl.textContent = '⏸ 暂停';
            pomodoroSkipBtnEl.style.display = '';
            endTime = Date.now() + (currentTime * 1000);
            savePomodoroState();
            updatePomodoroDisplay();
            timer = setInterval(tick, 100);
        }
    } else {
        // 休息完成
        window.showToast('☕ 休息结束！准备开始下一个番茄钟');
        
        // 播放提示音提醒休息结束
        if (settings.soundEnabled) {
            playNotificationSound();
        }
        
        pomodoroState = PomodoroState.WORKING;
        currentTime = settings.workDuration * 60;
        totalTime = settings.workDuration * 60;
        pomodoroStatusEl.textContent = '工作';
        pomodoroCircleEl.classList.add('work');
        pomodoroCircleEl.classList.remove('break');
        pomodoroStartBtnEl.textContent = '⏸ 暂停';
        
        // 自动开始下一个番茄钟
        endTime = Date.now() + (currentTime * 1000);
        savePomodoroState();
        updatePomodoroDisplay();
        timer = setInterval(tick, 100);
    }
    
    updatePomodoroDisplay();
}

/**
 * 记录完成的番茄钟
 */
function recordCompletedPomodoro() {
    const today = window.getToday();
    let records = window.appData.pomodoroRecords || [];
    
    const todayRecord = records.find(r => r.date === today);
    if (todayRecord) {
        todayRecord.completed++;
    } else {
        records.push({
            date: today,
            completed: 1
        });
    }
    
    // 只保留最近30天的记录
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    records = records.filter(r => new Date(r.date) >= thirtyDaysAgo);
    
    window.appData.pomodoroRecords = records;
    console.log('📝 记录完成的番茄钟，今日:', completedPomodoros, '条记录:', records);
    // 通知游戏系统
    if (window.notifyGame) {
        window.notifyGame('pomodoro_completed', {});
    }
    window.debouncedSave();
}

/**
 * 更新显示
 */
function updatePomodoroDisplay() {
    // 更新时间显示
    const minutes = Math.floor(currentTime / 60);
    const seconds = currentTime % 60;
    pomodoroTimeEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    // 更新进度环
    const circumference = 2 * Math.PI * 90; // r=90
    const progress = 1 - (currentTime / totalTime);
    const offset = circumference * (1 - progress);
    progressRingEl.style.strokeDashoffset = offset;

    // 休息状态时显示跳过按钮
    if (pomodoroSkipBtnEl) {
        pomodoroSkipBtnEl.style.display = (pomodoroState === PomodoroState.BREAK) ? '' : 'none';
    }
}

/**
 * 播放提示音（使用当前选中的提示音）
 */
function playNotificationSound() {
    const settings = window.appData.pomodoroSettings;
    const now = Date.now();
    
    // 防止短时间内重复播放（间隔小于1秒）
    if (now - lastPlayTime < 1000) {
        console.log('⏳ 跳过重复播放');
        return;
    }
    lastPlayTime = now;
    
    console.log('🔔 播放提示音 - 当前音量设置:', settings.soundVolume, '页面可见:', !document.hidden);
    
    // 确保音频上下文激活
    ensureAudioContext();
    
    // 使用预加载的音频播放
    if (preloadedAudio) {
        try {
            const volume = (settings.soundVolume || 80) / 100;
            preloadedAudio.volume = volume;
            preloadedAudio.currentTime = 0;
            
            const playPromise = preloadedAudio.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log('✅ 提示音播放成功');
                        pendingPlayback = false;
                    })
                    .catch(e => {
                        console.log('⚠️ 播放失败，可能是后台标签页，设置待播标记:', e);
                        pendingPlayback = true;
                    });
            }
        } catch (e) {
            console.log('播放提示音失败:', e);
            pendingPlayback = true;
        }
    } else {
        console.log('⚠️ 没有预加载的音频，重新加载');
        preloadNotificationSound();
        pendingPlayback = true;
    }
}

/**
 * 保存番茄钟状态到 appData
 */
function savePomodoroState() {
    if (!window.appData) return;
    
    window.appData.pomodoroSession = {
        state: pomodoroState,
        currentTime: currentTime,
        totalTime: totalTime,
        endTime: endTime,
        completedPomodoros: completedPomodoros
    };
    
    window.debouncedSave();
}

/**
 * 从 appData 恢复番茄钟状态
 */
function restorePomodoroState() {
    const session = window.appData.pomodoroSession;
    if (!session) return;
    
    // 恢复状态
    pomodoroState = session.state;
    completedPomodoros = session.completedPomodoros || 0;
    totalTime = session.totalTime;
    
    // 更新计数显示
    currentCountEl.textContent = completedPomodoros;
    
    // 检查是否有未完成的计时
    if (session.endTime && session.endTime > Date.now()) {
        // 有未完成的计时，继续
        endTime = session.endTime;
        currentTime = Math.ceil((endTime - Date.now()) / 1000);
        
        // 恢复状态显示
        if (session.state === PomodoroState.WORKING) {
            pomodoroStatusEl.textContent = '工作中';
            pomodoroCircleEl.classList.add('work');
            pomodoroCircleEl.classList.remove('break');
        } else if (session.state === PomodoroState.BREAK) {
            pomodoroStatusEl.textContent = session.totalTime >= 15 * 60 ? '长休息' : '短休息';
            pomodoroCircleEl.classList.remove('work');
            pomodoroCircleEl.classList.add('break');
        }
        
        pomodoroStartBtnEl.textContent = '⏸ 暂停';
        
        // 继续计时
        timer = setInterval(tick, 100);
        
        console.log('🍅 恢复番茄钟计时');
    } else if (session.endTime && session.endTime <= Date.now()) {
        // 计时已经结束了
        if (session.state === PomodoroState.WORKING || session.state === PomodoroState.BREAK) {
            console.log('🔄 恢复时检测到计时已结束，调用 completePomodoro()');
            completePomodoro();
            // completePomodoro() 已经会保存新状态，不需要再 reset
        } else {
            resetPomodoroSession();
        }
    } else if (session.state === PomodoroState.PAUSED) {
        // 暂停状态
        currentTime = session.currentTime;
        endTime = null;

        const workSeconds = window.appData.pomodoroSettings.workDuration * 60;
        if (session.totalTime === window.appData.pomodoroSettings.longBreak * 60) {
            pomodoroState = PomodoroState.BREAK;
            pomodoroStatusEl.textContent = '长休息';
            pomodoroCircleEl.classList.remove('work');
            pomodoroCircleEl.classList.add('break');
        } else if (session.totalTime !== workSeconds) {
            pomodoroState = PomodoroState.BREAK;
            pomodoroStatusEl.textContent = '短休息';
            pomodoroCircleEl.classList.remove('work');
            pomodoroCircleEl.classList.add('break');
        } else {
            pomodoroState = PomodoroState.WORKING;
            pomodoroStatusEl.textContent = '工作';
            pomodoroCircleEl.classList.add('work');
            pomodoroCircleEl.classList.remove('break');
        }

        pomodoroStartBtnEl.textContent = '▶ 继续';
    }
}

/**
 * 重置番茄钟 session
 */
function resetPomodoroSession() {
    if (window.appData) {
        window.appData.pomodoroSession = null;
        window.debouncedSave();
    }
}

// HTML 转义函数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 导出函数到全局
window.initPomodoroModule = initPomodoroModule;
window.togglePomodoro = togglePomodoro;
window.resetPomodoro = resetPomodoro;
