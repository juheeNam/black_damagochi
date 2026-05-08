export type AccessorySlot = 'top' | 'face' | 'neck';

export interface AccessoryDef {
  id: string;
  name: string;
  emoji: string;
  slot: AccessorySlot;
}

export type EquippedAccessories = Record<AccessorySlot, string | null>;

export const ACCESSORY_LIST: AccessoryDef[] = [
  { id: 'hat_top',      name: '중절모',   emoji: '🎩', slot: 'top'  },
  { id: 'hat_straw',    name: '밀짚모자', emoji: '👒', slot: 'top'  },
  { id: 'hat_santa',    name: '산타모자', emoji: '🎅', slot: 'top'  },
  { id: 'glasses_sun',  name: '선글라스', emoji: '🕶', slot: 'face' },
  { id: 'glasses',      name: '안경',     emoji: '👓', slot: 'face' },
  { id: 'mask',         name: '마스크',   emoji: '😷', slot: 'face' },
  { id: 'tie',          name: '넥타이',   emoji: '👔', slot: 'neck' },
  { id: 'ribbon',       name: '리본',     emoji: '🎀', slot: 'neck' },
  { id: 'medal',        name: '메달',     emoji: '🏅', slot: 'neck' },
];

export function getSlotItems(slot: AccessorySlot): AccessoryDef[] {
  return ACCESSORY_LIST.filter(a => a.slot === slot);
}
