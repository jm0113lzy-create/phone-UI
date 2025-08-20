// SillyTavern Phone UI Extension
// 小手机界面扩展

jQuery(async () => {
    'use strict';

    const extensionName = 'phone-ui';
    const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

    // 扩展设置
    const defaultSettings = {
        enabled: false,
        theme: 'ins-light',
        bubble: 'blue',
        doubleTick: true
    };

    // 全局变量
    let extension_settings = {};
    let phoneContainer = null;
    let activeChar = 'Ghost';
    let store = {};

    // 初始化函数
    async function init() {
        console.log('[Phone UI Extension] 正在初始化...');
        
        // 加载设置
        extension_settings = extension_settings[extensionName] || defaultSettings;
        
        // 创建设置面板
        createSettingsPanel();
        
        // 如果启用，初始化手机界面
        if (extension_settings.enabled) {
            await initPhoneUI();
        }

        console.log('[Phone UI Extension] 初始化完成');
    }

    // 创建设置面板
    function createSettingsPanel() {
        const settingsHtml = `
        <div class="phone-ui-settings">
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>小手机界面设置</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content">
                    <label class="checkbox_label" for="phone_ui_enabled">
                        <input id="phone_ui_enabled" type="checkbox">
                        <span>启用手机界面</span>
                    </label>
                    
                    <h4>主题设置</h4>
                    <div class="radio-group">
                        <label><input type="radio" name="phone_theme" value="ins-light"> 清透·INS</label>
                        <label><input type="radio" name="phone_theme" value="dark"> 暗色·夜幕</label>
                        <label><input type="radio" name="phone_theme" value="clear"> 透明·极简</label>
                    </div>
                    
                    <h4>气泡样式</h4>
                    <div class="radio-group">
                        <label><input type="radio" name="phone_bubble" value="blue"> 冰蓝</label>
                        <label><input type="radio" name="phone_bubble" value="green"> 薄荷</label>
                        <label><input type="radio" name="phone_bubble" value="pink"> 樱粉</label>
                        <label><input type="radio" name="phone_bubble" value="neutral"> 中性</label>
                        <label><input type="radio" name="phone_bubble" value="dark"> 深色</label>
                    </div>
                    
                    <label class="checkbox_label" for="phone_ui_double_tick">
                        <input id="phone_ui_double_tick" type="checkbox">
                        <span>显示双勾"已读"</span>
                    </label>
                    
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ccc;">
                        <button id="phone_ui_toggle_btn" style="background: #0ea5e9; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
                            切换手机界面显示/隐藏
                        </button>
                        <button id="phone_ui_debug_btn" style="background: #f59e0b; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; margin-left: 8px;">
                            调试信息
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
        
        $('#extensions_settings2').append(settingsHtml);
        
        // 绑定事件监听器
        bindSettingsEvents();
        
        // 加载当前设置
        loadSettings();
    }

    // 绑定设置事件
    function bindSettingsEvents() {
        $('#phone_ui_enabled').on('change', function() {
            extension_settings.enabled = $(this).is(':checked');
            saveSettings();
            
            if (extension_settings.enabled) {
                initPhoneUI();
            } else {
                destroyPhoneUI();
            }
        });

        $('input[name="phone_theme"]').on('change', function() {
            if ($(this).is(':checked')) {
                extension_settings.theme = $(this).val();
                saveSettings();
                applyTheme();
            }
        });

        $('input[name="phone_bubble"]').on('change', function() {
            if ($(this).is(':checked')) {
                extension_settings.bubble = $(this).val();
                saveSettings();
                applyTheme();
            }
        });

        $('#phone_ui_double_tick').on('change', function() {
            extension_settings.doubleTick = $(this).is(':checked');
            saveSettings();
        });

        // 添加调试和切换按钮事件
        $('#phone_ui_toggle_btn').on('click', function() {
            if (phoneContainer) {
                if (phoneContainer.style.display === 'none') {
                    phoneContainer.style.display = 'block';
                    console.log('[Phone UI] 手机界面已显示');
                } else {
                    phoneContainer.style.display = 'none';
                    console.log('[Phone UI] 手机界面已隐藏');
                }
            } else {
                console.log('[Phone UI] 手机界面未初始化，尝试创建...');
                initPhoneUI();
            }
        });

        $('#phone_ui_debug_btn').on('click', function() {
            const debugInfo = {
                enabled: extension_settings.enabled,
                phoneContainerExists: !!phoneContainer,
                phoneContainerVisible: phoneContainer ? phoneContainer.style.display !== 'none' : false,
                activeChar: activeChar,
                storeData: store,
                thisChid: typeof this_chid !== 'undefined' ? this_chid : '未定义',
                characters: typeof characters !== 'undefined' ? Object.keys(characters).length : '未定义'
            };
            console.log('[Phone UI Debug]', debugInfo);
            alert('调试信息已输出到控制台，请按F12查看Console标签');
        });
    }

    // 加载设置
    function loadSettings() {
        $('#phone_ui_enabled').prop('checked', extension_settings.enabled);
        $(`input[name="phone_theme"][value="${extension_settings.theme}"]`).prop('checked', true);
        $(`input[name="phone_bubble"][value="${extension_settings.bubble}"]`).prop('checked', true);
        $('#phone_ui_double_tick').prop('checked', extension_settings.doubleTick);
    }

    // 保存设置
    function saveSettings() {
        extension_settings[extensionName] = extension_settings;
        saveSettingsDebounced();
    }

    // 获取当前角色名
    function getActiveCharacterName() {
        // 尝试从 SillyTavern 全局变量获取
        if (typeof this_chid !== 'undefined' && characters[this_chid]) {
            return characters[this_chid].name || 'Ghost';
        }
        
        // 从 URL 参数获取
        const urlParams = new URLSearchParams(window.location.search);
        const charFromUrl = urlParams.get('char');
        if (charFromUrl) return charFromUrl;
        
        // 默认角色
        return 'Ghost';
    }

    // 角色默认数据
    const DEFAULT_DATA = {
        "Ghost": {
            state: { doing:"狙击训练", location:"141 基地 · 射击场", mood:"冷峻专注", affection:65, mind:"检查狙击枪并观察队友。" },
            messages: [{from:"Ghost", text:"保持通信畅通。", time:"08:00", read:false}],
            feed: [{author:"Ghost", content:"例行训练。", time:"07:30", likes:0}],
            diary: [{date:"2025-08-18", entry:"Soap 太吵了，但还能忍。"}]
        },
        "König": {
            state: { doing:"整理装备", location:"141 基地 · 宿舍区", mood:"拘谨安静", affection:45, mind:"低头摆弄迷彩布，尽量不引人注意。"},
            messages: [{from:"König", text:"装备检查完毕。", time:"09:00", read:false}],
            feed: [{author:"König", content:"风有点大。", time:"09:00", likes:0}],
            diary: [{date:"2025-08-17", entry:"人群让我不舒服。"}]
        }
    };

    // 加载角色数据
    function loadCharacterData(name) {
        const key = `phone_ui_${name}`;
        const defaultData = DEFAULT_DATA[name] || DEFAULT_DATA["Ghost"];
        
        try {
            const stored = localStorage.getItem(key);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn('[Phone UI] 加载角色数据失败:', e);
        }
        
        return {
            state: defaultData.state,
            messages: defaultData.messages,
            feed: defaultData.feed,
            diary: defaultData.diary
        };
    }

    // 保存角色数据
    function saveCharacterData(name, data) {
        const key = `phone_ui_${name}`;
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.warn('[Phone UI] 保存角色数据失败:', e);
        }
    }

    // 初始化手机界面
    async function initPhoneUI() {
        if (phoneContainer) {
            return; // 已经初始化
        }

        console.log('[Phone UI] 创建手机界面...');
        
        // 获取当前角色
        activeChar = getActiveCharacterName();
        store = loadCharacterData(activeChar);
        
        // 创建手机界面容器
        phoneContainer = document.createElement('div');
        phoneContainer.id = 'phone-ui-container';
        phoneContainer.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            width: 380px;
            height: 780px;
            z-index: 10000;
            border-radius: 36px;
            box-shadow: 0 18px 50px rgba(0,0,0,0.25);
            overflow: hidden;
            background: #fff;
        `;

        // 加载手机界面HTML内容
        await loadPhoneHTML();
        
        // 添加到页面
        document.body.appendChild(phoneContainer);
        
        // 初始化手机界面功能
        initPhoneFunctionality();
        
        // 应用主题
        applyTheme();
        
        console.log('[Phone UI] 手机界面创建完成');
    }

    // 加载手机HTML内容
    async function loadPhoneHTML() {
        const phoneHTML = `
        <div id="phone" class="phone-frame">
            <!-- 顶栏 -->
            <header id="topbar" class="topbar">
                <div class="name-line">
                    <span id="charName">${activeChar}</span>
                </div>
                <div class="status-line">
                    <span class="dot"></span>
                    <span id="doingText">${store.state.doing}</span>
                </div>
                
                <details class="fold">
                    <summary>📍 所在地</summary>
                    <div id="locationText" class="fold-body">${store.state.location}</div>
                </details>
                <details class="fold">
                    <summary>🌤️ 心情</summary>
                    <div id="moodText" class="fold-body">${store.state.mood}</div>
                </details>
                <details class="fold">
                    <summary>❤️ 心动值</summary>
                    <div class="fold-body">
                        <div class="aff-bar">
                            <div id="affBarFill" style="width:${store.state.affection}%"></div>
                        </div>
                        <div id="affText">${store.state.affection}%</div>
                    </div>
                </details>
                <details class="fold">
                    <summary>🧠 心理</summary>
                    <div id="mindText" class="fold-body">${store.state.mind}</div>
                </details>
            </header>

            <!-- 视图容器 -->
            <main id="views">
                <!-- 聊天视图 -->
                <section id="chatView" class="view active">
                    <div id="msgList" class="msg-list"></div>
                    <div class="input-bar">
                        <input id="msgInput" placeholder="输入消息…" />
                        <button id="sendBtn">发送</button>
                    </div>
                </section>

                <!-- 朋友圈视图 -->
                <section id="feedView" class="view">
                    <div class="feed-head">
                        <button class="pill active" data-feedtab="timeline">朋友圈</button>
                        <button class="pill" data-feedtab="ins">INS风</button>
                    </div>
                    <div id="feedList" class="feed-list"></div>
                    <div class="input-bar">
                        <input id="feedInput" placeholder="发布动态…" />
                        <button id="postBtn">发布</button>
                    </div>
                </section>

                <!-- 日记视图 -->
                <section id="diaryView" class="view">
                    <div id="diaryList" class="diary-list"></div>
                    <div class="input-bar">
                        <input id="diaryInput" placeholder="写点今日心情…" />
                        <button id="diaryBtn">写入</button>
                    </div>
                </section>
            </main>

            <!-- 底部导航 -->
            <nav class="navbar">
                <button class="tab active" data-view="chatView">
                    💬
                    <span class="badge" id="badgeChat" style="display:none;">0</span>
                </button>
                <button class="tab" data-view="feedView">
                    📰
                    <span class="badge" id="badgeFeed" style="display:none;">0</span>
                </button>
                <button class="tab" data-view="diaryView">
                    📖
                </button>
            </nav>
        </div>
        `;

        phoneContainer.innerHTML = phoneHTML;

        // 添加CSS样式
        if (!document.getElementById('phone-ui-styles')) {
            const style = document.createElement('style');
            style.id = 'phone-ui-styles';
            style.textContent = getPhoneCSS();
            document.head.appendChild(style);
            }
        }

    // 获取手机界面的CSS样式
    function getPhoneCSS() {
        return `
            /* 只对手机界面容器内的元素应用样式，避免影响主界面 */
            #phone-ui-container {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            
            #phone-ui-container             #phone-ui-container .phone-frame {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                background: #fff;
                position: relative;
            }
            
            #phone-ui-container .topbar {
                padding: 10px 14px 6px;
                border-bottom: 1px solid rgba(0,0,0,0.06);
                background: rgba(255,255,255,0.82);
                backdrop-filter: blur(10px);
            }
            
            #phone-ui-container .name-line {
                font-weight: 700;
                font-size: 18px;
                color: #111;
            }
            
            #phone-ui-container .status-line {
                display: flex;
                align-items: center;
                gap: 6px;
                color: #6b7280;
                font-size: 12px;
                margin-top: 2px;
            }
            
            #phone-ui-container .dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #22c55e;
                box-shadow: 0 0 8px #22c55e;
            }
            
            #phone-ui-container .fold {
                margin-top: 6px;
            }
            
            #phone-ui-container .fold > summary {
                cursor: pointer;
                font-size: 12px;
                color: #0ea5e9;
                list-style: none;
            }
            
            #phone-ui-container .fold > summary::-webkit-details-marker {
                display: none;
            }
            
            #phone-ui-container .fold-body {
                padding: 6px 0 0 12px;
                font-size: 12px;
                color: #374151;
            }
            
            #phone-ui-container .aff-bar {
                width: 100%;
                height: 8px;
                background: #e5e7eb;
                border-radius: 999px;
                margin: 6px 0;
            }
            
            #phone-ui-container .aff-bar > div {
                height: 8px;
                background: linear-gradient(90deg, #f0abfc, #f43f5e);
                border-radius: 999px;
                transition: width 0.3s ease;
            }
            
            #phone-ui-container #views {
                flex: 1;
                display: flex;
                position: relative;
            }
            
            #phone-ui-container .view {
                position: absolute;
                inset: 0;
                display: none;
                flex-direction: column;
            }
            
            #phone-ui-container .view.active {
                display: flex;
            }
            
            #phone-ui-container .msg-list {
                flex: 1;
                overflow: auto;
                padding: 12px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                background: #eef2f7;
            }
            
            #phone-ui-container .msg {
                max-width: 72%;
                padding: 10px 12px;
                border-radius: 16px;
                background: #fff;
                color: #0f172a;
                position: relative;
                border: 1px solid #e5e7eb;
            }
            
            #phone-ui-container .msg.me {
                align-self: flex-end;
                background: #dcfce7;
            }
            
            #phone-ui-container .meta {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-top: 4px;
                color: #64748b;
                font-size: 10px;
            }
            
            #phone-ui-container .input-bar {
                display: flex;
                gap: 8px;
                padding: 10px;
                background: #fff;
                border-top: 1px solid rgba(0,0,0,0.06);
            }
            
            #phone-ui-container .input-bar input {
                flex: 1;
                border: 1px solid #e5e7eb;
                border-radius: 20px;
                padding: 8px 12px;
                outline: none;
            }
            
            #phone-ui-container .input-bar button {
                border: none;
                background: #0ea5e9;
                color: #fff;
                border-radius: 12px;
                padding: 8px 14px;
                cursor: pointer;
            }
            
            #phone-ui-container .navbar {
                height: 62px;
                background: #111;
                display: flex;
                justify-content: space-around;
                align-items: center;
            }
            
            #phone-ui-container .tab {
                position: relative;
                border: none;
                background: transparent;
                width: 44px;
                height: 44px;
                cursor: pointer;
                opacity: 0.8;
                color: #fff;
                font-size: 18px;
            }
            
            #phone-ui-container .tab.active {
                opacity: 1;
            }
            
            #phone-ui-container .badge {
                position: absolute;
                top: -2px;
                right: -2px;
                background: #ef4444;
                color: #fff;
                border-radius: 999px;
                padding: 2px 6px;
                font-size: 11px;
            }
            
            #phone-ui-container .feed-head {
                display: flex;
                gap: 8px;
                padding: 10px;
                border-bottom: 1px solid rgba(0,0,0,0.06);
                background: #fff;
            }
            
            #phone-ui-container .pill {
                border: 1px solid #cbd5e1;
                padding: 6px 10px;
                border-radius: 999px;
                background: #fff;
                color: #334155;
                cursor: pointer;
            }
            
            #phone-ui-container .pill.active {
                background: #0ea5e9;
                color: #fff;
                border-color: #0ea5e9;
            }
            
            #phone-ui-container .feed-list {
                flex: 1;
                overflow: auto;
                padding: 10px;
                background: #fafafa;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            #phone-ui-container .feed-item {
                background: #fff;
                border: 1px solid #e5e7eb;
                border-radius: 14px;
                padding: 10px;
            }
            
            #phone-ui-container .diary-list {
                flex: 1;
                overflow: auto;
                padding: 10px;
                background: #f8fafc;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            #phone-ui-container .diary-card {
                background: #fff;
                border: 1px solid #e5e7eb;
                border-radius: 14px;
                padding: 10px;
            }
            
            #phone-ui-container .diary-card .date {
                font-size: 12px;
                color: #64748b;
                margin-bottom: 4px;
                font-weight: bold;
            }
        `;
    }

    // 初始化手机功能
    function initPhoneFunctionality() {
        if (!phoneContainer) return;

        // 渲染初始内容
        renderMessages();
        renderFeed();
        renderDiary();

        // 绑定导航切换事件
        phoneContainer.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const targetView = tab.dataset.view;
                switchView(targetView);
            });
        });

        // 绑定发送消息事件
        const msgInput = phoneContainer.querySelector('#msgInput');
        const sendBtn = phoneContainer.querySelector('#sendBtn');
        
        if (msgInput && sendBtn) {
            const sendMessage = () => {
                const text = msgInput.value.trim();
                if (text) {
                    addMessage('me', text);
                    msgInput.value = '';
                    
                    // 模拟角色回复（可以后续集成到 SillyTavern 的对话系统）
                    setTimeout(() => {
                        addMessage(activeChar, `收到：${text}`);
                    }, 1000);
                }
            };

            sendBtn.addEventListener('click', sendMessage);
            msgInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            });
        }
    }

    // 切换视图
    function switchView(viewId) {
        if (!phoneContainer) return;

        // 切换视图显示
        phoneContainer.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        phoneContainer.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });

        const targetView = phoneContainer.querySelector(`#${viewId}`);
        const targetTab = phoneContainer.querySelector(`[data-view="${viewId}"]`);
        
        if (targetView) targetView.classList.add('active');
        if (targetTab) targetTab.classList.add('active');
    }

    // 添加消息
    function addMessage(from, text) {
        const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        const message = {
            from: from,
            text: text,
            time: time,
            read: from === 'me'
        };

        store.messages.push(message);
        saveCharacterData(activeChar, store);
        renderMessages();
    }

    // 渲染消息列表
    function renderMessages() {
        if (!phoneContainer) return;

        const msgList = phoneContainer.querySelector('#msgList');
        if (!msgList) return;

        msgList.innerHTML = '';
        
        store.messages.forEach(msg => {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'msg' + (msg.from === 'me' ? ' me' : '');
            msgDiv.innerHTML = `
                <div class="text">${msg.text}</div>
                <div class="meta">
                    <span>${msg.time}</span>
                    ${msg.from === 'me' && extension_settings.doubleTick ? 
                        `<span class="ticks">${msg.read ? '✓✓' : '✓'}</span>` : ''}
                </div>
            `;
            msgList.appendChild(msgDiv);
        });

        msgList.scrollTop = msgList.scrollHeight;

        // 更新未读消息徽章
        const unreadCount = store.messages.filter(m => m.from !== 'me' && !m.read).length;
        const badge = phoneContainer.querySelector('#badgeChat');
        if (badge) {
            if (unreadCount > 0) {
                badge.style.display = 'block';
                badge.textContent = unreadCount;
            } else {
                badge.style.display = 'none';
            }
        }
    }

    // 渲染动态列表
    function renderFeed() {
        if (!phoneContainer) return;

        const feedList = phoneContainer.querySelector('#feedList');
        if (!feedList) return;

        feedList.innerHTML = '';
        
        store.feed.forEach((post, index) => {
            const feedDiv = document.createElement('div');
            feedDiv.className = 'feed-item';
            feedDiv.innerHTML = `
                <div><b>${post.author}</b></div>
                <div>${post.content}</div>
                <div class="feed-meta">
                    <span>${post.time}</span>
                    <div class="actions">
                        <button onclick="window.phoneUI.likePost(${index})">赞 (${post.likes || 0})</button>
                    </div>
                </div>
            `;
            feedList.appendChild(feedDiv);
        });
    }

    // 渲染日记列表
    function renderDiary() {
        if (!phoneContainer) return;

        const diaryList = phoneContainer.querySelector('#diaryList');
        if (!diaryList) return;

        diaryList.innerHTML = '';
        
        [...store.diary].reverse().forEach(diary => {
            const diaryDiv = document.createElement('div');
            diaryDiv.className = 'diary-card';
            diaryDiv.innerHTML = `
                <div class="date">${diary.date}</div>
                <div>${diary.entry}</div>
            `;
            diaryList.appendChild(diaryDiv);
        });
    }

    // 应用主题
    function applyTheme() {
        if (!phoneContainer) return;

        // 这里可以根据 extension_settings.theme 和 extension_settings.bubble 应用不同的样式
        // 暂时使用简单的类名切换
        phoneContainer.className = `theme-${extension_settings.theme} bubble-${extension_settings.bubble}`;
    }

    // 销毁手机界面
    function destroyPhoneUI() {
        if (phoneContainer) {
            phoneContainer.remove();
            phoneContainer = null;
            console.log('[Phone UI] 手机界面已销毁');
        }
        
        // 移除样式
        const styleEl = document.getElementById('phone-ui-styles');
        if (styleEl) {
            styleEl.remove();
        }
    }

    // 暴露一些全局方法供界面调用
    window.phoneUI = {
        likePost: function(index) {
            if (store.feed[index]) {
                store.feed[index].likes = (store.feed[index].likes || 0) + 1;
                saveCharacterData(activeChar, store);
                renderFeed();
            }
        }
    };

    // 监听角色切换事件
    $(document).on('character_selected', function() {
        if (extension_settings.enabled && phoneContainer) {
            activeChar = getActiveCharacterName();
            store = loadCharacterData(activeChar);
            
            // 重新渲染界面
            loadPhoneHTML().then(() => {
                initPhoneFunctionality();
                applyTheme();
            });
        }
    });

    // 初始化扩展
    init();
});
