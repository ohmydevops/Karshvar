// Original synthesized ambient score: D minor, long crossfades, sparse high notes.
// All timing uses AudioContext.currentTime, so suspension freezes the score.
export function createAmbientScore(context, output) {
  const chords = [
    [73.416, 174.614, 220, 329.628],
    [58.27, 174.614, 220, 293.665],
    [87.307, 130.813, 220, 293.665],
    [65.406, 146.832, 195.998, 293.665],
  ];
  const notes = [440, 349.228, 391.995, 329.628];
  const mix = context.createGain();
  mix.gain.value = 0;
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1300;
  filter.Q.value = 0.4;
  filter.connect(mix).connect(output);
  const delay = context.createDelay(1);
  const feedback = context.createGain();
  const wet = context.createGain();
  delay.delayTime.value = 0.48;
  feedback.gain.value = 0.22;
  wet.gain.value = 0.28;
  mix.connect(delay).connect(wet).connect(output);
  delay.connect(feedback).connect(delay);

  const banks = [0, 1].map(() => {
    const gain = context.createGain();
    gain.gain.value = 0;
    gain.connect(filter);
    const voices = [0.11, 0.065, 0.045, 0.035].map((level, index) => {
      const oscillator = context.createOscillator();
      const amplitude = context.createGain();
      oscillator.type = index === 1 ? "triangle" : "sine";
      amplitude.gain.value = level;
      oscillator.connect(amplitude).connect(gain);
      oscillator.start();
      return oscillator;
    });
    return { gain, voices };
  });
  const melody = context.createOscillator();
  const melodyGain = context.createGain();
  melody.type = "sine";
  melodyGain.gain.value = 0;
  melody.connect(melodyGain).connect(filter);
  melody.start();

  const pulse = context.createOscillator();
  const pulseGain = context.createGain();
  pulse.type = "triangle";
  pulseGain.gain.value = 0;
  pulse.connect(pulseGain).connect(filter);
  pulse.start();
  let nextBeat = 0,
    beat = 0;
  let enabled = false,
    ducked = false,
    nextChange = 0,
    chordIndex = 0,
    currentBank = 1;
  function updateMix() {
    const time = context.currentTime;
    mix.gain.cancelScheduledValues(time);
    mix.gain.setTargetAtTime(enabled ? (ducked ? 0.055 : 0.12) : 0, time, 0.7);
  }
  function tick() {
    const time = context.currentTime;
    if (!enabled) return;
    if (time >= nextBeat) {
      const chord = chords[Math.max(0, chordIndex - 1) % chords.length];
      pulse.frequency.setValueAtTime(chord[beat++ % 2 === 0 ? 0 : 2], time);
      pulseGain.gain.cancelScheduledValues(time);
      pulseGain.gain.setValueAtTime(0, time);
      pulseGain.gain.linearRampToValueAtTime(0.12, time + 0.025);
      pulseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.55);
      nextBeat = time + 0.75;
    }
    if (time < nextChange) return;
    const index = chordIndex++ % chords.length;
    const previous = banks[currentBank];
    currentBank = 1 - currentBank;
    const incoming = banks[currentBank];
    previous.gain.gain.cancelScheduledValues(time);
    previous.gain.gain.setValueAtTime(previous.gain.gain.value, time);
    previous.gain.gain.linearRampToValueAtTime(0, time + 4);
    incoming.voices.forEach((voice, i) => {
      voice.frequency.setValueAtTime(chords[index][i], time);
    });
    incoming.gain.gain.cancelScheduledValues(time);
    incoming.gain.gain.setValueAtTime(0, time);
    incoming.gain.gain.linearRampToValueAtTime(1, time + 4);
    melody.frequency.setValueAtTime(notes[index], time);
    melodyGain.gain.cancelScheduledValues(time);
    melodyGain.gain.setValueAtTime(0, time);
    melodyGain.gain.setValueAtTime(0, time + 5);
    melodyGain.gain.linearRampToValueAtTime(0.035, time + 6.5);
    melodyGain.gain.linearRampToValueAtTime(0, time + 11);
    // No catch-up work after a long gap and no wall-clock scheduling timer.
    nextChange = time + 12;
  }
  return {
    tick,
    setActive(value) {
      const next = Boolean(value);
      if (next === enabled) return;
      enabled = next;
      updateMix();
      if (enabled) tick();
    },
    setDucked(value) {
      const next = Boolean(value);
      if (next === ducked) return;
      ducked = next;
      updateMix();
    },
  };
}
