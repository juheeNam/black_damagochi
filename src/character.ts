import { HEAD_STYLES, BODY_STYLES } from './accessories';

export type SpriteName = 'idle' | 'angry' | 'dizzy' | 'down' | 'hit' | 'quest';

const STATE_SPRITES = ['angry', 'dizzy', 'down', 'hit'] as const;
const stateImgs: Record<string, HTMLImageElement> = {};
const headImgs:  Record<string, HTMLImageElement> = {};
const bodyImgs:  Record<string, HTMLImageElement> = {};

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let currentSprite: SpriteName = 'idle';
let currentHead = 'sunglasses';
let currentBody = 'no_tie';

export function initCharacter(canvasEl: HTMLCanvasElement) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d')!;

  for (const name of STATE_SPRITES) {
    const img = new Image();
    img.src = `/sprites/${name}.png`;
    stateImgs[name] = img;
  }
  for (const hs of HEAD_STYLES) {
    const img = new Image();
    img.src = `/sprites/head_${hs.id}.png`;
    headImgs[hs.id] = img;
  }
  for (const bs of BODY_STYLES) {
    const img = new Image();
    img.src = `/sprites/body_${bs.id}.png`;
    bodyImgs[bs.id] = img;
  }
  const questBody = new Image();
  questBody.src = '/sprites/body_quest.png';
  bodyImgs['quest'] = questBody;
}

export function setHeadStyle(id: string) { currentHead = id; }
export function setBodyStyle(id: string) { currentBody = id; }
export function getHeadStyle() { return currentHead; }
export function getBodyStyle() { return currentBody; }

export function setState(state: SpriteName) {
  currentSprite = state;
  canvas.classList.toggle('idle', state === 'idle' || state === 'quest');
}

export function getState(): SpriteName { return currentSprite; }

export function renderFrame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const cw = canvas.width, ch = canvas.height;

  if (currentSprite === 'idle' || currentSprite === 'quest') {
    const bodyKey = currentSprite === 'quest' ? 'quest' : currentBody;
    const bImg = bodyImgs[bodyKey] ?? bodyImgs[currentBody];
    if (bImg?.complete && bImg.naturalWidth > 0) ctx.drawImage(bImg, 0, 0, cw, ch);
    const hImg = headImgs[currentHead];
    if (hImg?.complete && hImg.naturalWidth > 0) ctx.drawImage(hImg, 0, 0, cw, ch);
  } else {
    const sImg = stateImgs[currentSprite];
    if (sImg?.complete && sImg.naturalWidth > 0) ctx.drawImage(sImg, 0, 0, cw, ch);
  }
}
