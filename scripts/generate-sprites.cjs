'use strict';

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Color palette
const C = {
  skin:       '#f5d6b0',
  skinShadow: '#d4a878',
  hair:       '#3a3a3a',
  sideHair:   '#888888',
  black:      '#000000',
  white:      '#ffffff',
  suit:       '#2c3e50',
  suitHL:     '#3d5066',
  tie:        '#c0392b',
  tieDark:    '#7d2419',
  tieMid:     '#a83025',
  pin:        '#f1c40f',
  shine:      '#fff5d8',
  eyebrow:    '#2a2a2a',
  mouth:      '#3a2a1a',
  sweat:      '#5dade2',
  dizzy:      '#9b59b6',
  star:       '#f1c40f',
  red:        '#e74c3c',
  steam:      '#e74c3c',
};

function drawPixel(ctx, x, y, color) {
  if (!color) return;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

function drawBase(ctx) {
  const p = (x, y, color) => drawPixel(ctx, x, y, color);

  // ---- HEAD (rows 0-12) ----

  // Row 0: empty

  // Row 1: bald crown
  for (let x = 7; x <= 12; x++) p(x, 1, C.skin);

  // Row 2: wider crown + shine
  for (let x = 6; x <= 13; x++) p(x, 2, C.skin);
  p(8, 2, C.shine);

  // Row 3: wider + dark hair strands
  for (let x = 5; x <= 14; x++) p(x, 3, C.skin);
  p(7,  3, C.hair);
  p(11, 3, C.hair);

  // Row 4: widest head
  for (let x = 4; x <= 15; x++) p(x, 4, C.skin);

  // Row 5: side hair + eyebrows
  for (let x = 3; x <= 16; x++) p(x, 5, C.skin);
  p(3,  5, C.sideHair);
  p(4,  5, C.sideHair);
  p(15, 5, C.sideHair);
  p(16, 5, C.sideHair);
  // Left eyebrow: cols 5,6,7
  p(5, 5, C.eyebrow);
  p(6, 5, C.eyebrow);
  p(7, 5, C.eyebrow);
  // Right eyebrow: cols 12,13,14
  p(12, 5, C.eyebrow);
  p(13, 5, C.eyebrow);
  p(14, 5, C.eyebrow);

  // Row 6: side hair + eyebrow sides darker
  for (let x = 3; x <= 16; x++) p(x, 6, C.skin);
  p(3,  6, C.sideHair);
  p(16, 6, C.sideHair);
  p(5,  6, C.eyebrow);
  p(6,  6, C.eyebrow);
  p(7,  6, C.eyebrow);
  p(14, 6, C.eyebrow);
  p(12, 6, C.eyebrow);
  p(13, 6, C.eyebrow);

  // Row 7: glasses row (skin base first)
  for (let x = 3; x <= 16; x++) p(x, 7, C.skin);
  p(3,  7, C.sideHair);
  p(16, 7, C.sideHair);

  // Row 8: glasses bottom row
  for (let x = 3; x <= 16; x++) p(x, 8, C.skin);
  p(3,  8, C.sideHair);
  p(16, 8, C.sideHair);

  // Row 9: nose
  for (let x = 4; x <= 15; x++) p(x, 9, C.skin);
  p(9,  9, C.skinShadow);
  p(10, 9, C.skinShadow);

  // Row 10: mouth row
  for (let x = 5; x <= 14; x++) p(x, 10, C.skin);

  // Row 11: chin
  for (let x = 6; x <= 13; x++) p(x, 11, C.skin);

  // Row 12: neck top
  for (let x = 7; x <= 12; x++) p(x, 12, C.skin);

  // ---- GLASSES (overlaid on rows 6-8) ----
  // Left frame top bar: row 6, cols 6,7,8
  p(6, 6, C.black);
  p(7, 6, C.black);
  p(8, 6, C.black);
  // Right frame top bar: row 6, cols 11,12,13
  p(11, 6, C.black);
  p(12, 6, C.black);
  p(13, 6, C.black);

  // Row 7: frame sides + bridge
  p(6,  7, C.black);  // left frame left side
  p(8,  7, C.black);  // left frame right side
  p(9,  7, C.black);  // bridge
  p(10, 7, C.black);  // bridge
  p(11, 7, C.black);  // right frame left side
  p(13, 7, C.black);  // right frame right side
  // Eye whites inside frames
  p(7,  7, C.white);  // left eye
  p(12, 7, C.white);  // right eye

  // Left frame bottom bar: row 8, cols 6,7,8
  p(6, 8, C.black);
  p(7, 8, C.black);
  p(8, 8, C.black);
  // Right frame bottom bar: row 8, cols 11,12,13
  p(11, 8, C.black);
  p(12, 8, C.black);
  p(13, 8, C.black);

  // ---- BODY (rows 13-19) ----

  // Row 13: shirt collar + tie knot + suit shoulders
  p(7,  13, C.white);      // shirt left
  p(12, 13, C.white);      // shirt right
  p(8,  13, C.skinShadow); // neck
  p(9,  13, C.skinShadow); // neck
  p(10, 13, C.skinShadow); // neck
  p(11, 13, C.skinShadow); // neck
  p(9,  13, C.tie);        // tie center
  p(10, 13, C.tie);        // tie center
  // suit sides
  for (let x = 3; x <= 5; x++)  p(x, 13, C.suit);
  for (let x = 14; x <= 16; x++) p(x, 13, C.suit);

  // Row 14: collar sides + tie dark + suit
  p(6,  14, C.white);
  p(7,  14, C.white);
  p(12, 14, C.white);
  p(13, 14, C.white);
  p(9,  14, C.tieMid);
  p(10, 14, C.tieMid);
  for (let x = 2; x <= 5; x++)  p(x, 14, C.suit);
  for (let x = 14; x <= 17; x++) p(x, 14, C.suit);

  // Row 15: lapel + tie widens + suit
  p(6,  15, C.white);
  p(7,  15, C.white);
  p(12, 15, C.white);
  p(13, 15, C.white);
  p(8,  15, C.tie);
  p(9,  15, C.tie);
  p(10, 15, C.tie);
  p(11, 15, C.tie);
  for (let x = 2; x <= 5; x++)  p(x, 15, C.suit);
  for (let x = 14; x <= 17; x++) p(x, 15, C.suit);

  // Row 16: suit body + tie + gold pin
  p(8,  16, C.tie);
  p(9,  16, C.tie);
  p(10, 16, C.tie);
  p(11, 16, C.tie);
  p(9,  16, C.pin);  // gold pin overwrites tie
  for (let x = 2; x <= 7; x++)  p(x, 16, C.suit);
  for (let x = 12; x <= 17; x++) p(x, 16, C.suit);

  // Row 17: suit body + tie
  p(8,  17, C.tie);
  p(9,  17, C.tie);
  p(10, 17, C.tie);
  p(11, 17, C.tie);
  for (let x = 2; x <= 7; x++)  p(x, 17, C.suit);
  for (let x = 12; x <= 17; x++) p(x, 17, C.suit);

  // Row 18: tie narrows
  p(9,  18, C.tie);
  p(10, 18, C.tie);
  for (let x = 2; x <= 8; x++)  p(x, 18, C.suit);
  for (let x = 11; x <= 17; x++) p(x, 18, C.suit);

  // Row 19: tie tip (dark)
  p(9,  19, C.tieDark);
  p(10, 19, C.tieDark);
  for (let x = 2; x <= 8; x++)  p(x, 19, C.suit);
  for (let x = 11; x <= 17; x++) p(x, 19, C.suit);
}

// ---- EXPRESSIONS ----

function exprIdle(ctx) {
  const p = (x, y, color) => drawPixel(ctx, x, y, color);
  // Pupils (overwrites white)
  p(7,  7, C.black);
  p(12, 7, C.black);
  // Flat worried mouth
  p(8,  10, C.mouth);
  p(9,  10, C.mouth);
  p(10, 10, C.mouth);
  p(11, 10, C.mouth);
}

function exprHit(ctx) {
  const p = (x, y, color) => drawPixel(ctx, x, y, color);
  // X eyes (diagonals inside frames)
  // Left eye: X shape at cols 6,7,8 rows 6,7,8
  p(6, 6, C.black);
  p(8, 6, C.black);
  p(7, 7, C.black);
  p(6, 8, C.black);
  p(8, 8, C.black);
  // Right eye: X shape at cols 11,12,13 rows 6,7,8
  p(11, 6, C.black);
  p(13, 6, C.black);
  p(12, 7, C.black);
  p(11, 8, C.black);
  p(13, 8, C.black);
  // Open O mouth
  p(9,  10, C.mouth);
  p(10, 10, C.mouth);
  p(9,  11, C.mouth);
  p(10, 11, C.mouth);
}

function exprDizzy(ctx) {
  const p = (x, y, color) => drawPixel(ctx, x, y, color);
  // Purple pupils
  p(7,  7, C.dizzy);
  p(12, 7, C.dizzy);
  // Stars above head
  p(8,  0, C.star);
  p(11, 0, C.star);
  p(13, 1, C.star);
  // Wavy mouth
  p(8,  10, C.mouth);
  p(9,  11, C.mouth);
  p(10, 10, C.mouth);
  p(11, 11, C.mouth);
}

function exprDown(ctx) {
  const p = (x, y, color) => drawPixel(ctx, x, y, color);
  // Drooped inner eyebrows (sad look)
  p(7,  4, C.eyebrow);
  p(12, 4, C.eyebrow);
  // Half-closed eyes: full black bar across frame rows 7
  p(6,  7, C.black);
  p(7,  7, C.black);
  p(8,  7, C.black);
  p(11, 7, C.black);
  p(12, 7, C.black);
  p(13, 7, C.black);
  // Sweat drop (right side of head)
  p(15, 6, C.sweat);
  p(15, 7, C.sweat);
  // Deep frown (U shape)
  p(8,  10, C.mouth);
  p(11, 10, C.mouth);
  p(9,  11, C.mouth);
  p(10, 11, C.mouth);
}

function exprAngry(ctx) {
  const p = (x, y, color) => drawPixel(ctx, x, y, color);
  // Slanted eyebrows
  p(5,  5, C.eyebrow);
  p(6,  6, C.eyebrow);
  p(14, 5, C.eyebrow);
  p(13, 6, C.eyebrow);
  // Pupils
  p(7,  7, C.black);
  p(12, 7, C.black);
  // Red cheeks
  p(5,  9, C.red);
  p(14, 9, C.red);
  // Wide tight frown
  p(7,  10, C.mouth);
  p(8,  10, C.mouth);
  p(9,  10, C.mouth);
  p(10, 10, C.mouth);
  p(11, 10, C.mouth);
  p(12, 10, C.mouth);
  // Red steam above head
  p(8,  0, C.steam);
  p(9,  0, C.steam);
  p(10, 0, C.steam);
  p(11, 0, C.steam);
}

// ---- GENERATE ----

const SPRITES_DIR = path.join(__dirname, '..', 'src', 'assets', 'sprites');

function generateSprite(name, expressionFn) {
  const canvas = createCanvas(20, 20);
  const ctx = canvas.getContext('2d');

  // Transparent background
  ctx.clearRect(0, 0, 20, 20);

  drawBase(ctx);
  expressionFn(ctx);

  const buffer = canvas.toBuffer('image/png');
  const outPath = path.join(SPRITES_DIR, name + '.png');
  fs.writeFileSync(outPath, buffer);
  const size = fs.statSync(outPath).size;
  console.log(`Generated ${name}.png (${size} bytes)`);
}

generateSprite('idle',  exprIdle);
generateSprite('hit',   exprHit);
generateSprite('dizzy', exprDizzy);
generateSprite('down',  exprDown);
generateSprite('angry', exprAngry);

console.log('All sprites generated successfully.');
