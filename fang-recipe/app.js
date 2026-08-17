/* ========================================
   Fang的食谱 - 主逻辑
======================================== */

// ===== 数据持久化 =====
const STORAGE_KEY = 'fang_recipes_v1';

// 11 个分类（图标 + 颜色 + 英文 key）
const CATEGORIES = [
  { key: 'home',     name: '首页',    icon: '🏠', color: '#ffd1dc' },
  { key: 'chicken',  name: '鸡肉',    icon: '🍗', color: '#ffe2c5' },
  { key: 'pork',     name: '猪肉',    icon: '🥩', color: '#ffd6c9' },
  { key: 'fish',     name: '鱼肉',    icon: '🐟', color: '#c8e3f0' },
  { key: 'shrimp',   name: '虾类',    icon: '🦐', color: '#ffc8d2' },
  { key: 'crab',     name: '螃蟹',    icon: '🦀', color: '#ffd0b8' },
  { key: 'squid',    name: 'Squid',  icon: '🦑', color: '#d9c2f0' },
  { key: 'veg',      name: '蔬菜',    icon: '🥦', color: '#c5e1a5' },
  { key: 'dimsum',   name: '点心',    icon: '🥟', color: '#fff2b3' },
  { key: 'baking',   name: '烘培',    icon: '🧁', color: '#f9d4e0' },
  { key: 'drink',    name: '饮料',    icon: '🧋', color: '#d6c7e8' },
];

const FOOD_CATEGORIES = CATEGORIES.filter(c => c.key !== 'home');

// ===== 工具函数 =====
function loadRecipes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('读取食谱失败：', e);
    return [];
  }
}

function saveRecipes(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove('show'), 2000);
}

// ===== 状态 =====
let state = {
  currentPage: 'home',
  currentCategory: null,
  currentDetailId: null,
  editingId: null,
  pendingImage: null,
  searchKeyword: '',
};

// ===== 渲染：左侧菜单 =====
function renderMenu() {
  const recipes = loadRecipes();
  const menu = document.getElementById('menu');
  menu.innerHTML = '';

  CATEGORIES.forEach(cat => {
    const item = document.createElement('div');
    item.className = 'menu-item';
    item.dataset.key = cat.key;
    if (cat.key === state.currentCategory) item.classList.add('active');

    const count = cat.key === 'home'
      ? recipes.length
      : recipes.filter(r => r.category === cat.key).length;

    item.innerHTML = `
      <div class="menu-icon" style="background:${cat.color}">${cat.icon}</div>
      <div class="menu-text">${escHtml(cat.name)}</div>
      ${count > 0 ? `<div class="menu-count">${count}</div>` : ''}
    `;
    item.addEventListener('click', () => navigate(cat.key));
    menu.appendChild(item);
  });
}

// ===== 导航 =====
function navigate(key) {
  if (key === 'home') {
    state.currentPage = 'home';
    state.currentCategory = null;
    state.currentDetailId = null;
  } else {
    state.currentPage = 'category';
    state.currentCategory = key;
    state.currentDetailId = null;
    state.searchKeyword = '';
  }
  renderAll();
  document.querySelector('.main').scrollTo({ top: 0, behavior: 'smooth' });
}

function showDetail(id) {
  state.currentPage = 'detail';
  state.currentDetailId = id;
  renderAll();
  document.querySelector('.main').scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== 渲染：主页面切换 =====
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const sel = document.querySelector(`.page[data-page="${page}"]`);
  if (sel) sel.classList.add('active');
}

// ===== 渲染：首页 =====
function renderHome() {
  showPage('home');

  // 分类瓦片
  const grid = document.getElementById('categoryGrid');
  const recipes = loadRecipes();
  grid.innerHTML = FOOD_CATEGORIES.map(cat => {
    const count = recipes.filter(r => r.category === cat.key).length;
    return `
      <div class="cat-tile" data-key="${cat.key}">
        <div class="cat-tile-icon" style="background:${cat.color}">${cat.icon}</div>
        <div class="cat-tile-name">${escHtml(cat.name)}</div>
        <div class="cat-tile-count">${count} 道食谱</div>
      </div>
    `;
  }).join('');
  grid.querySelectorAll('.cat-tile').forEach(t => {
    t.addEventListener('click', () => navigate(t.dataset.key));
  });

  // 最近添加
  const recent = document.getElementById('recentList');
  const sorted = [...recipes].sort((a,b) => b.createdAt - a.createdAt).slice(0, 8);
  if (sorted.length === 0) {
    recent.innerHTML = `<div class="empty">还没有收藏过食谱哦～先去左侧选一个分类加一个吧！</div>`;
  } else {
    recent.innerHTML = sorted.map(r => {
      const cat = CATEGORIES.find(c => c.key === r.category);
      const hasImg = !!r.image;
      return `
        <div class="recent-card" data-id="${r.id}">
          <div class="recent-thumb" style="background:${cat?.color || '#fff2b3'}">
            ${hasImg ? `<img src="${r.image}" alt="">` : (cat?.icon || '🍽️')}
          </div>
          <div>
            <div class="recent-name">${escHtml(r.name)}</div>
            <div class="recent-cat">${cat?.icon || ''} ${escHtml(cat?.name || '其他')}</div>
          </div>
        </div>
      `;
    }).join('');
    recent.querySelectorAll('.recent-card').forEach(c => {
      c.addEventListener('click', () => showDetail(c.dataset.id));
    });
  }
}

// ===== 渲染：分类页 =====
function renderCategory() {
  showPage('category');

  const cat = CATEGORIES.find(c => c.key === state.currentCategory);
  if (!cat) { renderHome(); return; }

  document.getElementById('catIcon').textContent = cat.icon;
  document.getElementById('catName').textContent = cat.name;
  document.getElementById('catSubtitle').textContent = `把所有「${cat.name}」美味都收进这里吧～`;

  const recipes = loadRecipes().filter(r => r.category === cat.key);
  const kw = state.searchKeyword.trim().toLowerCase();
  const filtered = kw
    ? recipes.filter(r =>
        r.name.toLowerCase().includes(kw) ||
        (r.ingredients || '').toLowerCase().includes(kw)
      )
    : recipes;

  document.getElementById('countTag').textContent = `共 ${filtered.length} 道`;

  const grid = document.getElementById('recipeGrid');
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-card">
        <div class="empty-emoji">${recipes.length === 0 ? '🍳' : '🔍'}</div>
        <div>${recipes.length === 0
          ? '还没有食谱，点击右上角<strong>加入食谱</strong>开始记录第一道菜吧～'
          : '没有匹配的食谱，换个关键词试试吧～'}</div>
      </div>
    `;
  } else {
    grid.innerHTML = filtered.map(r => `
      <div class="recipe-card" data-id="${r.id}">
        <div class="recipe-thumb" style="background:${cat.color}">
          ${r.image
            ? `<img src="${r.image}" alt="${escHtml(r.name)}">`
            : `<span style="font-size:80px">${cat.icon}</span>`}
          <div class="recipe-cat-tag">${cat.icon} ${escHtml(cat.name)}</div>
        </div>
        <div class="recipe-body">
          <div class="recipe-name">${escHtml(r.name)}</div>
          <div class="recipe-meta">
            ${r.servings ? `<span>🍽 ${escHtml(r.servings)}</span>` : ''}
            ${r.duration ? `<span>⏱ ${escHtml(r.duration)}</span>` : ''}
            <span style="margin-left:auto">📅 ${formatDate(r.createdAt)}</span>
          </div>
        </div>
      </div>
    `).join('');
    grid.querySelectorAll('.recipe-card').forEach(c => {
      c.addEventListener('click', () => showDetail(c.dataset.id));
    });
  }
}

function formatDate(ts) {
  const d = new Date(ts);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${m}/${day}`;
}

// ===== 渲染：详情页 =====
function renderDetail() {
  showPage('detail');

  const recipes = loadRecipes();
  const r = recipes.find(x => x.id === state.currentDetailId);
  const wrap = document.getElementById('detailContent');

  if (!r) {
    wrap.innerHTML = `
      <div class="empty-card">
        <div class="empty-emoji">😢</div>
        <div>没找到这个食谱…它可能已经被删除啦</div>
      </div>`;
    return;
  }

  const cat = CATEGORIES.find(c => c.key === r.category) || {};
  const hasImg = !!r.image;

  // 食材：按行分割
  const ingHtml = (r.ingredients || '')
    .split('\n').map(l => l.trim()).filter(Boolean)
    .map(l => `• ${escHtml(l)}`).join('\n');

  // 步骤：按行分割成编号
  const stepLines = (r.steps || '')
    .split('\n').map(l => l.trim()).filter(Boolean);
  const stepHtml = stepLines.map(s => `<div class="step-item">${escHtml(s)}</div>`).join('');

  wrap.innerHTML = `
    <div class="detail-card" id="printCard">
      <div class="detail-cover" style="background:${cat.color || '#ffe2e9'}">
        ${hasImg
          ? `<img src="${r.image}" alt="${escHtml(r.name)}">`
          : `<span>${cat.icon || '🍽️'}</span>`}
      </div>
      <div class="detail-info">
        <div class="detail-cat">${cat.icon || ''} ${escHtml(cat.name || '')}</div>
        <h2 class="detail-name">${escHtml(r.name)}</h2>
        <div class="detail-meta">
          ${r.servings ? `<span>🍽 ${escHtml(r.servings)}</span>` : ''}
          ${r.duration ? `<span>⏱ ${escHtml(r.duration)}</span>` : ''}
          <span>📅 ${new Date(r.createdAt).toLocaleDateString('zh-CN')}</span>
        </div>

        ${r.ingredients ? `
        <div class="detail-section">
          <div class="detail-section-title">🥕 食材</div>
          <div class="detail-ingredients">${ingHtml}</div>
        </div>` : ''}

        ${r.steps ? `
        <div class="detail-section">
          <div class="detail-section-title">📝 步骤</div>
          <div class="detail-steps">${stepHtml}</div>
        </div>` : ''}

        ${r.tips ? `
        <div class="detail-section">
          <div class="detail-section-title">💡 小贴士</div>
          <div class="detail-tips">${escHtml(r.tips)}</div>
        </div>` : ''}

        <div class="detail-actions no-print">
          <button class="detail-btn print" id="btnPrint">🖨 打印食谱</button>
          <button class="detail-btn edit" id="btnEdit">✏ 编辑</button>
          <button class="detail-btn del" id="btnDelete">🗑 删除</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btnPrint').addEventListener('click', () => printRecipe(r, cat));
  document.getElementById('btnEdit').addEventListener('click', () => openModal(r.id));
  document.getElementById('btnDelete').addEventListener('click', () => {
    if (confirm(`确定要删除「${r.name}」吗？此操作无法撤销哦`)) {
      const list = loadRecipes().filter(x => x.id !== r.id);
      saveRecipes(list);
      showToast('已删除');
      navigate(state.currentCategory || 'home');
    }
  });
}

// ===== 打印（所见即所得：克隆真实工作台详情 DOM） =====
function printRecipe(r, cat) {
  const area = document.getElementById('printArea');
  const src = document.getElementById('printCard');

  if (!src) {
    showToast('暂时无法打印，请刷新后重试');
    return;
  }

  // 深克隆屏幕上的真实卡片，画面与工作台完全一致
  const clone = src.cloneNode(true);
  clone.id = 'printCardClone';
  clone.classList.remove('no-print');
  // 去掉克隆里的操作按钮
  const actions = clone.querySelector('.detail-actions');
  if (actions) actions.remove();
  // 去掉按钮上遗留的事件监听引用（节点克隆后无监听，仅清理 DOM）
  clone.querySelectorAll('button').forEach(b => b.remove());

  area.innerHTML = '';
  area.appendChild(clone);

  // 等待图片/字体就绪后再调起打印
  setTimeout(() => window.print(), 250);

  // 打印结束后清空（不残留）
  const clearFn = () => {
    area.innerHTML = '';
    window.removeEventListener('afterprint', clearFn);
  };
  window.addEventListener('afterprint', clearFn);
}

// ===== 模态框（添加/编辑） =====
function openModal(editId = null) {
  state.editingId = editId;
  state.pendingImage = null;

  const modal = document.getElementById('modalMask');
  const sel = document.getElementById('fCategory');

  // 填充分类下拉框
  sel.innerHTML = FOOD_CATEGORIES.map(c =>
    `<option value="${c.key}">${c.icon} ${c.name}</option>`
  ).join('');

  // 重置
  document.getElementById('fName').value = '';
  document.getElementById('fServings').value = '';
  document.getElementById('fDuration').value = '';
  document.getElementById('fIngredients').value = '';
  document.getElementById('fSteps').value = '';
  document.getElementById('fTips').value = '';
  document.getElementById('uploadPreview').innerHTML = '<span class="upload-tip">点击上传照片</span>';

  if (editId) {
    const r = loadRecipes().find(x => x.id === editId);
    if (r) {
      document.getElementById('modalTitle').textContent = '编辑食谱';
      document.getElementById('fName').value = r.name || '';
      document.getElementById('fCategory').value = r.category || FOOD_CATEGORIES[0].key;
      document.getElementById('fServings').value = r.servings || '';
      document.getElementById('fDuration').value = r.duration || '';
      document.getElementById('fIngredients').value = r.ingredients || '';
      document.getElementById('fSteps').value = r.steps || '';
      document.getElementById('fTips').value = r.tips || '';
      if (r.image) {
        state.pendingImage = r.image;
        document.getElementById('uploadPreview').innerHTML = `<img src="${r.image}" alt="">`;
      }
    }
  } else {
    document.getElementById('modalTitle').textContent = '加入食谱';
    document.getElementById('fCategory').value = state.currentCategory || FOOD_CATEGORIES[0].key;
  }

  modal.classList.add('show');
}

function closeModal() {
  document.getElementById('modalMask').classList.remove('show');
  state.editingId = null;
  state.pendingImage = null;
}

function handleImageUpload(file) {
  if (!file || !file.type.startsWith('image/')) {
    showToast('请选择图片文件哦～');
    return;
  }

  // 压缩到合适尺寸
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const maxW = 800;
      let w = img.width, h = img.height;
      if (w > maxW) {
        h = h * (maxW / w);
        w = maxW;
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      state.pendingImage = dataUrl;
      document.getElementById('uploadPreview').innerHTML = `<img src="${dataUrl}" alt="">`;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function saveRecipe() {
  const name = document.getElementById('fName').value.trim();
  if (!name) {
    showToast('请填写菜名哦 🍽');
    return;
  }

  const data = {
    name,
    category: document.getElementById('fCategory').value,
    servings: document.getElementById('fServings').value.trim(),
    duration: document.getElementById('fDuration').value.trim(),
    ingredients: document.getElementById('fIngredients').value,
    steps: document.getElementById('fSteps').value,
    tips: document.getElementById('fTips').value,
    image: state.pendingImage,
  };

  const list = loadRecipes();
  if (state.editingId) {
    const idx = list.findIndex(x => x.id === state.editingId);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...data, updatedAt: Date.now() };
      saveRecipes(list);
      showToast('已更新 ✿');
      closeModal();
      showDetail(state.editingId);
      return;
    }
  }

  // 新增
  list.push({
    id: uid(),
    ...data,
    createdAt: Date.now(),
  });
  saveRecipes(list);
  showToast('已添加到食谱集 ✿');
  closeModal();
  renderAll();
}

// ===== 全部渲染入口 =====
function renderAll() {
  renderMenu();
  if (state.currentPage === 'home') renderHome();
  else if (state.currentPage === 'category') renderCategory();
  else if (state.currentPage === 'detail') renderDetail();
}

// ===== 事件绑定 =====
function bindEvents() {
  // 加入食谱按钮
  document.getElementById('addRecipeBtn').addEventListener('click', () => openModal());

  // 模态框关闭
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalCancel').addEventListener('click', closeModal);
  document.getElementById('modalMask').addEventListener('click', e => {
    if (e.target.id === 'modalMask') closeModal();
  });

  // 保存
  document.getElementById('modalSave').addEventListener('click', saveRecipe);

  // 图片上传
  const fileInput = document.getElementById('fImageFile');
  const preview = document.getElementById('uploadPreview');
  preview.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', e => {
    const f = e.target.files[0];
    if (f) handleImageUpload(f);
    fileInput.value = '';
  });

  document.getElementById('clearImage').addEventListener('click', () => {
    state.pendingImage = null;
    document.getElementById('uploadPreview').innerHTML = '<span class="upload-tip">点击上传照片</span>';
  });

  // 搜索
  document.getElementById('searchInput').addEventListener('input', e => {
    state.searchKeyword = e.target.value;
    renderCategory();
  });

  // 返回按钮
  document.getElementById('backBtn').addEventListener('click', () => {
    if (state.currentCategory) navigate(state.currentCategory);
    else navigate('home');
  });

  // ESC 关闭模态框
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const m = document.getElementById('modalMask');
      if (m.classList.contains('show')) closeModal();
    }
  });
}

// ===== 初始化 =====
function init() {
  bindEvents();
  renderAll();
}

// 如果是首次访问，插入一些示例数据（用 localStorage 已经存在则跳过）
function seedIfEmpty() {
  if (loadRecipes().length > 0) return;

  const samples = [
    {
      name: '妈妈的红烧鸡',
      category: 'chicken',
      servings: '3 人份',
      duration: '40 分钟',
      ingredients: '鸡腿 500g\n生姜 4 片\n大蒜 5 瓣\n生抽 2 勺\n老抽 1 勺\n冰糖 15g\n料酒 1 勺',
      steps: '鸡腿洗净切块，冷水下锅加姜片焯水去腥\n热锅冷油，放冰糖小火炒至焦糖色\n放入鸡块翻炒上色，加生抽老抽料酒\n加水没过鸡块，大火烧开转小火焖 25 分钟\n大火收汁，撒葱花出锅',
      tips: '冰糖炒色的时候要小火，不然会发苦',
      icon: '🍗',
    },
    {
      name: '蜂蜜黄油吐司',
      category: 'baking',
      servings: '2 人份',
      duration: '15 分钟',
      ingredients: '厚吐司 2 片\n黄油 20g\n蜂蜜 2 勺\n盐 少许',
      steps: '吐司表面抹上软化的黄油\n平底锅小火煎至两面金黄\n淋上蜂蜜，撒少许盐\n配上水果或一杯牛奶就是完美早餐',
      tips: '吐司切厚一点口感更棒',
      icon: '🍞',
    },
    {
      name: '蜜桃乌龙茶',
      category: 'drink',
      servings: '1 杯',
      duration: '10 分钟',
      ingredients: '乌龙茶 300ml\n蜜桃果肉 50g\n蜂蜜 1 勺\n柠檬 2 片\n冰块 适量',
      steps: '乌龙茶提前泡好放凉\n蜜桃切丁，加少许蜂蜜腌 5 分钟\n杯中放入冰块、蜜桃、柠檬片\n倒入乌龙茶，搅拌均匀',
      tips: '用新鲜水蜜桃风味最好',
      icon: '🧋',
    },
  ];

  const seeded = samples.map((s, i) => ({
    id: 'sample_' + i,
    ...s,
    image: null,
    createdAt: Date.now() - (3 - i) * 86400000,
  }));
  saveRecipes(seeded);
}

seedIfEmpty();
init();
