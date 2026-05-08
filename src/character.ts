import { FACE_STYLES } from './accessories';

export type SpriteName = 'idle' | 'angry' | 'dizzy' | 'down' | 'hit' | 'quest';

type HeadKey = 'head_idle' | 'head_angry' | 'head_dizzy' | 'head_down' | 'head_hit';

const HEAD_NAMES: HeadKey[] = ['head_idle', 'head_angry', 'head_dizzy', 'head_down', 'head_hit'];
const BODY_NAMES = ['body_normal', 'body_quest', 'body_tie_red', 'body_tie_blue', 'body_suit_dot', 'body_suit_stripe'];
const FACE_IDS   = FACE_STYLES.map(f => f.id); // acc_{id}.png

const headSprites: Record<HeadKey, HTMLImageElement> = {} as Record<HeadKey, HTMLImageElement>;
const bodySprites: Record<string,  HTMLImageElement> = {};
const faceSprites: Record<string,  HTMLImageElement> = {};

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let currentSprite: SpriteName = 'idle';
let currentFaceStyle: string | null = null;
let currentBodyStyle: string = 'normal';
let questActive = false;

export function initCharacter(canvasEl: HTMLCanvasElement) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d')!;

  for (const name of HEAD_NAMES) {
    const img = new Image();
    img.src = `/sprites/${name}.png`;
    headSprites[name] = img;
  }
  for (const name of BODY_NAMES) {
    const img = new Image();
    img.src = `/sprites/${name}.png`;
    bodySprites[name] = img;
  }
  for (const id of FACE_IDS) {
    const img = new Image();
    img.src = `/sprites/acc_${id}.png`;
    faceSprites[id] = img;
  }
}

function stateToHead(state: SpriteName): HeadKey {
  if (state === 'quest') return 'head_idle';
  return `head_${state}` as HeadKey;
}

function resolveBodyKey(): string {
  return questActive ? 'body_quest' : `body_${currentBodyStyle}`;
}

export function setCharacterFaceStyle(id: string | null) { currentFaceStyle = id; }
export function setCharacterBodyStyle(id: string)         { currentBodyStyle = id; }
export function setQuestActive(active: boolean)           { questActive = active; }

export function setState(state: SpriteName) {
  currentSprite = state;
  canvas.classList.toggle('idle', state === 'idle');
}

export function getState(): SpriteName {
  return currentSprite;
}

export function renderFrame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // [1] body style
  const bodyKey = resolveBodyKey();
  const body = bodySprites[bodyKey] ?? bodySprites['body_normal'];
  if (body?.complete && body.naturalWidth > 0) {
    ctx.drawImage(body, 0, 0, canvas.width, canvas.height);
  }

  // [2] head state
  const headKey = stateToHead(currentSprite);
  const head = headSprites[headKey];
  if (head?.complete && head.naturalWidth > 0) {
    ctx.drawImage(head, 0, 0, canvas.width, canvas.height);
  }

  // [3] face overlay
  if (currentFaceStyle) {
    const face = faceSprites[currentFaceStyle];
    if (face?.complete && face.naturalWidth > 0) {
      ctx.drawImage(face, 0, 0, canvas.width, canvas.height);
    }
  }
}
