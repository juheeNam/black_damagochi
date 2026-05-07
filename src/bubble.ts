let el: HTMLElement;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let dndActive = false;

export function initBubble(element: HTMLElement) {
  el = element;
}

export function setBubbleDnd(enabled: boolean) {
  dndActive = enabled;
  if (enabled) hideBubble();
}

export function showBubble(text: string, durationMs = 2500) {
  if (dndActive) return;
  if (hideTimer) clearTimeout(hideTimer);
  el.textContent = text;
  el.classList.remove('hidden');
  hideTimer = setTimeout(() => {
    el.classList.add('hidden');
    hideTimer = null;
  }, durationMs);
}

export function hideBubble() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  el.classList.add('hidden');
}
