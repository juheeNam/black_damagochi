// User interaction handlers

import { getCurrentWindow } from '@tauri-apps/api/window';
import { setState, renderFrame } from './character';
import { adjustMood, feed } from './stats';
import { showBubble } from './bubble';

const HURT_MESSAGES = ['(x_x)', '아파!!', '하지마!', '(>_<)!!', '그만해!'];
const FEED_MESSAGES = ['(^q^) ♪', '냠냠~', '맛있다!'];

let clickCooldown = false;

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
        setState('dizzy');
        renderFrame(); // dizzy 스프라이트 즉시 렌더
        cleanup();
        // 한 프레임 대기 후 드래그 시작 (dizzy가 화면에 그려진 뒤)
        requestAnimationFrame(() => {
          getCurrentWindow().startDragging().then(() => {
            setState('idle');
            renderFrame();
          });
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
