import './style.css';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { initCharacter, renderFrame, setState, getState } from './character';
import { loadStats, persistStats, tickDecay, getStats, onLevelUp, unlockSkill, resetAllData as resetStatsData } from './stats';
import { initBubble, showBubble } from './bubble';
import { initGauge, updateGauge, initExpGauge, updateExpGauge } from './gauge';
import { initInteractions } from './interactions';
import {
  initSettings, setSize, setOpacity, toggleMini, toggleDoNotDisturb, isDoNotDisturb,
  setNotif, isNotifSetting, resetSettings, setSoundSetting, setSkin,
  setHead, setBody, getHeadStyle, getBodyStyle,
  openSidePanel, closeSidePanel,
} from './settings';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { SizePreset, OpacityPreset } from './settings';
import { SKILL_LIST, syncUnlocked, checkNewUnlocks, isUnlocked as skillUnlocked } from './skills';
import { QUEST_LIST, startQuest, collectQuest, cancelQuest, getProgress, isComplete, formatRemaining, getQuestDef } from './quests';
import { selectItem, cancelSelection } from './throw';
import { notify } from './notifications';
import { getLastInteractionTime } from './interactions';
import { playLevelUp } from './sounds';
import { SKIN_LIST } from './skins';
import { HEAD_STYLES, BODY_STYLES } from './accessories';

const IDLE_CHATTER = [
  '(^▽^) ♪', '(＿▽＿)', '...', '(*´ҳ`*)', '(◕ω◕)',
  'zzz...', '(・∀・)', '♪～', '(ˊҳˋ)',
];

function resolveIdle(mood: number) {
  setState(mood <= 30 ? 'angry' : 'idle');
}

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
    barEl.style.width = `${getProgress(quest) * 100}%`;
    timeEl.textContent = isComplete(quest) ? '완료!' : formatRemaining(quest);
    collectBtn.classList.toggle('hidden', !isComplete(quest));
  } else {
    listEl.classList.remove('hidden');
    progressEl.classList.add('hidden');
  }
}

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
  updateQuestStatus();

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

  function updateQuestStatus() {
    const statusEl = document.getElementById('quest-status');
    if (!statusEl) return;
    const { quest } = getStats();
    if (!quest) { statusEl.textContent = ''; statusEl.classList.add('hidden'); statusEl.classList.remove('done'); return; }
    const def = getQuestDef(quest.id);
    if (isComplete(quest)) {
      statusEl.textContent = `-${def?.name ?? ''} 심부름 완료!-`;
      statusEl.classList.remove('hidden'); statusEl.classList.add('done');
    } else {
      statusEl.textContent = `-${def?.name ?? ''} 심부름 중-`;
      statusEl.classList.remove('hidden', 'done');
    }
  }

  const settingsBtn   = document.getElementById('settings-btn')!;
  const settingsPanel = document.getElementById('settings-panel')!;
  const questPanel    = document.getElementById('quest-panel')!;
  const skillPanel    = document.getElementById('skill-panel')!;
  const coordPanel    = document.getElementById('coord-panel')!;
  const resetConfirm  = document.getElementById('reset-confirm')!;

  function showPanel(el: HTMLElement) {
    [settingsPanel, questPanel, skillPanel, coordPanel, resetConfirm].forEach(p => p.classList.add('hidden'));
    el.classList.remove('hidden');
    settingsBtn.classList.toggle('open', el === settingsPanel);
    openSidePanel();
  }

  async function closeAllPanels() {
    [settingsPanel, questPanel, skillPanel, coordPanel, resetConfirm].forEach(p => p.classList.add('hidden'));
    settingsBtn.classList.remove('open');
    await closeSidePanel();
  }

  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!settingsPanel.classList.contains('hidden')) { closeAllPanels(); return; }
    showPanel(settingsPanel);
  });

  document.addEventListener('click', () => closeAllPanels());
  [settingsPanel, questPanel, skillPanel, coordPanel, resetConfirm].forEach(el =>
    el.addEventListener('click', e => e.stopPropagation()));
  document.getElementById('side-panel')!.addEventListener('click', e => e.stopPropagation());

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
  miniRestoreBtn.addEventListener('click', () => { if (!miniDragging) toggleMini(); miniDragging = false; });

  const dndBtn = document.getElementById('dnd-btn')!;
  dndBtn.addEventListener('click', async () => {
    await toggleDoNotDisturb();
    dndBtn.classList.toggle('active', isDoNotDisturb());
  });

  await listen('toggle-dnd', async () => {
    await toggleDoNotDisturb();
    dndBtn.classList.toggle('active', isDoNotDisturb());
  });

  document.getElementById('settings-close-btn')!.addEventListener('click', () => closeAllPanels());
  document.getElementById('notif-btn')!.addEventListener('click', async () => { await setNotif(!isNotifSetting()); });

  document.getElementById('reset-btn')!.addEventListener('click', (e) => {
    e.stopPropagation(); showPanel(resetConfirm);
  });
  document.getElementById('reset-ok-btn')!.addEventListener('click', async () => {
    await resetStatsData(); await resetSettings(); window.location.reload();
  });
  document.getElementById('reset-cancel-btn')!.addEventListener('click', () => showPanel(settingsPanel));

  // 심부름 패널
  buildQuestList(() => { closeAllPanels(); updateQuestStatus(); });
  document.getElementById('quest-btn')!.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!questPanel.classList.contains('hidden')) { showPanel(settingsPanel); return; }
    updateQuestPanel(); showPanel(questPanel);
  });
  document.getElementById('quest-collect-btn')!.addEventListener('click', () => {
    const exp = collectQuest();
    if (exp > 0) showBubble(`+${exp} EXP 획득!`, 2000);
    closeAllPanels(); updateQuestStatus();
  });
  document.getElementById('quest-cancel-btn')!.addEventListener('click', () => {
    cancelQuest(); updateQuestPanel(); updateQuestStatus();
  });
  document.getElementById('quest-back-btn')!.addEventListener('click', (e) => { e.stopPropagation(); showPanel(settingsPanel); });

  // 스킬 패널
  document.getElementById('skill-btn')!.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!skillPanel.classList.contains('hidden')) { showPanel(settingsPanel); return; }
    buildSkillPanel(); showPanel(skillPanel);
  });
  document.getElementById('skill-back-btn')!.addEventListener('click', (e) => { e.stopPropagation(); showPanel(settingsPanel); });

  // 코디 패널
  function buildCoordPanel() {
    // 스킨
    const skinListEl = document.getElementById('skin-list')!;
    skinListEl.innerHTML = '';
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
      skinListEl.appendChild(item);
    });

    // 얼굴 스타일
    const headListEl = document.getElementById('head-style-list')!;
    headListEl.innerHTML = '';
    HEAD_STYLES.forEach(hs => {
      const btn = document.createElement('button');
      btn.className = 'style-btn';
      btn.dataset.headId = hs.id;
      btn.textContent = hs.emoji;
      btn.title = hs.name;
      btn.addEventListener('click', async () => {
        await setHead(hs.id);
        syncStyleButtons();
      });
      headListEl.appendChild(btn);
    });

    // 바디 스타일
    const bodyListEl = document.getElementById('body-style-list')!;
    bodyListEl.innerHTML = '';
    BODY_STYLES.forEach(bs => {
      const btn = document.createElement('button');
      btn.className = 'style-btn';
      btn.dataset.bodyId = bs.id;
      btn.textContent = bs.emoji;
      btn.title = bs.name;
      btn.addEventListener('click', async () => {
        await setBody(bs.id);
        syncStyleButtons();
      });
      bodyListEl.appendChild(btn);
    });

    syncStyleButtons();
  }

  function syncStyleButtons() {
    const head = getHeadStyle();
    const body = getBodyStyle();
    document.querySelectorAll<HTMLElement>('[data-head-id]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.headId === head);
    });
    document.querySelectorAll<HTMLElement>('[data-body-id]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.bodyId === body);
    });
  }

  document.getElementById('coord-btn')!.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!coordPanel.classList.contains('hidden')) { showPanel(settingsPanel); return; }
    buildCoordPanel(); showPanel(coordPanel);
  });
  document.getElementById('coord-back-btn')!.addEventListener('click', (e) => { e.stopPropagation(); showPanel(settingsPanel); });

  // 볼륨
  document.getElementById('sound-range')!.addEventListener('input', (e) => {
    const val = Number((e.target as HTMLInputElement).value) / 100;
    setSoundSetting(val);
  });

  // 단축키
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { cancelSelection(); invoke('quit'); }
    if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      toggleDoNotDisturb().then(() => dndBtn.classList.toggle('active', isDoNotDisturb()));
    }
    if (e.key === '1') selectItem('paper');
    if (e.key === '2') selectItem('pen');
    if (e.key === '3') selectItem('slipper');
  });

  const stats = await loadStats();
  syncUnlocked(stats.unlockedSkills);
  updateGauge(stats.mood);
  updateExpGauge(stats.exp, getExpThreshold(stats.level));
  levelEl.textContent = `Lv.${stats.level}`;

  if (stats.mood > 70) {
    setState('idle'); showBubble('(^▽^) ♪');
  } else if (stats.mood > 40) {
    setState('dizzy'); showBubble('(・・;)');
    setTimeout(() => resolveIdle(stats.mood), 1500);
  } else {
    setState('down'); showBubble('(；＿；)');
    setTimeout(() => resolveIdle(stats.mood), 2000);
  }

  const NEGLECT_MS = 10 * 60_000;
  let lastTime = performance.now();
  let saveAccum = 0, chatterAccum = 0, questAccum = 0;
  let moodWarned = false, neglectNotified = false, questCompleteNotified = false;
  let nextChatterMs = randomBetween(3 * 60_000, 5 * 60_000);

  function loop(now: number) {
    const dt = now - lastTime; lastTime = now;
    saveAccum += dt; chatterAccum += dt; questAccum += dt;

    const decayMultiplier = skillUnlocked('obsess') ? 0.85 : 1.0;
    tickDecay(dt, decayMultiplier);

    const { mood, level, exp, quest } = getStats();
    updateGauge(mood);
    updateExpGauge(exp, getExpThreshold(level));
    levelEl.textContent = `Lv.${level}`;
    renderFrame();

    const state = getState();
    if (mood <= 0) { setState('down'); }
    else if (quest && mood > 30 && (state === 'idle' || state === 'angry')) { setState('quest'); }
    else if (!quest && state === 'quest') { setState(mood <= 30 ? 'angry' : 'idle'); }
    else if (mood <= 30 && (state === 'idle' || state === 'quest')) { setState('angry'); }
    else if (mood > 30 && state === 'angry') { setState('idle'); }
    else if (mood > 0 && state === 'down') { setState(quest && mood > 30 ? 'quest' : mood <= 30 ? 'angry' : 'idle'); }

    if (mood < 20 && !moodWarned) {
      moodWarned = true; showBubble('(；ω；) 외로워...', 3000);
      setState('dizzy'); setTimeout(() => resolveIdle(getStats().mood), 1500);
    } else if (mood >= 20) { moodWarned = false; }

    const neglected = Date.now() - getLastInteractionTime() >= NEGLECT_MS;
    if (neglected && !neglectNotified) { neglectNotified = true; notify('(；ω；) 상사가 많이 외로워합니다...'); }
    else if (!neglected) { neglectNotified = false; }

    if (chatterAccum >= nextChatterMs) {
      chatterAccum = 0; nextChatterMs = randomBetween(3 * 60_000, 5 * 60_000);
      if (mood > 40) showBubble(IDLE_CHATTER[Math.floor(Math.random() * IDLE_CHATTER.length)]);
    }

    if (questAccum >= 1000) {
      questAccum = 0;
      if (quest && isComplete(quest)) {
        if (!questCompleteNotified) {
          questCompleteNotified = true;
          const def = getQuestDef(quest.id);
          if (def) { showBubble(`${def.name} 완료!`, 3000); notify(`📋 ${def.name} 완료!`, `+${def.exp} EXP 수령 대기 중`); }
          const questBtnEl = document.getElementById('quest-btn');
          if (questBtnEl) questBtnEl.textContent = '📋 심부름 ●';
          updateQuestStatus();
        }
      } else if (!quest) {
        questCompleteNotified = false;
        const questBtnEl = document.getElementById('quest-btn');
        if (questBtnEl) questBtnEl.textContent = '📋 심부름';
      }
      if (!questPanel.classList.contains('hidden')) updateQuestPanel();
    }

    if (saveAccum >= 10_000) { saveAccum = 0; persistStats(); }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

function getExpThreshold(level: number): number {
  const EXP_TABLE = [100, 200, 350, 550, 800, 1100, 1500, 2000, 2700];
  return EXP_TABLE[Math.min(level - 1, EXP_TABLE.length - 1)] ?? Infinity;
}
function randomBetween(min: number, max: number): number { return Math.random() * (max - min) + min; }

main();
