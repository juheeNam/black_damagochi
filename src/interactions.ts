// User interaction handlers

import { getCurrentWindow } from '@tauri-apps/api/window';
import { setState } from './character';
import { adjustMood, feed } from './stats';
import { showBubble } from './bubble';

const HURT_MESSAGES = ['(x_x)', 'イタイ！', 'ﾔﾒﾃ！', '(>_<)!!', 'ﾀﾀクナ！'];
const FEED_MESSAGES = ['(^q^) ♪', 'ｶｺウｶｺウ', '(*´ҳ`*)'];

let clickCooldown = false;

export function initInteractions(spriteEl: HTMLElement) {
  let isDragging = false;
  let startX = 0, startY = 0;

  // 마우스 누를 때: 드래그 vs 클릭 판별
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
        setState('dizzy');
        // 드래그 완료 후 idle 복귀
        getCurrentWindow().startDragging().then(() => {
          setState('idle');
        });
        cleanup();
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

  // 클릭: 드래그였으면 무시
  spriteEl.addEventListener('click', (e: MouseEvent) => {
    if (isDragging) { isDragging = false; return; }
    handleClick(e);
  });

  // 우클릭: 밥 주기
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
  setTimeout(() => setState('idle'), 600);
}

function handleFeed(e: MouseEvent) {
  e.preventDefault();
  feed(30);
  adjustMood(3);
  setState('hit');
  showBubble(FEED_MESSAGES[Math.floor(Math.random() * FEED_MESSAGES.length)]);
  setTimeout(() => setState('idle'), 800);
}
