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
        let onPostDragMouseMove: (() => void) | null = null;
        let dragStarted = false;

        const endDrag = () => {
          if (ended) return;
          ended = true;
          if (moveTimeout !== null) clearTimeout(moveTimeout);
          if (unlistenMove) unlistenMove();
          if (onPostDragMouseMove) document.removeEventListener('mousemove', onPostDragMouseMove);
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
            // 창이 실제로 움직이기 시작한 뒤에만 mousemove fallback 등록
            // (startDragging 직후 잔여 mousemove 이벤트를 잡지 않기 위해)
            if (!dragStarted) {
              dragStarted = true;
              onPostDragMouseMove = () => endDrag();
              document.addEventListener('mousemove', onPostDragMouseMove, { once: true });
            }
            if (moveTimeout !== null) clearTimeout(moveTimeout);
            moveTimeout = setTimeout(endDrag, 200);
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
  setTimeout(() => { clickCooldown = false; }, 800);

  setState('hit');
  adjustMood(-3);
  showBubble(pick(HURT_MESSAGES));
  setTimeout(() => resolveIdle(), 600);
}

function handleFeed(e: MouseEvent) {
  e.preventDefault();
  adjustMood(30);
  setState('hit');
  showBubble(pick(FEED_MESSAGES));
  setTimeout(() => resolveIdle(), 800);
}
