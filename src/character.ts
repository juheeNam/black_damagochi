import { ACCESSORY_LIST } from './accessories';
import type { AccessorySlot, EquippedAccessories } from './accessories';

export type SpriteName = 'idle' | 'angry' | 'dizzy' | 'down' | 'hit' | 'quest';

const SPRITE_NAMES: SpriteName[] = ['idle', 'angry', 'dizzy', 'down', 'hit', 'quest'];
const sprites: Record<SpriteName, HTMLImageElement> = {} as Record<SpriteName, HTMLImageElement>;
const accSprites: Record<string, HTMLImageElement> = {};

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let currentSprite: SpriteName = 'idle';
let equippedAcc: EquippedAccessories = { top: null, face: null, neck: null };

export function initCharacter(canvasEl: HTMLCanvasElement) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d')!;

  for (const name of SPRITE_NAMES) {
    const img = new Image();
    img.src = `/sprites/${name}.png`;
    sprites[name] = img;
  }

  for (const acc of ACCESSORY_LIST) {
    const img = new Image();
    img.src = `/sprites/acc_${acc.id}.png`;
    accSprites[acc.id] = img;
  }
}

export function setEquippedAccessories(acc: EquippedAccessories) {
  equippedAcc = { ...acc };
}

export function setState(state: SpriteName) {
  currentSprite = state;
  canvas.classList.toggle('idle', state === 'idle');
}

export function getState(): SpriteName {
  return currentSprite;
}

export function renderFrame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const img = sprites[currentSprite];
  if (img?.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }
  for (const slot of ['top', 'face', 'neck'] as AccessorySlot[]) {
    const id = equippedAcc[slot];
    if (!id) continue;
    const accImg = accSprites[id];
    if (accImg?.complete && accImg.naturalWidth > 0) {
      ctx.drawImage(accImg, 0, 0, canvas.width, canvas.height);
    }
  }
}
