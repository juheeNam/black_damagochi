export type SkinId = 'default' | 'angry' | 'cold' | 'golden';

export const SKIN_LIST: { id: SkinId; name: string; filter: string }[] = [
  { id: 'default', name: '기본',   filter: 'none' },
  { id: 'angry',   name: '분노형', filter: 'hue-rotate(320deg) saturate(2)' },
  { id: 'cold',    name: '냉혹형', filter: 'hue-rotate(195deg) saturate(1.3)' },
  { id: 'golden',  name: '황금형', filter: 'hue-rotate(40deg) saturate(2.5) brightness(1.1)' },
];

let currentSkin: SkinId = 'default';

export function applySkin(id: SkinId) {
  currentSkin = id;
  const sprite = document.getElementById('sprite') as HTMLElement | null;
  const skin = SKIN_LIST.find(s => s.id === id);
  if (sprite && skin) sprite.style.filter = skin.filter === 'none' ? '' : skin.filter;
}

export function getCurrentSkin(): SkinId {
  return currentSkin;
}
