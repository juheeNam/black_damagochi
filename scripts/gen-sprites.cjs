/**
 * 악세서리 + quest 스프라이트 PNG 생성기
 * 실행: node scripts/gen-sprites.js
 *
 * 캐릭터 픽셀 구조 (20×20, 주요 solid 픽셀):
 *   머리 왼쪽윤곽: (7,1)(6,2)(5,3)(4,4) — 피부색 대각
 *   머리 오른쪽:   (13,2)(14,3)         — 피부색
 *   귀/디테일:      (3,5)                — 회색
 *   몸통:          (4,9)(5,10)(6,11)(7,12) — 피부색 역대각
 *   팔 어둠:        (3,13)(14,13)(2,14)(17,14)
 *   팔 흰:          (7,13)(6,14)(13,14)
 *   발:             (8,15)(11,15)         — 빨간색
 */

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

// ── CRC32 ────────────────────────────────────────────────────────────
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ── PNG 인코더 ───────────────────────────────────────────────────────
function encodePNG(pixels) {
  // pixels: 20×20 배열, 각 요소 [r,g,b,a]
  const W = 20, H = 20;
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 4 + 1)] = 0; // filter: None
    for (let x = 0; x < W; x++) {
      const [r, g, b, a] = pixels[y][x];
      const off = y * (W * 4 + 1) + 1 + x * 4;
      raw[off] = r; raw[off+1] = g; raw[off+2] = b; raw[off+3] = a;
    }
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });

  function chunk(type, data) {
    const lenBuf  = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcVal  = Buffer.alloc(4);
    crcVal.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([lenBuf, typeBuf, data, crcVal]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── 픽셀 그리드 유틸 ─────────────────────────────────────────────────
function blank() {
  return Array.from({ length: 20 }, () =>
    Array.from({ length: 20 }, () => [0, 0, 0, 0])
  );
}

function set(grid, x, y, color) {
  if (x < 0 || x >= 20 || y < 0 || y >= 20) return;
  grid[y][x] = color;
}

function fill(grid, x1, x2, y, color) {
  for (let x = x1; x <= x2; x++) set(grid, x, y, color);
}

// ── 색상 상수 ────────────────────────────────────────────────────────
const SKIN  = [245, 214, 176, 255];
const DARK  = [44,  62,  80,  255];
const WHITE = [255, 255, 255, 255];
const RED   = [192, 57,  43,  255];
const GRAY  = [136, 136, 136, 255];

// idle 픽셀 (quest sprite의 베이스로 재사용)
const IDLE_PIXELS = [
  [7,1,SKIN],  [6,2,SKIN],  [13,2,SKIN], [5,3,SKIN],  [14,3,SKIN],
  [4,4,SKIN],  [3,5,GRAY],  [4,9,SKIN],  [5,10,SKIN], [6,11,SKIN],
  [7,12,SKIN], [3,13,DARK], [7,13,WHITE],[14,13,DARK], [2,14,DARK],
  [6,14,WHITE],[13,14,WHITE],[17,14,DARK],[8,15,RED],  [11,15,RED],
];

// ── 스프라이트 정의 ──────────────────────────────────────────────────

function makeHatTop() {
  // 중절모: 챙 y=0(넓게) + 크라운 y=1
  const g = blank();
  const BRIM   = [40,  35,  30,  255]; // 진한 갈색 챙
  const CROWN  = [25,  20,  18,  255]; // 더 어두운 크라운
  const BAND   = [80,  50,  30,  255]; // 모자 띠 (중간)
  fill(g, 3, 11, 0, BRIM);             // 챙: x=3~11
  fill(g, 5,  9, 1, CROWN);            // 크라운 베이스
  fill(g, 5,  9, 2, CROWN);            // 크라운 위 (머리 일부 덮음)
  set(g, 5, 1, BAND); set(g, 9, 1, BAND); // 모자 띠 양끝
  return g;
}

function makeHatStraw() {
  // 밀짚모자: 크고 넙적한 챙
  const g = blank();
  const STRAW  = [210, 175, 80,  255]; // 밀짚색
  const DARK_S = [160, 120, 40,  255]; // 크라운 어두운 밀짚
  const BAND   = [140,  80, 30,  255]; // 리본 띠
  fill(g, 2, 13, 0, STRAW);            // 넓은 챙
  fill(g, 5,  9, 1, DARK_S);           // 크라운
  fill(g, 5,  9, 2, DARK_S);
  fill(g, 5,  9, 1, BAND);             // 띠는 크라운 위에 덮어서
  // 실제 띠: 크라운 좌우 끝에 색상 강조
  set(g, 5, 1, BAND); set(g, 9, 1, BAND);
  return g;
}

function makeHatSanta() {
  // 산타모자: 흰색 테두리 + 빨간 모자 + 위쪽으로 기울어짐
  const g = blank();
  const TRIM  = [240, 240, 240, 255]; // 흰 테두리
  const SANTA = [200,  45,  45, 255]; // 산타 빨강
  const POMPOM= [255, 255, 255, 255]; // 흰 방울
  // 흰 테두리: y=0 양끝
  fill(g, 3,  5, 0, TRIM);
  fill(g, 9, 11, 0, TRIM);
  // 빨간 모자 몸체
  fill(g, 6,  8, 0, SANTA);
  fill(g, 5,  9, 1, SANTA);
  fill(g, 5,  9, 2, SANTA);
  // 오른쪽으로 기울어진 모자 팁
  set(g, 10, 0, SANTA);
  set(g,  3, 0, TRIM);
  // 방울: y=0 제일 오른쪽 끝
  set(g, 12, 0, POMPOM);
  return g;
}

function makeGlassesSun() {
  // 선글라스: y=3 얼굴 가운데 (머리윤곽 x=5,x=14 사이)
  // 두 렌즈 + 브릿지 + 사이드 다리
  const g = blank();
  const LENS   = [15,  15,  15,  220]; // 진한 렌즈
  const FRAME  = [30,  25,  20,  255]; // 프레임
  const BRIDGE = [50,  45,  40,  200]; // 브릿지
  // 왼쪽 렌즈: x=6,7,8 y=2~3
  fill(g, 6, 8, 2, LENS);
  fill(g, 6, 8, 3, LENS);
  // 오른쪽 렌즈: x=10,11,12 y=2~3
  fill(g, 10, 12, 2, LENS);
  fill(g, 10, 12, 3, LENS);
  // 브릿지: x=9 y=2
  set(g, 9, 2, BRIDGE);
  // 프레임 외곽
  set(g, 5, 2, FRAME); set(g, 5, 3, FRAME);   // 왼 다리
  set(g, 13, 2, FRAME); set(g, 13, 3, FRAME);  // 오른 다리
  return g;
}

function makeGlasses() {
  // 일반 안경: 얇은 와이어 프레임, 파란빛 렌즈
  const g = blank();
  const LENS   = [120, 170, 230, 130]; // 연한 파란 렌즈
  const FRAME  = [80,  80,  100, 220]; // 어두운 프레임
  const BRIDGE = [80,  80,  100, 255];
  // 왼 렌즈
  fill(g, 6, 8, 3, LENS);
  // 오른 렌즈
  fill(g, 10, 12, 3, LENS);
  // 프레임 테두리
  set(g, 6, 2, FRAME); set(g, 8, 2, FRAME);    // 왼 상단
  set(g, 6, 3, FRAME); set(g, 8, 3, FRAME);    // 왼 하단
  set(g, 10, 2, FRAME); set(g, 12, 2, FRAME);  // 오른 상단
  set(g, 10, 3, FRAME); set(g, 12, 3, FRAME);  // 오른 하단
  // 브릿지
  set(g, 9, 3, BRIDGE);
  // 사이드 다리
  set(g, 5, 3, FRAME); set(g, 13, 3, FRAME);
  return g;
}

function makeMask() {
  // 마스크: 하단 얼굴 덮음 (y=4~6)
  const g = blank();
  const CLOTH = [230, 230, 235, 255]; // 흰 마스크
  const EDGE  = [160, 160, 170, 255]; // 테두리/주름
  const WIRE  = [150, 180, 210, 200]; // 콧등 철사
  // 마스크 본체
  for (let y = 4; y <= 6; y++) fill(g, 4, 10, y, CLOTH);
  // 테두리
  fill(g, 4, 10, 4, EDGE);   // 위쪽 테두리
  fill(g, 4, 10, 6, EDGE);   // 아래 테두리
  set(g, 4, 5, EDGE); set(g, 10, 5, EDGE);
  // 콧등 와이어
  fill(g, 6, 8, 4, WIRE);
  return g;
}

function makeTie() {
  // 넥타이: 몸통 따라 대각으로 내려감
  // 몸통 픽셀: (4,9)(5,10)(6,11)(7,12) — 몸통 바로 오른쪽에 배치
  const g = blank();
  const TIE_TOP = [160,  30,  30, 255]; // 진한 빨강
  const TIE_MID = [180,  35,  35, 255];
  const TIE_TIP = [170,  28,  28, 255];
  // 타이 상단 (매듭)
  fill(g, 5, 6, 8, TIE_TOP);
  // 타이 몸통 — 몸통 대각에 따라
  fill(g, 6, 7,  9, TIE_MID);
  fill(g, 7, 8, 10, TIE_MID);
  fill(g, 8, 9, 11, TIE_MID);
  // 타이 팁 (삼각)
  fill(g, 8, 10, 12, TIE_TIP);
  set(g, 9, 13, TIE_TIP);
  return g;
}

function makeRibbon() {
  // 리본: 머리 위 (y=0)에 핑크 리본
  const g = blank();
  const BOW    = [240,  90, 140, 255]; // 핑크
  const CENTER = [210,  60, 110, 255]; // 중심 매듭 (더 어둠)
  const TAIL   = [230,  80, 130, 200]; // 리본 꼬리
  // 왼쪽 bow
  fill(g, 4, 6, 0, BOW);
  // 오른쪽 bow
  fill(g, 9, 11, 0, BOW);
  // 중심 매듭
  set(g, 7, 0, CENTER); set(g, 8, 0, CENTER);
  // 꼬리 (y=1로 내려옴)
  set(g, 7, 1, TAIL); set(g, 8, 1, TAIL);
  return g;
}

function makeMedal() {
  // 메달: 가슴에 금메달 + 리본 줄
  const g = blank();
  const GOLD   = [220, 185,  50, 255]; // 금색
  const LGOLD  = [240, 210,  80, 255]; // 밝은 금색 (하이라이트)
  const RIBBON = [100,  30, 200, 255]; // 메달 리본 (보라)
  const STRIPE = [220,  30,  30, 255]; // 리본 줄기 빨강
  // 리본 줄: 가슴에서 메달까지
  set(g, 6, 8, RIBBON);
  set(g, 6, 9, RIBBON);
  // 메달 원 (y=10~12, x=5~8)
  fill(g, 5, 8, 10, GOLD);
  fill(g, 4, 9, 11, GOLD);
  set(g, 6, 11, LGOLD); set(g, 7, 11, LGOLD);  // 하이라이트
  fill(g, 5, 8, 12, GOLD);
  // 메달 줄기 빨강 (위)
  set(g, 6, 8, STRIPE);
  return g;
}

function makeQuest() {
  // 심부름 중 스프라이트: idle 기반 + 오른쪽에 서류
  const g = blank();
  // idle 픽셀 그대로 복사
  for (const [x, y, c] of IDLE_PIXELS) set(g, x, y, c);

  // 서류 (오른쪽 허리 높이: y=7~12, x=9~14)
  const PAPER  = [235, 232, 220, 255]; // 종이 색
  const LINE   = [100,  95,  90, 200]; // 글씨 줄
  const EDGE   = [170, 160, 140, 255]; // 종이 테두리
  // 서류 본체
  for (let y = 7; y <= 12; y++) fill(g, 9, 14, y, PAPER);
  // 테두리
  for (let y = 7; y <= 12; y++) { set(g, 9, y, EDGE); set(g, 14, y, EDGE); }
  fill(g, 9, 14, 7, EDGE); fill(g, 9, 14, 12, EDGE);
  // 텍스트 줄
  fill(g, 10, 13, 8, LINE);
  fill(g, 10, 12, 9, LINE);
  fill(g, 10, 13, 10, LINE);
  // 오른손이 서류를 잡는 느낌 (17,14 → 더 안쪽으로)
  set(g, 14, 12, DARK);
  set(g, 15, 11, DARK);

  return g;
}

// ── HEAD 픽셀 분리 (y=0~8) / BODY 픽셀 분리 (y=9~19) ────────────────
const HEAD_PIXELS = IDLE_PIXELS.filter(([,y]) => y <= 8);
const BODY_PIXELS = IDLE_PIXELS.filter(([,y]) => y >= 9);

// ── HEAD state 스프라이트 ────────────────────────────────────────────
function makeHeadIdle() {
  const g = blank();
  for (const [x, y, c] of HEAD_PIXELS) set(g, x, y, c);
  return g;
}

function makeHeadAngry() {
  const g = blank();
  for (const [x, y, c] of HEAD_PIXELS) set(g, x, y, c);
  // angry 표시: y=0에 빨간 점 (기존 angry.png의 (8,0) RED 픽셀)
  set(g, 8, 0, RED);
  return g;
}

function makeHeadDizzy() {
  const g = blank();
  for (const [x, y, c] of HEAD_PIXELS) set(g, x, y, c);
  // dizzy 표시: y=0에 별 모양 노란 점 2개 (기존 dizzy.png의 (8,0)(11,0))
  const STAR = [220, 200, 80, 255];
  set(g, 8, 0, STAR); set(g, 11, 0, STAR);
  // 눈 x 표시: 기존 dizzy.png의 (11,1)(12,1) 영역
  set(g, 10, 1, STAR); set(g, 12, 1, STAR);
  return g;
}

function makeHeadDown() {
  // down은 head_idle과 동일 (표정 없음)
  return makeHeadIdle();
}

function makeHeadHit() {
  // hit도 head_idle과 동일
  return makeHeadIdle();
}

// ── BODY style 스프라이트 ─────────────────────────────────────────────
function makeBodyNormal() {
  const g = blank();
  for (const [x, y, c] of BODY_PIXELS) set(g, x, y, c);
  return g;
}

function makeBodyQuest() {
  // body_normal + 오른쪽 y=9~12 서류 (body 영역 내)
  const g = blank();
  for (const [x, y, c] of BODY_PIXELS) set(g, x, y, c);
  const PAPER = [235, 232, 220, 255];
  const LINE  = [100,  95,  90, 200];
  const EDGE  = [170, 160, 140, 255];
  for (let y = 9; y <= 13; y++) fill(g, 9, 14, y, PAPER);
  for (let y = 9; y <= 13; y++) { set(g, 9, y, EDGE); set(g, 14, y, EDGE); }
  fill(g, 9, 14,  9, EDGE); fill(g, 9, 14, 13, EDGE);
  fill(g, 10, 13, 10, LINE);
  fill(g, 10, 12, 11, LINE);
  fill(g, 10, 13, 12, LINE);
  // 손으로 서류 잡는 느낌
  set(g, 14, 13, DARK);
  return g;
}

function makeBodyTieRed() {
  const g = blank();
  for (const [x, y, c] of BODY_PIXELS) set(g, x, y, c);
  const TIE = [180, 30, 30, 255];
  const TIP = [160, 25, 25, 255];
  // 넥타이: 몸통 대각을 따라
  fill(g, 5,  6,  8, TIE);   // 매듭
  fill(g, 6,  7,  9, TIE);
  fill(g, 7,  8, 10, TIE);
  fill(g, 8,  9, 11, TIE);
  fill(g, 8, 10, 12, TIP);   // 팁 (삼각)
  set(g, 9, 13, TIP);
  return g;
}

function makeBodyTieBlue() {
  const g = blank();
  for (const [x, y, c] of BODY_PIXELS) set(g, x, y, c);
  const TIE = [40, 80, 180, 255];
  const TIP = [30, 65, 160, 255];
  fill(g, 5,  6,  8, TIE);
  fill(g, 6,  7,  9, TIE);
  fill(g, 7,  8, 10, TIE);
  fill(g, 8,  9, 11, TIE);
  fill(g, 8, 10, 12, TIP);
  set(g, 9, 13, TIP);
  return g;
}

function makeBodySuitDot() {
  // 땡땡이 양복: 어두운 양복 배경 + 흰 도트
  const g = blank();
  for (const [x, y, c] of BODY_PIXELS) set(g, x, y, c);
  const SUIT = [44, 62, 80, 255];     // 어두운 양복색
  const DOT  = [220, 220, 240, 255];  // 흰/밝은 도트
  // 양복 배경 (몸통 오른쪽 영역 채우기)
  for (let y = 9; y <= 14; y++) fill(g, 8, 14, y, SUIT);
  // 땡땡이 도트
  set(g,  9,  9, DOT); set(g, 13,  9, DOT);
  set(g, 11, 11, DOT);
  set(g,  9, 13, DOT); set(g, 13, 13, DOT);
  // 왼쪽 몸통도 살짝 채우기 (기존 skin 픽셀 오른쪽)
  fill(g, 5,  7,  9, SUIT);
  fill(g, 6,  8, 10, SUIT);
  fill(g, 7,  9, 11, SUIT);
  fill(g, 8, 10, 12, SUIT);
  // 도트 추가 (왼쪽 영역)
  set(g, 6,  9, DOT);
  set(g, 8, 11, DOT);
  return g;
}

function makeBodySuitStripe() {
  // 스트라이프 양복: 세로 줄무늬
  const g = blank();
  for (const [x, y, c] of BODY_PIXELS) set(g, x, y, c);
  const DARK_S  = [44, 62, 80, 255];    // 어두운 줄
  const LIGHT_S = [80, 105, 130, 255];  // 밝은 줄
  // 몸통 전체에 세로 스트라이프
  for (let y = 9; y <= 14; y++) {
    for (let x = 5; x <= 14; x++) {
      set(g, x, y, x % 2 === 0 ? DARK_S : LIGHT_S);
    }
  }
  // 원래 팔 픽셀 복원 (스트라이프 위에 덮어쓰기)
  for (const [x, y, c] of BODY_PIXELS) {
    if (y >= 13) set(g, x, y, c);
  }
  return g;
}

// ── 생성 실행 ────────────────────────────────────────────────────────
const OUT_DIR = path.join(__dirname, '..', 'public', 'sprites');

const sprites = {
  'acc_hat_top':     makeHatTop(),
  'acc_hat_straw':   makeHatStraw(),
  'acc_hat_santa':   makeHatSanta(),
  'acc_glasses_sun': makeGlassesSun(),
  'acc_glasses':     makeGlasses(),
  'acc_mask':        makeMask(),
  'acc_tie':         makeTie(),
  'acc_ribbon':      makeRibbon(),
  'acc_medal':       makeMedal(),
  'quest':           makeQuest(),
  // HEAD state sprites
  'head_idle':       makeHeadIdle(),
  'head_angry':      makeHeadAngry(),
  'head_dizzy':      makeHeadDizzy(),
  'head_down':       makeHeadDown(),
  'head_hit':        makeHeadHit(),
  // BODY style sprites
  'body_normal':     makeBodyNormal(),
  'body_quest':      makeBodyQuest(),
  'body_tie_red':    makeBodyTieRed(),
  'body_tie_blue':   makeBodyTieBlue(),
  'body_suit_dot':   makeBodySuitDot(),
  'body_suit_stripe':makeBodySuitStripe(),
};

for (const [name, grid] of Object.entries(sprites)) {
  const outPath = path.join(OUT_DIR, name + '.png');
  fs.writeFileSync(outPath, encodePNG(grid));
  console.log('Generated:', outPath);
}
console.log('Done!');
