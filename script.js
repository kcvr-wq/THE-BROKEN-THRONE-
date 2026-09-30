const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const LS = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem('nv_' + k)) ?? d } catch { return d } },
  set: (k, v) => { try { localStorage.setItem('nv_' + k, JSON.stringify(v)) } catch {} }
};
const ch = NOVEL.chapters;
const app = $('#app');
const pad = n => String(n).padStart(2, '0');
const ago = t => { const d = (Date.now() - t) / 864e5; return d < 1 ? 'اليوم' : d < 2 ? 'أمس' : 'قبل ' + Math.floor(d) + ' يوم' };

/* ===== الإعدادات ===== */
const S = Object.assign({ theme: 'dark', size: 20, lh: 2, w: 680, font: 'serif', bionic: false, speed: 2, spoil: true }, LS.get('set', {}));
function applySet() {
  const r = document.documentElement;
  r.dataset.theme = S.theme; r.dataset.font = S.font;
  r.style.setProperty('--fs', S.size + 'px');
  r.style.setProperty('--lh', S.lh);
  r.style.setProperty('--w', S.w + 'px');
  LS.set('set', S);
}
const map = { 's-theme': 'theme', 's-font': 'font', 's-size': 'size', 's-lh': 'lh', 's-w': 'w', 's-speed': 'speed' };
for (const id in map) {
  const el = $('#' + id); el.value = S[map[id]];
  el.oninput = () => { S[map[id]] = el.type === 'range' ? +el.value : el.value; applySet() };
}
$('#s-bionic').checked = S.bionic; $('#s-spoil').checked = S.spoil;
$('#s-bionic').onchange = e => { S.bionic = e.target.checked; applySet(); route() };
$('#s-spoil').onchange = e => { S.spoil = e.target.checked; applySet(); route() };
$('#bset').onclick = () => $('#drawer').hidden = false;
$('#dclose').onclick = () => $('#drawer').hidden = true;
applySet();

/* تصدير واستيراد */
$('#exp').onclick = () => {
  const o = {}; for (const k in localStorage) if (k.startsWith('nv_')) o[k] = localStorage[k];
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(o)], { type: 'application/json' }));
  a.download = 'novel-data.json'; a.click();
};
$('#imp').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  f.text().then(t => { const o = JSON.parse(t); for (const k in o) if (k.startsWith('nv_')) localStorage[k] = o[k]; location.reload() })
    .catch(() => alert('الملف غير صالح'));
};

/* ===== شاشة الدخول ===== */
document.title = NOVEL.title;
$('#sp-title').textContent = NOVEL.title;
$('#sp-by').textContent = 'بقلم ' + NOVEL.author;
$('#logo').textContent = NOVEL.title;
const sp = $('#splash');
function enter() {
  sp.classList.add('open'); sessionStorage.setItem('nv_seen', 1);
  setTimeout(() => sp.classList.add('gone'), 1400);
}
if (sessionStorage.getItem('nv_seen')) sp.classList.add('gone');
$('#enter').onclick = enter;
sp.onkeydown = e => { if (e.key === 'Enter') enter() };
setTimeout(() => $('#enter').focus(), 2600);

/* ===== التوجيه ===== */
const V = { '': home, chapters: chaptersView, read, world };
function route() {
  stopAudio(); stopScroll();
  document.body.classList.remove('focus');
  const [v = '', a, b] = location.hash.slice(2).split('/');
  (V[v] || home)(a, b);
  $$('#top nav a').forEach(x => x.classList.toggle('on', x.getAttribute('href') === '#/' + v));
  const pos = LS.get('pos');
  const r = $('#resume');
  r.hidden = !pos || v === 'read';
  if (pos) { r.href = '#/read/' + pos.ch; r.textContent = 'تابع من الفصل ' + pos.ch }
  if (v !== 'read') window.scrollTo(0, 0);
  $('#rbar').style.width = 0;
}
addEventListener('hashchange', route);

/* ===== الرئيسية ===== */
function home() {
  const pos = LS.get('pos');
  const latest = [...ch].reverse().slice(0, 5);
  app.innerHTML = `
  <section class="hero">
    <div>
      <span class="badge">${NOVEL.status}</span>
      <h1>${NOVEL.title}</h1>
      <p class="by">بقلم ${NOVEL.author}</p>
      <p>${NOVEL.synopsis}</p>
      <div class="tags">${NOVEL.tags.map(t => `<span>${t}</span>`).join('')}</div>
      <div class="cta">
        <a class="btn" href="#/read/${pos ? pos.ch : 1}">${pos ? 'استكمل القراءة' : 'ابدأ القراءة'}</a>
        <button class="btn ghost" id="rnd">فصل عشوائي</button>
      </div>
    </div>
    <div class="cover">${NOVEL.title}</div>
  </section>
  <section class="cols">
    <div>
      <h2>أحدث الفصول</h2>
      <ul class="list">${latest.map(c => `<li><a href="#/read/${c.id}"><span>${c.title}</span><small>${ago(c.ts)}</small></a></li>`).join('')}</ul>
    </div>
    <aside>
      <div class="box"><h3>الفصل القادم بعد</h3><div id="cd"></div></div>
      <div class="box"><h3>${NOVEL.goal.label}: ${NOVEL.goal.pct}%</h3><div class="bar"><i style="width:${NOVEL.goal.pct}%"></i></div></div>
      <div class="box"><h3>ادعم الكاتب</h3><div class="sup">${NOVEL.support.map(s => `<a class="btn ghost" href="${s[1]}" target="_blank" rel="noopener">${s[0]}</a>`).join('')}</div></div>
    </aside>
  </section>`;
  $('#rnd').onclick = () => location.hash = '#/read/' + ch[Math.floor(Math.random() * ch.length)].id;
  tick();
}
function tick() {
  const el = $('#cd'); if (!el) return;
  let t = new Date(NOVEL.next).getTime();
  while (t < Date.now()) t += 6048e5;
  const s = Math.floor((t - Date.now()) / 1000);
  el.textContent = `${Math.floor(s / 86400)} يوم  ${pad(Math.floor(s % 86400 / 3600))}:${pad(Math.floor(s % 3600 / 60))}:${pad(s % 60)}`;
}
setInterval(tick, 1000);

/* ===== الفصول ===== */
let asc = true;
function chaptersView() {
  app.innerHTML = `
  <h2>الفصول</h2>
  <p class="note">${NOVEL.schedule}</p>
  <div class="bar2"><input id="cf" placeholder="ابحث برقم الفصل أو عنوانه"><button class="btn ghost" id="cs"></button></div>
  <div id="cl"></div>`;
  const draw = () => {
    const q = $('#cf').value.trim();
    $('#cs').textContent = asc ? 'من الأقدم' : 'من الأحدث';
    $('#cl').innerHTML = NOVEL.volumes.map((v, i) => {
      let L = ch.filter(c => c.vol === i && (!q || (c.id + c.title).includes(q)));
      if (!asc) L = L.reverse();
      if (!L.length) return '';
      return `<details open><summary>${v}</summary><ul class="list">${L.map(c =>
        `<li><a href="#/read/${c.id}"><span>${c.title}${c.warn ? `<span class="warnb">${c.warn}</span>` : ''}</span><small>${ago(c.ts)}</small></a></li>`).join('')}</ul></details>`;
    }).join('') || '<p class="note">لا توجد نتائج.</p>';
  };
  $('#cf').oninput = draw;
  $('#cs').onclick = () => { asc = !asc; draw() };
  draw();
}

/* ===== القارئ ===== */
const bio = p => !S.bionic ? p : p.replace(/[\u0600-\u06FF]+/g, w => { const n = Math.ceil(w.length / 2); return `<b>${w.slice(0, n)}</b>${w.slice(n)}` });
let cur = null;
function read(id, pId) {
  const c = ch.find(x => x.id == id) || ch[0]; cur = c;
  const i = ch.indexOf(c), prev = ch[i - 1], next = ch[i + 1];
  const bms = (LS.get('bm', {})[c.id]) || [];
  const nav = `<nav class="rn">
    ${next ? `<a class="btn ghost" href="#/read/${next.id}">التالي</a>` : '<span></span>'}
    <select class="jump" aria-label="انتقال إلى فصل">${ch.map(x => `<option value="${x.id}"${x.id === c.id ? ' selected' : ''}>${x.title}</option>`).join('')}</select>
    ${prev ? `<a class="btn ghost" href="#/read/${prev.id}">السابق</a>` : '<span></span>'}
  </nav>`;
  app.innerHTML = `<article class="reader">${nav}
    <h1>${c.title}</h1>
    ${c.warn ? `<p class="warn">تنبيه: ${c.warn}</p>` : ''}
    <p class="rinfo"><span id="pct">0%</span> · <span id="rem"></span></p>
    <div id="txt">${c.text.map((p, k) => `<p id="p${k + 1}"${bms.includes(k + 1) ? ' class="bm"' : ''}><span class="pt">
      <button data-a="link" data-k="${k + 1}" title="نسخ رابط الفقرة" aria-label="نسخ رابط الفقرة">رابط</button>
      <button data-a="bm" data-k="${k + 1}" title="إشارة مرجعية" aria-label="إشارة مرجعية">علامة</button></span>${bio(p)}</p>`).join('')}</div>
    ${nav}</article>
    <div class="rtools">
      <button id="tf">تركيز</button><button id="tfs">ملء الشاشة</button>
      <button id="tas">تمرير تلقائي</button><button id="ttt">قراءة صوتية</button>
    </div>`;
  $$('.jump').forEach(s => s.onchange = () => location.hash = '#/read/' + s.value);
  $('#txt').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    const k = +b.dataset.k;
    if (b.dataset.a === 'link') {
      const u = location.href.split('#')[0] + '#/read/' + c.id + '/p' + k;
      navigator.clipboard?.writeText(u); b.textContent = 'نُسخ';
      setTimeout(() => b.textContent = 'رابط', 1200);
    } else {
      const all = LS.get('bm', {}), a = all[c.id] || [];
      all[c.id] = a.includes(k) ? a.filter(x => x !== k) : [...a, k];
      LS.set('bm', all); b.closest('p').classList.toggle('bm');
    }
  };
  $('#tf').onclick = e => { document.body.classList.toggle('focus'); e.target.classList.toggle('on') };
  $('#tfs').onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
  $('#tas').onclick = e => { autoT ? stopScroll() : startScroll(); e.target.classList.toggle('on', !!autoT) };
  $('#ttt').onclick = e => { speechSynthesis.speaking ? stopAudio() : speak(c); e.target.classList.toggle('on', speechSynthesis.speaking) };
  const pos = LS.get('pos');
  const target = pId && $('#' + pId);
  if (target) setTimeout(() => target.scrollIntoView(), 50);
  else if (pos && pos.ch == c.id) setTimeout(() => scrollTo(0, pos.y), 50);
  else scrollTo(0, 0);
  LS.set('pos', { ch: c.id, y: pos && pos.ch == c.id ? pos.y : 0 });
}

/* التقدم + حفظ الموضع */
let st;
addEventListener('scroll', () => {
  if (!location.hash.startsWith('#/read')) return;
  const h = document.documentElement.scrollHeight - innerHeight;
  const p = h > 0 ? Math.min(1, scrollY / h) : 1;
  $('#rbar').style.width = (p * 100) + '%';
  const pc = $('#pct'); if (pc) pc.textContent = Math.round(p * 100) + '%';
  const rm = $('#rem');
  if (rm && cur) { const w = cur.text.join(' ').split(/\s+/).length; rm.textContent = 'متبقي ' + Math.max(1, Math.ceil(w / 180 * (1 - p))) + ' د' }
  clearTimeout(st);
  st = setTimeout(() => cur && LS.set('pos', { ch: cur.id, y: scrollY }), 400);
}, { passive: true });

/* تمرير تلقائي */
let autoT = 0;
const startScroll = () => { autoT = setInterval(() => scrollBy(0, S.speed), 30) };
const stopScroll = () => { clearInterval(autoT); autoT = 0; $('#tas')?.classList.remove('on') };

/* قراءة صوتية */
function speak(c) {
  const u = new SpeechSynthesisUtterance(c.text.join('. '));
  u.lang = 'ar-SA'; u.rate = 0.6 + S.speed * 0.2;
  u.onend = () => $('#ttt')?.classList.remove('on');
  speechSynthesis.speak(u);
}
function stopAudio() { if ('speechSynthesis' in window) speechSynthesis.cancel() }

/* إيماءات السحب */
let tx, ty;
addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY }, { passive: true });
addEventListener('touchend', e => {
  if (!cur || !location.hash.startsWith('#/read')) return;
  const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
  if (Math.abs(dx) < 90 || Math.abs(dy) > 50) return;
  const t = ch[ch.indexOf(cur) + (dx > 0 ? 1 : -1)];
  if (t) location.hash = '#/read/' + t.id;
}, { passive: true });

/* ===== العالم ===== */
function world() {
  const pos = (LS.get('pos') || { ch: 0 }).ch;
  app.innerHTML = `<h2>عالم الرواية</h2>
  <p class="note">بطاقات الشخصيات. الأسرار تظهر حسب آخر فصل وصلت إليه (الفصل ${pos || 0}).</p>
  <div class="cards">${NOVEL.chars.map(c => `<div class="card"><h3>${c.n}</h3><p>${c.d}</p>
    <p class="spo">${!S.spoil || pos >= c.from ? c.spoiler : 'مخفي حتى تصل إلى الفصل ' + c.from}</p></div>`).join('')}</div>`;
}

/* ===== البحث السريع ===== */
const qs = $('#qs'), qi = $('#qi'), qr = $('#qr');
let sel = 0;
function openQ() { qs.hidden = false; qi.value = ''; qi.focus(); drawQ() }
function closeQ() { qs.hidden = true }
function drawQ() {
  const q = qi.value.trim();
  const items = [
    ...ch.filter(c => !q || (c.id + c.title).includes(q)).map(c => [c.title, '#/read/' + c.id]),
    ...NOVEL.chars.filter(c => q && c.n.includes(q)).map(c => ['شخصية: ' + c.n, '#/world'])
  ].slice(0, 8);
  sel = 0;
  qr.innerHTML = items.map((x, i) => `<li${i ? '' : ' class="sel"'}><a href="${x[1]}">${x[0]}</a></li>`).join('') || '<li><a>لا توجد نتائج</a></li>';
}
qi.oninput = drawQ;
qr.onclick = closeQ;
qs.onclick = e => { if (e.target === qs) closeQ() };
$('#bs').onclick = openQ;
addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openQ() }
  else if (e.key === 'Escape') { closeQ(); $('#drawer').hidden = true }
  else if (!qs.hidden && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
    const L = $$('li', qr); if (!L.length) return;
    L[sel]?.classList.remove('sel');
    sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + L.length) % L.length;
    L[sel].classList.add('sel');
  } else if (!qs.hidden && e.key === 'Enter') {
    const a = $$('li', qr)[sel]?.querySelector('a[href]'); if (a) { location.hash = a.getAttribute('href'); closeQ() }
  }
});

route();
