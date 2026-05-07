export type ThrowItem = 'paper' | 'pen' | 'slipper';

interface ItemDef { emoji: string; moodDelta: number; exp: number; }

const ITEMS: Record<ThrowItem, ItemDef> = {
  paper:   { emoji: '📄', moodDelta: -5,  exp: 3 },
  pen:     { emoji: '🖊',  moodDelta: -8,  exp: 5 },
  slipper: { emoji: '🥿', moodDelta: -12, exp: 8 },
};

let selectedItem: ThrowItem | null = null;
let selectTimer: ReturnType<typeof setTimeout> | null = null;
let onCooldown = false;

export function selectItem(item: ThrowItem) {
  if (selectTimer) clearTimeout(selectTimer);
  selectedItem = item;
  syncIndicator();
  selectTimer = setTimeout(cancelSelection, 3000);
}

export function getSelectedItem(): ThrowItem | null {
  return selectedItem;
}

export function cancelSelection() {
  if (selectTimer) { clearTimeout(selectTimer); selectTimer = null; }
  selectedItem = null;
  syncIndicator();
}

export function executeThrow(): { hit: boolean; def: ItemDef } | null {
  if (onCooldown || !selectedItem) return null;

  const def = ITEMS[selectedItem];
  cancelSelection();

  onCooldown = true;
  setTimeout(() => { onCooldown = false; }, 1500);

  animateThrow(def.emoji);

  return { hit: Math.random() < 0.8, def };
}

function syncIndicator() {
  const indicator = document.getElementById('item-indicator');
  const emojiEl   = document.getElementById('selected-item-emoji');
  if (!indicator || !emojiEl) return;
  if (selectedItem) {
    emojiEl.textContent = ITEMS[selectedItem].emoji;
    indicator.classList.remove('hidden');
  } else {
    indicator.classList.add('hidden');
  }
}

function animateThrow(emoji: string) {
  const appEl = document.getElementById('app');
  if (!appEl) return;

  const el = document.createElement('div');
  el.className = 'throwable';
  el.textContent = emoji;
  el.style.top = '75%';
  el.style.left = '50%';
  el.style.transform = 'translateX(-50%) scale(1.2)';
  el.style.opacity = '1';
  appEl.appendChild(el);

  void el.offsetHeight;

  el.style.transition = 'top 0.35s ease-in, transform 0.35s ease-in, opacity 0.2s 0.2s ease';
  el.style.top = '25%';
  el.style.transform = 'translateX(-50%) scale(0.4)';
  el.style.opacity = '0';

  setTimeout(() => el.remove(), 400);
}
