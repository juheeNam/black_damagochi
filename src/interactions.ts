// User interaction handlers (click, spin, etc.)

import { setState } from './character';
import { adjustMood, getStats } from './stats';
import { showBubble } from './bubble';

const PET_MESSAGES = ['(^▽^) ♪', '(*^_^*)', '~(^.^~)', '(＾▽＾)'];
const DIZZY_MESSAGES = ['(・・;)', '(´；ω；`)', '...'];
const ANGRY_MESSAGES = ['(╬ಠ益ಠ)', '(#`Д´)', '！！！'];

let clickCooldown = false;

export function initInteractions(spriteEl: HTMLElement) {
  spriteEl.addEventListener('click', handleClick);
}

function handleClick() {
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
