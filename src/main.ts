import './style.css';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { initCharacter, renderFrame, setState, getState } from './character';
import { loadStats, persistStats, tickDecay, getStats, onLevelUp, unlockSkill, resetAllData as resetStatsData } from './stats';
import { initBubble, showBubble } from './bubble';
import { initGauge, updateGauge, initExpGauge, updateExpGauge } from './gauge';
import { initInteractions } from './interactions';
import { initSettings, setSize, setOpacity, toggleMini, toggleDoNotDisturb, isDoNotDisturb, setNotif, isNotifSetting, resetSettings, setSoundSetting, setSkin } from './settings';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { SizePreset, OpacityPreset } from './settings';
import { SKILL_LIST, syncUnlocked, checkNewUnlocks, isUnlocked as skillUnlocked } from './skills';
import { QUEST_LIST, startQuest, collectQuest, cancelQuest, getProgress, isComplete, formatRemaining, getQuestDef } from './quests';
import { selectItem, cancelSelection } from './throw';
import { notify } from './notifications';
import { getLastInteractionTime } from './interactions';
import { playLevelUp } from './sounds';
import { SKIN_LIST } from './skins';

const IDLE_CHATTER = [
  '(^▽^) ♪', '(＿▽＿)', '...', '(*´ҳ`*)', '(◕ω◕)',
  'zzz...', '(・∀・)', '♪～', '(ˊҳˋ)',
];

function resolveIdle(mood: number) {
  setState(mood <= 30 ? 'angry' : 'idle');
}

// ── 심부름 패널 UI ──────────────────────────────────────────
function buildQuestList(onStart: () => void) {
  const listEl = document.getElementById('quest-list')!;
  listEl.innerHTML = '<div class="popup-title">📋 심부름</div>';
  QUEST_LIST.forEach(q => {
    const mins = q.durationMs / 60_000;
    const item = document.createElement('div');
    item.className = 'quest-item';
    item.innerHTML = `
      <span class="quest-item-name">${q.name}</span>
      <span class="quest-item-meta">${mins}분 / +${q.exp}exp</span>
    `;
    item.addEventListener('click', () => {
      startQuest(q.id);
      showBubble(`${q.name} 중...`, 3000);
      onStart();
    });
    listEl.appendChild(item);
  });
}

function updateQuestPanel() {
  const { quest } = getStats();
  const listEl     = document.getElementById('quest-list')!;
  const progressEl = document.getElementById('quest-progress')!;
  const nameEl     = document.getElementById('quest-name')!;
  const barEl      = document.getElementById('quest-progress-bar') as HTMLElement;
  const timeEl     = document.getElementById('quest-time')!;
  const collectBtn = document.getElementById('quest-collect-btn')!;

  if (quest) {
    listEl.classList.add('hidden');
    progressEl.classList.remove('hidden');

    const def = getQuestDef(quest.id);
    nameEl.textContent = def?.name ?? '';
    const prog = getProgress(quest);
    barEl.style.width = `${prog * 100}%`;
    timeEl.textContent = isComplete(quest) ? '완료!' : formatRemaining(quest);
    collectBtn.classList.toggle('hidden', !isComplete(quest));
  } else {
    listEl.classList.remove('hidden');
    progressEl.classList.add('hidden');
  }
}

// ── 스킬 패널 UI ────────────────────────────────────────────
function buildSkillPanel() {
  const listEl = document.getElementById('skill-list')!;
  const { unlockedSkills, level } = getStats();

  listEl.innerHTML = '';
  SKILL_LIST.forEach(skill => {
    const unlocked = unlockedSkills.includes(skill.id);
    const item = document.createElement('div');
    item.className = `skill-item${unlocked ? '' : ' locked'}`;
    item.innerHTML = `
      <div class="skill-item-header">
        <span class="skill-item-name">${unlocked ? '✓ ' : '🔒 '}${skill.name}</span>
        <span class="skill-item-level">Lv.${skill.unlockLevel}</span>
      </div>
      <div class="skill-item-desc">${skill.description}${!unlocked ? ` (Lv.${skill.unlockLevel} 해금)` : ''}</div>
    `;
    listEl.appendChild(item);
  });

  // suppress unused warning
  void level;
}

async function main() {
  const canvas   = document.getElementById('sprite')   as HTMLCanvasElement;
  const bubbleEl = document.getElementById('bubble')   as HTMLElement;
  const moodBar  = document.getElementById('mood-bar') as HTMLElement;
  const expBarEl = document.getElementById('exp-bar')  as HTMLElement;
  const levelEl  = document.getElementById('level-display')!;

  initCharacter(canvas);
  initBubble(bubbleEl);
  initGauge(moodBar);
  initExpGauge(expBarEl);
  initInteractions(canvas);

  await initSettings();

  // ── 레벨업 콜백 등록 ─────────────────────────────────────
  onLevelUp((newLevel) => {
    playLevelUp();
    showBubble(`★ 레벨 업! Lv.${newLevel}`, 3000);
    notify('★ 레벨 업!', `Lv.${newLevel} 달성`);
    setState('hit');
    setTimeout(() => resolveIdle(getStats().mood), 1500);

    const newSkills = checkNewUnlocks(newLevel);
    newSkills.forEach(skill => {
      unlockSkill(skill.id);
      syncUnlocked(getStats().unlockedSkills);
      setTimeout(() => showBubble(`⚡ 스킬 해금: ${skill.name}`, 2500), 1800);
    });

    buildSkillPanel();
  });

  // ── 설정 패널 ────────────────────────────────────────────
  const settingsBtn   = document.getElementById('settings-btn')!;
  const settingsPanel = document.getElementById('settings-panel')!;
  const questPanel    = document.getElementById('quest-panel')!;
  const skillPanel    = document.getElementById('skill-panel')!;
  const skinPanel     = document.getElementById('skin-panel')!;
  const resetConfirm  = document.getElementById('reset-confirm')!;

  function closeAllPanels() {
    settingsPanel.classList.add('hidden');
    questPanel.classList.add('hidden');
    skillPanel.classList.add('hidden');
    skinPanel.classList.add('hidden');
    resetConfirm.classList.add('hidden');
    settingsBtn.classList.remove('open');
  }

  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = !settingsPanel.classList.contains('hidden');
    closeAllPanels();
    if (!open) {
      settingsPanel.classList.remove('hidden');
      settingsBtn.classList.add('open');
    }
  });

  document.addEventListener('click', () => closeAllPanels());
  settingsPanel.addEventListener('click', (e) => e.stopPropagation());
  questPanel.addEventListener('click', (e) => e.stopPropagation());
  skillPanel.addEventListener('click', (e) => e.stopPropagation());
  skinPanel.addEventListener('click', (e) => e.stopPropagation());
  resetConfirm.addEventListener('click', (e) => e.stopPropagation());

  document.querySelectorAll<HTMLElement>('[data-size]').forEach(btn => {
    btn.addEventListener('click', () => setSize(btn.dataset.size as SizePreset));
  });
  document.querySelectorAll<HTMLElement>('[data-opacity]').forEach(btn => {
    btn.addEventListener('click', () => setOpacity(btn.dataset.opacity as OpacityPreset));
  });

  document.getElementById('hide-btn')!.addEventListener('click', () => toggleMini());
  const miniRestoreBtn = document.getElementById('mini-restore-btn')!;
  let miniDragging = false;
  miniRestoreBtn.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    miniDragging = false;
    const startX = e.clientX, startY = e.clientY;
    const onMove = (me: MouseEvent) => {
      if (!miniDragging && Math.hypot(me.clientX - startX, me.clientY - startY) > 4) {
        miniDragging = true;
        getCurrentWindow().startDragging();
        document.removeEventListener('mousemove', onMove);
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', () => document.removeEventListener('mousemove', onMove), { once: true });
  });
  miniRestoreBtn.addEventListener('click', () => {
    if (!miniDragging) toggleMini();
    miniDragging = false;
  });
  const dndBtn = document.getElementById('dnd-btn')!;
  dndBtn.addEventListener('click', async () => {
    await toggleDoNotDisturb();
    dndBtn.classList.toggle('active', isDoNotDisturb());
  });

  await listen('toggle-dnd', async () => {
    await toggleDoNotDisturb();
    dndBtn.classList.toggle('active', isDoNotDisturb());
  });

  // ── 설정 패널 닫기 버튼 ─────────────────────────────────
  document.getElementById('settings-close-btn')!.addEventListener('click', () => closeAllPanels());

  // ── 알림 토글 ────────────────────────────────────────────
  document.getElementById('notif-btn')!.addEventListener('click', async () => {
    await setNotif(!isNotifSetting());
  });

  // ── 데이터 초기화 ────────────────────────────────────────
  document.getElementById('reset-btn')!.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllPanels();
    resetConfirm.classList.remove('hidden');
  });
  document.getElementById('reset-ok-btn')!.addEventListener('click', async () => {
    await resetStatsData();
    await resetSettings();
    window.location.reload();
  });
  document.getElementById('reset-cancel-btn')!.addEventListener('click', () => {
    resetConfirm.classList.add('hidden');
  });

  // ── 심부름 패널 ──────────────────────────────────────────
  buildQuestList(closeAllPanels);

  document.getElementById('quest-btn')!.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = !questPanel.classList.contains('hidden');
    closeAllPanels();
    if (!open) {
      updateQuestPanel();
      questPanel.classList.remove('hidden');
    }
  });

  document.getElementById('quest-collect-btn')!.addEventListener('click', () => {
    const exp = collectQuest();
    if (exp > 0) showBubble(`+${exp} EXP 획득!`, 2000);
    closeAllPanels();
  });

  document.getElementById('quest-cancel-btn')!.addEventListener('click', () => {
    cancelQuest();
    updateQuestPanel();
  });

  document.getElementById('quest-back-btn')!.addEventListener('click', (e) => {
    e.stopPropagation();
    questPanel.classList.add('hidden');
    settingsPanel.classList.remove('hidden');
    settingsBtn.classList.add('open');
  });

  // ── 스킬 패널 ────────────────────────────────────────────
  document.getElementById('skill-btn')!.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = !skillPanel.classList.contains('hidden');
    closeAllPanels();
    if (!open) {
      buildSkillPanel();
      skillPanel.classList.remove('hidden');
    }
  });

  document.getElementById('skill-back-btn')!.addEventListener('click', (e) => {
    e.stopPropagation();
    skillPanel.classList.add('hidden');
    settingsPanel.classList.remove('hidden');
    settingsBtn.classList.add('open');
  });

  // ── 스킨 패널 ────────────────────────────────────────────
  function buildSkinPanel() {
    const listEl = document.getElementById('skin-list')!;
    listEl.innerHTML = '';
    SKIN_LIST.forEach(skin => {
      const item = document.createElement('div');
      item.className = 'skin-item';
      item.dataset.skinId = skin.id;
      item.textContent = skin.name;
      item.addEventListener('click', async () => {
        await setSkin(skin.id as Parameters<typeof setSkin>[0]);
        document.querySelectorAll<HTMLElement>('.skin-item').forEach(el => {
          el.classList.toggle('active', el.dataset.skinId === skin.id);
        });
      });
      listEl.appendChild(item);
    });
  }

  document.getElementById('skin-btn')!.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = !skinPanel.classList.contains('hidden');
    closeAllPanels();
    if (!open) {
      buildSkinPanel();
      skinPanel.classList.remove('hidden');
    }
  });

  document.getElementById('skin-back-btn')!.addEventListener('click', (e) => {
    e.stopPropagation();
    skinPanel.classList.add('hidden');
    settingsPanel.classList.remove('hidden');
    settingsBtn.classList.add('open');
  });

  // ── 볼륨 슬라이더 ────────────────────────────────────────
  document.getElementById('sound-range')!.addEventListener('input', (e) => {
    const val = Number((e.target as HTMLInputElement).value) / 100;
    setSoundSetting(val);
  });

  // ── 단축키 ───────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { cancelSelection(); invoke('quit'); }
    if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      toggleDoNotDisturb().then(() => {
        dndBtn.classList.toggle('active', isDoNotDisturb());
      });
    }
    if (e.key === '1') selectItem('paper');
    if (e.key === '2') selectItem('pen');
    if (e.key === '3') selectItem('slipper');
  });

  // ── 초기 stats 로드 ──────────────────────────────────────
  const stats = await loadStats();
  syncUnlocked(stats.unlockedSkills);
  updateGauge(stats.mood);
  updateExpGauge(stats.exp, getExpThreshold(stats.level));
  levelEl.textContent = `Lv.${stats.level}`;

  if (stats.mood > 70) {
    setState('idle');
    showBubble('(^▽^) ♪');
  } else if (stats.mood > 40) {
    setState('dizzy');
    showBubble('(・・;)');
    setTimeout(() => resolveIdle(stats.mood), 1500);
  } else {
    setState('down');
    showBubble('(；＿；)');
    setTimeout(() => resolveIdle(stats.mood), 2000);
  }

  // ── 게임 루프 ────────────────────────────────────────────
  const NEGLECT_MS = 10 * 60_000;
  let lastTime           = performance.now();
  let saveAccum          = 0;
  let chatterAccum       = 0;
  let questAccum         = 0;
  let moodWarned         = false;
  let neglectNotified    = false;
  let questCompleteNotified = false;

  let nextChatterMs = randomBetween(3 * 60_000, 5 * 60_000);

  function loop(now: number) {
    const dt = now - lastTime;
    lastTime = now;
    saveAccum    += dt;
    chatterAccum += dt;
    questAccum   += dt;

    const decayMultiplier = skillUnlocked('obsess') ? 0.85 : 1.0;
    tickDecay(dt, decayMultiplier);

    const { mood, level, exp, quest } = getStats();
    updateGauge(mood);
    updateExpGauge(exp, getExpThreshold(level));
    levelEl.textContent = `Lv.${level}`;
    renderFrame();

    const state = getState();
    if (mood <= 30 && state === 'idle')  setState('angry');
    if (mood >  30 && state === 'angry') setState('idle');

    if (mood < 20 && !moodWarned) {
      moodWarned = true;
      showBubble('(；ω；) 외로워...', 3000);
      setState('dizzy');
      setTimeout(() => resolveIdle(getStats().mood), 1500);
    } else if (mood >= 20) {
      moodWarned = false;
    }

    const neglected = Date.now() - getLastInteractionTime() >= NEGLECT_MS;
    if (neglected && !neglectNotified) {
      neglectNotified = true;
      notify('(；ω；) 상사가 많이 외로워합니다...');
    } else if (!neglected) {
      neglectNotified = false;
    }

    if (chatterAccum >= nextChatterMs) {
      chatterAccum = 0;
      nextChatterMs = randomBetween(3 * 60_000, 5 * 60_000);
      if (mood > 40) {
        showBubble(IDLE_CHATTER[Math.floor(Math.random() * IDLE_CHATTER.length)]);
      }
    }

    // 심부름 완료 감지 (1초 간격)
    if (questAccum >= 1000) {
      questAccum = 0;
      if (quest && isComplete(quest)) {
        if (!questCompleteNotified) {
          questCompleteNotified = true;
          const def = getQuestDef(quest.id);
          if (def) {
            showBubble(`${def.name} 완료!`, 3000);
            notify(`📋 ${def.name} 완료!`, `+${def.exp} EXP 수령 대기 중`);
          }
          const questBtnEl = document.getElementById('quest-btn');
          if (questBtnEl) questBtnEl.textContent = '📋 심부름 ●';
        }
      } else if (!quest) {
        questCompleteNotified = false;
        const questBtnEl = document.getElementById('quest-btn');
        if (questBtnEl) questBtnEl.textContent = '📋 심부름';
      }
      // 패널 열려있으면 진행률 갱신
      if (!document.getElementById('quest-panel')!.classList.contains('hidden')) {
        updateQuestPanel();
      }
    }

    if (saveAccum >= 10_000) {
      saveAccum = 0;
      persistStats();
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

function getExpThreshold(level: number): number {
  const EXP_TABLE = [100, 200, 350, 550, 800, 1100, 1500, 2000, 2700];
  return EXP_TABLE[Math.min(level - 1, EXP_TABLE.length - 1)] ?? Infinity;
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

main();
