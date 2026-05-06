import { getCurrentWindow } from '@tauri-apps/api/window';
import { setState, renderFrame } from './character';
import { adjustMood, getStats } from './stats';
import { showBubble } from './bubble';

const HURT_MESSAGES = ['(x_x)', '아파!!', '하지마!', '(>_<)!!', '그만해!'];
const FEED_MESSAGES = ['(^q^) ♪', '기분 좋아~!', '♥ 충전!'];

let clickCooldown = false;

function resolveIdle() {
  const { mood } = getStats();
  setState(mood <= 30 ? 'angry' : 'idle');
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
        cleanup();

        const onDragEnd = () => {
          document.removeEventListener('pointerup', onDragEnd);
          document.removeEventListener('pointercancel', onDragEnd);
          const duration = Date.now() - dragStartTime;
          isDragging = false;
          if (duration >= 3000) {
            setState('angry');
            renderFrame();
            setTimeout(() => resolveIdle(), 1200);
          } else {
            resolveIdle();
            renderFrame();
          }
        };
        document.addEventListener('pointerup', onDragEnd);
        document.addEventListener('pointercancel', onDragEnd);

        requestAnimationFrame(() => {
          getCurrentWindow().startDragging();
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
  showBubble(HURT_MESSAGES[Math.floor(Math.random() * HURT_MESSAGES.length)]);
  setTimeout(() => resolveIdle(), 600);
}

function handleFeed(e: MouseEvent) {
  e.preventDefault();
  adjustMood(30);
  setState('hit');
  showBubble(FEED_MESSAGES[Math.floor(Math.random() * FEED_MESSAGES.length)]);
  setTimeout(() => resolveIdle(), 800);
}
