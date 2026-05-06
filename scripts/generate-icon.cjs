'use strict';

const { createCanvas, loadImage } = require('canvas');
const fs   = require('fs');
const path = require('path');

const SPRITE_PATH = path.join(__dirname, '..', 'src', 'assets', 'sprites', 'idle.png');
const ICONS_DIR   = path.join(__dirname, '..', 'src-tauri', 'icons');

// 배경색: 진한 남색 (앱 테마와 어울리는 색)
const BG_COLOR = '#1a1a2e';

async function generateIcon(sizePx, outName) {
  const canvas = createCanvas(sizePx, sizePx);
  const ctx    = canvas.getContext('2d');

  // 배경
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, sizePx, sizePx);

  // 스프라이트(20x20)를 중앙에 배치 — 아이콘 크기의 70% 차지
  const spriteSize = Math.floor(sizePx * 0.7);
  const offset     = Math.floor((sizePx - spriteSize) / 2);

  const img = await loadImage(SPRITE_PATH);
  ctx.imageSmoothingEnabled = false; // 픽셀아트 선명도 유지
  ctx.drawImage(img, offset, offset, spriteSize, spriteSize);

  const outPath = path.join(ICONS_DIR, outName);
  fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
  console.log(`Generated ${outName} (${sizePx}x${sizePx})`);
}

(async () => {
  await generateIcon(32,  '32x32.png');
  await generateIcon(128, '128x128.png');
  await generateIcon(256, '128x128@2x.png');
  console.log('All icons generated.');
})();
