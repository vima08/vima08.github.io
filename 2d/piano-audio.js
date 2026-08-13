(function () {
  "use strict";

  const SEMITONES = {
    C: 0,
    "C#": 1,
    D: 2,
    "D#": 3,
    E: 4,
    F: 5,
    "F#": 6,
    G: 7,
    "G#": 8,
    A: 9,
    "A#": 10,
    B: 11,
  };
  const HARMONICS = [
    { multiplier: 1, type: "triangle", level: 0.3 },
    { multiplier: 2, type: "sine", level: 0.07 },
    { multiplier: 3, type: "sine", level: 0.025 },
  ];

  const voices = new Map();
  let context;
  let masterGain;

  function initializeAudio() {
    if (context) return context;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;

    context = new AudioContext();
    masterGain = context.createGain();
    masterGain.gain.value = 0.7;
    masterGain.connect(context.destination);
    return context;
  }

  function frequencyForNote(note) {
    const match = note.match(/^([A-G]#?)(-?\d)$/);
    if (!match) throw new Error(`Unknown note: ${note}`);

    const [, pitch, octave] = match;
    const midiNumber = (Number(octave) + 1) * 12 + SEMITONES[pitch];
    return 440 * 2 ** ((midiNumber - 69) / 12);
  }

  function release(note) {
    if (!context) return;

    const now = context.currentTime;
    for (const [voiceId, voice] of voices) {
      if (!voiceId.startsWith(`${note}|`)) continue;

      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setTargetAtTime(0.0001, now, 0.11);
      voice.oscillator.stop(now + 0.6);
      voices.delete(voiceId);
    }
  }

  function press(note, duration, velocity = 1) {
    if (!initializeAudio()) return;

    context.resume();
    release(note);

    const now = context.currentTime;
    const normalizedVelocity = Math.max(0, Math.min(1, velocity));
    const baseFrequency = frequencyForNote(note);

    HARMONICS.forEach(({ multiplier, type, level }) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const filter = context.createBiquadFilter();

      oscillator.type = type;
      oscillator.frequency.value = baseFrequency * multiplier;
      oscillator.detune.value = multiplier === 1 ? -2 : 2;

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(5000, now);
      filter.frequency.exponentialRampToValueAtTime(1200, now + 1.4);

      const peakLevel = level * normalizedVelocity;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(peakLevel, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(peakLevel * 0.34, now + 0.45);

      oscillator.connect(filter).connect(gain).connect(masterGain);
      oscillator.start();
      voices.set(`${note}|${multiplier}`, { oscillator, gain });
    });

    if (duration) setTimeout(() => release(note), duration);
  }

  function stopAll() {
    const activeNotes = new Set(
      [...voices.keys()].map((voiceId) => voiceId.split("|")[0]),
    );
    activeNotes.forEach(release);
  }

  function setVolume(volume) {
    initializeAudio();
    if (masterGain) masterGain.gain.value = volume;
  }

  window.pianoAudio = { press, release, stopAll, setVolume };
})();
