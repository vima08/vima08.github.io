/* Shared, asset-free soundtrack and sound effects for every game. */
(() => {
  'use strict';

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  let context;
  let master;
  let musicTimer;
  let step = 0;
  let muted = localStorage.getItem('mini-games-muted') === 'true';

  const notes = [130.81, 155.56, 196, 233.08, 196, 155.56, 146.83, 174.61];

  function ensureAudio() {
    if (!context) {
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.22;
      master.connect(context.destination);
    }
    if (context.state === 'suspended') context.resume();
    if (!musicTimer) {
      playMusicStep();
      musicTimer = window.setInterval(playMusicStep, 360);
    }
  }

  function tone(frequency, duration, volume, type = 'sine', delay = 0) {
    if (!context || muted) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  function playMusicStep() {
    if (!context || muted || document.hidden) return;
    const note = notes[step % notes.length];
    tone(note, 0.3, 0.055, 'triangle');
    if (step % 2 === 0) tone(note / 2, 0.22, 0.035, 'sine');
    step += 1;
  }

  function effect(name) {
    ensureAudio();
    if (name === 'success') {
      tone(523.25, 0.12, 0.16, 'square');
      tone(783.99, 0.2, 0.13, 'square', 0.09);
    } else if (name === 'action') {
      tone(220, 0.07, 0.11, 'sawtooth');
      tone(330, 0.08, 0.07, 'square', 0.035);
    } else {
      tone(440, 0.045, 0.055, 'triangle');
    }
  }

  function setMuted(value) {
    muted = value;
    localStorage.setItem('mini-games-muted', String(muted));
    if (master && context) master.gain.setTargetAtTime(muted ? 0 : 0.22, context.currentTime, 0.025);
    updateButton();
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'game-audio-toggle';
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    ensureAudio();
    setMuted(!muted);
    if (!muted) effect('success');
  });

  function updateButton() {
    button.textContent = muted ? '🔇' : '🔊';
    button.title = muted ? 'Turn sound on' : 'Mute music and sounds';
    button.setAttribute('aria-label', button.title);
    button.setAttribute('aria-pressed', String(muted));
  }

  const style = document.createElement('style');
  style.textContent = `
    .game-audio-toggle {
      position: fixed !important; z-index: 10000 !important; top: 14px !important; right: 14px !important;
      width: 44px !important; height: 44px !important; margin: 0 !important; padding: 0 !important;
      display: grid !important; place-items: center !important; border: 1px solid rgba(255,255,255,.35) !important;
      border-radius: 50% !important; background: rgba(5,10,25,.78) !important; color: white !important;
      font: 20px/1 sans-serif !important; cursor: pointer !important; box-shadow: 0 5px 22px rgba(0,0,0,.35) !important;
      backdrop-filter: blur(8px); touch-action: manipulation;
    }
    .game-audio-toggle:hover { transform: scale(1.06); background: rgba(20,30,55,.92) !important; }
    .game-audio-toggle:focus-visible { outline: 3px solid #fff !important; outline-offset: 3px !important; }
  `;
  document.head.appendChild(style);
  document.body.appendChild(button);
  updateButton();

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
    if (event.target !== button) effect(event.target.closest('button, .cell') ? 'action' : 'move');
  }, { passive: true });

  // Games may request a semantic effect without depending on the audio implementation.
  window.gameAudio = { play: effect, mute: setMuted, get muted() { return muted; } };
})();
