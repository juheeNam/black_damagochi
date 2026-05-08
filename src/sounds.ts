let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let volume = 0.5;

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    masterGain = ctx.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(ctx.destination);
  }
  return ctx;
}

function getMaster(): GainNode {
  getCtx();
  return masterGain!;
}

export function initSound(vol: number) {
  volume = vol;
  if (masterGain) masterGain.gain.value = vol;
}

export function setSoundVolume(vol: number) {
  volume = vol;
  if (masterGain) masterGain.gain.value = vol;
}

export function getSoundVolume(): number {
  return volume;
}

function noise(durationSec: number, freq?: number) {
  const c = getCtx();
  const bufLen = Math.floor(c.sampleRate * durationSec);
  const buf = c.createBuffer(1, bufLen, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

  const src = c.createBufferSource();
  src.buffer = buf;

  const gain = c.createGain();
  gain.gain.setValueAtTime(1, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + durationSec);

  if (freq) {
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    src.connect(filter);
    filter.connect(gain);
  } else {
    src.connect(gain);
  }

  gain.connect(getMaster());
  src.start();
}

function tone(freqStart: number, freqEnd: number, durationSec: number, gainVal = 0.4) {
  const c = getCtx();
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freqStart, c.currentTime);
  if (freqEnd !== freqStart) {
    osc.frequency.exponentialRampToValueAtTime(freqEnd, c.currentTime + durationSec);
  }

  const gain = c.createGain();
  gain.gain.setValueAtTime(gainVal, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + durationSec);

  osc.connect(gain);
  gain.connect(getMaster());
  osc.start();
  osc.stop(c.currentTime + durationSec);
}

export function playHit() {
  noise(0.08, 3000);
}

export function playDrag() {
  const c = getCtx();
  const osc = c.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60, c.currentTime + 0.5);

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.25, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);

  osc.connect(gain);
  gain.connect(getMaster());
  osc.start();
  osc.stop(c.currentTime + 0.5);
}

export function playFeed() {
  tone(440, 880, 0.3, 0.3);
}

export function playThrowHit() {
  noise(0.15, 600);
  tone(120, 60, 0.2, 0.3);
}

export function playLevelUp() {
  const c = getCtx();
  const notes = [523, 659, 784];
  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const gain = c.createGain();
    const start = c.currentTime + i * 0.15;
    gain.gain.setValueAtTime(0.4, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);

    osc.connect(gain);
    gain.connect(getMaster());
    osc.start(start);
    osc.stop(start + 0.2);
  });
}
