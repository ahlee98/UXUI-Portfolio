// 인트로 → 원형 배치 → 아래로 내려와 호(arc)로 회전. 데이터는 content.json(= content/*.md).
// 위치 계산은 render()가 매 프레임 담당하고, GSAP는 상태 값(S, 각 프로젝트의 k)만 움직인다.
import { mountPhone } from './phone.js?v=e41fda37';
import { createLensGL } from './lensgl.js?v=e41fda37';
const { home, projects } = await (await fetch('./content.json', { cache: 'no-store' })).json();
const filters = (home.filters ?? '').split(' / ').filter(Boolean).map(s => { const [name, color] = s.split('='); return { name: name.trim(), color: color?.trim() }; });
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TAU = Math.PI * 2, n = projects.length;

const $ = id => document.getElementById(id);
const ring = $('ring'), center = $('center'), word = $('word'), filterNav = $('filters');

// ── 요소 만들기 ────────────────────────────────
const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), WHITE = [255, 255, 255];
const local = e => { const r = e.currentTarget.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; };
const orbs = projects.map((p, i) => {
  const el = document.createElement('button');
  el.className = 'orb'; el.setAttribute('aria-label', `${p.title} — ${p.category ?? ''}`);
  el.innerHTML = `<span class="ph"><img src="${p.image}" alt=""></span><canvas class="lens"></canvas>`; // ph: 원형 마스크, 이미지는 카드 비율로 가운데만 보인다
  ring.append(el);
  const o = { el, p, rgb: hexRGB(filters.find(f => f.name === p.category)?.color ?? '#dddddd'), img: el.querySelector('img'), lens: el.querySelector('.lens'), tx: 0.5, ty: 0.5, lx: 0.5, ly: 0.5, base: i / n * TAU, k: 0, f: 1, fTarget: 1, h: 0, hover: false, category: p.category };
  el.addEventListener('pointerenter', e => { o.hover = true; o.tx = o.lx = local(e).x; o.ty = o.ly = local(e).y; });
  el.addEventListener('pointermove', e => {               // 마우스를 빠르게 움직이면 그 방향으로 툭 치듯 출렁인다
    const l = local(e); o.tx = l.x; o.ty = l.y;
    if (o.srcN) {
      o.wx += e.movementX * JELLY.kick * 60; o.wy += e.movementY * JELLY.kick * 60;
      const w = Math.hypot(o.wx, o.wy); if (w > 10) { o.wx *= 10 / w; o.wy *= 10 / w; } // 너무 세게 튀지 않게
    }
  });
  el.addEventListener('pointerleave', () => o.hover = false);
  return o;
});
// 필터 버튼: 마우스를 올리면 글자가 위로 굴러 같은 글자로 바뀌고(나가면 되돌아옴), 올려 둔 동안 글자가 커서 쪽으로 위아래로만 살짝 끌려온다
const buttons = filters.map(f => {
  const b = document.createElement('button');
  b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label', f.name);
  b.innerHTML = `<span class="mag" aria-hidden="true"><span class="roll"><span>${f.name}</span><span>${f.name}</span></span></span>`;
  b.addEventListener('click', () => setFilter(active === f ? null : f));
  filterNav.append(b);
  rollButton(b);
  return b;
});
function rollButton(b) {                        // 필터·Next Project 버튼 공통: 글자 굴림 + 세로 끌림
  const mag = b.querySelector('.mag'), roll = b.querySelector('.roll'), clone = roll.lastElementChild;
  const toY = gsap.quickTo(mag, 'y', { duration: 0.9, ease: 'power3.out' }); // 끌림은 세로로만
  b.addEventListener('pointerenter', () => gsap.to(roll, { y: -clone.offsetTop, duration: 0.9, ease: 'expo.out', overwrite: true }));
  b.addEventListener('pointermove', e => {
    const r = b.getBoundingClientRect();
    toY((e.clientY - r.top - r.height / 2) * 0.12);
  });
  b.addEventListener('pointerleave', () => {
    gsap.to(roll, { y: 0, duration: 0.9, ease: 'expo.out', overwrite: true });
    gsap.to(mag, { y: 0, duration: 1.4, ease: 'elastic.out(1, 0.6)', overwrite: true });
  });
}
// ── 필터: 누를 때마다 지정 배경색. 같은 필터를 다시 누르면 전체 ───
let active = null;
const PAGE = '#ffffff'; // 필터를 끈 기본 배경
document.body.style.setProperty('--page', PAGE);
const bgLayer = $('bgLayer');
function setFilter(f) {
  active = f;
  const color = f?.color ?? PAGE;
  if (f) document.body.style.setProperty('--bg', f.color); else document.body.style.removeProperty('--bg');
  buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(filters[i] === f)));
  orbs.forEach(o => o.fTarget = !f || o.category === f.name ? 1 : 0);
  thumbBtns.forEach((b, i) => b.hidden = !orbs[i].fTarget);
  if (selected) sizeThumbs();
  if (selected && !selected.fTarget) { const first = orbs.find(o => o.fTarget) ?? selected; selected = null; select(first); } // 펼친 상태에서 필터를 바꾸면 그 분야 첫 프로젝트로
  else if (selected) S.ci = orbs.filter(o => o.fTarget).indexOf(selected);   // 목록이 바뀌었으니 가운데 번호 다시 맞춤
  // 새 배경색 면이 아래에서 위로 덮고, 다 덮으면 페이지 배경으로 바꾼 뒤 아래 깔린 면들은 지운다
  const panel = document.createElement('div'); panel.style.background = color; bgLayer.append(panel);
  gsap.fromTo(panel, { clipPath: 'inset(100% 0 0 0)' }, {
    clipPath: 'inset(0% 0 0 0)', duration: reduce ? 0 : 0.9, ease: 'expo.inOut',
    onComplete: () => { document.body.style.setProperty('--page', color); while (panel.previousSibling) panel.previousSibling.remove(); panel.remove(); },
  });
}

// ── 레이아웃 ───────────────────────────────────
// m = 0: 화면 가운데 원형 배치 / m = 1: 원이 내려가 위쪽 호만 보이는 배치
const S = { m: 0, rot: 0, speed: 0, run: 0, caps: 0, z: 0, reveal: 0 }; // z: 펼침 정도(0 호 ↔ 1 타원 상세)
const lerp = (a, b, t) => a + (b - a) * t;
const wrap = (v, len) => len > 2 ? ((v % len) + len * 1.5) % len - len / 2 : v; // 순환 목록에서 가장 가까운 거리(-len/2 ~ len/2)
const smooth = t => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
const gentle = t => { t = Math.min(1, Math.max(0, t)); return t * t * t * (t * (6 * t - 15) + 10); }; // 시작·끝이 더 부드러운 곡선
const GAP = 1.15;
const SIDE_OPACITY = 0.5; // 펼쳤을 때 양옆 카드의 불투명도
const THUMB_SIZES = { desktop: [88, 64, 48], mobile: [52, 40, 32] }; // 썸네일 크기: 고른 것 · 바로 옆 · 그 밖
// 세로형 작은 화면(휴대폰·아이패드 세로): 호 없이 펼친 화면이 기본
const isCompact = () => innerWidth <= 1024 && innerHeight > innerWidth * 1.15;
let compact = isCompact();
// 원형 호 없이 인트로 뒤 바로 펼친 화면(가운데 카드 · 양옆 카드 · 썸네일)으로 시작. 프로젝트가 6개 정도라 호보다 펼친 화면이 낫다
const NO_RING = true;
const flat = () => compact || NO_RING;          // 펼친 화면 고정 모드(접히는 호가 없음)
const PILL_TOP = 220; // 펼친 상태 이름 알약의 위 끝 y(px). 카드·썸네일은 그 아래로 이어진다(알약–카드 간격 48px, 카드 위치는 그대로)
const SHRINK = 0.45; // 위로 끝까지 스크롤했을 때 줄어드는 정도(0.45 → 기본의 55% 크기) // 원 중심 간 거리 ÷ 원 크기 (작을수록 촘촘)
function layout() {
  const w = innerWidth, h = innerHeight, short = Math.min(w, h);
  const circle = { cx: w / 2, cy: h / 2, R: short * 0.36, size: short * 0.13 };
  // 위에서부터: 타이틀 → 필터 → 원
  const head = word.getBoundingClientRect().height, filtersH = filterNav.offsetHeight || 40;
  const titleY = 40 + head / 2; // 위 여백 40px
  const below = titleY + head / 2 + 24 + filtersH;          // 필터 아래 끝
  let arc;
  if (h > w * 1.2) {
    // 세로 화면(모바일): 호 대신 원 전체를 남은 공간 가운데에 둔다
    // 원 사이 간격(중심 간 거리)은 원 크기에 맞춰 두고, 개수가 줄면 원(R)이 작아진다
    const R = Math.min(w * 0.44, (h - below) * 0.42), size = Math.min(TAU * R / n * 0.92, R * 0.62);
    const cy = below + (h - below) * 0.55;                  // 남은 공간 가운데보다 살짝 아래
    arc = { cx: w / 2, cy, R, size, titleY, full: true };
  } else {
    // 원 크기를 먼저 정하고, 원 사이 간격(중심 간 거리 = 크기 × GAP)이 일정하도록 개수에 맞춰 호의 반지름을 정한다
    const size = Math.min(Math.max(w * 0.21, 120), 360), R = Math.max(n * size * GAP / TAU, w * 0.3);
    const top = below + 56 + h * 0.1 + size / 2;              // 호의 꼭대기(가운데 원의 중심) 높이. h * 0.1 = 필터 아래로 더 내리는 여백
    arc = { cx: w / 2, cy: top + R, R, size, titleY };
  }
  // 펼친 상태: 이름 알약 → 카드 → 썸네일 목록. 데스크톱은 알약 위 끝을 PILL_TOP에, 세로형 작은 화면은 필터 아래 남은 공간 가운데에
  const small = innerWidth <= 640, thumbsH = thumbSizes()[0];
  const pillFont = compact ? Math.min(Math.max(w * 0.048, 16), 28) : Math.min(Math.max(w * 0.022, 20), 34), pillH = pillFont * 1.6; // styles.css .hero-title 글자 크기와 같은 식
  const RATIO = 2 / 3;                                                              // 카드(=사진) 비율 3:2
  let GAPY = 48, THUMB_GAP = 60, W, H, top0;  // GAPY: 이름 알약 아래 끝 → 카드 위 끝
  if (compact) {
    // 세로형 화면: 가운데 카드는 크게, 이름 알약은 카드 바로 위. 이전·다음 카드는 위·아래에 작게(세로로 넘겨 탐색)
    W = Math.min(w * 0.8, 680); H = W * RATIO;
    const midY = below + (h - below) * 0.5;
    top0 = midY - H / 2 - 16 - pillH;                                               // 이름 알약은 카드 바로 위(간격 16)
  } else {
    W = Math.min(w * 0.36, 700); H = W * 0.66; top0 = Math.max(PILL_TOP, below + 20);
    const room = h - 32 - top0 - (pillH + GAPY + THUMB_GAP + thumbsH);              // 화면 안에 다 들어오도록 카드 높이 제한
    if (H > room) { H = Math.max(140, room); W = Math.min(W, H / 0.66); }
  }
  document.body.classList.toggle('compact', compact);
  const cardTop = compact ? top0 + pillH + 16 : top0 + pillH + GAPY;
  document.documentElement.style.setProperty('--ar', W / H);   // 이미지 비율 = 펼친 카드 비율(원·카드 모두 같은 자르기)
  const hero = { cx: w / 2, cy: cardTop + H / 2, W, H, SP: W * 1.18, SPV: H * 0.86 + pillH + 56, clipTop: below + 8, titleY: top0 + pillH / 2, thumbsY: cardTop + H + THUMB_GAP + thumbsH / 2 };
  return { w, h, circle, arc, hero, base: arc.size };
}
let L = layout();
addEventListener('resize', () => { L = layout(); if (selected) sizeThumbs(); orbs.forEach(o => { o.el.style.width = o.el.style.height = L.base + 'px'; }); });
orbs.forEach(o => { o.el.style.width = o.el.style.height = L.base + 'px'; });

// ── 매 프레임 그리기 ───────────────────────────
function render(_, dt) {
  dt = Math.min(dt, 50) / 1000;
  const { circle: c, arc: a, w, h } = L, m = S.m;
  let cx = lerp(c.cx, a.cx, m), cy = lerp(c.cy, a.cy, m), R = lerp(c.R, a.R, m), size = lerp(c.size, a.size, m);
  // 위로 스크롤(z < 0): 호와 원이 기본보다 작아진다. 호의 꼭대기 높이는 그대로(세로 화면은 원 중심 기준)
  const sh = 1 + SHRINK * Math.max(-1, Math.min(0, S.z));
  if (sh < 1) { if (!a.full) cy -= R * (1 - sh); R *= sh; size *= sh; }
  const off = Math.hypot(w, h) * 0.75;                  // 날아 들어오기 전 거리(화면 밖)

  // 왼쪽으로 자동 회전. 올려 둔 프로젝트가 있으면 거의 멈춘다
  if (!zTween) { S.z = lerp(S.z, zT, 1 - Math.exp(-dt * 7)); if (Math.abs(S.z - zT) < 0.0005) S.z = zT; } // 펼침·접힘은 zTween(시간 기반), 위로 줄어드는 건 스크롤을 따라감
  const zp = Math.max(0, S.z), ez = zp * zp * (3 - 2 * zp); // 펼침(부드럽게)
  if (S.z === 0 && zT === 0 && selected) selected = null;
  const hovering = orbs.some(o => o.hover);
  S.speed = lerp(S.speed, holdSpin ? 0 : S.run * (1 - Math.max(0, S.z)) * (hovering ? 0.006 : 0.07), 1 - Math.exp(-dt * (holdSpin ? 8 : 1.5))); // 가운데로 데려오는 동안·펼친 동안은 멈춤, 접히면 천천히 다시 회전
  S.rot -= S.speed * dt;

  for (const o of orbs) {
    o.f = lerp(o.f, o.fTarget, 1 - Math.exp(-dt * 6));
    o.h = lerp(o.h, o.hover && S.z < 0.05 && !holdSpin ? 1 : 0, 1 - Math.exp(-dt * (holdSpin ? 24 : 6)));
    const swirl = (1 - o.k) * 0.9;                       // 들어올 때 살짝 휘감기며 자리 잡기
    const t = o.base + S.rot + swirl, cos = Math.cos(t);
    const spread = 1 + 0.9 * ez;                         // 펼치면 호가 바깥으로 퍼진다(꼭대기 높이는 유지)
    const r = (R + (1 - o.k) * off) * spread;
    const x = cx + r * Math.sin(t), y = cy + R * (spread - 1) - r * cos;
    const depth = 0.42 + 0.58 * ((1 + cos) / 2) ** 2;    // 꼭대기일수록 크게
    const scale = size / L.base * lerp(1, depth, m) * (0.82 + 0.18 * o.f) * (1 + 0.08 * o.h);
    o.el.style.transform = `translate(${x - L.base / 2}px, ${y - L.base / 2}px) scale(${scale})`;
    o.el.style.opacity = flat() || (o === selected && S.z > 0.001) ? 0 : Math.min(1, o.k * 1.6) * (0.16 + 0.84 * o.f) * (1 - ez); // 세로형은 호를 쓰지 않는다
    o.x = x; o.y = y; o.d = L.base * scale;
    const live = !flat() && S.z < 0.05;                // 원이 보일 때만 누를 수 있다(펼친 상태에선 보이지 않는 원이 카드 클릭을 가로채지 않게)
    if (o.live !== live) { o.live = live; o.el.style.pointerEvents = live ? '' : 'none'; }
    o.el.style.zIndex = Math.round(cos * 100) + 100;
    o.cos = cos;
    if (o.h > 0.01 || !settled(o)) drawLens(o, dt); else if (o.lensOn) { o.lens.style.opacity = 0; o.img.style.opacity = 1; o.lensOn = false; }
  }
  center.style.transform = `translate(-50%, -50%) translateY(${lerp(L.h / 2, L.arc.titleY, m)}px)`;
  // 올린 프로젝트의 키컬러로 화면 배경을 바꾼다(접힌 상태는 원, 펼친 상태는 가운데 카드)
  const tinted = !!active || (HOVER_BG && !!hoverP);              // 배경이 키컬러인 상태(필터·마우스 올림) → 이름 알약을 검정으로
  if (tinted !== document.body.classList.contains('tinted')) document.body.classList.toggle('tinted', tinted);
  if (HOVER_BG) {
    const hp = !canHover ? null : orbs.find(o => o.hover && S.z < 0.05)?.p ?? (CL.over ? selected?.p : null);
    if (hp !== hoverP) {
      hoverP = hp;
      if (hp) hoverBg.style.backgroundColor = filters.find(f => f.name === hp.category)?.color ?? '#eee';
      hoverBg.style.opacity = hp ? 1 : 0;
    }
  }
  // 지금 기준 프로젝트: 마우스를 올린 것, 없으면 꼭대기에 가장 가까운 것(필터에 맞는 것 중) — 스크롤로 펼칠 때 연다
  const pick = selected ?? orbs.find(o => o.hover) ?? orbs.filter(o => o.fTarget).reduce((a, b) => (b.cos > a.cos ? b : a), { cos: -2 });
  if (S.caps > 0 && pick.p && pick !== focused) showFocus(pick);
  scrollHint.style.opacity = flat() ? 0 : 0.35 * S.caps * (1 - ez) * (1 + Math.min(0, S.z));   // 접힌 상태에서만(펼치거나 줄어들면 사라짐)
  // 펼침: 고른 프로젝트 카드는 원의 현재 자리·크기에서 가운데 알약으로 커지고, 나머지 카드는 양옆에 줄지어 나타난다.
  // 카드 위치는 연속 번호 S.ci 기준(목록에서 고르면 S.ci가 움직여 카드들이 옆으로 밀려 지나간다).
  if (selected && S.z > 0.001) {
    const T = L.hero, list = orbs.filter(o => o.fTarget), SP = T.SP;
    const p1 = flat() ? 1 : gentle(S.z / 0.6), p2 = flat() ? 1 : gentle((S.z - 0.35) / 0.65); // ① 커지기 ② 옆으로 늘어나기(겹쳐서 이어지게, 양옆 카드도 이때 나타남)
    for (const o of orbs) {
      const j = list.indexOf(o), c = o.card;
      const kk = j < 0 ? 99 : wrap(j - S.ci, list.length), a = Math.min(1, Math.abs(kk)); // 목록은 순환: 첫 프로젝트 왼쪽엔 마지막 프로젝트
      if (Math.abs(kk) > 2.4) { if (c.style.opacity !== '0') c.style.opacity = 0; continue; }
      let x = T.cx + kk * SP, y = T.cy, ww = T.W, hh = T.H, rot = -Math.max(-1.5, Math.min(1.5, kk)) * 18, sc = 1 - 0.08 * a;
      if (compact) { x = T.cx; y = T.cy + kk * T.SPV; rot = 0; sc = 1 - 0.3 * a; }   // 세로형: 위·아래로 쌓고 옆 카드는 작게
      let op = lerp(1, SIDE_OPACITY, a) * (o === selected ? 1 : p2);
      if (o === selected) {
        // 두 단계: ① 원 그대로 커지며 가운데로(지름 → 카드 높이) ② 그 자리에서 옆으로 늘어나 알약 카드가 된다. 접을 땐 반대로
        const dd = lerp(o.d, hh, p1);
        x = lerp(o.x, x, p1); y = lerp(o.y, y, p1); ww = lerp(dd, ww, p2); hh = dd; rot *= p2; sc = lerp(1, sc, p2);
      }
      c.style.width = ww + 'px'; c.style.height = hh + 'px';
      const ih = hh, iw = T.W * hh / T.H;                               // 이미지는 카드 비율 그대로 현재 높이에 맞추고, 가로는 마스크로만 열고 닫는다
      if (c.iw !== iw) { c.iw = iw; c.img.style.width = iw + 'px'; c.img.style.height = ih + 'px'; }
      c.style.borderRadius = Math.min(ww, hh) / 2 + 'px';     // 사각형에 r을 최대로 준 형태(정사각일 땐 원)
      if (flat()) { y += (1 - S.reveal) * 40; op *= S.reveal; }           // 펼친 화면 고정: 인트로 뒤 아래에서 올라오며 나타난다
      c.style.transform = `translate3d(${x - ww / 2}px, ${y - hh / 2}px, 0) rotateY(${rot}deg) scale(${sc})`;
      c.style.opacity = op; c.style.filter = a > 0.01 ? `grayscale(${a})` : '';
      c.style.zIndex = 10 - Math.round(Math.abs(kk) * 2);
      const clickable = S.z > 0.95 && op > 0.1 && (o === selected || a > 0.5); // 가운데 카드(상세)·양옆 카드(넘기기)를 누를 수 있다
      c.classList.toggle('is-center', o === selected);
      if (c.clickable !== clickable) { c.clickable = clickable; c.style.pointerEvents = clickable ? 'auto' : 'none'; }
    }
    cardLens(dt);
    cardsEl.style.clipPath = compact ? `inset(${T.clipTop}px 0 0 0)` : '';   // 세로형: 위 카드가 타이틀·필터를 덮지 않게
    const show = flat() ? S.reveal : smooth((S.z - 0.6) / 0.4);
    heroTitle.style.opacity = show;
    heroTitle.style.transform = `translateY(${T.titleY + (1 - show) * 24}px)`;
    thumbs.style.opacity = show;
    thumbs.style.transform = `translate(-50%, -50%) translateY(${T.thumbsY + (1 - show) * 24}px)`;
    thumbs.classList.toggle('on', S.z > 0.9);
  } else if (cardsOn) {
    cardsOn = false; orbs.forEach(o => { o.card.style.opacity = 0; o.card.style.visibility = ''; }); CL.canvas.remove(); heroTitle.style.opacity = 0; thumbs.style.opacity = 0; thumbs.classList.remove('on');
  }
  if (selected && S.z > 0.001) cardsOn = true;
}
center.style.top = '0';
const scrollHint = $('scrollHint');
const hoverBg = $('hoverBg'); let hoverP = null;
let focused = null;
function showFocus(o) { focused = o; }         // 꼭대기(또는 마우스를 올린) 프로젝트 기억: 스크롤로 펼칠 때 이 프로젝트를 연다
// ── 볼록렌즈 + 젤리 형태: 마우스를 올린 원은 커서 자리가 부풀고(1차 hello 렌즈와 같은 방식), 원 테두리가 커서 쪽으로 늘어난다 ──
// 원 이미지를 캔버스에 한 번 그려 두고(srcPx), 매 프레임 픽셀마다 ① 늘어난 형태 안인지 ② 이미지의 어느 점을 보여 줄지 계산한다.
const lensGL = createLensGL();   // 그래픽 카드로 렌즈·출렁임을 그린다(없으면 아래 CPU 방식으로 대신)
const DPR = lensGL ? Math.min(devicePixelRatio || 1, 2) : 1; // GPU면 레티나 해상도로, CPU면 1배
const LENS_MIN = 0.45; // 렌즈 가운데 배율의 역수(0.45 ≈ 2.2배 확대, 작을수록 크게 부풂)
const LENS_ON = true;  // 볼록렌즈 확대 사용 여부
const STRETCH = 0.22;  // 테두리가 커서 쪽으로 늘어나는 정도(원 반지름 대비)
const JELLY = { stiff: 90, damp: 9, kick: 0, ripple: 0 }; // 출렁임: 탄성 · 감쇠(작을수록 오래 출렁) · 마우스 속도가 주는 충격 · 테두리 물결 세기
const SHAPE_PAD = 0.22; // 늘어난 형태가 들어갈 여백(원 크기 대비, 캔버스는 원보다 이만큼 크다. styles.css .orb .lens와 같이)
const HOVER_BG = true; // true: 올리면 배경이 키컬러, 둘레 번짐은 흰색 / false: 배경 그대로, 둘레 번짐이 키컬러
const HALO = { size: 0.16, soft: 0.22, alpha: 0, loose: 1.6 }; // alpha 0 = 둘레 번짐 끔(되살리려면 0.85) // 키컬러 번짐: 크기(반지름 대비) · 가장자리 부드러움 · 진하기 · 형태보다 더 출렁이는 정도
function lensSource(o) {
  const N = Math.round(L.base * DPR);
  if (o.srcN === N || !o.img.complete || !o.img.naturalWidth) return o.srcN === N;
  const c = Object.assign(document.createElement('canvas'), { width: N, height: N }), g = c.getContext('2d');
  const ar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ar')) || 1.5;
  const iw = o.img.naturalWidth, ih = o.img.naturalHeight, k = Math.max(N * ar / iw, N / ih); // 카드 비율로 자른 뒤 가운데(원과 같은 자르기)
  g.drawImage(o.img, (N - iw * k) / 2, (N - ih * k) / 2, iw * k, ih * k);
  o.srcCanvas = c; o.srcN = N; if (!lensGL) o.srcPx = g.getImageData(0, 0, N, N).data;
  const M = Math.round(N * (1 + SHAPE_PAD * 2));
  o.lens.width = o.lens.height = M; o.ctx = o.lens.getContext('2d'); if (!lensGL) o.out = new ImageData(M, M);
  o.vx = o.vy = o.wx = o.wy = 0; // 늘어남 벡터와 그 속도(스프링)
  return true;
}
function drawLens(o, dt) {
  if (!lensSource(o)) return;
  const N = o.srcN, src = o.srcPx, out = o.out?.data, M = o.lens.width, C = M / 2, R = N / 2, k = o.h, rgb = HOVER_BG ? WHITE : o.rgb;
  o.lx += (o.tx - o.lx) * 0.12; o.ly += (o.ty - o.ly) * 0.12;          // 렌즈는 커서를 부드럽게 따라온다
  // 늘어남: 원 중심 → 커서 방향 벡터를 스프링으로 따라가서, 나가면 출렁이며 원으로 돌아온다
  const gx = o.hover ? (o.tx - 0.5) * 2 : 0, gy = o.hover ? (o.ty - 0.5) * 2 : 0;
  o.wx += ((gx - o.vx) * JELLY.stiff - o.wx * JELLY.damp) * dt; o.wy += ((gy - o.vy) * JELLY.stiff - o.wy * JELLY.damp) * dt;
  o.vx += o.wx * dt; o.vy += o.wy * dt;
  // 테두리 물결: 늘어남이 빠르게 변할수록 커지고, 시간이 지나면 잦아든다(세 갈래로 일렁이는 모양)
  o.rip = (o.rip || 0) * Math.exp(-dt * 2.2) + Math.min(1, Math.hypot(o.wx, o.wy) * 0.02) * dt * 6;
  o.ph = (o.ph || 0) + dt * 14;
  const B = JELLY.ripple * Math.min(o.rip, 1) * Math.sin(o.ph);
  const mag = Math.hypot(o.vx, o.vy), ux = mag ? o.vx / mag : 0, uy = mag ? o.vy / mag : 0, A = STRETCH * Math.min(mag, 1.4);
  const mx = o.lx * N, my = o.ly * N, LR = N * (0.3 + 0.18 * k), LR2 = LR * LR;
  if (lensGL) {                                  // GPU: 같은 계산을 레티나 해상도로, 이미지는 부드럽게 섞어 가져온다
    lensGL(o.ctx, o.srcCanvas, { hx: 0, hy: 0, r: R, ux, uy, A, mx, my, LR, k: LENS_ON ? k : 0, lmin: LENS_MIN });
    if (!o.lensOn) { o.lens.style.opacity = 1; o.img.style.opacity = 0; o.lensOn = true; }
    return;
  }
  const far = R * (1 + HALO.size) * (1 + A * HALO.loose) + 1, far2 = far * far;
  for (let y = 0; y < M; y++) for (let x = 0; x < M; x++) {
    const di = (y * M + x) << 2, dx = x - C, dy = y - C, d2 = dx * dx + dy * dy;
    if (d2 > far2) { out[di + 3] = 0; continue; }                      // 번짐까지 닿지 않는 바깥은 계산하지 않는다
    const d = Math.sqrt(d2) || 0.001;
    const proj = (dx * ux + dy * uy) / d;                              // 커서 방향이면 1, 반대면 -1
    const r = R * (1 + (proj > 0 ? A * proj * proj : A * 0.3 * proj) + B * (4 * proj * proj * proj - 3 * proj)); // 커서 쪽은 늘어나고 반대쪽은 살짝 줄어들며, 테두리가 물결친다(cos 3θ)
    const alpha = Math.min(1, Math.max(0, r - d + 0.5));               // 테두리 안티앨리어싱
    // 키컬러 번짐: 원 둘레에 같은 방향으로 더 크게 늘어나는 색 테두리(올린 정도 k로 나타나고 사라진다)
    const rh = R * (1 + HALO.size) * (1 + (proj > 0 ? A * HALO.loose * proj * proj : A * HALO.loose * 0.3 * proj));
    const ha = k * HALO.alpha * Math.min(1, Math.max(0, (rh - d) / (R * HALO.soft)));
    if (!alpha) { if (ha > 0.003) { out[di] = rgb[0]; out[di + 1] = rgb[1]; out[di + 2] = rgb[2]; out[di + 3] = ha * 255; } else out[di + 3] = 0; continue; }
    let u = R + dx * R / r, v = R + dy * R / r;                        // 늘어난 형태에 맞춰 이미지도 늘인다
    const ex = u - mx, ey = v - my, e2 = ex * ex + ey * ey;
    if (LENS_ON && e2 < LR2) {                                         // 볼록렌즈: 가운데일수록 크게 확대되고 렌즈 가장자리에서 원래 크기로 매끄럽게 이어진다
      const t = Math.sqrt(e2) / LR, f = 1 - k * (1 - LENS_MIN) * (1 - t) * (1 - t); // f: 가져올 거리 비율(가운데 LENS_MIN → 가장자리 1)
      u = mx + ex * f; v = my + ey * f;
    }
    const si = ((Math.min(N - 1, Math.max(0, v | 0)) * N) + Math.min(N - 1, Math.max(0, u | 0))) << 2;
    if (alpha < 1 && ha > 0) {                                         // 테두리: 이미지와 번짐 색을 섞는다
      const b = ha * (1 - alpha), t = alpha + b;
      out[di] = (src[si] * alpha + rgb[0] * b) / t; out[di + 1] = (src[si + 1] * alpha + rgb[1] * b) / t; out[di + 2] = (src[si + 2] * alpha + rgb[2] * b) / t; out[di + 3] = t * 255;
    } else { out[di] = src[si]; out[di + 1] = src[si + 1]; out[di + 2] = src[si + 2]; out[di + 3] = src[si + 3] * alpha; }
  }
  o.ctx.putImageData(o.out, 0, 0);
  if (!o.lensOn) { o.lens.style.opacity = 1; o.img.style.opacity = 0; o.lensOn = true; }
}
const settled = o => !o.srcN || (Math.abs(o.vx) + Math.abs(o.vy) + Math.abs(o.wx) + Math.abs(o.wy) + (o.rip || 0) < 0.004);
// ── 스크롤로 펼치기/접기: 아래로 스크롤하면 꼭대기 프로젝트가 타원으로 커지고 목록이 뜬다, 위로 스크롤하면 다시 호로 ──
// 휠·터치 양만큼 따라가다가 손을 떼면 움직이던 방향의 끝(0 또는 1)으로 붙는다. 기본 상태에서 위로 더 스크롤하면 원이 작아졌다가, 멈추면 기본으로 돌아온다.
const cardsEl = $('cards'), heroTitle = $('heroTitle'), thumbs = $('thumbs');
let cardsOn = false;
S.ci = 0; // 펼친 상태의 가운데 카드 번호(필터에 맞는 목록 기준, 연속 값)
orbs.forEach(o => { o.card = Object.assign(document.createElement('div'), { className: 'card', innerHTML: `<img src="${o.p.image}" alt="">` }); o.card.img = o.card.firstChild; cardsEl.append(o.card); o.card.addEventListener('click', e => { if (zT !== 1 || detailOpen || S.z < 0.95) return; e.stopPropagation(); if (o === selected) openDetail(o); else select(o); }); }); // 가운데 카드: 상세 / 양옆 카드: 그 프로젝트로 // 양옆 카드를 누르면 그 프로젝트로 넘어간다
let zT = 0, selected = null, ready = false, snapTimer;
const colorOf = cat => filters.find(f => f.name === cat)?.color ?? '#eee';
const thumbBtns = orbs.map(o => {
  const b = document.createElement('button');
  b.setAttribute('aria-label', o.p.title); b.innerHTML = `<img src="${o.p.image}" alt="">`;
  b.addEventListener('click', () => select(o));
  thumbs.append(b); return b;
});
function select(o, rotate = true) {              // 프로젝트 고르기: 호를 돌려 꼭대기로 가져오고(접을 때 그 자리로), 카드·이름·썸네일을 바꾼다
  const prev = selected; selected = o;
  if (prev !== o && CL.canvas.parentNode) {          // 카드가 바뀌면 렌즈·늘어남을 바로 정리(밀려가는 카드 위에 남지 않게)
    CL.canvas.remove(); if (CL.card) CL.card.style.visibility = '';
    Object.assign(CL, { h: 0, over: false, vx: 0, vy: 0, wx: 0, wy: 0 });
  }
  if (rotate) { let d = -(o.base + S.rot); d = ((d % TAU) + TAU * 1.5) % TAU - TAU / 2; gsap.to(S, { rot: S.rot + d, duration: 1, ease: 'expo.inOut', overwrite: 'auto' }); }
  const list = orbs.filter(x => x.fTarget), j = list.indexOf(o), d = wrap(j - S.ci, list.length); // 가까운 쪽으로 돈다
  if (prev && prev !== o && S.z > 0.5) gsap.to(S, { ci: S.ci + d, duration: 0.8, ease: 'expo.inOut', overwrite: 'auto' }); // 카드들이 옆으로 밀려 지나간다
  else { gsap.killTweensOf(S, 'ci'); S.ci = j; }
  if (prev !== o) swapPill(o);
  thumbBtns.forEach((b, i) => b.setAttribute('aria-current', String(orbs[i] === o)));
  sizeThumbs();
}
function thumbSizes() { return innerWidth <= 640 ? THUMB_SIZES.mobile : THUMB_SIZES.desktop; }
function sizeThumbs() {                         // 고른 썸네일이 가장 크고, 멀어질수록 작아진다
  const sizes = thumbSizes();
  const shown = thumbBtns.filter(b => !b.hidden), at = shown.findIndex(b => b.getAttribute('aria-current') === 'true');
  shown.forEach((b, i) => {
    const size = sizes[Math.min(Math.abs(i - at), sizes.length - 1)];
    b.dataset.base = size; b.style.width = b.style.height = size + 'px'; b.style.borderRadius = size * 0.27 + 'px';
  });

}
const pillWindow = Object.assign(document.createElement('div'), { className: 'pill-window' });
heroTitle.append(pillWindow);
function swapPill(o) {                           // 이름 알약: 알약 자체가 움직인다 — 이전 알약은 위로 올라가 빠지고, 새 알약이 아래에서 올라온다(알약 높이만큼의 창 안에서)
  const next = Object.assign(document.createElement('div'), { className: 'pill-box', textContent: o.p.title });
  next.style.backgroundColor = colorOf(o.p.category);
  const prev = [...pillWindow.children];
  pillWindow.append(next);
  gsap.set(next, { xPercent: -50, yPercent: -50 });
  if (!prev.length) return;                     // 처음엔 바로
  prev.forEach(el => gsap.to(el, { yPercent: -160, duration: 0.42, ease: 'expo.inOut', overwrite: true, onComplete: () => el.remove() }));
  gsap.fromTo(next, { yPercent: 60 }, { yPercent: -50, duration: 0.42, ease: 'expo.inOut' });
}
let zTween = null, lockUntil = 0, acc = 0, accTimer;
let holdSpin = false;
function open(o) {                               // 펼치기: 회전을 멈추고 그 원을 꼭대기 가운데로 데려온 뒤 → 자연스럽게 커지며 펼친다
  if (!ready || zT === 1 || !o) return;
  holdSpin = true; zT = 1;
  orbs.forEach(x => x.hover = false);            // 마우스를 올린 효과(렌즈·늘어남·살짝 커짐)를 먼저 가라앉히고 깨끗한 원에서 커지기 시작
  select(o, false);
  let d = -(o.base + S.rot); d = ((d % TAU) + TAU * 1.5) % TAU - TAU / 2;
  const dur = Math.abs(d) < 0.01 ? 0 : 0.35 + 1.25 * Math.abs(d) / Math.PI; // 가운데로 오는 시간: 바로 옆 원 약 0.45초 ~ 반대편 원 1.6초(멀수록 천천히)
  lockUntil = performance.now() + (Math.max(0.18, dur) + 0.65) * 1000 + 250;
  zTween?.kill();
  const settle = 0.18;                            // 효과가 가라앉는 시간(가운데로 오는 시간이 더 길면 그 안에 끝난다)
  zTween = gsap.timeline({ onComplete: () => { zTween = null; } })
    .to(S, { rot: S.rot + d, duration: dur, ease: 'power3.inOut' })
    .to(S, { z: 1, duration: 0.65, ease: 'none' }, Math.max(settle, dur - 0.08)); // 단계별 곡선(gentle)이 따로 있어서 전체는 일정한 속도로
}
function close() {                               // 접기: 카드에 마우스를 올린 효과(렌즈·늘어남)를 먼저 가라앉히고 → 옆이 줄어 원이 되고 → 작아지며 꼭대기 원 자리로 → 다시 천천히 회전
  if (zT !== 1) return;
  zT = 0; zTween?.kill();
  const settle = CL.canvas.parentNode ? 0.18 : 0;
  CL.over = false;
  lockUntil = performance.now() + (settle + 0.6) * 1000 + 200;
  zTween = gsap.to(S, { z: 0, duration: 0.6, delay: settle, ease: 'none', onComplete: () => { zTween = null; holdSpin = false; } });
}
function nudge(delta) {
  if (!ready || flat() || performance.now() < lockUntil) return;    // 펼친 화면 고정 모드에선 접고 펴지 않는다
  if (delta > 0) {
    if (zT < 0) { zT = Math.min(0, zT + delta); return; }            // 줄어든 상태에서 아래로: 기본 쪽으로 따라온다
    if (zT === 0) { acc += delta; clearTimeout(accTimer); accTimer = setTimeout(() => acc = 0, 200); if (acc > 0.12) { acc = 0; open(focused ?? orbs[0]); } }
  } else if (delta < 0) {
    if (zT === 1) { close(); return; }                                 // 펼친 상태에서 위로: 접힌다
    if (zTween) return;
    zT = Math.max(-1, zT + delta);                                     // 기본 상태에서 위로: 원이 작아지고, 멈추면 기본으로 돌아온다
    clearTimeout(snapTimer); snapTimer = setTimeout(() => { if (zT < 0) zT = 0; }, 120);
  }
}
// 트랙패드는 손가락 방향 그대로: 두 손가락을 아래로 쓸면 펼치고 위로 쓸면 줄어든다(맥 기본 '자연스러운 스크롤'에서 휠 값과 반대).
// 마우스 휠은 그대로: 아래로 굴리면 펼친다. 트랙패드 판별: 크롬·사파리는 트랙패드일 때 wheelDeltaY = -3 × deltaY, 그 밖엔 작은 픽셀 단위 값
const isTrackpad = e => e.wheelDeltaY ? e.wheelDeltaY === -3 * e.deltaY && e.wheelDeltaY % 120 !== 0 : e.deltaMode === 0 && Math.abs(e.deltaY) < 50; // 마우스 휠은 120 단위
let vAcc = 0, vLock = 0, vTimer;
addEventListener('wheel', e => {
  if (detailOpen) return;                        // 상세 화면에서는 호·카드 조작 없음
  if (flat()) {                                  // 펼친 화면 고정: 스크롤하면 다음/이전 카드로(한 번에 한 장)
    if (!ready || zT !== 1 || performance.now() < vLock) return;
    vAcc += e.deltaY; clearTimeout(vTimer); vTimer = setTimeout(() => vAcc = 0, 200);
    if (Math.abs(vAcc) > 40) { step(Math.sign(vAcc)); vAcc = 0; vLock = performance.now() + 650; }
    return;
  }
  nudge((isTrackpad(e) ? -1 : 1) * e.deltaY * 0.004);
}, { passive: true });
// 썸네일 독 확대: 마우스에 가까운 썸네일일수록 커진다(맥 독처럼). 올려 둔 동안은 고른 썸네일보다 우선, 나가면 고른 썸네일 기준으로 돌아간다
const mobileThumbs = () => innerWidth <= 640;
thumbs.addEventListener('pointermove', e => {
  if (mobileThumbs()) return;
  thumbs.classList.add('dock');
  thumbBtns.forEach(b => {
    if (b.hidden) return;
    const r = b.getBoundingClientRect(), d = (e.clientX - (r.left + r.width / 2)) / 70;
    // 마우스를 올린 동안은 고른 썸네일과 상관없이 커서에 가까운 썸네일이 가장 크다(고른 것보다 조금 더 크게)
    const sizes = THUMB_SIZES.desktop, small = sizes[sizes.length - 1], big = sizes[0] + 8;
    const size = small + (big - small) * Math.exp(-d * d * 0.9);
    b.style.width = b.style.height = size + 'px'; b.style.borderRadius = size * 0.27 + 'px';
  });
});
thumbs.addEventListener('pointerleave', () => { thumbs.classList.remove('dock'); sizeThumbs(); });
let touchY = null;
addEventListener('touchstart', e => { touchY = e.touches[0].clientY; }, { passive: true });
addEventListener('touchmove', e => { if (touchY == null) return; const y = e.touches[0].clientY; nudge((touchY - y) * 0.006); touchY = y; }, { passive: true });
addEventListener('touchend', () => { touchY = null; }, { passive: true });
addEventListener('keydown', e => {
  if (detailOpen) { if (e.key === 'Escape') closeDetail(); return; }
  if (!ready) return;
  if (flat()) { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) step(['ArrowDown', 'ArrowRight'].includes(e.key) ? 1 : -1); return; }
  if (['ArrowDown', 'PageDown'].includes(e.key)) open(focused ?? orbs[0]);
  else if (['ArrowUp', 'PageUp', 'Escape'].includes(e.key)) close();
  else if (zT === 1 && ['ArrowLeft', 'ArrowRight'].includes(e.key)) step(e.key === 'ArrowRight' ? 1 : -1); // 펼친 상태: 좌우로 이전/다음 프로젝트
});
function step(dir) {                            // 이전/다음 프로젝트(필터에 맞는 목록에서 순환)
  const list = orbs.filter(o => o.fTarget), i = list.indexOf(selected);
  select(list[(i + dir + list.length) % list.length]);
}
// 세로형 화면: 위아래로 밀면 이전/다음 프로젝트
let swipe = null;
addEventListener('touchstart', e => { swipe = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
addEventListener('touchend', e => {
  if (detailOpen) return;
  if (!swipe || !flat() || zT !== 1 || e.target.closest('.thumbs')) return;
  const dx = e.changedTouches[0].clientX - swipe.x, dy = e.changedTouches[0].clientY - swipe.y; swipe = null;
  if (compact) { if (Math.abs(dy) > 40 && Math.abs(dy) > Math.abs(dx) * 1.2) step(dy < 0 ? 1 : -1); }   // 세로형: 위로 밀면 다음, 아래로 밀면 이전
  else if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) step(dx < 0 ? 1 : -1);             // 가로형: 왼쪽으로 밀면 다음
}, { passive: true });
function startExpanded() {                       // 호 없이 첫(또는 지금) 프로젝트를 펼친 화면으로 시작
  holdSpin = true; zT = 1; S.z = 1;
  if (!selected) select(NO_RING ? orbs.find(o => o.fTarget) ?? orbs[0] : focused ?? orbs[0], false); // 호가 없으면 항상 첫 프로젝트부터
  gsap.to(S, { reveal: 1, duration: 0.9, ease: 'expo.out' });
}
addEventListener('resize', () => {               // 화면 방향·크기가 바뀌면 모드 전환
  const c = isCompact(); if (c === compact) return;
  compact = c; L = layout();
  if (!ready) return;
  if (flat()) startExpanded(); else { S.reveal = 1; close(); }
});
orbs.forEach(o => o.el.addEventListener('click', () => open(o))); // 원을 누르면 꼭대기 가운데로 온 뒤 펼친다
// 펼친 상태: 가운데 카드 자리를 누르면 상세 화면, 빈 배경을 누르면 접힌다(카드 자체 클릭은 카드에서 처리)
addEventListener('click', e => {
  if (detailOpen || zT !== 1 || S.z < 0.95 || performance.now() < lockUntil) return;
  const T = L.hero;
  if (Math.abs(e.clientX - T.cx) < T.W / 2 && Math.abs(e.clientY - T.cy) < T.H / 2 && !e.target.closest('.thumbs, .filters')) { openDetail(selected); return; } // 카드가 렌즈 효과로 잠시 가려져 있어도 그 자리를 누르면 상세
  if (flat() || e.target.closest('.card, .thumbs, .filters, .hero-title, button, a')) return;
  close();
});
// ── 상세 화면 ────────────────────────────────────
// 가운데 카드 사진이 그 자리에서 커져 화면을 채우고(모서리 r → 0) → 20% 검정 막이 깔리며 개요 글이 올라온다. 화살표로 글·막을 걷고 사진만 볼 수 있다. 닫으면 카드 자리로 돌아간다.
const detail = $('detail'), detailMedia = $('detailMedia'), detailImg = $('detailImg'), glass = $('glass'), detailClose = $('detailClose'), detailToggle = $('detailToggle'), detailDim = $('detailDim');
const DIM = 0.6; // 사진 위 검정 막 진하기
const BLUR = 8;  // 글이 보일 때 사진 흐림(px). 사진만 볼 때는 0
let detailOpen = false, detailTl = null;
const INFO = [['client', 'Client'], ['role', 'Role'], ['period', 'Period'], ['scope', 'Scope']];
const cardRect = () => { const T = L.hero; return { left: T.cx - T.W / 2, top: T.cy - T.H / 2, width: T.W, height: T.H, borderRadius: T.H / 2 }; };
function openDetail(o) {
  if (!o || detailOpen) return;
  detailOpen = true; CL.over = false;
  const p = o.p;
  if (p.detail?.length) return openPage(o);       // 상세 모듈이 있는 프로젝트는 모듈 페이지로
  detailImg.src = p.image;
  $('gMeta').textContent = [p.category, p.year].filter(Boolean).join(' · ');
  $('gTitle').textContent = p.title;
  $('gSum').innerHTML = p.intro || '';
  $('gInfo').innerHTML = INFO.filter(([k]) => p[k]).map(([k, label]) => `<dt>${label}</dt><dd>${p[k]}</dd>`).join('');
  detail.classList.add('on'); detail.setAttribute('aria-hidden', 'false');
  const items = [$('gMeta'), $('gTitle'), $('gSum'), $('gInfo')];
  detailTl?.kill();
  detailTl = gsap.timeline()
    .set(detailMedia, { ...cardRect(), opacity: 1 })
    .to(detailMedia, { left: 0, top: 0, width: () => innerWidth, height: () => innerHeight, borderRadius: 0, duration: 0.8, ease: 'expo.inOut' })
    .set(detailDim, { opacity: 0 }, 0)
    .set([glass, detailClose, detailToggle], { visibility: 'visible' })
    .to(detailDim, { opacity: DIM, duration: 0.5, ease: 'power2.out' }, '-=0.15')
    .fromTo(detailImg, { filter: 'blur(0px)', scale: 1 }, { filter: `blur(${BLUR}px)`, scale: 1.04, duration: 0.6, ease: 'power2.out' }, '<') // 살짝 키워 흐림 가장자리가 비치지 않게
    .set(glass, { opacity: 1 }, '<')
    .fromTo(items, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out', stagger: 0.06 }, '<0.1')
    .fromTo([detailClose, detailToggle], { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'expo.out' }, '<');
  textHidden = false; detailToggle.setAttribute('aria-pressed', 'false'); detailToggle.setAttribute('aria-label', '사진만 보기');
}
function closeDetail() {
  if (!detailOpen) return;
  if (pageOn) return closePage();
  detailTl?.kill();
  detailTl = gsap.timeline({ onComplete: () => { detailOpen = false; detail.classList.remove('on'); detail.setAttribute('aria-hidden', 'true'); gsap.set(detailMedia, { opacity: 0 }); } })
    .to([glass, detailClose, detailToggle], { opacity: 0, duration: 0.25, ease: 'power2.in' })
    .to(detailDim, { opacity: 0, duration: 0.25 }, '<')
    .to(detailImg, { filter: 'blur(0px)', scale: 1, duration: 0.25 }, '<')
    .set([glass, detailClose, detailToggle], { visibility: 'hidden' })
    .to(detailMedia, { ...cardRect(), duration: 0.7, ease: 'expo.inOut' });
}
// ── 상세 모듈 페이지 ─────────────────────────────
// 카드 사진이 대표 모듈 자리로 커지며 이어지고(→ 모서리 r 20) → 어두운 바탕과 나머지 모듈이 나타난다. 아래 모듈은 스크롤로 보일 때 올라온다.
const dp = $('dp'), dpInner = $('dpInner');
let pageOn = false, pageCleanups = [];
const lines = v => (v ?? '').split(' / ').map(t => t.trim()).join(' <br>');   // 앞 띄어쓰기: 모바일에서 줄바꿈을 숨겨도 단어가 붙지 않게
// 컨셉 도형(480×480 시안): 쓰기 = 위가 둥근 아치, 모으기 = 대각선 모서리가 크게 둥근 잎, 투자하기 = 둥근 사각 두 개가 위아래로 겹친 모양
const SHAPES = {
  Spend: { color: '#aaaaff', svg: '<path d="M0 240A240 240 0 0 1 480 240V400Q480 480 400 480H80Q0 480 0 400Z"/>' },
  Save: { color: '#99dbff', svg: '<path d="M0 200A200 200 0 0 1 200 0H380A100 100 0 0 1 480 100V280A200 200 0 0 1 280 480H100A100 100 0 0 1 0 380Z"/>' },
  Invest: { color: '#ddf552', svg: '<rect width="480" height="262" rx="110"/><rect y="218" width="480" height="262" rx="110"/>' },
};
// 이미지 또는 동영상(mp4·webm·mov): 동영상은 소리 없이 반복 재생(사파리 자동 재생 조건 muted + playsinline), 화면에 보일 때만 재생
const isVideo = src => /\.(mp4|webm|mov)$/i.test(src);
const media = (src, extra = '') => isVideo(src) ? `<video src="${src}" muted loop playsinline preload="metadata"${extra}></video>` : `<img src="${src}" alt=""${extra}>`;
const lum = hex => { const v = parseInt(hex.replace('#', '').slice(0, 6), 16); return 0.299 * (v >> 16) + 0.587 * (v >> 8 & 255) + 0.114 * (v & 255); };
function moduleHTML(m) {
  const f = k => m.fields[k] ?? [], one = k => f(k)[0] ?? '';
  switch (m.kind) {
    case '대표': return `<section class="dm dm-hero${one('글색') === '흰색' ? ' light' : ''}${one('판색') && lum(one('판색')) < 128 ? ' panel-dark' : ''}"${one('판색') ? ` style="--panel:${one('판색')}"` : ''}>${media(m.images[0])}
      <div class="dh-top"><div><p class="dh-title">${one('제목')}</p><ul class="dh-tags">${one('태그').split(' / ').map(t => `<li>${t}</li>`).join('')}</ul></div>
      <div class="dh-info"><p><b>${one('역할')}</b>${one('범위')}</p><p><b>${one('클라이언트')}</b>${one('연도')}</p></div></div>
      <div class="dh-bottom"><p class="dh-intro${one('소개색') === '흰색' ? ' white' : ''}">${lines(one('소개'))}</p>${one('크레딧') ? `<p class="dh-credit">${lines(one('크레딧'))}</p>` : ''}</div></section>`;
    case '와이드': { // 배경: 색 판 위 가운데에 이미지(폭: 판 대비 %), 비율: 판 비율(예 1840:1080), 틀 — 태블릿: 흰 테두리
      const bg = one('배경'), w = one('폭'), ar = one('비율');
      const cls = ({ 어둡게: ' dark', 흰색: ' light' }[one('글색')] ?? '') + (bg ? ' boxed' : '') + (ar ? ' ratio' : '') + ({ 태블릿: ' tablet', 테두리: ' outline' }[one('틀')] ?? '');
      const st = (bg ? `--bg:${bg};` : '') + (w ? `--w:${w};` : '') + (ar ? `aspect-ratio:${ar.replace(':', '/')};` : '');
      return `<section class="dm dm-wide${cls}"${st ? ` style="${st}"` : ''}>${media(m.images[0], one('모바일 영역') ? ` data-area="${one('모바일 영역')}"` : '')}${one('글') ? `<p class="dm-text">${lines(one('글'))}</p>` : one('라벨') ? `<p class="dm-text dm-tag">${lines(one('라벨'))}</p>` : ''}</section>`; } // '- 라벨 —'은 글보다 작은 이름표
    case '3단': { const COLS = [1.3, 30.6, 73]; // 03 이미지의 세 단 왼쪽 위치(%)
      return `<section class="dm dm-triple${one('모바일') === '첫 단 숨김' ? ' cut-first' : ''}"><img src="${m.images[0]}" alt="">${f('글').map((t, i) => `<p class="dm-col" style="left:${COLS[i] ?? 0}%">${lines(t)}</p>`).join('')}</section>`; }
    case '컨셉': return `<section class="dm dm-concept"><p class="dm-label">${one('라벨')}</p><p class="dm-text">${lines(one('글'))}</p>
      <div class="blobs">${one('도형').split(' / ').map(n => { const sh = SHAPES[n.trim()]; return `<div><span class="shape"><svg viewBox="0 0 480 480" fill="${sh?.color ?? '#ccc'}" aria-hidden="true">${sh?.svg ?? '<circle cx="240" cy="240" r="240"/>'}</svg><b>${n.trim()}</b></span></div>`; }).join('')}</div></section>`;
    case '아이콘': return `<section class="dm dm-icons"><p class="dm-label">${one('라벨')}</p><div class="icon-stage">${m.images.map(src => `<img src="${src}" alt="">`).join('')}</div></section>`;
    case '4칸': // 2×2 둥근 칸. '- 칸 — 라벨 : 글' 네 줄(왼쪽 위 → 오른쪽 위 → 왼쪽 아래 → 오른쪽 아래), 첫 칸은 검정
      return `<section class="dm dm-quad"${one('배경') || one('칸색') ? ` style="${one('배경') ? `--bg:${one('배경')};` : ''}${one('칸색') ? `--tile:${one('칸색')};` : ''}"` : ''}>${f('칸').map((t, i) => { const [label, ...rest] = t.split(' : '); return `<div class="q${i ? '' : ' on'}"><span class="q-label">${label}</span><p class="q-text">${lines(rest.join(' : '))}</p></div>`; }).join('')}</section>`;
    case '태블릿': { // 이응이 태블릿 프로토타입(oiooi-proto.js)이 가상 커서로 화면을 눌러 가며 저절로 시연한다. 색 판·폭·비율은 와이드 '- 배경'과 같다
      const bg = one('배경'), w = one('폭'), ar = one('비율');
      return `<section class="dm dm-wide boxed dm-tablet${ar ? ' ratio' : ''}" style="${bg ? `--bg:${bg};` : ''}${w ? `--w:${w};` : ''}${ar ? `aspect-ratio:${ar.replace(':', '/')};` : ''}"><div class="tablet-host" data-tour="${one('시연') || 'full'}"></div></section>`; }
    case '프로토타입': return `<section class="dm dm-proto"><figure data-phone="${m.ref}"></figure></section>`;
    default: return '';
  }
}
function buildPage(p) {                          // '| 2단' 모듈이 연달아 오면 한 줄에 나란히
  let out = '', row = [];
  let size = 2;
  const flush = n => { if (row.length) out += `<div class="dm-row${size === 3 ? ' dm-row3' : ''}">${row.join('')}</div>`; row = []; };
  for (const m of p.detail) { if (m.half) { if (row.length && m.half !== size) flush(); size = m.half; row.push(moduleHTML(m)); if (row.length === size) flush(); } else { flush(); out += moduleHTML(m); } }
  flush();
  const next = nextOrb(orbs.find(o => o.p === p)), np = next.p, c = next.rgb;
  const dark = (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) > 130;   // 밝은 분야색(초록 등)이면 검정 글자
  out += `<div class="dm-next"><button class="next-btn" style="--c:rgb(${c.join(',')});--t:${dark ? '#111' : '#fff'}" aria-label="다음 프로젝트: ${np.title}">
    <span class="mag" aria-hidden="true"><span class="roll"><span>Next Project</span><span>${np.title}</span></span></span></button></div>`;
  dpInner.innerHTML = out;
  const btn = dpInner.querySelector('.next-btn');
  rollButton(btn);
  btn.addEventListener('click', () => goNext(next));
}
// 다음 프로젝트(MD 순서, 마지막 다음은 처음)
const nextOrb = o => orbs[(orbs.indexOf(o) + 1) % orbs.length];
// Next Project: 상세 화면을 닫지 않고 그 자리에서 바로 다음 프로젝트 페이지로 바뀐다(뒤 캐러셀도 몰래 다음 카드로 맞춰 둬서 닫으면 그 카드로 돌아감)
function goNext(o) {
  if (!pageOn) return;
  detailTl?.kill();
  if (o.p.detail?.length) {
    detailTl = gsap.timeline()
      .to(dpInner, { opacity: 0, duration: 0.35, ease: 'power2.in' })
      .call(() => {
        pageCleanups.forEach(fn => fn()); pageCleanups = [];
        selected = null; select(o);                 // 이전 선택을 비워 카드가 밀려가지 않고 바로 바뀐다
        openPage(o, true);
      });
    return;
  }
  // 상세 모듈이 없는 프로젝트: 페이지가 흐려지며 닫히고 그 카드에서 개요 화면이 열린다
  gsap.to(detailClose, { opacity: 0, duration: 0.2, onComplete: () => gsap.set(detailClose, { visibility: 'hidden' }) });
  detailTl = gsap.timeline()
    .to(dp, { opacity: 0, duration: 0.45, ease: 'power2.in' })
    .call(() => { endPage(); gsap.set(dp, { opacity: 1 }); selected = null; select(o); })   // 이전 선택을 비워 카드가 밀려가지 않고 바로 바뀐다
    .call(() => openDetail(o), null, '+=0.35');
}
async function openPage(o, direct = false) {   // direct: Next Project로 넘어올 때(카드에서 커지지 않고 어두운 바탕 위에 바로)
  pageOn = true;
  buildPage(o.p);
  detail.classList.add('on'); detail.setAttribute('aria-hidden', 'false');
  gsap.set([glass, detailToggle], { visibility: 'hidden' });
  dp.scrollTop = 0;
  const hero = dpInner.querySelector('.dm-hero') ?? dpInner.firstElementChild, heroImg = hero.querySelector('img');
  const rest = [...dpInner.children].filter(el => el !== hero);
  if (heroImg && !heroImg.complete) await heroImg.decode().catch(() => {});
  gsap.set(dp, { visibility: 'visible', backgroundColor: `rgba(17,17,17,${direct ? 1 : 0})` });
  gsap.set(hero, { visibility: 'hidden' }); gsap.set(hero.children, { opacity: 0 }); gsap.set(heroImg, { opacity: 1 });
  rest.forEach(el => el.classList.add('dm-reveal'));
  gsap.set(dpInner, { opacity: 1 });              // Next Project로 넘어올 때 흐려 둔 내용을 (숨길 것 숨긴 뒤) 다시 보이게
  const r = (heroImg ?? hero).getBoundingClientRect();   // 카드가 커져 닿는 곳은 대표 사진(모바일은 제목이 사진 위 판 밖에 있다)
  detailImg.src = heroImg.src; gsap.set(detailImg, { filter: 'none', scale: 1 }); gsap.set(detailDim, { opacity: 0 });
  detailTl?.kill();
  if (direct) detailTl = gsap.timeline()          // 대표 모듈이 살짝 올라오며 나타나고, 그 위 글이 차례로
    .set(hero, { visibility: 'visible' })
    .fromTo(hero, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', clearProps: 'opacity,transform' })
    .to([...hero.children].filter(el => el !== heroImg), { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out', stagger: 0.08, startAt: { y: 12 } }, 0.2);
  else detailTl = gsap.timeline()
    .set(detailMedia, { ...cardRect(), opacity: 1 })
    .to(detailMedia, { left: r.left, top: r.top, width: r.width, height: r.height, borderRadius: 20, duration: 0.85, ease: 'expo.inOut' })   // 카드 → 대표 모듈 자리
    .to(dp, { backgroundColor: 'rgba(17,17,17,1)', duration: 0.6, ease: 'power2.out' }, 0.25)
    .call(() => { gsap.set(hero, { visibility: 'visible' }); gsap.set(detailMedia, { opacity: 0 }); })
    .to([...hero.children].filter(el => el !== heroImg), { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out', stagger: 0.08, startAt: { y: 12 } })
    .set(detailClose, { visibility: 'visible' }, '<')
    .fromTo(detailClose, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'expo.out' }, '<');
  // 아래 모듈: 화면에 들어올 때 올라온다
  // 스크롤 인터랙션: 화면에 들어오면 나타나고, 벗어나면 숨었다가 다시 들어올 때 또 나타난다(내려갈 때 · 올라갈 때 모두)
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) e.target.classList.add('in');
    else { e.target.classList.remove('in'); e.target.style.setProperty('--from', e.boundingClientRect.top < 0 ? '-60px' : '60px'); } // 위로 벗어나면 다음엔 위에서, 아래로 벗어나면 아래에서
  }), { root: dp, threshold: 0.12 });
  setTimeout(() => rest.forEach(el => io.observe(el)), 700);
  detailTl.call(() => { hero.classList.add('dm-reveal', 'in'); io.observe(hero); });   // 대표 모듈도 열리는 효과가 끝난 뒤부터 함께
  pageCleanups.push(() => io.disconnect());
  // 3단: 이미지 안 카드들의 모서리를 화면 크기와 상관없이 일정한 r로(이미지에 그려진 r은 작게 줄면 거의 직각이 된다)
  dpInner.querySelectorAll('.dm-triple > img').forEach(img => {
    const apply = () => roundCards(img);
    img.complete ? apply() : img.addEventListener('load', apply, { once: true });
    const ro = new ResizeObserver(apply); ro.observe(img);
    pageCleanups.push(() => ro.disconnect());
  });
  // '- 모바일 영역 — 왼쪽% / 오른쪽%': 모바일에서 이미지의 그 가로 구간만 보여 준다(위아래는 자르지 않음)
  dpInner.querySelectorAll('[data-area]').forEach(img => {
    const set = () => {
      const [l, r] = img.dataset.area.split('/').map(v => parseFloat(v) / 100), w = r - l, nw = img.naturalWidth ?? img.videoWidth, nh = img.naturalHeight ?? img.videoHeight;
      img.style.setProperty('--area-ar', (nw * w / nh).toFixed(4));
      img.style.setProperty('--area-x', w < 1 ? `${(l / (1 - w) * 100).toFixed(2)}%` : '50%');
    };
    img.complete || img.readyState >= 1 ? set() : img.addEventListener(img.tagName === 'VIDEO' ? 'loadedmetadata' : 'load', set, { once: true });
  });
  // 동영상: 화면에 보일 때만 재생(배터리·성능), 벗어나면 멈춤
  const vio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.play().catch(() => {}); else e.target.pause(); }), { root: dp, threshold: 0.15 });
  dpInner.querySelectorAll('video').forEach(v => vio.observe(v));
  pageCleanups.push(() => { vio.disconnect(); dpInner.querySelectorAll('video').forEach(v => v.pause()); });
  // 나란히 놓인 두 이미지 모듈: 사진 비율대로 폭을 나눠 높이를 맞춘다(정사각 둘이면 반반)
  dpInner.querySelectorAll('.dm-row').forEach(row => {
    const imgs = [...row.children].map(el => el.matches('.dm-wide:not(.boxed)') && el.querySelector(':scope > img'));
    if (imgs.length !== 2 || !imgs.every(Boolean)) return;
    const set = () => { if (imgs.every(i => i.naturalWidth)) row.style.setProperty('--cols', imgs.map(i => `${(i.naturalWidth / i.naturalHeight).toFixed(4)}fr`).join(' ')); };
    imgs.forEach(i => i.complete ? set() : i.addEventListener('load', set, { once: true }));
  });
  // 태블릿 시연: 화면에 보일 때만 진행, 페이지를 닫으면 멈춘다
  dpInner.querySelectorAll('.tablet-host').forEach(async host => {
    if (!document.querySelector('link[href*="oiooi-proto.css"]')) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: './oiooi-proto.css' }));
    host.dataset.visible = '0';
    const tio = new IntersectionObserver(([e]) => { host.dataset.visible = e.isIntersecting ? '1' : '0'; }, { root: dp, threshold: 0.3 });
    tio.observe(host);
    const { mountTablet } = await import('./oiooi-proto.js?v=e41fda37');
    if (!host.isConnected) return;
    const handle = mountTablet(host, { tour: host.dataset.tour, caption: false, signIn: false });
    pageCleanups.push(() => { tio.disconnect(); handle.stop(); });
  });
  // 아이콘: 제자리에서 차례로 바뀐다
  dpInner.querySelectorAll('.icon-stage').forEach(stage => {
    const imgs = [...stage.children]; let i = 0; imgs[0]?.classList.add('on');
    const t = setInterval(() => { imgs[i].classList.remove('on'); i = (i + 1) % imgs.length; imgs[i].classList.add('on'); }, 1600);
    pageCleanups.push(() => clearInterval(t));
  });
  // 프로토타입: 움직이는 휴대폰
  for (const fig of dpInner.querySelectorAll('[data-phone]')) mountPhone(fig, fig.dataset.phone).then(stop => stop && pageCleanups.push(stop)).catch(console.error);
}
// 3단 이미지의 카드(불투명한 사각형) 위치를 한 번 찾아 두고, 보이는 크기에 맞춰 둥근 사각형 마스크를 씌운다
const TRIPLE_R = () => innerWidth <= 768 ? 12 : 20;   // 카드 모서리(px): 데스크톱 20(다른 모듈과 같음), 모바일 12
function cardRects(img) {
  if (img._rects) return img._rects;
  const W = img.naturalWidth, H = img.naturalHeight, c = Object.assign(document.createElement('canvas'), { width: W, height: H }), g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, W, H).data, on = (x, y) => d[(y * W + x) * 4 + 3] > 10, rects = [];
  const spans = (len, at) => { const out = []; let s = -1; for (let i = 0; i <= len; i++) { const t = i < len && at(i); if (t && s < 0) s = i; if (!t && s >= 0) { if (i - s > 4) out.push([s, i]); s = -1; } } return out; };
  // 세로로 끝까지 비어 있는 줄을 단 경계로 보고, 단마다 가운데 세로줄에서 카드들의 위아래를 찾는다
  const colOn = x => { for (let y = 0; y < H; y += 2) if (on(x, y)) return true; return false; };
  for (const [x0, x1] of spans(W, colOn)) for (const [y0, y1] of spans(H, y => on((x0 + x1) >> 1, y))) rects.push([x0, y0, x1 - x0, y1 - y0]);
  return img._rects = rects;
}
function roundCards(img) {
  if (!img.naturalWidth || !img.offsetWidth) return;
  const W = img.naturalWidth, H = img.naturalHeight, r = TRIPLE_R() * W / img.offsetWidth;   // 화면 px → 이미지 px
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${cardRects(img).map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(r, w / 2, h / 2)}"/>`).join('')}</svg>`;
  img.style.maskImage = img.style.webkitMaskImage = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  img.style.maskSize = img.style.webkitMaskSize = '100% 100%';
}
function endPage() {
  pageCleanups.forEach(fn => fn()); pageCleanups = [];
  dpInner.innerHTML = ''; gsap.set(dp, { visibility: 'hidden' }); gsap.set(detailMedia, { opacity: 0 });
  pageOn = false; detailOpen = false; detail.classList.remove('on'); detail.setAttribute('aria-hidden', 'true');
}
function closePage() {
  const hero = dpInner.querySelector('.dm-hero') ?? dpInner.firstElementChild;
  const r = (hero?.querySelector("img") ?? hero)?.getBoundingClientRect(), atTop = r && r.bottom > 0 && dp.scrollTop < 80;
  const finish = endPage;
  detailTl?.kill();
  gsap.to(detailClose, { opacity: 0, duration: 0.2, onComplete: () => gsap.set(detailClose, { visibility: 'hidden' }) });
  if (atTop) {                                   // 맨 위에서 닫으면: 대표 모듈 사진이 다시 카드 자리로 줄어든다
    detailTl = gsap.timeline({ onComplete: finish })
      .set(detailMedia, { left: r.left, top: r.top, width: r.width, height: r.height, borderRadius: 20, opacity: 1 })
      .set(hero, { visibility: 'hidden' })
      .to([...dpInner.children].filter(el => el !== hero), { opacity: 0, duration: 0.25 }, 0)
      .to(dp, { backgroundColor: 'rgba(17,17,17,0)', duration: 0.5 }, 0.1)
      .to(detailMedia, { ...cardRect(), duration: 0.75, ease: 'expo.inOut' }, 0);
  } else detailTl = gsap.timeline({ onComplete: finish }).to(dp, { opacity: 0, duration: 0.4, ease: 'power2.in' }).set(dp, { opacity: 1 }); // 스크롤한 뒤 닫으면 흐려지며 닫힘
}
detailClose.addEventListener('click', closeDetail);
// 화살표: 글·검정 막을 걷고 사진만 / 다시 누르면 글이 돌아온다
let textHidden = false;
detailToggle.addEventListener('click', () => {
  textHidden = !textHidden;
  detailToggle.setAttribute('aria-pressed', String(textHidden));
  detailToggle.setAttribute('aria-label', textHidden ? '글 다시 보기' : '사진만 보기');
  const items = [$('gMeta'), $('gTitle'), $('gSum'), $('gInfo')];
  gsap.killTweensOf([items, detailDim, detailImg]);
  if (textHidden) {
    gsap.to(items, { opacity: 0, y: 16, duration: 0.35, ease: 'power2.in', stagger: { each: 0.04, from: 'end' } });
    gsap.to(detailDim, { opacity: 0, duration: 0.5, ease: 'power2.out' });
    gsap.to(detailImg, { filter: 'blur(0px)', scale: 1, duration: 0.5, ease: 'power2.out' });
  } else {
    gsap.to(detailDim, { opacity: DIM, duration: 0.5, ease: 'power2.out' });
    gsap.to(detailImg, { filter: `blur(${BLUR}px)`, scale: 1.04, duration: 0.5, ease: 'power2.out' });
    gsap.fromTo(items, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out', stagger: 0.06 });
  }
});
// 펼친 상태 가운데 카드: 접힌 상태의 원과 같이, 마우스를 올리면 커서 자리가 볼록하게 부풀고 카드 테두리가 커서 쪽으로 늘어났다가
// 나가면 출렁이며 돌아온다. 늘어난 형태가 카드 밖으로 나가므로 카드 위에 여백을 둔 캔버스를 따로 겹쳐 그리고, 그동안 카드는 숨긴다.
const CL = { canvas: document.createElement('canvas'), h: 0, tx: 0.5, ty: 0.5, lx: 0.5, ly: 0.5, over: false, vx: 0, vy: 0, wx: 0, wy: 0 };
CL.ctx = CL.canvas.getContext('2d');
Object.assign(CL.canvas.style, { position: 'absolute', left: '0', top: '0', zIndex: 20, pointerEvents: 'none' });
const CARD_STRETCH = 0.16;
const REVEAL_SIZE = 1.45;   // 렌즈 속 이미지가 보이는 원 크기(렌즈 반지름 대비). 렌즈 밖까지 넓게 비친다
const REVEAL_FEATHER = 0.55; // 렌즈 속 이미지 테두리: 원 반지름의 바깥 55%에서 서서히 섞인다(0 = 딱 잘린 원, 클수록 부드럽게) // 카드 테두리가 늘어나는 정도(원은 STRETCH)
const canHover = matchMedia('(hover: hover)').matches;   // 터치 화면은 마우스 올림 효과(렌즈·늘어남·배경색) 없음
addEventListener('pointermove', e => {
  const c = selected?.card; if (!c || zT !== 1 || !canHover) { CL.over = false; return; }
  const T = L.hero, x = (e.clientX - (T.cx - T.W / 2)) / T.W, y = (e.clientY - (T.cy - T.H / 2)) / T.H;
  const list = orbs.filter(o => o.fTarget);
  CL.over = x > 0 && x < 1 && y > 0 && y < 1 && Math.abs(wrap(list.indexOf(selected) - S.ci, list.length)) < 0.05;
  if (CL.over) { CL.tx = x; CL.ty = y; }
});
function cardLens(dt) {
  const o = selected, T = L.hero;
  if (zT !== 1 && S.z < 0.999) {                 // 접히기 시작하면 효과 캔버스를 걷고 카드가 그대로 줄어든다
    if (CL.canvas.parentNode) { CL.canvas.remove(); if (CL.card) CL.card.style.visibility = ''; }
    Object.assign(CL, { h: 0, vx: 0, vy: 0, wx: 0, wy: 0 }); return;
  }
  CL.h = lerp(CL.h, CL.over ? 1 : 0, 1 - Math.exp(-dt * (zT === 1 ? 6 : 24)));
  // 늘어남 스프링(원과 같은 JELLY 값)
  const gx = CL.over ? (CL.tx - 0.5) * 2 : 0, gy = CL.over ? (CL.ty - 0.5) * 2 : 0;
  CL.wx += ((gx - CL.vx) * JELLY.stiff - CL.wx * JELLY.damp) * dt; CL.wy += ((gy - CL.vy) * JELLY.stiff - CL.wy * JELLY.damp) * dt;
  CL.vx += CL.wx * dt; CL.vy += CL.wy * dt;
  const still = Math.abs(CL.vx) + Math.abs(CL.vy) + Math.abs(CL.wx) + Math.abs(CL.wy) < 0.004;
  if (CL.h < 0.01 && still) { if (CL.canvas.parentNode) { CL.canvas.remove(); CL.card.style.visibility = ''; } return; }
  if (!o.img.complete || !o.img.naturalWidth) return;
  const D = lensGL ? DPR : 0.6;                                       // GPU면 레티나 해상도, CPU면 0.6배로 계산하고 늘려 보인다
  const W = Math.round(T.W * D), H = Math.round(T.H * D), P = Math.round(Math.min(W, H) * (lensGL ? 0.25 : 0.42)), MW = W + P * 2, MH = H + P * 2;
  if (CL.src !== o || CL.W !== W || CL.H !== H) {                     // 프로젝트·크기가 바뀌면 원본 픽셀을 새로 그린다(object-fit: cover)
    const c = Object.assign(document.createElement('canvas'), { width: W, height: H }), g = c.getContext('2d');
    const iw = o.img.naturalWidth, ih = o.img.naturalHeight, k = Math.max(W / iw, H / ih);
    g.drawImage(o.img, (W - iw * k) / 2, (H - ih * k) / 2, iw * k, ih * k);
    if (CL.card && CL.card !== o.card) CL.card.style.visibility = '';
    let c2 = null;                                                     // 렌즈 원 안에 비쳐 보일 이미지(프로젝트 MD의 hover)
    if (o.p.hover) {
      o.hoverImg ??= Object.assign(new Image(), { src: o.p.hover });
      if (o.hoverImg.complete && o.hoverImg.naturalWidth) {
        c2 = Object.assign(document.createElement('canvas'), { width: W, height: H });
        const g2 = c2.getContext('2d'), iw2 = o.hoverImg.naturalWidth, ih2 = o.hoverImg.naturalHeight, k2 = Math.max(W / iw2, H / ih2);
        g2.drawImage(o.hoverImg, (W - iw2 * k2) / 2, (H - ih2 * k2) / 2, iw2 * k2, ih2 * k2);
      } else o.hoverImg.onload = () => { CL.src = null; };          // 다 불러오면 다음 프레임에 다시 그린다
    }
    Object.assign(CL, { src: o, card: o.card, W, H, srcCanvas: c, srcCanvas2: c2, px: lensGL ? null : g.getImageData(0, 0, W, H).data, out: lensGL ? null : new ImageData(MW, MH) });
    CL.canvas.width = MW; CL.canvas.height = MH; CL.lx = CL.tx; CL.ly = CL.ty;
    Object.assign(CL.canvas.style, { width: MW / D + 'px', height: MH / D + 'px' });
  }
  if (CL.canvas.parentNode !== cardsEl) cardsEl.append(CL.canvas);
  CL.canvas.style.transform = `translate(${T.cx - MW / D / 2}px, ${T.cy - MH / D / 2}px)`;
  o.card.style.visibility = 'hidden';
  CL.lx += (CL.tx - CL.lx) * 0.12; CL.ly += (CL.ty - CL.ly) * 0.12;
  const rgb = HOVER_BG ? WHITE : o.rgb, src = CL.px, out = CL.out?.data, k = CL.h, r = Math.min(W, H) / 2, hx = W / 2 - r, hy = H / 2 - r;
  const mag = Math.hypot(CL.vx, CL.vy), ux = mag ? CL.vx / mag : 0, uy = mag ? CL.vy / mag : 0, A = CARD_STRETCH * Math.min(mag, 1.4);
  const mx = CL.lx * W, my = CL.ly * H, LR = Math.min(W, H) * 0.4, LR2 = LR * LR;
  if (lensGL) { lensGL(CL.ctx, CL.srcCanvas, { hx, hy, r, ux, uy, A, mx, my, LR, k: LENS_ON ? k : 0, lmin: LENS_MIN, source2: CL.srcCanvas2, reveal: k, maskR: LR * REVEAL_SIZE * (0.6 + 0.4 * k), feather: REVEAL_FEATHER }); return; } // 원 안쪽에 hover 이미지가 비친다(올린 정도만큼 커지며 나타남)
  const CX = MW / 2, CY = MH / 2, far = (Math.sqrt(W * W + H * H) / 2 + r * (HALO.size + HALO.soft)) * (1 + A * HALO.loose) + 1, far2 = far * far;
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const di = (y * MW + x) << 2, dx = x - CX, dy = y - CY, d2 = dx * dx + dy * dy;
    if (d2 > far2) { out[di + 3] = 0; continue; }                      // 늘어나도 닿을 수 없는 바깥은 계산하지 않는다
    const d = Math.sqrt(d2) || 0.001;
    const proj = (dx * ux + dy * uy) / d, st = 1 + (proj > 0 ? A * proj * proj : A * 0.3 * proj); // 커서 쪽은 늘어나고 반대쪽은 살짝 줄어든다
    const px = dx / st, py = dy / st;                                  // 늘어난 형태 → 원래 카드 좌표
    const qx = Math.abs(px) - hx, qy = Math.abs(py) - hy;              // 알약 모양(사각형 + 최대 r) 안쪽인지
    const ox = qx > 0 ? qx : 0, oy = qy > 0 ? qy : 0;              // (Math.hypot은 느려서 픽셀마다 쓰지 않는다)
    const sd = Math.sqrt(ox * ox + oy * oy) + (qx > qy ? (qx < 0 ? qx : 0) : (qy < 0 ? qy : 0)) - r;
    const alpha = Math.min(1, Math.max(0, 0.5 - sd * st));
    // 키컬러 번짐(원과 같은 방식): 같은 방향으로 더 크게 늘어난 알약 모양 둘레
    const sth = 1 + (proj > 0 ? A * HALO.loose * proj * proj : A * HALO.loose * 0.3 * proj), hx2 = Math.abs(dx / sth) - hx, hy2 = Math.abs(dy / sth) - hy;
    const hox = hx2 > 0 ? hx2 : 0, hoy = hy2 > 0 ? hy2 : 0, sdh = Math.sqrt(hox * hox + hoy * hoy) + (hx2 > hy2 ? (hx2 < 0 ? hx2 : 0) : (hy2 < 0 ? hy2 : 0)) - r;
    const ha = k * HALO.alpha * Math.min(1, Math.max(0, (r * HALO.size - sdh) / (r * HALO.soft)));
    if (!alpha) { if (ha > 0.003) { out[di] = rgb[0]; out[di + 1] = rgb[1]; out[di + 2] = rgb[2]; out[di + 3] = ha * 255; } else out[di + 3] = 0; continue; }
    let u = px + W / 2, v = py + H / 2;
    const ex = u - mx, ey = v - my, e2 = ex * ex + ey * ey;
    if (LENS_ON && e2 < LR2) {                                         // 볼록렌즈(원과 같은 공식)
      const t = Math.sqrt(e2) / LR, f = 1 - k * (1 - LENS_MIN) * (1 - t) * (1 - t);
      u = mx + ex * f; v = my + ey * f;
    }
    const si = ((Math.min(H - 1, Math.max(0, v | 0)) * W) + Math.min(W - 1, Math.max(0, u | 0))) << 2;
    if (alpha < 1 && ha > 0) {
      const b = ha * (1 - alpha), t = alpha + b;
      out[di] = (src[si] * alpha + rgb[0] * b) / t; out[di + 1] = (src[si + 1] * alpha + rgb[1] * b) / t; out[di + 2] = (src[si + 2] * alpha + rgb[2] * b) / t; out[di + 3] = t * 255;
    } else { out[di] = src[si]; out[di + 1] = src[si + 1]; out[di + 2] = src[si + 2]; out[di + 3] = src[si + 3] * alpha; }
  }
  CL.ctx.putImageData(CL.out, 0, 0);
}
gsap.ticker.add(render);

// ── 인트로 타임라인 ─────────────────────────────
// 1. 분야 색 화면이 차례로 아래에서 올라오고, 알약 크기가 먼저 새 이름에 맞춰 바뀌고, 이어서 글자가 아래에서 올라온다
// 2. 검은 화면 + 흰 알약으로 'Ahhyun Portfolio'가 나온 뒤 흰 알약이 화면 가득 커져 배경이 된다 → 3. 프로젝트가 가장자리에서 원형으로 → 4. 호로 내려와 회전
const intro = $('intro'), pill = $('pill'), pillMask = $('pillMask');
const PAD = 26; // 알약 좌우 여백
gsap.set(pill, { xPercent: -50, yPercent: -50 }); // 폭이 바뀌어도 가운데 유지
await document.fonts.ready; // 알약 폭을 실제 서체로 재기 위해 서체 로딩을 기다린다
const measurer = Object.assign(document.createElement('span'), { className: 'measure' });
document.body.append(measurer);
const textWidth = (text, size) => { measurer.style.fontSize = size ? size + 'px' : ''; measurer.textContent = text; return measurer.offsetWidth; };
const INK = '#1a1a1a', PAPER = '#ffffff'; // 마지막 장: 검은 화면 + 흰 알약 → 흰 알약이 커져 메인 배경이 된다
const panels = [...filters.map(f => f.color), INK].map(color => {
  const el = document.createElement('div'); el.className = 'panel'; el.style.background = color; intro.append(el); return el;
});
panels.forEach((el, i) => el.style.zIndex = i);
let label = null;
// 글자 전환: 이전 글자는 바로 위로 빠지고(줄어드는 알약에 잘리지 않게), 알약 크기가 다 바뀐 뒤 새 글자가 아래에서 올라온다
const rollOut = (tl, el, at) => tl.to(el, { yPercent: -260, duration: 0.35, ease: 'power3.in', onComplete: () => el.remove() }, at);
function rollIn(tl, text, at) {
  const next = document.createElement('span'); next.textContent = text; label = next;
  tl.call(() => { gsap.set(next, { yPercent: 260 }); pillMask.append(next); }, null, at)
    .to(next, { yPercent: 0, duration: 0.8, ease: 'expo.out' }, at);
}

const edgeOrder = orbs.map((_, i) => i).sort(() => Math.random() - 0.5); // 가장자리에서 무작위 순서로 등장
let revealed = false;
function reveal() {
  if (revealed) return; revealed = true;
  gsap.to(buttons, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'expo.out' });
  gsap.to(S, { caps: 1, duration: 1.2, onComplete: () => ready = true });
}
gsap.set(buttons, { y: 12 });
word.textContent = home.title;
L = layout(); // 타이틀 글자·서체가 정해진 뒤 위치 다시 계산
if (reduce || !filters.length) {
  intro.remove(); gsap.set(word, { yPercent: 0 }); Object.assign(S, { m: 1, run: reduce ? 0 : 1 }); orbs.forEach(o => o.k = 1); reveal(); if (flat()) startExpanded();
} else {
  // 첫 장(파란 화면 + 첫 분야)은 처음부터 떠 있고, 이후 장이 아래에서 덮어 올라온다
  gsap.set(panels[0], { clipPath: 'inset(0% 0 0 0)' });
  gsap.set(pill, { opacity: 1, width: textWidth(filters[0].name) + PAD * 2 });
  gsap.set(word, { opacity: 0 }); center.style.zIndex = 30; // 타이틀은 인트로 위에서 나타난다
  const tl = gsap.timeline();
  label = Object.assign(document.createElement('span'), { textContent: filters[0].name }); pillMask.append(label); // 첫 장은 처음부터 보인다
  const HOLD = 0.5, WIPE = 0.8;
  for (let i = 1; i < filters.length; i++) {
    const at = `step${i}`, text = filters[i].name;
    // 배경색이 바뀌는 동시에 알약 크기가 먼저 바뀌고 → 그다음 글자
    tl.addLabel(at, `>+=${HOLD}`)
      .to(panels[i], { clipPath: 'inset(0% 0 0 0)', duration: WIPE, ease: 'expo.inOut' }, at);
    rollOut(tl, label, at);
    tl.to(pill, { width: textWidth(text) + PAD * 2, duration: 0.6, ease: 'expo.inOut' }, at);
    rollIn(tl, text, `${at}+=0.55`);
  }
  // 마지막 장: 검은 화면이 올라오며 알약이 흰색으로 → 타이틀이 알약에 등장 → 흰 알약이 화면을 덮어 메인 배경이 되고, 글자는 타이틀 크기로
  const headSize = parseFloat(getComputedStyle(word).fontSize);
  tl.addLabel('title', `>+=${HOLD}`)
    .to(panels[panels.length - 1], { clipPath: 'inset(0% 0 0 0)', duration: WIPE, ease: 'expo.inOut' }, 'title');
  rollOut(tl, label, 'title');
  tl.to(pill, { width: textWidth(home.title) + PAD * 2, backgroundColor: PAPER, color: INK, duration: 0.6, ease: 'expo.inOut' }, 'title');
  rollIn(tl, home.title, 'title+=0.55');
  const titleLabel = label;
  tl.addLabel('expand', `>+=${HOLD}`)
    .to(pill, { width: () => Math.hypot(innerWidth, innerHeight) + 40, height: () => Math.hypot(innerWidth, innerHeight) + 40, duration: 1.1, ease: 'expo.inOut' }, 'expand')
    .to(titleLabel, { fontSize: headSize, fontWeight: 600, letterSpacing: '-0.01em', duration: 1.1, ease: 'expo.inOut' }, 'expand')
    .call(() => { gsap.set(word, { opacity: 1, yPercent: 0 }); intro.remove(); measurer.remove(); center.style.zIndex = ''; })
  if (flat()) {
    // 펼친 화면 고정(세로형·호 없음): 가운데에서 필터가 나오고 → 타이틀·필터가 함께 위로 올라가 자리 잡은 뒤 → 카드가 아래에서 올라온다
    tl.call(reveal)
      .to(S, { m: 1, duration: 0.9, ease: 'power3.inOut' }, '+=0.85')
      .call(startExpanded, null, '-=0.1');
  } else tl
    // 3. 가장자리에서 원형 자리로
    .to(edgeOrder.map(i => orbs[i]), { k: 1, duration: 1.4, ease: 'expo.out', stagger: 0.04 }, '-=0.15')
    // 4. 원이 아래로 내려와 호가 되고, 왼쪽으로 돌기 시작
    .to(S, { m: 1, duration: 1.6, ease: 'power3.inOut' }, '-=0.6')
    .to(S, { run: 1, duration: 1.2, ease: 'power1.in' }, '<0.6')
    .call(reveal, null, '-=0.6');
}
