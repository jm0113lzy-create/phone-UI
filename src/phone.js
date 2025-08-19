// ====== 工具 ======
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const LS = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v))
};
const nowHM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

// ====== 自动识别当前角色名（多策略） ======
function getActiveCharacterName() {
  // 1) SillyTavern 全局变量（若存在）
  if (window.currentCharacter?.name) return window.currentCharacter.name;
  if (window.character?.name) return window.character.name;

  // 2) URL 覆盖 ?char=König
  const url = new URL(window.location.href);
  const q = url.searchParams.get('char');
  if (q) { LS.set('lastChar', q); return q; }

  // 3) 上次使用
  const last = LS.get('lastChar');
  if (last) return last;

  // 4) 兜底
  return 'Ghost';
}

// ====== 角色默认数据（同属 141，地点相近） ======
const DEFAULT_DATA = {
  "Ghost": {
    state: { doing:"狙击训练", location:"141 基地 · 射击场", mood:"冷峻专注", affection:65, mind:"检查狙击枪并观察队友。" },
    feed: [ {author:"Ghost", content:"例行训练。", time:"07:30"} ],
    diary:[ {date:"2025-08-18", entry:"Soap 太吵了，但还能忍。"} ]
  },
  "König": {
    state: { doing:"整理装备", location:"141 基地 · 宿舍区", mood:"拘谨安静", affection:45, mind:"低头摆弄迷彩布，尽量不引人注意。"},
    feed: [ {author:"König", content:"风有点大。", time:"09:00"} ],
    diary:[ {date:"2025-08-17", entry:"人群让我不舒服。"} ]
  },
  "Krueger": {
    state: { doing:"清点武器", location:"141 基地 · 军械库", mood:"冷漠克制", affection:30, mind:"目光像刀子，算着下一步。"},
    feed: [ {author:"Krueger", content:"一切照旧。", time:"06:45"} ],
    diary:[ {date:"2025-08-16", entry:"猎杀是我的日常。"} ]
  },
  "Keegan": {
    state: { doing:"侦察简报", location:"141 基地 · 屋顶岗哨", mood:"冷静沉着", affection:55, mind:"望远镜对着远方风切。"},
    feed: [ {author:"Keegan", content:"侦察正常。", time:"10:20"} ],
    diary:[ {date:"2025-08-18", entry:"风声有点怪。"} ]
  }
};

// 每个角色持久化在 localStorage：状态/消息/动态/日记
function loadCharStore(name){
  const seed = DEFAULT_DATA[name] ?? DEFAULT_DATA["Ghost"];
  return LS.get(`sp_${name}`, {
    state: seed.state,
    messages: [
      {from:name, text:"保持通信畅通。", time:"08:00", read:false}
    ],
    feed: seed.feed,
    diary: seed.diary
  });
}
function saveCharStore(name, store){ LS.set(`sp_${name}`, store); }

// ====== 从（可选的）SillyTavern API 尝试拉取状态 ======
async function pullStatusFromST() {
  try {
    const resp = await fetch("/api/character");
    if (!resp.ok) return null;
    const c = await resp.json();
    const s = c?.data?.status;
    if (!s) return null;
    return {
      doing: s.doing ?? "待命中",
      location: s.location ?? "141 基地",
      mood: s.mood ?? "平静",
      affection: Number(s.affection ?? 35),
      mind: s.mind ?? "思绪平稳"
    };
  } catch { return null; }
}

// ====== UI 渲染：状态栏 ======
function renderTopbar(state, charName){
  $('#charName').textContent = charName;
  $('#doingText').textContent = state.doing;
  $('#locationText').textContent = state.location;
  $('#moodText').textContent = state.mood;
  $('#affText').textContent = `${Number(state.affection)||0}%`;
  $('#affBarFill').style.width = `${Number(state.affection)||0}%`;
  $('#mindText').textContent = state.mind ?? '';
}

// ====== UI 渲染：聊天（含已读/未读/红点） ======
function renderMessages(store, settings){
  const list = $('#msgList');
  list.innerHTML = '';
  store.messages.forEach(m=>{
    const wrap = document.createElement('div');
    wrap.className = 'msg' + (m.from==='me'?' me':'');
    wrap.innerHTML = `
      <div class="text">${m.text}</div>
      <div class="meta">
        <span>${m.time}</span>
        ${m.from==='me' && settings.doubleTick ? `<span class="ticks">${m.read?'✓✓':'✓'}</span>`:''}
      </div>`;
    list.appendChild(wrap);
  });
  list.scrollTop = list.scrollHeight;

  // 更新未读徽标
  const unread = store.messages.filter(m=>m.from!=='me' && !m.read).length;
  const badge = $('#badgeChat');
  if (unread>0){ badge.hidden=false; badge.textContent=String(unread);}
  else { badge.hidden=true; }
}

// 进入聊天页时，将对方消息标记已读
function markAllRead(store){
  let changed = false;
  store.messages.forEach(m=>{
    if (m.from!=='me' && !m.read){ m.read = true; changed = true; }
  });
  return changed;
}

// ====== UI 渲染：朋友圈 ======
function renderFeed(store){
  const list = $('#feedList');
  list.innerHTML = '';
  store.feed.forEach((p,i)=>{
    const item = document.createElement('div');
    item.className = 'feed-item';
    item.innerHTML = `
      <div><b>${p.author}</b></div>
      <div>${p.content}</div>
      <div class="feed-meta">
        <span>${p.time}</span>
        <div class="actions">
          <button data-like="${i}">赞 (${p.likes||0})</button>
          <button data-cmt="${i}">评论</button>
        </div>
      </div>
    `;
    list.appendChild(item);
  });

  // 点赞
  list.querySelectorAll('[data-like]').forEach(btn=>{
    btn.onclick = ()=>{
      const i = Number(btn.dataset.like);
      store.feed[i].likes = (store.feed[i].likes||0)+1;
      renderFeed(store);
      saveCharStore(activeChar, store);
    };
  });
  // 评论（简单弹窗）
  list.querySelectorAll('[data-cmt]').forEach(btn=>{
    btn.onclick = ()=>{
      const i = Number(btn.dataset.cmt);
      const text = prompt('评论内容：');
      if(text){
        const prev = store.feed[i].content;
        store.feed[i].content = prev + `\n💬 你：${text}`;
        renderFeed(store);
        saveCharStore(activeChar, store);
      }
    };
  });
}

// ====== UI 渲染：日记 ======
function renderDiary(store){
  const list = $('#diaryList');
  list.innerHTML = '';
  store.diary.slice().reverse().forEach(d=>{
    const card = document.createElement('div');
    card.className = 'diary-card';
    card.innerHTML = `<div class="date">${d.date}</div><div>${d.entry}</div>`;
    list.appendChild(card);
  });
}

// ====== 主题与样式设置 ======
function applySettings(settings){
  document.body.classList.remove('theme-dark','theme-clear','theme-ins-light',
                                 'bubble-blue','bubble-green','bubble-pink','bubble-neutral','bubble-dark');

  if (settings.theme==='dark') document.body.classList.add('theme-dark');
  else if (settings.theme==='clear') document.body.classList.add('theme-clear');
  else document.body.classList.add('theme-ins-light');

  const bubbleClass = 'bubble-' + (settings.bubble||'blue');
  document.body.classList.add(bubbleClass);
}

// ====== 全局状态 ======
let activeChar = getActiveCharacterName();
let store = loadCharStore(activeChar);
let settings = LS.get('sp_settings', { theme:'ins-light', bubble:'blue', doubleTick:true });

// ====== 初始化 ======
window.addEventListener('DOMContentLoaded', async ()=>{
  LS.set('lastChar', activeChar);

  // 可选：从 SillyTavern 拉状态，覆盖默认
  const pulled = await pullStatusFromST();
  if (pulled){
    store.state = { ...store.state, doing:pulled.doing, location:pulled.location, mood:pulled.mood, affection:pulled.affection, mind:pulled.mind };
    saveCharStore(activeChar, store);
  }

  renderTopbar(store
