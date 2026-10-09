// 움직이는 휴대폰 프로토타입(1차 포트폴리오 표지에서 옮김): 탭 화면(SVG)을 순서대로 전환하고, 화면이 바뀔 때마다 각 화면의 모듈이 움직인다.
// SVG는 Figma에서 내보낸 평면 구조라, 최상위 요소의 순번 범위로 모듈을 묶는다. [시작, 끝, 모션, 지연(ms)]
// 모션: rise(아래에서) · pop(튀어나옴) · drop(스티커처럼 떨어짐) · wheel(원형으로 돌아 들어옴) · slide-l/slide-r(옆에서) · reveal(왼쪽부터 드러남) · sheet(하단 시트) · fade
const PHONES = {
  ibuja: {
    dir: './assets/ibuja-screens/',
    tabs: ['쓰기', '모으기', '투자하기', '마이'],
    tabBarFrom: 'my', // 탭 바는 라벨이 맞는 '마이' 화면의 것을 가져와 하나만 겹쳐 쓴다.
    screens: [
      {file: 'spend', modules: [[2,8,'rise',0], [20,23,'pop',120], [24,26,'pop',230], [27,29,'pop',330], [30,31,'rise',460], [32,33,'sheet',120]]},
      {file: 'save', modules: [[1,4,'rise',0], [15,24,'wheel',150], [25,27,'fade',800], [28,29,'sheet',120]]}, // 카드 3장이 아래 중심점을 축으로 한 칸 돌아 들어옴(분홍 → 가운데 순)
      {file: 'invest', modules: [[3,7,'rise',0], [8,8,'rise',250], [24,25,'rise',500]]}, // 그래프는 정지. 투자중인 금액 → 지금까지 수익 → 주가 알림 순으로 시차를 두고 등장
      {file: 'my', modules: [[21,22,'rise',0], [1,1,'pop',100], [2,2,'pop',160], [3,3,'pop',220], [4,4,'pop',280], [5,6,'drop',420], [7,9,'drop',480], [10,12,'drop',540], [13,15,'drop',600], [16,18,'drop',660], [19,19,'pop',320], [20,20,'pop',360], [34,43,'rise',560], [44,45,'sheet',120]]},
    ],
  },
};
const INTERVAL = 2800;
const PILL_X = [24, 106, 189, 272]; // 탭별 선택 표시의 x 위치 (375 기준)
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

async function loadSvg(url, prefix) {
  const text = await fetch(url).then(r => { if (!r.ok) throw new Error(`Missing ${url}`); return r.text(); });
  // 여러 SVG를 한 문서에 넣으므로 id가 겹치지 않게 접두어를 붙인다.
  const host = document.createElement('div');
  host.innerHTML = text.replace(/(\bid="|url\(#|href="#)/g, `$1${prefix}-`);
  return host.firstElementChild;
}

function groupModules(svg, modules) {
  const kids = [...svg.querySelector(':scope > g').children];
  for (const [from, to, motion, delay] of modules) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', `m m-${motion}`); g.style.setProperty('--d', `${delay}ms`);
    kids[from].before(g); g.append(...kids.slice(from, to + 1));
  }
  kids[kids.length - 1].classList.add('baked-tabbar');
}

function buildTabBar(svg, labels, onSelect) {
  const groups = svg.querySelector(':scope > g').children, [bg, ...parts] = groups[groups.length - 1].children; // .at(-1)은 사파리 15.4 미만에서 없음
  const pill = parts.find(p => p.getAttribute('fill') === '#F5F7F9');
  const items = parts.filter(p => p !== pill);
  const bar = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  bar.setAttribute('viewBox', '0 0 375 812'); bar.setAttribute('class', 'phone-tabbar'); bar.setAttribute('aria-hidden', 'true');
  pill.setAttribute('class', 'tab-pill');
  bar.append(bg, pill);
  labels.forEach((_, i) => { const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'tab-item'); g.append(items[i*2], items[i*2+1]); bar.append(g); });
  const nav = document.createElement('div'); nav.className = 'phone-tabs'; nav.setAttribute('role', 'tablist'); nav.setAttribute('aria-label', '앱 탭 화면');
  labels.forEach((label, i) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.textContent = label; b.addEventListener('click', () => onSelect(i, true)); nav.append(b); });
  return {bar, nav, select(i) {
    pill.style.transform = `translateX(${PILL_X[i] - PILL_X[3]}px)`; // 가져온 탭 바의 선택 표시는 '마이' 위치에 있다.
    bar.querySelectorAll('.tab-item').forEach((g, k) => g.classList.toggle('on', k === i));
    nav.querySelectorAll('button').forEach((b, k) => b.setAttribute('aria-selected', String(k === i)));
  }};
}

export async function mountPhone(figure, projectId) {
  const config = PHONES[projectId]; if (!config) return null;
  const svgs = await Promise.all(config.screens.map(s => loadSvg(config.dir + s.file + '.svg', `${projectId}-${s.file}`)));
  const screen = document.createElement('div'); screen.className = 'phone-screen';
  const layers = svgs.map(svg => {
    const layer = document.createElement('div'); layer.className = 'phone-layer'; layer.append(svg); screen.append(layer);
    return layer;
  });
  figure.replaceChildren(screen); figure.classList.add('is-live');
  // 탭 바를 먼저 떼어 낸 뒤 모듈을 묶는다(순번은 그대로 유지됨).
  let current = -1, timer, inView = false;
  const tabs = buildTabBar(svgs[config.screens.findIndex(s => s.file === config.tabBarFrom)], config.tabs, show);
  svgs.forEach((svg, i) => groupModules(svg, config.screens[i].modules));
  screen.append(tabs.bar, tabs.nav);

  function show(i, byUser) {
    if (i === current) return;
    layers.forEach((layer, k) => { layer.classList.toggle('on', k === i); layer.classList.remove('play'); });
    if (!reduced.matches) { void layers[i].offsetWidth; layers[i].classList.add('play'); }
    tabs.select(i); current = i;
    if (byUser) restart();
  }
  const visible = () => inView && !figure.matches(':hover') && !document.hidden;   // 화면에 보이고 마우스를 올리지 않았을 때만 넘어간다
  function restart() { clearInterval(timer); if (!reduced.matches) timer = setInterval(() => { if (visible()) show((current + 1) % layers.length); }, INTERVAL); }
  // 화면에 다시 들어오면 첫 화면부터 모션을 다시 보여준다
  const io = new IntersectionObserver(([e]) => { const was = inView; inView = e.isIntersecting; if (inView && !was) { current = -1; show(0); restart(); } }, { threshold: 0.4 });
  io.observe(figure);
  show(0); restart();
  return () => { clearInterval(timer); io.disconnect(); };   // 상세 화면을 닫을 때 정리
}
