import './style.css';
import { initCharacter, renderFrame, setState } from './character';
import { loadStats, persistStats, tickDecay, getStats } from './stats';
import { initBubble, showBubble } from './bubble';
import { initDrag } from './drag';
import { initGauge, updateGauge } from './gauge';
import { initInteractions } from './interactions';

// 기분 좋을 때 랜덤 혼잏말
const IDLE_CHATTER = [
  '(^▽^) ♪', '(＿▽＿)', '...', '(*´ҳ`*)', '(◕ω◕)',
  'zzz...', '(・∀・)', '♪～', '(ˊҳˋ)',
];

async function main() {
  const canvas    = document.getElementById('sprite')     as HTMLCanvasElement;
  const bubbleEl  = document.getElementById('bubble')     as HTMLElement;
  const moodBar   = document.getElementById('mood-bar')   as HTMLElement;
  const hungerBar = document.getElementById('hunger-bar') as HTMLElement;

  initCharacter(canvas);
  initBubble(bubbleEl);
  initGauge(moodBar, hungerBar);
  initInteractions(canvas);
  initDrag(document.getElementById('app') as HTMLElement, canvas);

  const stats = await loadStats();
  updateGauge(stats.mood, stats.hunger);

  // 시작 인사
  if (stats.hunger < 30) {
    setState('down');
    showBubble('배고파... (；＿；)');
    setTimeout(() => setState('idle'), 2000);
  } else if (stats.mood > 70) {
    setState('idle');
    showBubble('(^▽^) ♪');
  } else if (stats.mood > 40) {
    setState('dizzy');
    showBubble('(・・;)');
    setTimeout(() => setState('idle'), 1500);
  } else {
    setState('down');
    showBubble('(；＿；)');
    setTimeout(() => setState('idle'), 2000);
  }

  let lastTime     = performance.now();
  let saveAccum    = 0;
  let chatterAccum = 0;
  let hungryWarned = false;
  let moodWarned   = false;

  // 랜덤 혼잏말 간격: 3~5분
  let nextChatterMs = randomBetween(3 * 60_000, 5 * 60_000);

  function loop(now: number) {
    const dt = now - lastTime;
    lastTime = now;
    saveAccum    += dt;
    chatterAccum += dt;

    tickDecay(dt);

    const { mood, hunger } = getStats();
    updateGauge(mood, hunger);
    renderFrame();

    // 허기 경고
    if (hunger < 20 && !hungryWarned) {
      hungryWarned = true;
      showBubble('배고파... (；＿；)', 3000);
      setState('down');
      setTimeout(() => setState('idle'), 1500);
    } else if (hunger >= 20) {
      hungryWarned = false;
    }

    // 기분 저하 경고
    if (mood < 20 && !moodWarned) {
      moodWarned = true;
      showBubble('(；ω；) 외로워...', 3000);
      setState('dizzy');
      setTimeout(() => setState('idle'), 1500);
    } else if (mood >= 20) {
      moodWarned = false;
    }

    // 주기적 혼잏말 (기분 좋을 때만)
    if (chatterAccum >= nextChatterMs) {
      chatterAccum = 0;
      nextChatterMs = randomBetween(3 * 60_000, 5 * 60_000);
      if (mood > 40 && hunger > 30) {
        showBubble(IDLE_CHATTER[Math.floor(Math.random() * IDLE_CHATTER.length)]);
      }
    }

    // 10초마다 자동 저장
    if (saveAccum >= 10_000) {
      saveAccum = 0;
      persistStats();
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

main();
