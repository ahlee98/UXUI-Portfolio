// 이응이 태블릿 프로토타입: Figma 원본(1366×1024 프레임)의 화면·문구·에셋을 HTML로 옮긴 동작 버전.
// 메인 → 브랜드 소개(About us) → 온보딩 5단계 → 로딩 → 맞춤 추천 → 활동 리스트 → 활동 세부 순서로 이어진다.
// 1366×1024 캔버스를 컨테이너 너비에 맞춰 축소하고, tour가 있으면 가상 커서가 흐름을 시연한다.
// 사용자가 태블릿을 누르거나 올려 두면 시연을 멈추고, 손을 떼고 잠시 지나면 처음부터 다시 시연한다.
// (web-02: 1차 포트폴리오 web/dist/oiooi-proto.js에서 가져옴. 화면 밖이면 시연을 쉬고(host.dataset.visible='0'), 반환값의 stop()으로 완전히 멈춘다)
import { ICON } from './oiooi-proto-icons.js?v=e41fda37';

const IMG = new URL('./assets/oiooi-proto/', import.meta.url).href;
const W = 1366, H = 1024;
const img = (name, cls = '') => `<img src="${IMG}${name}" alt=""${cls ? ` class="${cls}"` : ''} draggable="false">`;
const AREAS = ['언어', '신체', '인지', '정서', '관계'];
const AREA_CLS = {언어: 'lang', 신체: 'body', 인지: 'cog', 정서: 'emo', 관계: 'rel'};
const AREA_DESC = {언어: '글자를 익히고 어휘력을 키워요.', 신체: '협응력과 소근육을 발달시켜요.', 인지: '시지각, 이해력, 수학적 사고를 배워요.', 정서: '감정표현을 익히고 성취감을 경험해요.', 관계: '규칙이해, 갈등해결 등 관계 형성 능력을 키워요.'};
const AREA_CARD = {언어: '글자를 익히고<br>어휘력을 키워요.', 신체: '협응력과 소근육을<br>발달시켜요.', 인지: '시지각, 이해력, 수학적<br>사고를 배워요.', 정서: '감정표현을 익히고<br>성취감을 경험해요.', 관계: '규칙이해, 갈등해결 등<br>관계 형성 능력을<br>키워요.'};
const AGES = ['0~12개월', '12~24개월', '24~36개월', '36~48개월', '48~60개월', '60개월 이상'];
// 세부 발달 문항은 Figma에 언어·신체 두 영역만 정의돼 있다.
const LEVELS = {
  언어: ['아직 말을 하지 못해요.', '간단한 단어를 말할 수 있어요.', '완성된 문장을 구사하고, 이름을 쓰고 읽을 수 있어요.', '복잡한 문장을 구사하고 자신의 의견을 말할 수 있어요.', '대화에 능숙하고 영어에 관심을보여요.'],
  신체: ['아직 영아 발달이 필요한 시기에요.', '이앓이를 시작했어요.', '간단한 손가락 조작을 할 수 있어요.', '손가락 조작이 자유롭고, 도구를 활용할 수 있어요.'],
};

// 활동: 이름·태그·연령·시간·인원은 Figma 카드 표기를 따른다. detail은 세부 화면으로 쓸 활동.
const ACTS = {
  finger: {img: 'c-finger', title: 'Finger Gym! 손가락 놀이', tags: ['신체', '언어'], age: '48-60개월', time: '10 min', people: '1 ~2 명'},
  block: {img: 'c-block', title: '블록을 쌓아 나만의 모양 만들기', tags: ['신체'], age: '12-24개월', time: '10 ~ 15 min', people: '1~3 명'},
  block2: {img: 'c-block2', title: '블록을 쌓아 나만의 모양 만들기', tags: ['신체', '언어'], age: '0-6개월', time: '5 ~ 10 min', people: '1 ~3 명'},
  car: {img: 'c-car', title: '자동차를 움직이며 감정 말하기', tags: ['정서'], age: '12-24개월', time: '5 ~ 10 min', people: '1 명'},
  match: {img: 'c-match', title: '그림과 똑같은 캐릭터 이름 맞추기', tags: ['언어', '인지'], age: '12-24개월', time: '8 ~ 10 min', people: '자유'},
  face: {img: 'c-face', title: '한글로 얼굴 만들어보기', tags: ['인지'], age: '24-36개월', time: '5 ~ 10 min', people: '1 명'},
  count: {img: 'c-count', title: '1부터 10까지 세기', tags: ['언어'], age: '0-6개월', time: '10 min', people: '1 ~3명'},
  film: {img: 'c-film', title: '필름을 맞춰보며 촉감 자극하기', tags: ['신체'], age: '0-6개월', time: '5 ~ 10 min', people: '1 명'},
  choco: {img: 'c-choco', title: '초콜릿 만들기', tags: ['언어'], age: '36-48개월', time: '5 ~ 10 min', people: '자유'},
  wood: {img: 'c-wood', title: '입과 손으로 나무 느껴보기', tags: ['신체'], age: '0-6개월', time: '5 ~ 10 min', people: '1 ~3 명'},
  shape: {img: 'c-shape', title: '글자 모양 맞춰보기', tags: ['언어'], age: '24-36개월', time: '10 min', people: '1 명'},
  english: {img: 'c-english', title: '영어 글자 모양 맞추기', tags: ['언어'], age: '48-60개월', time: '10~ 15 min', people: '1 명'},
  rattle: {img: 'c-rattle', title: '딸랑이 흔들기', tags: ['신체'], age: '0-6개월', time: '1 ~ 3 min', people: '1 명'},
  emotion: {img: 'c-emotion', title: '감정 이해하고 말하기', tags: ['정서'], age: '24-36개월', time: '5 ~ 10 min', people: '1 ~3 명'},
  // 맞춤 추천 화면에만 나오는 카드
  rattle2: {img: 'c-rattle', title: '딸랑이와 인형놀이 하기', tags: ['신체발달', '언어'], age: '12~24개월', time: '5~ 10 min', people: '자유'},
  consonant: {img: 'c-wood', title: '캐릭터로 자음 익히기', tags: ['언어발달', '언어'], age: '24~36개월', time: '10~ 15 min', people: '1 ~3 명'},
  finger2: {img: 'c-finger2', title: 'Finger gym! 손가락 놀이', tags: ['신체발달', '언어'], age: '24-36개월', time: '5 ~ 10 min', people: '2-3 명', detail: 'finger'},
};
// 그 밖의 활동 세부 문구: Figma에는 Finger Gym!만 있어, 활동 이름·발달 영역·연령을 바탕으로 같은 형식(한 줄 소개·설명·좋은 점 4가지)으로 새로 썼다.
const INFO = {
  block: {level: '기초 단계', headline: '손으로 쌓고 다시 쌓으며 익히는 첫 구조 놀이', desc: '원목 글자 블록을 차곡차곡 쌓아 탑이나 동물 모양을 만들어 보는 놀이입니다. 균형을 맞추며 블록을 올리고, 무너지면 다시 쌓는 과정을 반복하며 손의 힘과 집중력을 기를 수 있습니다.',
    more: [['소근육 발달', '블록을 집고 올리며 손가락의 힘과 조절력을 키워요.'], ['공간 지각', '크기와 모양을 비교하며 균형을 잡는 법을 익혀요.'], ['창의력', '정해진 답 없이 나만의 모양을 자유롭게 만들어요.'], ['끈기', '무너져도 다시 쌓으며 끝까지 도전하는 힘을 길러요.']]},
  block2: {level: '영아 단계', headline: '블록을 쥐고 맞대 보며 감각을 깨우는 놀이', desc: '부드러운 원목 블록을 손에 쥐어 보고, 두 개를 맞대거나 살짝 쌓아 보는 영아 놀이입니다. 보호자가 블록의 이름과 모양을 말해 주면 촉감 자극과 함께 첫 언어 경험도 쌓을 수 있습니다.',
    more: [['촉감 자극', '매끈한 나무의 감촉과 무게를 손으로 느껴요.'], ['쥐기 발달', '블록을 잡고 놓으며 손 전체를 쓰는 힘을 길러요.'], ['언어 노출', '보호자의 말소리로 사물의 이름을 자연스럽게 들어요.'], ['애착 형성', '함께 주고받는 놀이로 안정감을 느껴요.']]},
  car: {level: '기초 단계', headline: '자동차 역할놀이로 감정을 말로 표현해요', desc: '원목 자동차를 밀고 멈추며 “빨리 달려서 신나”, “부딪혀서 속상해”처럼 상황에 맞는 기분을 말해 보는 놀이입니다. 놀이 속 상황을 빌려 아이가 자신의 감정을 알아차리고 표현하도록 도와줍니다.',
    more: [['감정 인식', '놀이 상황 속에서 내 기분이 어떤지 알아차려요.'], ['감정 표현', '신나요, 속상해요처럼 기분을 말로 표현해요.'], ['움직임 조절', '자동차를 밀고 멈추며 힘을 조절하는 법을 익혀요.'], ['상호작용', '보호자와 대화를 주고받으며 마음을 나눠요.']]},
  match: {level: '기초 단계', headline: '그림 속 캐릭터를 찾아 이름을 불러 봐요', desc: '그림책 속 캐릭터와 똑같은 원목 교구를 찾아 짝을 맞추고, 캐릭터의 이름을 따라 말해 보는 놀이입니다. 같은 모양을 찾는 관찰력과 사물의 이름을 익히는 어휘력을 함께 키울 수 있습니다.',
    more: [['시각 변별', '비슷한 모양 중에서 똑같은 것을 찾아내요.'], ['어휘력', '캐릭터 이름을 따라 말하며 새로운 낱말을 익혀요.'], ['기억력', '그림과 교구를 번갈아 보며 모양을 기억해요.'], ['성취감', '짝을 맞출 때마다 해냈다는 기쁨을 느껴요.']]},
  face: {level: '기초 단계', headline: '자음과 모음으로 눈·코·입을 만들어요', desc: 'ㅇ, ㄴ, ㅡ 같은 한글 블록을 눈·코·입 자리에 놓아 여러 표정의 얼굴을 만들어 보는 놀이입니다. 글자를 먼저 모양으로 익히고, 완성한 표정에 이름을 붙이며 감정 어휘도 함께 배울 수 있습니다.',
    more: [['한글 모양 인지', '자음과 모음의 생김새를 놀이로 먼저 익혀요.'], ['창의 표현', '같은 글자로도 다양한 얼굴을 만들어 봐요.'], ['감정 어휘', '웃는 얼굴, 화난 얼굴처럼 표정에 이름을 붙여요.'], ['소근육 발달', '작은 블록을 제자리에 놓으며 손끝을 써요.']]},
  count: {level: '영아 단계', headline: '숫자 블록을 하나씩 짚으며 소리로 세어요', desc: '1부터 10까지 원목 숫자 블록을 차례로 놓고, 보호자가 하나씩 짚으며 소리 내어 세어 주는 놀이입니다. 반복되는 숫자 소리와 모양을 자연스럽게 접하며 수에 대한 첫 감각을 쌓을 수 있습니다.',
    more: [['수 감각', '하나, 둘 반복되는 소리로 수의 흐름을 느껴요.'], ['청각 자극', '리듬 있는 말소리에 귀 기울여요.'], ['언어 노출', '숫자 이름을 자주 들으며 친숙해져요.'], ['시선 추적', '짚어 주는 손끝을 따라 눈을 움직여요.']]},
  film: {level: '영아 단계', headline: '필름 카드를 만지며 촉감과 시각을 깨워요', desc: '그림이 그려진 필름 카드를 교구 위에 겹쳐 보고, 매끈한 필름과 나무의 서로 다른 촉감을 느껴 보는 놀이입니다. 겹칠 때마다 달라지는 그림을 보며 시각과 촉각을 함께 자극할 수 있습니다.',
    more: [['촉각 자극', '필름과 나무의 서로 다른 감촉을 비교해요.'], ['시각 자극', '겹쳐질 때 달라지는 그림과 색을 관찰해요.'], ['손 뻗기', '보이는 것을 향해 손을 뻗고 잡아 봐요.'], ['호기심', '만지면 달라지는 경험으로 탐색 의욕을 키워요.']]},
  choco: {level: '중간 단계', headline: '글자 블록으로 나만의 초콜릿 상자를 꾸며요', desc: '글자 블록을 초콜릿처럼 상자 칸에 채워 넣고, 완성한 상자에 이름을 붙여 보는 놀이입니다. 좋아하는 글자를 고르고 단어를 만들며 가게 놀이처럼 즐겁게 한글을 익힐 수 있습니다.',
    more: [['단어 만들기', '글자를 골라 이어 붙이며 낱말을 완성해요.'], ['분류하기', '모양과 색에 따라 칸을 나눠 채워요.'], ['역할놀이', '초콜릿 가게 주인이 되어 상황을 꾸며요.'], ['표현력', '완성한 상자를 소개하며 말하는 힘을 길러요.']]},
  wood: {level: '영아 단계', headline: '안전한 원목을 입과 손으로 탐색해요', desc: '무독성 마감의 원목 교구를 손에 쥐고 입으로 느껴 보며 나무의 촉감과 무게를 탐색하는 놀이입니다. 영아기의 자연스러운 입 탐색을 안전하게 경험하도록 돕습니다.',
    more: [['구강 탐색', '입으로 느끼며 사물을 알아가는 시기를 존중해요.'], ['쥐기 발달', '손바닥 전체로 잡고 놓는 힘을 길러요.'], ['촉감 자극', '나무의 결과 온기를 손끝으로 느껴요.'], ['안정감', '익숙한 교구를 반복해 만지며 편안함을 느껴요.']]},
  shape: {level: '기초 단계', headline: '같은 모양의 글자를 찾아 짝을 맞춰요', desc: '그림책에 그려진 글자 모양과 똑같은 원목 글자 블록을 찾아 위에 올려 보는 놀이입니다. 글자의 생김새를 비교하며 자음과 모음의 형태를 눈과 손으로 익힐 수 있습니다.',
    more: [['글자 형태 인지', '비슷한 글자 사이의 차이를 알아봐요.'], ['눈-손 협응력', '보고 찾은 블록을 정확한 자리에 놓아요.'], ['집중력', '하나씩 맞춰 가며 끝까지 몰입해요.'], ['어휘 확장', '맞춘 글자로 시작하는 낱말을 함께 떠올려요.']]},
  english: {level: '심화 단계', headline: '알파벳 블록으로 영어 단어를 만나요', desc: '알파벳 블록을 그림책 속 글자 모양에 맞춰 놓고, 그 글자로 시작하는 단어를 함께 읽어 보는 놀이입니다. D는 Dinosaur처럼 글자와 단어를 이어 보며 영어에 자연스럽게 흥미를 가질 수 있습니다.',
    more: [['알파벳 인지', '대문자의 모양과 이름을 익혀요.'], ['소리 연결', '글자와 첫소리를 이어 파닉스의 기초를 쌓아요.'], ['어휘 확장', '그림과 함께 새로운 영어 단어를 만나요.'], ['학습 흥미', '놀이로 시작해 영어를 즐겁게 받아들여요.']]},
  rattle: {level: '영아 단계', headline: '소리 나는 딸랑이로 손과 귀를 깨워요', desc: '원목 딸랑이를 쥐고 흔들어 소리를 내 보는 영아 놀이입니다. 손을 움직이면 소리가 나는 경험으로 원인과 결과를 알아가고, 소리 나는 쪽으로 고개를 돌리며 감각을 키울 수 있습니다.',
    more: [['쥐기 발달', '손잡이를 잡고 흔들며 손의 힘을 길러요.'], ['청각 자극', '딸랑 소리의 크기와 방향을 느껴요.'], ['원인과 결과', '내가 흔들면 소리가 난다는 것을 알아가요.'], ['시선 추적', '움직이는 딸랑이를 눈으로 따라가요.']]},
  emotion: {level: '기초 단계', headline: '여러 표정을 보며 내 마음을 말해 봐요', desc: '다양한 표정의 캐릭터 교구를 보며 기쁨, 슬픔, 화남 같은 감정을 찾아보고, 언제 그런 기분이 드는지 이야기해 보는 놀이입니다. 감정에 이름을 붙이며 나와 친구의 마음을 이해하는 힘을 기를 수 있습니다.',
    more: [['감정 어휘', '기쁨, 슬픔처럼 감정에 알맞은 이름을 붙여요.'], ['공감', '친구의 표정을 보고 마음을 헤아려요.'], ['자기 표현', '내 기분과 그 이유를 말로 전해요.'], ['사회성', '감정을 나누며 함께 노는 법을 익혀요.']]},
  rattle2: {level: '기초 단계', headline: '딸랑이와 인형으로 짧은 이야기를 만들어요', desc: '딸랑이 소리에 맞춰 인형을 움직이며 인사하고, 짧은 말을 주고받는 역할놀이입니다. 소리와 움직임을 이어 보며 손의 조절력과 말하기 경험을 함께 쌓을 수 있습니다.',
    more: [['소근육 발달', '딸랑이와 인형을 번갈아 쥐며 손을 섬세하게 써요.'], ['언어 모방', '인형의 인사말을 따라 하며 말을 익혀요.'], ['상상력', '인형에게 역할을 주며 이야기를 꾸며요.'], ['상호작용', '보호자와 번갈아 말하며 대화의 순서를 배워요.']]},
  consonant: {level: '기초 단계', headline: '자음 캐릭터와 친구가 되어 한글을 익혀요', desc: 'ㄱ, ㄴ, ㄷ 모양의 캐릭터 블록을 하나씩 소개하며 이름을 붙이고, 같은 소리로 시작하는 낱말을 떠올려 보는 놀이입니다. 캐릭터와 함께 자음의 모양과 소리를 자연스럽게 이어 볼 수 있습니다.',
    more: [['자음 인지', '캐릭터 모양으로 자음의 생김새를 기억해요.'], ['소리 인식', '같은 첫소리로 시작하는 낱말을 찾아요.'], ['어휘 확장', '캐릭터마다 어울리는 낱말을 떠올려요.'], ['학습 흥미', '친구 같은 캐릭터로 한글을 즐겁게 만나요.']]},
};
// Finger Gym!만 Figma에 세부 화면이 있다.
const FINGER = {
  name: 'Finger Gym!', chips: [['cStar', '신체 · 언어'], ['cFace', '1 ~ 2명'], ['cPace', '4세 이상'], ['dAlarm', '약 10분'], ['bar', '기초 단계']],
  headline: '연필잡기 어려운 친구들을 위한 손가락 놀이',
  desc: '아이들의 소근육 발달을 돕는 재미있는 한글 자음 모음 손가락 놀이! 손가락에 힘이 부족한 친구들이 자음과 모음을 쉽게 배울 수 있는 놀이로, 손가락에 한글을 적고 자음 순서대로 접는 운동을 통해 한글을 배우고 손의 힘을 키울 수 있습니다.',
  more: [['소근육 발달', '손가락을 이용한 운동으로 글씨 쓰기에 필요한 손의 힘을 키워요.'], ['눈-손 협응력', '자음을 보고 손가락으로 따라 접으며 눈과 손의 조화를 발달시켜요.'], ['집중력 향상', '놀이를 통해 재미있게 한글을 익히면서 집중력도 함께 길러요.'], ['한글 학습', '색깔과 손가락 운동을 결합해 자연스럽게 한글을 익혀요.']],
};

// 브랜드 소개 캐러셀 3장
const INTRO = [
  {en: 'Design play recipe', h: '우리 아이 맞춤 놀이', p: '아이의 연령, 발달 단계, 놀이 상황에 맞춘 다양한 활동을 추천합니다. 이응이의 맞춤형 놀이 콘텐츠는 아이들의 전인적 성장을 돕기 위해<br>신체, 정서, 인지, 언어, 사회적 관계를 고려하여 설계되었습니다.', img: 'intro-recipe', to: '.s-recipe'},
  {en: 'oioiooi playground', h: '이야기 놀이터', p: '이응이와 함께하는 창의적 놀이와 참여가 어우러진 공간입니다.<br>다양한 참여형 활동과 놀이 아이디어를 공유하고, 부모와 아이가<br>함께 놀이의 즐거움과 성장을 경험할 수 있는 공간입니다.', img: 'intro-playground', to: '.s-play'},
  {en: 'oioiooi story', h: '이야기 소식', p: '이응이의 최신 뉴스와 박람회, 행사 소식을 빠르게 만나보세요.<br>이응이의 활동과 새로운 제품, 브랜드 이야기를 통해<br>소식을 전달합니다.', img: 'intro-story', to: '.s-story'},
];
// Design play recipe 탭: Figma에 있는 조합(각 탭의 첫 칩, 연령 12-24개월)은 그대로, 나머지 칩은 같은 기준으로 골라 채운다.
const RECIPE = [
  {tab: '연령별 추천', head: () => '영아 발달에 필요한 오감 자극 중심 놀이', chips: ['0-6개월', '6-12개월', '12-24개월', '24-36개월', '36-48개월', '48-60개월', '60개월-저학년'],
    sets: [['rattle', 'wood', 'film'], ['film', 'rattle', 'count'], ['block', 'car', 'match'], ['shape', 'face', 'emotion'], ['choco', 'match', 'shape'], ['finger', 'english', 'choco'], ['english', 'finger', 'face']]},
  {tab: '활동별 추천', head: i => AREA_DESC[AREAS[i]].replace(/\.$/, ''), chips: AREAS.map(a => a + '발달'),
    sets: [['shape', 'choco', 'english'], ['finger', 'block', 'rattle'], ['face', 'match', 'count'], ['car', 'emotion', 'face'], ['block2', 'car', 'emotion']]},
  {tab: '인원별 추천', head: () => '아이 혼자서도 잘 놀 수 있어요', chips: ['아이 혼자', '부모와 함께', '형제자매와 함께', '친구들과 함께'],
    sets: [['rattle', 'emotion', 'film'], ['finger', 'count', 'choco'], ['wood', 'block', 'emotion'], ['match', 'choco', 'block2']]},
  {tab: '시간별 추천', head: () => '짧은 자투리 시간을 활용해 아이와 놀아요', chips: ['10분 이내', '10분 - 20분', '20분 이상'],
    sets: [['count', 'emotion', 'face'], ['block', 'english', 'finger'], ['choco', 'match', 'shape']]},
];
const PLAY = [['strategy', '미션 및 도전 활동', '월별로 제공되는 놀이 미션과 단계별 작은 도전을 통해<br>아이의 성장 과정을 게임처럼 즐겁게 채워나갈수 있습니다. 미션을 완수하고 아이와 함께 보람찬 성취감을 느껴보세요.'],
  ['folder', '아카이브 기능', '아이들이 학습 과정을 통해 만들어낸 결과물과 성과를<br>기록하고, 소중한 성장의 발자취를 남길 수 있는 아카이브 기능을 제공합니다. 사진과 이야기를 통해 다른 부모님과<br>함께 경험을 공유할 수 있습니다.'],
  ['forum', '커뮤니티 및 후기 공유', '아이와 함께한 놀이 후기를 남기고, 다른 부모님들과<br>소통하며 유익한 피드백을 주고받는 커뮤니티가 마련되어 있습니다. 서로의 경험을 통해 더욱 풍부한 학습 경험을<br>나눌 수 있습니다.']];
const REVIEWS = [
  {t: '재질도 너무 부드럽고, 디자인도 예뻐서<br>애들이 그림보며 잘 갖고 놀아요~', by: '- 블로그 hann***** 님', img: 'review2'},
  {t: '아이가 너무 좋아해요. 글자 숫자들이<br>귀엽고 이쁘다고 좋아해요.', by: '- 블로그 mokk**** 님', img: 'review1'},
  {t: '글씨도 귀엽고 그림도 넘 앙증맞아요~<br>무엇보다 kc인증에 유럽인증까지 받은 제품이라 더 마음 놓고 놀 수 있겠어요!', by: '- 블로그 leel****** 님', img: 'review3'},
];
// 활동 리스트 섹션: 활동 id 또는 [id, 그 섹션에서 보이는 태그]
const PERSONAL = [['관심 활동', ['finger', 'block', 'car', 'match']], ['추천 활동', ['face', 'count', 'film', 'choco']]];
const SECTIONS = [
  {name: '인기활동', icon: 'bookmark', cls: 'pop', items: ['finger', 'car', 'wood', 'block2']},
  {name: '언어발달', icon: '언어', cls: 'lang', items: ['choco', 'shape', 'count', 'english']},
  {name: '신체발달', icon: '신체', cls: 'body', items: ['finger', 'block', 'rattle', 'wood']},
  {name: '인지발달', icon: '인지', cls: 'cog', items: [['face', ['인지']], ['count', ['인지']], ['film', ['인지']], ['choco', ['인지']]]},
  {name: '정서발달', icon: '정서', cls: 'emo', items: [['match', ['정서']], ['block2', ['정서']], ['face', ['정서']], ['car', ['정서']]]},
  {name: '관계발달', icon: '관계', cls: 'rel', items: ['block2', 'block2', 'block2', 'block2']},
];
const FILTERS = {
  age: ['연령', ['0-6개월', '6-12개월', '12-24개월', '24-36개월', '36-48개월', '48-60개월']],
  people: ['인원', ['1명', '2명', '3명 이상']],
  time: ['시간', ['10분 이내', '10분 - 20분', '20분 이상']],
};
const nums = s => (s.match(/\d+/g) || []).map(Number);
const PASS = {
  age: (a, v) => { const [lo] = nums(a.age), [flo, fhi] = nums(FILTERS.age[1][v]); return lo >= flo && lo < fhi; },
  people: (a, v) => { if (a.people === '자유') return true; const n = nums(a.people), min = Math.min(...n), max = Math.max(...n); return v === 2 ? max >= 3 : min <= v + 1 && max >= v + 1; },
  time: (a, v) => { const [lo] = nums(a.time); return v === 0 ? lo < 10 : v === 1 ? lo >= 10 && lo < 20 : lo >= 20; },
};

const tag = t => `<span class="tp-tag ${AREA_CLS[t.slice(0, 2)] || ''}">${t}</span>`;
const card = (id, liked, tags) => {
  const a = ACTS[id], key = a.detail || id;
  return `<button type="button" class="tp-card" data-act="${id}"><span class="tp-card-img">${img(a.img + '.webp')}<span class="tp-like${liked ? ' on' : ''}" data-like="${key}" role="button" aria-label="찜하기">${liked ? ICON.heartOn : ICON.heartOff}</span></span>
    <span class="tp-card-info"><span class="tp-tags">${(tags || a.tags).map(tag).join('')}<span class="tp-tag age">${a.age}</span></span><strong>${a.title}</strong><span class="tp-meta"><span>${ICON.alarm}${a.time}</span><span>${ICON.face}${a.people}</span></span></span></button>`;
};
const logo = (go = 'main') => `<button type="button" class="tp-logo" data-go="${go}" aria-label="이응이 홈">${img('logo.webp')}</button>`;
const gnb = (active, user) => `<header class="tp-gnb">${logo()}<nav>${[['About us', 'about'], ['Activities', 'list'], ['Community'], ['Notice'], ['Shop']].map(([n, go]) => `<span class="${n === active ? 'on' : ''}"${go ? ` data-go="${go}"` : ` data-toast="${n}은 준비 중이에요"`}>${n}</span>`).join('')}</nav><span class="tp-brown" data-signin data-go="${user ? 'list' : 'onboard'}">${user ? 'My page' : 'Sign in'}</span></header>`;
const chevronL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const playSvg = '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="42" fill="#fdd001"/><path d="M41 32v36l28-18z" fill="#fff"/></svg>';
const RING = [-2, -1, 0, 1, 2];

// cover: false면 표지(메인) 없이 브랜드 소개부터 쓴다(포트폴리오 안 임베드용). onScreen은 화면이 바뀔 때마다 이름을 받는다.
// allow를 주면 그 화면들로만 이동하고, 나머지로 가려 하면 blocked 문구를 토스트로 띄운 채 머문다. signIn: false면 GNB의 Sign in·My page를 막는다.
export function mountTablet(host, {tour = null, start = 'main', caption = true, cover = true, onScreen = null, allow = null, blocked = '이 화면은 다음 장에서 체험해 볼 수 있어요', signIn = true} = {}) {
  const fresh = () => ({sit: null, kids: 1, ages: new Set(), areas: new Set(), levels: {언어: new Set(), 신체: new Set()}, lv: 0, step: 0, done: false,
    filter: {age: null, people: null, time: null}, menu: null, act: 'finger', more: false, rtab: 0, rchip: 0, slide: 0, review: 1});
  const st = Object.assign(fresh(), {liked: new Set(['finger', 'block'])});
  host.classList.add('tp-host');
  host.innerHTML = `<div class="tp-device"><div class="tp-glass"><div class="tp-canvas" role="application" aria-label="이응이 프로토타입"><div class="tp-view"></div><div class="tp-toast" aria-live="polite"></div><div class="tp-cursor" aria-hidden="true"></div></div></div></div>${caption ? '<p class="tp-caption"><span class="tp-dot"></span><span class="tp-caption-text">프로토타입 · 눌러서 직접 사용해 보세요</span></p>' : ''}`;
  const glass = host.querySelector('.tp-glass'), canvas = host.querySelector('.tp-canvas'), view = host.querySelector('.tp-view');
  const cursor = host.querySelector('.tp-cursor'), toastEl = host.querySelector('.tp-toast'), capText = host.querySelector('.tp-caption-text');
  let screen = '', scale = 1;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  // 높이는 비율(aspect-ratio)로 정해 두고, 폭이 바뀔 때 캔버스 배율만 바꾼다(관찰 대상의 높이를 직접 바꾸면 사파리 등에서 ResizeObserver 반복 오류가 난다).
  glass.style.aspectRatio = `${W} / ${H}`;
  new ResizeObserver(() => { scale = glass.clientWidth / W; canvas.style.transform = `scale(${scale})`; }).observe(glass);

  const levelAreas = () => { const s = ['언어', '신체'].filter(a => st.areas.has(a)); return s.length ? s : ['언어', '신체']; };
  const chips = () => {
    const ages = [...st.ages].sort().map(i => AGES[i].replace('~', '-').replace(' 이상', '+')).join('<i></i>') || '전체 연령';
    const areas = AREAS.filter(a => st.areas.has(a)).join('<i></i>') || '전체 발달';
    return `<div class="tp-chips"><span>${ICON.cFace}${st.kids}명</span><span>${ICON.cPace}${ages}</span><span>${ICON.cStar}${areas}</span><span class="re" data-restart>${ICON.cRenew}재선택</span></div>`;
  };

  const screens = {
    main: () => `<div class="tp-main"><video class="bg" src="${IMG}hero.mp4" poster="${IMG}hero.webp" muted loop playsinline${reduced.matches ? '' : ' autoplay'} aria-hidden="true"></video><i class="shade"></i>${logo('about')}<span class="tp-brown sign" data-go="onboard">Sign in</span>
      <h2>DESIGN, PLAY AND KIDS.</h2><p>이응이는 아이들이 놀이를 통해 세상을 경험하기를 희망합니다.</p>
      <div class="btns"><span class="tp-ghost-w" data-go="about" data-tour="about">About us</span><span class="tp-ghost-w" data-toast="Shop은 준비 중이에요">Shop</span></div>
      <button type="button" class="scroll" data-go="about" aria-label="아래로">${img('scroll.gif')}<span>scroll</span></button></div>`,

    about: () => `${gnb('About us')}<div class="tp-scroll tp-about">
      <section class="s-intro"><div class="tp-intro-text rv">${introText(st.slide)}</div><div class="tp-ring rv" style="--i:1" data-ring="intro">${introRing()}</div>
        <div class="tp-dots3 rv" style="--i:2">${INTRO.map((_, i) => `<i class="${i === st.slide ? 'on' : ''}" data-slide="${i}"></i>`).join('')}</div></section>
      <section class="s-recipe"><div class="tp-sec-head rv"><p class="en">Design play recipe ${ICON.arrow}</p><h3>연령과 발달 목표에 따른 우리 아이 맞춤 놀이</h3><p>이응이의 콘텐츠는 신체, 정서, 인지, 언어, 사회 관계 등 아이의 전인적 성장을 돕는 요소들로 구성되어 있습니다.<br>각 연령과 발달 목표에 최적화된 맞춤형 놀이와 교구를 통해 부모와 아이가 함께 즐겁게 학습하며 성장할 수 있습니다.</p></div>
        <div class="tp-rtabs rv" style="--i:1">${RECIPE.map((r, i) => `<span class="${i === st.rtab ? 'on' : ''}" data-rtab="${i}">${r.tab}</span>`).join('')}</div>
        <div class="tp-board rv" style="--i:2">${board()}</div></section>
      <section class="s-play"><div class="tp-left-head rv"><p class="en">oioiooi playground ${ICON.arrow}</p><h3>아이들의 놀이 경험을<br>기록하고 공유하는 공간,<br>이야기 놀이터</h3><p>이응이와 함께 아이들의 놀이와 배움의 여정을 기록하고 공유하는 공간입니다. 교육 철학이 담긴 콘텐츠와 함께<br>아이의 발달 단계에 맞는 창의적인 놀이를 경험하세요.</p></div>
        <div class="tp-play-cards stg">${PLAY.map(([ic, t, d]) => `<div class="tp-pcard" data-toast="${t}은 준비 중이에요">${ICON[ic]}<strong>${t}</strong><p>${d}</p><span class="go">${ICON.arrow}</span></div>`).join('')}</div></section>
      <section class="s-story"><div class="tp-left-head rv"><p class="en">oioiooi story ${ICON.arrow}</p><h3>이응이의 최신 이야기를<br>빠르게 만날 수 있는 이응이 소식</h3><p class="gray">이응이의 최신 뉴스와 박람회, 행사 소식을 빠르게 만나보세요.<br>이응이의 활동과 새로운 제품, 브랜드 이야기를 통해 소식을 전달합니다.</p></div>
        <div class="tp-story-band rv-img"><video src="${IMG}story.mp4" poster="${IMG}story.webp" muted loop playsinline preload="none" aria-hidden="true"></video></div></section>
      <section class="s-review">${img('review-bg.webp', 'bg')}<h3 class="rv">oioiooi Review</h3><div class="tp-ring rv" style="--i:1" data-ring="review">${reviewRing()}</div></section></div>`,

    onboard: () => {
      const s = st.step;
      let body = '', ok = true;
      if (s === 0) {
        ok = st.sit != null;
        body = `<h4>어떤 상황에서 이응이 제품을 사용하려고 하시나요?</h4><p class="sub">답변에 따라 적합한 활동과 제품을 추천해 드릴게요.</p><div class="tp-sit">${[['부모', '가정에서 사용해요.', 'home'], ['교사, 원장', '어린이집, 유치원 등<br>기관에서 사용해요.', 'inst']].map(([l, t, ic], i) => `<button type="button" class="tp-obcard${st.sit === i ? ' on' : ''}" data-sit="${i}"><em>${l}</em><strong>${t}</strong>${ICON[ic]}</button>`).join('')}</div>`;
      } else if (s === 1) {
        body = `<h4>몇 명의 아이들이 함께 사용할 계획인가요?</h4><div class="tp-stepper"><button type="button" data-kids="-1" aria-label="한 명 줄이기"${st.kids < 2 ? ' disabled' : ''}>${ICON.minus}</button><span>${st.kids} 명</span><button type="button" data-kids="1" aria-label="한 명 늘리기"${st.kids > 4 ? ' disabled' : ''}>${ICON.plus}</button></div>
          <div class="tp-kids">${Array.from({length: st.kids}, (_, i) => `<span>${ICON['kid' + i % 3]}</span>`).join('')}</div>`;
      } else if (s === 2) {
        ok = st.ages.size > 0;
        body = `<h4>아이의 연령대는 어떻게 되나요?</h4><p class="sub">아이가 여러명일 경우 해당되는 모든 연령대를 선택해주세요.</p><div class="tp-agegrid">${AGES.map((a, i) => `<button type="button" class="${st.ages.has(i) ? 'on' : ''}" data-age="${i}">${a}이에요.</button>`).join('')}</div>`;
      } else if (s === 3) {
        ok = st.areas.size > 0;
        body = `<h4>관심있는 발달 영역을 모두 선택해주세요.</h4><div class="tp-areagrid">${AREAS.map(a => `<button type="button" class="tp-obcard${st.areas.has(a) ? ' on' : ''}" data-area="${a}"><em>${a}발달</em><strong>${AREA_CARD[a]}</strong>${ICON[a]}</button>`).join('')}</div>`;
      } else {
        const list = levelAreas();
        ok = list.every(a => st.levels[a].size > 0);
        body = `<h4>아이의 세부적인 발달 정도를 알려주세요.</h4><div class="tp-lvring">${list.map((a, i) => `<div class="tp-lvcard" data-d="${i - st.lv}" data-lvcard="${i}"><em>${a}발달</em><strong>${AREA_DESC[a]}</strong><ul>${LEVELS[a].map((t, j) => `<li class="${st.levels[a].has(j) ? 'on' : ''}" data-lv="${a}:${j}">${ICON.check}${t}</li>`).join('')}</ul></div>`).join('')}</div>`;
      }
      return `<div class="tp-ob">${logo()}<div class="tp-ob-dots">${[0, 1, 2, 3, 4].map(i => `<i class="${i === s ? 'on' : ''}"></i>`).join('')}</div>${body}
        <div class="tp-ob-foot">${s ? `<span class="prev" data-prev>${chevronL}이전</span>` : '<span></span>'}<span><span class="skip" data-skip>넘기기</span><button type="button" class="tp-next${ok ? '' : ' off'}" data-next>다음</button></span></div></div>`;
    },

    loading: () => `<div class="tp-ob tp-loading">${logo()}${img('loading.gif', 'spin')}<p>Loading...</p></div>`,

    recommend: () => `<div class="tp-ob tp-rec">${logo()}<h4>이응이님을 위한 추천 활동이에요!</h4>${chips()}<div class="tp-row3">${['rattle2', 'consonant', 'finger2'].map(id => card(id, st.liked.has(ACTS[id].detail || id))).join('')}</div><span class="tp-more" data-go="list">더 많은 활동 보러가기</span></div>`,

    list: () => {
      const f = st.filter, pass = a => Object.keys(f).every(k => f[k] == null || PASS[k](a, f[k]));
      const row = items => {
        const vis = items.map(x => Array.isArray(x) ? x : [x]).filter(([id]) => pass(ACTS[id]));
        return vis.length ? `<div class="tp-row4">${vis.map(([id, tags]) => card(id, st.liked.has(id), tags)).join('')}</div>` : '<p class="tp-empty">조건에 맞는 활동이 없어요. 필터를 바꿔보세요.</p>';
      };
      const label = k => f[k] == null ? FILTERS[k][0] : FILTERS[k][1][f[k]];
      const drops = Object.keys(FILTERS).map(k => `<span class="tp-drop${f[k] != null ? ' set' : ''}" data-menu="${k}">${label(k)}${ICON.drop}${st.menu === k ? `<span class="tp-menu"><span data-pick="${k}" data-val="null">전체</span>${FILTERS[k][1].map((v, i) => `<span data-pick="${k}" data-val="${i}">${v}</span>`).join('')}</span>` : ''}</span>`).join('');
      const head = st.done ? `<div class="tp-list-band"><h3>이응이님을 위한 맞춤 놀이</h3>${chips()}</div>${PERSONAL.map(([t, items]) => `<div class="tp-lsec"><div class="tp-lhead"><h4>${t}</h4><span class="tp-all">전체보기</span></div>${row(items)}</div>`).join('')}<hr class="tp-gap">` : '';
      return `${gnb('Activities', st.done)}<div class="tp-scroll tp-list${st.done ? '' : ' guest'}">${head}<div class="tp-filters"><h3>전체 활동</h3>${drops}</div>
        ${SECTIONS.map(s => `<div class="tp-lsec ${s.cls}"><div class="tp-lhead"><h4>${ICON[s.icon]}${s.name}</h4><span class="tp-all">전체보기</span></div>${row(s.items)}</div>`).join('')}</div>`;
    },

    detail: () => {
      const a = ACTS[st.act], fg = st.act === 'finger', liked = st.liked.has(st.act);
      const info = INFO[st.act] ?? {headline: a.title, desc: '영상 가이드를 따라 교구 활용법을 익히고, 놀이가 끝나면 결과물을 아카이브에 남겨보세요.'};
      const people = a.people.replace(/\s*~\s*/, ' ~ ').replace(/\s*명/, '명'), time = '약 ' + a.time.replace(/\s/g, '').replace('min', '분');
      const d = fg ? FINGER : {name: a.title, chips: [['cStar', a.tags.join(' · ')], ['cFace', people], ['cPace', a.age], ['dAlarm', time], ...(info.level ? [['bar', info.level]] : [])], ...info};
      return `<div class="tp-scroll tp-detail"><div class="tp-d-left"><span class="tp-back" data-go="list" aria-label="뒤로">${ICON.back}</span>
        <h3${/[가-힣]/.test(d.name) ? ' class="ko"' : ''}>${d.name}<span class="tp-dlike${liked ? ' on' : ''}" data-like="${st.act}" role="button" aria-label="찜하기">${liked ? ICON.heartOn : ICON.fav}</span></h3>
        <div class="tp-dchips">${d.chips.map(([ic, t]) => `<span>${ICON[ic]}${t}</span>`).join('')}</div>
        <h4>${d.headline}</h4><p class="desc">${d.desc}${d.more ? ` <span class="tp-link" data-more>${st.more ? '닫기' : '자세히'}</span>` : ''}</p>
        ${d.more ? `<dl class="tp-moretext${st.more ? ' on' : ''}">${d.more.map(([t, x]) => `<dt>${t}</dt><dd>${x}</dd>`).join('')}</dl>` : ''}
        <div class="tp-dbtns"><span class="tp-brown" data-toast="워크시트를 내려받았어요">${ICON.dl}워크시트 다운로드</span><span class="tp-brown" data-archive>${ICON.cam}결과물 아카이브</span></div>
        <p class="tp-dlabel">관련 제품</p><div class="tp-thumbs">${img('rel1.webp')}${img('rel2.webp')}</div>
        <p class="tp-dlabel res">다른 아이들의 결과물</p><div class="tp-thumbs res">${img('res1.webp')}${img('res2.webp')}${img('res3.webp')}</div></div>
        <div class="tp-d-right${fg ? '' : ' plain'}">${img((fg ? 'detail' : a.img) + '.webp')}<button type="button" class="tp-play" data-play aria-label="활용법 영상 재생">${playSvg}</button><div class="tp-video"><span>● 교구 활용법 영상</span><i class="tp-bar"><b></b></i></div></div></div>`;
    },
  };

  function introText(i) { const s = INTRO[i]; return `<h3 class="en">${s.en}</h3><h4>${s.h}</h4><p>${s.p}</p><span class="tp-gray-btn" data-scroll="${s.to}">더 알아보기</span>`; }
  // 캐러셀: 가운데(d=0)와 양옆 두 장씩 다섯 칸을 그린다. 이동은 칸을 한 칸씩 옮긴 뒤 새 순서로 다시 그린다.
  const at = (list, c, d) => (c + d + list.length * 2) % list.length;
  function introRing() { return RING.map(d => `<div class="tp-islide" data-d="${d}" data-slide="${at(INTRO, st.slide, d)}">${img(INTRO[at(INTRO, st.slide, d)].img + '.webp')}</div>`).join(''); }
  function reviewRing() { return RING.map(d => { const i = at(REVIEWS, st.review, d), r = REVIEWS[i]; return `<div class="tp-rcard" data-d="${d}" data-rv="${i}"><p>${r.t}</p><em>${r.by}</em>${img(r.img + '.webp')}</div>`; }).join(''); }
  function board() {
    const r = RECIPE[st.rtab];
    return `<p class="tp-mark">${r.head(st.rchip)}</p><div class="tp-rchips">${r.chips.map((c, i) => `<span class="${i === st.rchip ? 'on' : ''}" data-rchip="${i}">${c}</span>`).join('')}</div>
      <div class="tp-row4 stg">${r.sets[st.rchip].map(id => card(id, st.liked.has(id))).join('')}<button type="button" class="tp-promo" data-go="onboard" data-tour="promo">${img('promo.webp')}<span>내 아이에게 딱 맞는<br>이응이 활동이 궁금하다면</span><em>맞춤 활동 추천받기</em></button></div>`;
  }
  function swapBoard() { const b = view.querySelector('.tp-board'); b.innerHTML = board(); b.classList.remove('swap'); void b.offsetWidth; b.classList.add('swap'); }
  // 방향(dir=1: 다음 장)으로 한 칸 옮기는 애니메이션이 끝나면 done으로 다시 그린다.
  function spin(ring, dir, done) { ring.querySelectorAll('[data-d]').forEach(el => { el.dataset.d = +el.dataset.d - dir; }); setTimeout(done, 480); }
  const dirTo = (from, to, n) => ((to - from + n) % n) === 1 ? 1 : -1;
  let autoTimer;
  function autoIntro() { clearTimeout(autoTimer); autoTimer = setTimeout(() => { if (screen === 'about') slideTo(at(INTRO, st.slide, 1)); }, 4200); }
  function slideTo(i) {
    if (i === st.slide) return;
    const dir = dirTo(st.slide, i, 3), sec = view.querySelector('.s-intro'), text = sec.querySelector('.tp-intro-text'), ring = sec.querySelector('[data-ring]');
    st.slide = i; clearTimeout(autoTimer); text.classList.add('out');
    spin(ring, dir, () => {
      ring.innerHTML = introRing(); text.innerHTML = introText(i); text.classList.remove('out');
      sec.querySelectorAll('.tp-dots3 i').forEach((dot, j) => dot.classList.toggle('on', j === i)); autoIntro();
    });
  }
  // 후기는 3.5초마다 한 장씩 옆으로 넘어간다. 직접 넘기면 그때부터 다시 센다.
  let reviewTimer;
  function autoReview() { clearTimeout(reviewTimer); reviewTimer = setTimeout(() => { if (screen === 'about') reviewTo(at(REVIEWS, st.review, 1)); }, 3500); }
  function reviewTo(i) {
    if (i === st.review) return;
    const dir = dirTo(st.review, i, 3), ring = view.querySelector('[data-ring="review"]'); st.review = i; clearTimeout(reviewTimer);
    spin(ring, dir, () => { ring.innerHTML = reviewRing(); autoReview(); });
  }

  // 표지 ↔ About us는 한 화면씩 위아래로 밀어 넘긴다(slide: 'up' | 'down').
  function go(name, keepScroll, slide = screen === 'main' && name === 'about' ? 'up' : screen === 'about' && name === 'main' ? 'down' : null) {
    if (!cover && name === 'main') { name = 'about'; slide = null; }
    if (allow && screen && !allow.includes(name)) { toast(blocked); return; }
    const y = keepScroll ? view.querySelector('.tp-scroll')?.scrollTop : 0;
    const old = slide && !reduced.matches ? view.cloneNode(true) : null;
    screen = name; view.className = `tp-view s-${name}`; view.innerHTML = screens[name]();
    if (keepScroll && y) view.querySelector('.tp-scroll').scrollTop = y;
    if (old) {
      old.classList.remove('enter', 'tp-in-up', 'tp-in-down'); old.classList.add(`tp-out-${slide}`); old.setAttribute('aria-hidden', 'true');
      view.after(old); view.classList.add(`tp-in-${slide}`); setTimeout(() => old.remove(), 800);
      // GNB가 내려오는 애니메이션(0.72s 뒤 0.5s)이 끝날 때까지 클래스를 둔다.
      const cls = `tp-in-${slide}`; setTimeout(() => view.classList.remove(cls), 1300);
    } else if (!keepScroll) { view.classList.remove('enter'); void view.offsetWidth; view.classList.add('enter'); }
    lastTop = 0; topSince = Date.now();
    if (name === 'about') { autoIntro(); autoReview(); reveal(); } else { clearTimeout(autoTimer); clearTimeout(reviewTimer); }
    if (name === 'loading') setTimeout(() => { if (screen === 'loading') go('recommend'); }, 1900);
    onScreen?.(name);
  }
  let toastTimer;
  function toast(text) { toastEl.textContent = text; toastEl.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('on'), 1600); }
  const finish = () => { st.done = true; go('loading'); };
  // 세부 발달 단계는 화면을 다시 그리지 않고 제자리에서 바꾼다: 문항 선택은 색만, 카드 이동은 data-d만 바꿔 옆으로 미끄러지게.
  function syncLevels() {
    const list = levelAreas();
    view.querySelectorAll('.tp-lvcard').forEach((card, i) => { card.dataset.d = i - st.lv; card.querySelectorAll('li').forEach((li, j) => li.classList.toggle('on', st.levels[list[i]].has(j))); });
    view.querySelector('[data-next]')?.classList.toggle('off', !list.every(a => st.levels[a].size > 0));
  }
  const resetOnboard = () => Object.assign(st, {step: 0, sit: null, kids: 1, ages: new Set(), areas: new Set(), levels: {언어: new Set(), 신체: new Set()}, lv: 0});
  const scrollIn = (sel, offset = 0) => { const sc = view.querySelector('.tp-scroll'), el = view.querySelector(sel); if (sc && el) sc.scrollTo({top: el.offsetTop + offset, behavior: 'smooth'}); };

  // 표지에서 아래로 굴리면 About us로 넘어간다. About us는 보통 스크롤이고, 맨 위에 멈춰 있다가 위로 더 굴리면 표지로 돌아간다.
  // 위로 스크롤하던 관성이 맨 위에 닿자마자 표지로 넘어가지 않도록, 맨 위에 0.4초 이상 머문 뒤의 휠만 받는다.
  let pageLock = 0, topSince = 0;
  canvas.addEventListener('wheel', e => {
    const now = Date.now();
    if (screen === 'main') {
      if (e.deltaY <= 0) return;
      e.preventDefault(); if (now > pageLock && e.deltaY > 4) { pageLock = now + 900; go('about'); }
      return;
    }
    if (!cover || screen !== 'about' || e.deltaY >= 0) return;
    const sc = view.querySelector('.tp-scroll');
    if (sc.scrollTop > 0) return;
    e.preventDefault();
    if (now > pageLock && now - topSince > 400) { pageLock = now + 900; go('main'); }
  }, {passive: false});
  // 스크롤: 내리면 GNB를 숨기고 올리면 다시 내려보낸다. About us는 맨 위에 닿은 시각을 기록한다.
  let lastTop = 0;
  canvas.addEventListener('scroll', e => {
    const sc = e.target; if (!sc.classList?.contains('tp-scroll')) return;
    const y = sc.scrollTop, g = view.querySelector('.tp-gnb');
    if (g && Math.abs(y - lastTop) > 4) g.classList.toggle('hide', y > lastTop && y > 113);
    if (y <= 0 && lastTop > 0) topSince = Date.now();
    lastTop = y;
  }, true);
  // 창이 가려져 있을 때 막힌 영상 재생은 다시 보일 때 이어 간다.
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !reduced.matches) view.querySelectorAll('.in video, .tp-main video').forEach(v => v.paused && v.play().catch(() => {})); });
  // About us 섹션이 화면에 들어오면 .in을 붙여 안의 요소들을 차례로 떠오르게 한다.
  function reveal() {
    const sc = view.querySelector('.tp-about'); if (!sc) return;
    if (reduced.matches || !('IntersectionObserver' in window)) { sc.querySelectorAll('section').forEach(x => x.classList.add('in')); return; }
    // 소식 영상은 섹션이 보일 때 재생을 시작한다.
    const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add('in'); x.target.querySelector('video')?.play().catch(() => {}); io.unobserve(x.target); } }), {root: sc, threshold: .22});
    sc.querySelectorAll('section').forEach(x => io.observe(x));
  }
  // 터치: 표지에서 위로 밀면 About us로, About us 첫 화면 맨 위에서 아래로 당기면 표지로 돌아간다.
  let touchY = null;
  canvas.addEventListener('touchstart', e => { touchY = e.touches[0].clientY; }, {passive: true});
  canvas.addEventListener('touchend', e => {
    if (touchY == null) return; const dy = (e.changedTouches[0].clientY - touchY) / scale; touchY = null;
    if (screen === 'main' && dy < -60) go('about');
    else if (cover && screen === 'about' && dy > 60 && view.querySelector('.tp-scroll').scrollTop < 5) go('main');
  }, {passive: true});

  // 마우스로 누른 채 끌면 화면이 스크롤된다(휴대폰처럼 밀어서 보기). 놓으면 끌던 속도로 조금 더 미끄러지고, 끈 뒤의 클릭은 버튼으로 받지 않는다.
  // 표지에서 위로 끌면 About us로, About us 맨 위에서 아래로 끌면 표지로 넘어간다(터치와 같다). 끄는 동안 canvas에 .tp-dragging을 붙인다(커서 모양용).
  let drag = null, glide = 0, dragged = false;
  const SLOP = 8, VMAX = 2.4; // 끌기로 볼 최소 이동(화면 px)·놓은 뒤 미끄러짐 최대 속도(px/ms)
  canvas.addEventListener('dragstart', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    cancelAnimationFrame(glide);
    drag = {x: e.clientX, y: e.clientY, sc: e.target.closest?.('.tp-scroll'), top: 0, moved: false, id: e.pointerId, trace: []};
  });
  canvas.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved) {
      // 누르는 중 손이 살짝 흔들린 정도는 클릭으로 둔다. 넘으면 그 자리를 기준점으로 삼아 화면이 한 번에 튀지 않게 한다.
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < SLOP) return;
      drag.moved = true; drag.y = e.clientY; if (drag.sc) drag.top = drag.sc.scrollTop;
      canvas.classList.add('tp-dragging'); try { canvas.setPointerCapture(e.pointerId); } catch {}
    }
    if (drag.sc) { drag.sc.style.scrollBehavior = 'auto'; drag.sc.scrollTop = drag.top - (e.clientY - drag.y) / scale; }
    drag.trace.push({y: e.clientY, t: e.timeStamp}); if (drag.trace.length > 12) drag.trace.shift();
  });
  const endDrag = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null; canvas.classList.remove('tp-dragging');
    if (!d.moved) return;
    dragged = true; setTimeout(() => { dragged = false; }, 0);
    const dy = (e.clientY - d.y) / scale;
    if (screen === 'main' && dy < -60) return go('about');
    if (cover && screen === 'about' && dy > 60 && d.top < 5) return go('main');
    if (!d.sc || reduced.matches) { if (d.sc) d.sc.style.scrollBehavior = ''; return; }
    // 놓기 직전 0.1초 동안의 평균 속도로만 미끄러진다(마지막 한두 이벤트의 순간 속도로 튕기지 않게). 멈췄다 놓으면 그대로 멈춘다.
    const recent = d.trace.filter(p => e.timeStamp - p.t < 100), a = recent[0], b = recent[recent.length - 1];
    let v = a && b && b.t - a.t > 16 ? Math.max(-VMAX, Math.min(VMAX, (b.y - a.y) / scale / (b.t - a.t))) * 16 : 0; // 프레임당 px
    const step = () => { if (Math.abs(v) < .3) { d.sc.style.scrollBehavior = ''; return; } d.sc.scrollTop -= v; v *= .92; glide = requestAnimationFrame(step); };
    glide = requestAnimationFrame(step);
  };
  canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('click', e => { if (dragged) { e.preventDefault(); e.stopImmediatePropagation(); dragged = false; } }, true);

  canvas.addEventListener('click', e => {
    const t = e.target.closest('[data-like],[data-go],[data-toast],[data-scroll],[data-slide],[data-rv],[data-rtab],[data-rchip],[data-act],[data-sit],[data-kids],[data-age],[data-area],[data-lv],[data-lvcard],[data-next],[data-prev],[data-skip],[data-restart],[data-menu],[data-pick],[data-more],[data-archive],[data-play]');
    if (!t) { if (st.menu) { st.menu = null; go(screen, true); } return; }
    const d = t.dataset;
    if (d.like) {
      e.stopPropagation(); const on = !st.liked.has(d.like); on ? st.liked.add(d.like) : st.liked.delete(d.like);
      t.classList.toggle('on', on); t.innerHTML = on ? ICON.heartOn : t.classList.contains('tp-dlike') ? ICON.fav : ICON.heartOff; if (on) toast('관심 활동에 담았어요'); return;
    }
    if (d.toast) { toast(d.toast); return; }
    if (d.scroll) { scrollIn(d.scroll); return; }
    if (d.slide != null) { slideTo(+d.slide); return; }
    if (d.rv != null) { reviewTo(+d.rv); return; }
    if (d.rtab != null) { st.rtab = +d.rtab; st.rchip = 0; view.querySelectorAll('[data-rtab]').forEach(s => s.classList.toggle('on', s === t)); swapBoard(); return; }
    if (d.rchip != null) { st.rchip = +d.rchip; swapBoard(); return; }
    if (d.act) { st.act = ACTS[d.act].detail || d.act; st.more = false; go('detail'); return; }
    if (d.sit != null) { st.sit = +d.sit; go('onboard', true); return; }
    if (d.kids) { st.kids = Math.min(5, Math.max(1, st.kids + +d.kids)); go('onboard', true); return; }
    if (d.age != null) { const i = +d.age; st.ages.has(i) ? st.ages.delete(i) : st.ages.add(i); go('onboard', true); return; }
    if (d.area) { st.areas.has(d.area) ? st.areas.delete(d.area) : st.areas.add(d.area); go('onboard', true); return; }
    if (d.lv) { const [a, j] = d.lv.split(':'), set = st.levels[a]; set.has(+j) ? set.delete(+j) : set.add(+j); syncLevels(); return; }
    if (d.lvcard != null) { if (+d.lvcard !== st.lv) { st.lv = +d.lvcard; syncLevels(); } return; }
    if ('next' in d) {
      if (!t.classList.contains('off')) { if (st.step < 4) { st.step++; st.lv = 0; go('onboard'); } else finish(); return; }
      if (st.step < 4) { toast('항목을 선택해주세요'); return; }
      // 마지막 단계는 카드마다 하나 이상 골라야 하므로, 비어 있는 카드로 넘겨 준다.
      const empty = levelAreas().findIndex(a => !st.levels[a].size);
      if (empty >= 0 && empty !== st.lv) { st.lv = empty; syncLevels(); } else toast('카드마다 하나 이상 선택해주세요');
      return;
    }
    if ('prev' in d) { if (st.step > 0) { st.step--; st.lv = 0; go('onboard'); } else go('main'); return; }
    // 넘기기: 지금 질문만 건너뛰고 다음 질문으로. 마지막 질문에서 넘기면 추천으로 간다.
    if ('skip' in d) { if (st.step < 4) { st.step++; st.lv = 0; go('onboard'); } else finish(); return; }
    if ('restart' in d) { resetOnboard(); go('onboard'); return; }
    if (d.pick) { st.filter[d.pick] = d.val === 'null' ? null : +d.val; st.menu = null; go('list', true); return; }
    if (d.menu) { st.menu = st.menu === d.menu ? null : d.menu; go('list', true); return; }
    if ('more' in d) { st.more = !st.more; view.querySelector('.tp-moretext').classList.toggle('on', st.more); t.textContent = st.more ? '닫기' : '자세히'; return; }
    if ('archive' in d) {
      scrollIn('.tp-dlabel.res', -300); const th = view.querySelector('.tp-thumbs.res');
      th.classList.remove('flash'); void th.offsetWidth; th.classList.add('flash'); toast('결과물 아카이브에 올렸어요'); return;
    }
    if ('play' in d) { const r = view.querySelector('.tp-d-right'); r.classList.remove('playing'); void r.offsetWidth; r.classList.add('playing'); return; }
    if ('signin' in d && !signIn) { toast('프로토타입에서는 로그인을 지원하지 않아요'); return; }
    if (d.go) { if (d.go === 'onboard') { st.step = 0; st.lv = 0; } go(d.go); }
  });

  // ---- 시연(tour): [동작, 대상 선택자] 목록을 가상 커서로 재생 ----
  const TOURS = {
    entry: [['cap', '메인 · 브랜드 첫 화면'], ['wait', 1500], ['tap', '[data-tour="about"]'],
      ['cap', '브랜드 소개 · 놀이 레시피·놀이터·소식'], ['wait', 1200], ['tap', '.tp-islide[data-d="1"]'], ['wait', 1300], ['tap', '.tp-islide[data-d="1"]'], ['wait', 1200],
      ['scroll', '.s-recipe'], ['tap', '[data-rtab="1"]'], ['wait', 700], ['tap', '[data-rchip="1"]'], ['wait', 1000], ['tap', '[data-tour="promo"]'],
      ['cap', '온보딩 · 아이에 맞춘 다섯 가지 질문'], ['tap', '[data-sit="0"]'], ['tap', '[data-next]'], ['tap', '[data-kids="1"]'], ['tap', '[data-kids="1"]'], ['tap', '[data-next]'],
      ['tap', '[data-age="1"]'], ['tap', '[data-age="2"]'], ['tap', '[data-next]'], ['tap', '[data-area="언어"]'], ['tap', '[data-area="신체"]'], ['tap', '[data-next]'],
      ['tap', '[data-lv="언어:1"]'], ['tap', '[data-lv="언어:2"]'], ['tap', '[data-lvcard="1"]'], ['tap', '[data-lv="신체:2"]'], ['tap', '[data-next]'],
      ['cap', '맞춤 활동 추천'], ['wait', 3800], ['wait', 2400]],
    activity: [['cap', '활동 리스트 · 맞춤 놀이와 전체 활동'], ['wait', 1200], ['scroll', '.tp-filters'], ['tap', '[data-menu="age"]'], ['tap', '[data-pick="age"][data-val="5"]'], ['wait', 1300],
      ['tap', '[data-menu="age"]'], ['tap', '[data-pick="age"][data-val="null"]'], ['tap', '.pop [data-act="finger"]'],
      ['cap', '활동 세부 · 설명과 영상 가이드'], ['wait', 900], ['tap', '[data-more]'], ['wait', 1200], ['tap', '[data-play]'], ['wait', 2600],
      ['cap', '결과물 아카이브 · 기록과 공유'], ['tap', '[data-archive]'], ['wait', 2000]],
  };
  TOURS.full = [...TOURS.entry.slice(0, -1), ['tap', '.tp-more'], ...TOURS.activity];
  // onboard(web-02): 온보딩 다섯 질문 → 로딩 → 맞춤 추천까지만
  TOURS.onboard = [['wait', 800], ...TOURS.entry.slice(TOURS.entry.findIndex(([op, a]) => op === 'cap' && a.startsWith('온보딩')))];
  const START = {entry: 'main', activity: 'list', full: 'main', onboard: 'onboard'};
  let run = 0, userAt = 0;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const idle = () => Date.now() - userAt > 7000;
  let stopped = false;
  const active = () => { const page = host.closest('.page'); return !stopped && host.isConnected && host.dataset.visible !== '0' && (!page || page.classList.contains('is-active')) && !document.hidden; };
  // 대상이 움직이는 중(화면 전환·카드 이동·스크롤)이면 멈출 때까지 기다렸다가 잰다. 움직이는 중에 재면 커서가 엉뚱한 곳으로 갔다가 튕겨 돌아온다
  async function settle(el) {
    let prev = null;
    for (let i = 0; i < 40; i++) {
      const r = el.getBoundingClientRect(), key = `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)}`;
      if (key === prev) return; prev = key; await sleep(50);
    }
  }
  let curX = W * .7, curY = H * .8;
  async function moveTo(el) {
    await settle(el);
    const c = canvas.getBoundingClientRect(), r = el.getBoundingClientRect();
    const x = (r.left + r.width / 2 - c.left) / scale, y = (r.top + r.height / 2 - c.top) / scale;
    // 이동 시간은 거리에 비례(가까우면 0.5초, 화면을 가로지르면 1.2초까지): 먼 곳으로 0.6초 만에 확 날아가 튀어 보이지 않게
    const dist = Math.hypot(x - curX, y - curY), dur = Math.min(1.2, Math.max(.5, dist / 800));
    cursor.style.transitionDuration = `${dur}s, .3s`;
    cursor.style.transform = `translate(${x}px, ${y}px)`; curX = x; curY = y; await sleep(dur * 1000 + 120);
  }
  async function play(id) {
    const my = ++run, steps = TOURS[id];
    Object.assign(st, fresh(), id === 'activity' ? {done: true, sit: 0, kids: 3, ages: new Set([1, 2]), areas: new Set(['언어', '신체'])} : {});
    go(START[id]); cursor.classList.add('on'); cursor.style.transform = `translate(${W * .7}px, ${H * .8}px)`; curX = W * .7; curY = H * .8;
    for (const [op, arg] of steps) {
      while (my === run && !stopped && (!active() || !idle())) { cursor.classList.remove('on'); await sleep(400); }
      if (stopped) return;
      if (my !== run) return;
      cursor.classList.add('on');
      if (op === 'wait') await sleep(arg);
      else if (op === 'cap') { if (capText) capText.textContent = arg; }
      else if (op === 'scroll') { scrollIn(arg); await sleep(900); }
      else if (op === 'tap') {
        let el = view.querySelector(arg);
        for (let i = 0; !el && i < 10; i++) { await sleep(300); el = view.querySelector(arg); }
        if (!el || my !== run) continue;
        // scrollIntoView는 포트폴리오 페이지까지 움직이므로, 태블릿 안의 스크롤 영역만 직접 옮긴다.
        const sc = el.closest('.tp-scroll');
        if (sc) { const top = (el.getBoundingClientRect().top - sc.getBoundingClientRect().top) / scale; if (top < 0 || top > sc.clientHeight - 80) { sc.scrollTo({top: sc.scrollTop + top - 260, behavior: 'smooth'}); await sleep(650); } }
        await moveTo(el); cursor.classList.add('tap'); await sleep(180); cursor.classList.remove('tap');
        el.dispatchEvent(new MouseEvent('click', {bubbles: true})); await sleep(550);
      }
    }
    if (my === run && !stopped) { await sleep(600); play(id); }
  }
  // 직접 조작하는 동안은 시연을 멈추고, 멈춘 시연은 처음부터 다시 재생한다.
  let paused = false;
  const touch = e => { if (!e.isTrusted) return; userAt = Date.now(); cursor.classList.remove('on'); if (tour && !paused) { paused = true; run++; if (capText) capText.textContent = '직접 사용 중 · 잠시 후 시연을 다시 보여드려요'; } };
  canvas.addEventListener('pointerdown', touch); canvas.addEventListener('wheel', touch, {passive: true});
  if (tour && !reduced.matches) {
    var resume = setInterval(() => { if (paused && idle()) { paused = false; play(tour); } }, 1000);
    play(tour);
  } else go(start);
  // 바깥(포트폴리오 탭)에서 온보딩으로 보낼 때는 첫 질문부터 시작한다.
  return {go: name => { if (name === 'onboard') Object.assign(st, {step: 0, lv: 0}); go(name); },
    stop: () => { stopped = true; run++; clearInterval(resume); clearTimeout(autoTimer); clearTimeout(reviewTimer); view.querySelectorAll('video').forEach(v => v.pause()); }};
}
