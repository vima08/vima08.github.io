/* Shared, asset-free soundtrack and semantic sound effects for every game. */
(() => {
  'use strict';

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const storedVolume = localStorage.getItem('mini-games-volume');
  const savedVolume = storedVolume === null ? NaN : Number(storedVolume);
  let volume = Number.isFinite(savedVolume) ? clamp(savedVolume, 0, 1) : 0.55;
  let muted = localStorage.getItem('mini-games-muted') === 'true';
  let context;
  let master;
  let musicTimer;
  let step = 0;

  const notes = [130.81, 155.56, 196, 233.08, 196, 155.56, 146.83, 174.61];

  function outputLevel() {
    return muted ? 0 : volume * 0.4;
  }

  function ensureAudio() {
    if (!context) {
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = outputLevel();
      master.connect(context.destination);
    }
    if (context.state === 'suspended') context.resume();
    if (!musicTimer) {
      playMusicStep();
      musicTimer = window.setInterval(playMusicStep, 360);
    }
  }

  function tone(frequency, duration, level, type = 'sine', delay = 0, endFrequency = frequency) {
    if (!context || muted || volume === 0) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(level, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  function noise(duration, level, delay = 0) {
    if (!context || muted || volume === 0) return;
    const start = context.currentTime + delay;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i += 1) samples[i] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, start);
    filter.frequency.exponentialRampToValueAtTime(90, start + duration);
    gain.gain.setValueAtTime(level, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter).connect(gain).connect(master);
    source.start(start);
  }

  function playMusicStep() {
    if (!context || muted || volume === 0 || document.hidden) return;
    const note = notes[step % notes.length];
    tone(note, 0.3, 0.055, 'triangle');
    if (step % 2 === 0) tone(note / 2, 0.22, 0.035, 'sine');
    step += 1;
  }

  function effect(name) {
    ensureAudio();
    const effects = {
      bounce: () => tone(260, 0.055, 0.13, 'square', 0, 390),
      brick: () => tone(620, 0.07, 0.12, 'square', 0, 360),
      shoot: () => tone(190, 0.13, 0.13, 'sawtooth', 0, 70),
      explosion: () => { noise(0.38, 0.32); tone(105, 0.35, 0.2, 'sawtooth', 0, 35); },
      collect: () => { tone(660, 0.07, 0.12, 'square'); tone(990, 0.11, 0.1, 'square', 0.06); },
      score: () => { tone(440, 0.09, 0.13, 'square'); tone(660, 0.15, 0.11, 'square', 0.08); },
      lose: () => { tone(260, 0.16, 0.12, 'sawtooth', 0, 180); tone(150, 0.25, 0.1, 'sawtooth', 0.14, 70); },
      success: () => { tone(523.25, 0.12, 0.16, 'square'); tone(783.99, 0.2, 0.13, 'square', 0.09); },
      action: () => { tone(220, 0.07, 0.11, 'sawtooth'); tone(330, 0.08, 0.07, 'square', 0.035); },
      move: () => tone(440, 0.045, 0.055, 'triangle')
    };
    (effects[name] || effects.move)();
  }

  function applyLevel() {
    if (master && context) master.gain.setTargetAtTime(outputLevel(), context.currentTime, 0.025);
  }

  function setMuted(value) {
    muted = Boolean(value);
    localStorage.setItem('mini-games-muted', String(muted));
    applyLevel();
    updateControls();
  }

  function setVolume(value) {
    volume = clamp(Number(value) || 0, 0, 1);
    muted = volume === 0;
    localStorage.setItem('mini-games-volume', String(volume));
    localStorage.setItem('mini-games-muted', String(muted));
    ensureAudio();
    applyLevel();
    updateControls();
  }

  const controls = document.createElement('div');
  controls.className = 'game-audio-controls';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'game-audio-toggle';
  const slider = document.createElement('input');
  slider.className = 'game-audio-volume';
  slider.type = 'range';
  slider.min = '0';
  slider.max = '100';
  slider.step = '1';
  slider.setAttribute('aria-label', 'Music and sound volume');
  controls.append(button, slider);

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    ensureAudio();
    setMuted(!muted);
    if (!muted) effect('success');
  });
  slider.addEventListener('input', (event) => {
    event.stopPropagation();
    setVolume(event.currentTarget.value / 100);
  });
  slider.addEventListener('pointerdown', (event) => event.stopPropagation());

  function updateControls() {
    button.textContent = muted || volume === 0 ? '🔇' : volume < 0.5 ? '🔈' : '🔊';
    button.title = muted ? 'Turn sound on' : 'Mute music and sounds';
    button.setAttribute('aria-label', button.title);
    button.setAttribute('aria-pressed', String(muted));
    slider.value = String(Math.round(volume * 100));
    slider.title = `Volume: ${slider.value}%`;
  }

  const style = document.createElement('style');
  style.textContent = `
    .game-audio-controls {
      position: fixed !important; z-index: 10000 !important; top: 14px !important; right: 14px !important;
      display: flex !important; align-items: center !important; gap: 9px !important; padding: 6px 10px 6px 6px !important;
      border: 1px solid rgba(255,255,255,.35) !important; border-radius: 28px !important;
      background: rgba(5,10,25,.82) !important; box-shadow: 0 5px 22px rgba(0,0,0,.35) !important;
      backdrop-filter: blur(8px); color: white !important;
    }
    .game-audio-toggle {
      width: 36px !important; height: 36px !important; margin: 0 !important; padding: 0 !important;
      display: grid !important; place-items: center !important; border: 0 !important; border-radius: 50% !important;
      background: rgba(255,255,255,.1) !important; color: white !important; font: 19px/1 sans-serif !important;
      cursor: pointer !important; touch-action: manipulation;
    }
    .game-audio-volume { width: 92px !important; margin: 0 !important; padding: 0 !important; accent-color: #5af2ff; cursor: pointer; }
    .game-audio-toggle:hover { transform: scale(1.06); background: rgba(255,255,255,.2) !important; }
    .game-audio-toggle:focus-visible, .game-audio-volume:focus-visible { outline: 3px solid #fff !important; outline-offset: 3px !important; }
    @media (max-width: 480px) { .game-audio-volume { width: 68px !important; } }
  `;
  document.head.appendChild(style);
  document.body.appendChild(controls);
  updateControls();

  const movementKeys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd']);
  const actionKeys = new Set([' ', 'Enter', 'z', 'x']);
  addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (actionKeys.has(key)) effect('action');
    else if (movementKeys.has(key)) effect('move');
    else ensureAudio();
  });
  addEventListener('pointerdown', (event) => {
    if (!controls.contains(event.target)) effect(event.target.closest('button, .cell') ? 'action' : 'move');
  }, { passive: true });

  // Games request semantic effects without depending on the Web Audio implementation.
  window.gameAudio = {
    play: effect,
    mute: setMuted,
    setVolume,
    get muted() { return muted; },
    get volume() { return volume; }
  };
})();
