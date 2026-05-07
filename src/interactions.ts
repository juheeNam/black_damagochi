import { getCurrentWindow } from '@tauri-apps/api/window';
import { setState, renderFrame } from './character';
import { adjustMood, getStats } from './stats';
import { showBubble } from './bubble';

const HURT_MESSAGES = [
  '(x_x) 아파요...',
  '하지 말아 주세요!',
  '(>_<) 왜 그러세요!',
  '저한테 왜 이러세요...',
  '미안하다고 하세요!',
  '으아아... 살살 해주세요',
  '(T_T) 속상해요',
  '잠깐만요, 아프잖아요!',
];

const COMBO_MID_MESSAGES = [
  '왜 또 때리세요!',
  '으으... 계속 때리시는 건가요?',
  '(>_<) 그만해 주세요!',
  '아직도 그러실 건가요...',
];

const COMBO_MAX_MESSAGES = [
  '그만요!!!',
  '화날 것 같아요!',
  '(x_x) 진짜 화낼 거예요!',
  '제발 멈춰 주세요!!!',
];

const DRAG_MESSAGES = [
  '어지러워요~',
  '흔들흔들...',
  '으아아~ 세상이 빙빙!',
  '조심해 주세요!',
  '(x_x) 멀미날 것 같아요',
  '어어어~!',
];

const FEED_MESSAGES = [
  '(^q^) ♪ 고마워요!',
  '기분 좋아요~!',
  '♥ 충전 완료!',
  '(◕ω◕) 힘이 나요!',
];

const LONG_DRAG_MESSAGES = [
  '(x_x) 너무 오래 흔들었잖아요...',
  '으... 화가 나요!',
  '그만해 주세요!',
];

let clickCooldown = false;
let comboCount = 0;
let comboResetTimer: ReturnType<typeof setTimeout> | null = null;

function resolveIdle() {
  const { mood } = getStats();
  setState(mood <= 30 ? 'angry' : 'idle');
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function initInteractions(spriteEl: HTMLElement) {
  let isDragging = false;
  let startX = 0, startY = 0;

  spriteEl.addEventListener('mousedown', (e: MouseEvent) => {
    if (e.button !== 0) return;
    isDragging = false;
    startX = e.clientX;
    startY = e.clientY;

    const onMove = (me: MouseEvent) => {
      const dx = me.clientX - startX;
      const dy = me.clientY - startY;
      if (!isDragging && Math.sqrt(dx * dx + dy * dy) > 6) {
        isDragging = true;
        const dragStartTime = Date.now();
        setState('dizzy');
        renderFrame();
        adjustMood(-5);
        showBubble(pick(DRAG_MESSAGES));
        cleanup();

        let ended = false;
        let moveTimeout: ReturnType<typeof setTimeout> | null = null;
        let unlistenMove: (() => void) | null = null;

        const endDrag = () => {
          if (ended) return;
          ended = true;
          if (moveTimeout !== null) clearTimeout(moveTimeout);
          if (unlistenMove) unlistenMove();
          document.removeEventListener('pointerup', onPointerUp);
          document.removeEventListener('pointercancel', onPointerUp);
          const duration = Date.now() - dragStartTime;
          isDragging = false;
          if (duration >= 3000) {
            setState('angry');
            renderFrame();
            showBubble(pick(LONG_DRAG_MESSAGES));
            setTimeout(() => resolveIdle(), 1200);
          } else {
            resolveIdle();
            renderFrame();
          }
        };

        const onPointerUp = () => endDrag();
        document.addEventListener('pointerup', onPointerUp);
        document.addEventListener('pointercancel', onPointerUp);

        requestAnimationFrame(async () => {
          const win = getCurrentWindow();
          unlistenMove = await win.onMoved(() => {
            if (moveTimeout !== null) clearTimeout(moveTimeout);
            moveTimeout = setTimeout(endDrag, 500);
          });
          win.startDragging();
        });
      }
    };

    const cleanup = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    const onUp = () => cleanup();

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  spriteEl.addEventListener('click', (e: MouseEvent) => {
    if (isDragging) { isDragging = false; return; }
    handleClick(e);
  });

  spriteEl.addEventListener('contextmenu', handleFeed);
}

function handleClick(e: MouseEvent) {
  e.preventDefault();
  if (clickCooldown) return;
  clickCooldown = true;
  setTimeout(() => { clickCooldown = false; }, 250);

  comboCount += 1;
  if (comboResetTimer !== null) clearTimeout(comboResetTimer);
  comboResetTimer = setTimeout(() => { comboCount = 0; comboResetTimer = null; }, 1500);

  let msg: string;
  let moodDelta: number;
  if (comboCount >= 5) {
    msg = pick(COMBO_MAX_MESSAGES);
    moodDelta = -5;
  } else if (comboCount >= 3) {
    msg = pick(COMBO_MID_MESSAGES);
    moodDelta = -4;
  } else {
    msg = pick(HURT_MESSAGES);
    moodDelta = -3;
  }

  if (comboCount >= 2) msg = `${msg} x${comboCount}`;

  setState('hit');
  adjustMood(moodDelta);
  showBubble(msg);
  setTimeout(() => resolveIdle(), 600);
}

function handleFeed(e: MouseEvent) {
  e.preventDefault();
  adjustMood(30);
  setState('hit');
  showBubble(pick(FEED_MESSAGES));
  setTimeout(() => resolveIdle(), 800);
}
