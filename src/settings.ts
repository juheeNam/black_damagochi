import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import { load } from '@tauri-apps/plugin-store';

export type SizePreset = 'small' | 'medium' | 'large';
export type OpacityPreset = 'low' | 'normal' | 'high';

const SIZE_MAP: Record<SizePreset, [number, number]> = {
  small:  [140, 168],
  medium: [200, 240],
  large:  [280, 336],
};

const OPACITY_MAP: Record<OpacityPreset, number> = {
  low:    0.4,
  normal: 1.0,
  high:   1.0,
};

let currentDnd = false;
let store: Awaited<ReturnType<typeof load>> | null = null;

export async function initSettings() {
  store = await load('settings.json');

  const size    = (await store.get<SizePreset>('size'))    ?? 'medium';
  const opacity = (await store.get<OpacityPreset>('opacity')) ?? 'normal';
  const dnd     = (await store.get<boolean>('dnd'))        ?? false;

  await applySize(size);
  applyOpacity(opacity);
  if (dnd) await applyDnd(true);

  syncSizeButtons(size);
  syncOpacityButtons(opacity);
  if (dnd) document.getElementById('app')?.classList.add('dnd-active');
}

async function applySize(preset: SizePreset) {
  const [w, h] = SIZE_MAP[preset];
  const win = getCurrentWindow();
  await win.setSize(new LogicalSize(w, h));
  document.body.style.width  = `${w}px`;
  document.body.style.height = `${h}px`;
  const app = document.getElementById('app');
  if (app) { app.style.width = `${w}px`; app.style.height = `${h}px`; }
}

function applyOpacity(preset: OpacityPreset) {
  const app = document.getElementById('app');
  if (app) app.style.opacity = String(OPACITY_MAP[preset]);
}

async function applyDnd(enabled: boolean) {
  currentDnd = enabled;
  const win = getCurrentWindow();
  await win.setIgnoreCursorEvents(enabled);
  const app = document.getElementById('app');
  if (app) app.classList.toggle('dnd-active', enabled);
}

function syncSizeButtons(active: SizePreset) {
  document.querySelectorAll<HTMLElement>('[data-size]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.size === active);
  });
}

function syncOpacityButtons(active: OpacityPreset) {
  document.querySelectorAll<HTMLElement>('[data-opacity]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.opacity === active);
  });
}

export async function setSize(preset: SizePreset) {
  await applySize(preset);
  syncSizeButtons(preset);
  if (store) await store.set('size', preset);
}

export async function setOpacity(preset: OpacityPreset) {
  applyOpacity(preset);
  syncOpacityButtons(preset);
  if (store) await store.set('opacity', preset);
}

export async function setDoNotDisturb(enabled: boolean) {
  await applyDnd(enabled);
  if (store) await store.set('dnd', enabled);
}

export async function toggleDoNotDisturb() {
  await setDoNotDisturb(!currentDnd);
}

export function isDoNotDisturb() {
  return currentDnd;
}

export async function hideWindow() {
  await getCurrentWindow().hide();
}
