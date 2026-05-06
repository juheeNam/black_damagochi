// User interaction handlers (click, spin, etc.)

import { setState } from './character';
import { adjustMood, feed, getStats } from './stats';
import { showBubble } from './bubble';

const PET_MESSAGES   = ['(^▽^) ♪', '(*^_^*)', '~(^.^~)', '(＾▽＾)'];
const DIZZY_MESSAGES = ['(・・;)', '(´；ω；`)', '...'];
const ANGRY_MESSAGES = ['(╬ಠ益ಠ)', '(#`Д´)', '！！！'];
const FEED_MESSAGES  = ['(^q^) ♪', 'ｶｺｳｶｺｳ', '(*´ҳ`*)'];

let clickCooldown = false;

export function initInteractions(spriteEl: HTMLElement) {
  spriteEl.addEventListener('click',       handleClick);
  spriteEl.addEventListener('contextmenu', handleFeed);
}

function handleClick(e: MouseEvent) {
  e.preventDefault();
  if (clickCooldown) return;
  clickCooldown = true;
  setTimeout(() => { clickCooldown = false; }, 800);

  const { mood } = getStats();

  if (mood > 60) {
    setState('hit');
    adjustMood(5);
    showBubble(PET_MESSAGES[Math.floor(Math.random() * PET_MESSAGES.length)]);
  } else if (mood > 30) {
    setState('dizzy');
    adjustMood(3);
    showBubble(DIZZY_MESSAGES[Math.floor(Math.random() * DIZZY_MESSAGES.length)]);
  } else {
    setState('angry');
    showBubble(ANGRY_MESSAGES[Math.floor(Math.random() * ANGRY_MESSAGES.length)]);
  }

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
