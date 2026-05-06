// Character sprite animation state machine

export type SpriteName = 'idle' | 'angry' | 'dizzy' | 'down' | 'hit';

const SPRITE_NAMES: SpriteName[] = ['idle', 'angry', 'dizzy', 'down', 'hit'];
const sprites: Record<SpriteName, HTMLImageElement> = {} as Record<SpriteName, HTMLImageElement>;

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let currentSprite: SpriteName = 'idle';

export function initCharacter(canvasEl: HTMLCanvasElement) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d')!;

  for (const name of SPRITE_NAMES) {
    const img = new Image();
    img.src = `/src/assets/sprites/${name}.png`;
    sprites[name] = img;
  }
}

export function setState(state: SpriteName) {
  currentSprite = state;
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
}
