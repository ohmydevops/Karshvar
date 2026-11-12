import { createAmbientScore } from "./save-earth-music.js";

export function createGameAudio() {
  let context, master, hum, noise, breathing, music;
  let muted = false,
    active = false,
    firstPerson = false,
    radioSource = null,
    nextRadio = 0,
    nextFlyby = 0,
    radioIndex = 0;
  let narrationSource = null,
    narrationGain = null;
  const transient = new Set();
  const recordings = [];
  let saganRecording,
    nextSagan = 10;
  const radioFiles = [
    "nasa-houston-discovery.mp3",
    "nasa-discovery-how-read.mp3",
    "nasa-discovery-computers.mp3",
    "nasa-discovery-roger-roll.mp3",
    "nasa-discovery-go-deploy.mp3",
    "nasa-discovery-looking.mp3",
    "nasa-discovery-vector.mp3",
    "nasa-discovery-orbit.mp3",
  ];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const audible = () =>
    context && active && !muted && context.state === "running";

  function track(source, nodes) {
    transient.add(source);
    source.onended = () => {
      transient.delete(source);
      if (source === narrationSource) {
        narrationSource = null;
        narrationGain = null;
      }
      if (source === radioSource) {
        radioSource = null;
        updateBreathing();
      }
      for (const node of nodes) node.disconnect();
    };
    return source;
  }
  function stopTransient(preserveNarration = false) {
    for (const source of transient) {
      if (preserveNarration && source === narrationSource) continue;
      try {
        source.stop();
      } catch {
        /* A source may have finished this frame. */
      }
    }
    transient.clear();
    if (preserveNarration && narrationSource) transient.add(narrationSource);
    radioSource = null;
    if (!preserveNarration) narrationSource = narrationGain = null;
    nextRadio = 0;
    nextFlyby = 0;
  }
  function updateBreathing() {
    if (music) {
      music.setActive(active && !muted);
      music.setDucked(Boolean(radioSource || narrationSource));
    }
    if (narrationGain)
      narrationGain.gain.setTargetAtTime(
        radioSource ? 0.025 : 0.12,
        context.currentTime,
        0.35,
      );
    if (!breathing) return;
    breathing.gain.cancelScheduledValues(context.currentTime);
    breathing.gain.setTargetAtTime(
      active && firstPerson && !muted ? (radioSource ? 0.085 : 0.14) : 0,
      context.currentTime,
      0.18,
    );
  }
  function boot() {
    active = true;
    if (!context) {
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Audio) return;
      context = new Audio();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.35;
      master.connect(context.destination);
      music = createAmbientScore(context, master);
      fetch(new URL("./audio/carl-sagan-pale-blue-dot.m4a", import.meta.url))
        .then((response) => {
          if (!response.ok) throw new Error("Narration unavailable");
          return response.arrayBuffer();
        })
        .then((bytes) => context.decodeAudioData(bytes))
        .then((buffer) => {
          saganRecording = buffer;
        })
        .catch((error) => console.warn("Narration could not load", error));
      noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const samples = noise.getChannelData(0);
      for (let i = 0; i < samples.length; i++)
        samples[i] = Math.random() * 2 - 1;
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = 64;
      hum = context.createGain();
      hum.gain.value = 0;
      oscillator.connect(hum).connect(master);
      oscillator.start();
      // A real, 77-second studio recording retains natural differences between
      // breaths. Decode once and crossfade the seam; no generated hiss fallback.
      fetch(new URL("./audio/helmet-breathing.mp3", import.meta.url))
        .then((response) => {
          if (!response.ok) throw new Error("Breathing recording unavailable");
          return response.arrayBuffer();
        })
        .then((bytes) => context.decodeAudioData(bytes))
        .then((recording) => {
          const seam = Math.min(
            Math.floor(recording.sampleRate * 0.3),
            Math.floor(recording.length / 4),
          );
          const buffer = context.createBuffer(
            recording.numberOfChannels,
            recording.length - seam,
            recording.sampleRate,
          );
          for (
            let channel = 0;
            channel < recording.numberOfChannels;
            channel++
          ) {
            const input = recording.getChannelData(channel);
            const output = buffer.getChannelData(channel);
            output.set(input.subarray(seam));
            for (let i = 0; i < seam; i++) {
              const mix = i / seam;
              output[output.length - seam + i] =
                input[input.length - seam + i] * (1 - mix) + input[i] * mix;
            }
          }
          const source = context.createBufferSource();
          const highpass = context.createBiquadFilter();
          const lowpass = context.createBiquadFilter();
          source.buffer = buffer;
          source.loop = true;
          highpass.type = "highpass";
          highpass.frequency.value = 85;
          lowpass.type = "lowpass";
          lowpass.frequency.value = 2400;
          lowpass.Q.value = 0.5;
          breathing = context.createGain();
          breathing.gain.value = 0;
          source
            .connect(highpass)
            .connect(lowpass)
            .connect(breathing)
            .connect(master);
          source.start();
          updateBreathing();
        })
        .catch(() => {
          /* Remain silent when the actual recording cannot be loaded. */
        });
      // Local archive files decode once, asynchronously, never on a radio trigger.
      radioFiles.forEach((name, index) => {
        fetch(new URL("./audio/" + name, import.meta.url))
          .then((response) => {
            if (!response.ok) throw new Error("Radio recording unavailable");
            return response.arrayBuffer();
          })
          .then((bytes) => context.decodeAudioData(bytes))
          .then((buffer) => {
            recordings[index] = buffer;
          })
          .catch(() => {
            /* Other game sounds remain available offline. */
          });
      });
    }
    updateBreathing();
    context
      .resume()
      .then(() => {
        // A focus loss during resume must not restart audio behind a paused game.
        if (!active) context.suspend().catch(() => {});
      })
      .catch(() => {});
  }
  function tone(frequency, duration, volume, type = "sine", delay = 0) {
    if (!audible()) return;
    const time = context.currentTime + delay;
    const osc = context.createOscillator(),
      gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, time);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(30, frequency * 0.4),
      time + duration,
    );
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain).connect(master);
    track(osc, [osc, gain]);
    osc.start(time);
    osc.stop(time + duration);
  }
  function burst(duration, volume, cutoff, delay = 0) {
    if (!audible()) return;
    const source = context.createBufferSource(),
      filter = context.createBiquadFilter(),
      gain = context.createGain();
    const time = context.currentTime + delay;
    source.buffer = noise;
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter).connect(gain).connect(master);
    track(source, [source, filter, gain]);
    source.start(time);
    source.stop(time + duration);
  }
  function radio() {
    if (!audible()) return false;
    if (
      context.currentTime < nextRadio &&
      !(saganRecording && context.currentTime >= nextSagan)
    )
      return false;
    const narration =
      !narrationSource && saganRecording && context.currentTime >= nextSagan;
    if (!narration && radioSource) return false;
    let buffer = narration
      ? saganRecording
      : recordings[radioIndex % radioFiles.length];
    if (!buffer) buffer = recordings.find(Boolean);
    if (!buffer) return false;
    if (!narration) radioIndex++;
    else nextSagan = context.currentTime + buffer.duration + 240;
    const source = context.createBufferSource(),
      highpass = context.createBiquadFilter();
    const lowpass = context.createBiquadFilter(),
      gain = context.createGain();
    const time = context.currentTime + 0.08;
    source.buffer = buffer;
    highpass.type = "highpass";
    highpass.frequency.value = narration ? 80 : 330;
    lowpass.type = "lowpass";
    lowpass.frequency.value = narration ? 8000 : 2800;
    gain.gain.setValueAtTime(0, time);
    const voiceLevel = narration ? 0.12 : 0.24;
    gain.gain.linearRampToValueAtTime(
      voiceLevel,
      time + (narration ? 1.2 : 0.08),
    );
    gain.gain.setValueAtTime(
      voiceLevel,
      time + Math.max(0.1, buffer.duration - 0.12),
    );
    gain.gain.linearRampToValueAtTime(0, time + buffer.duration);
    source.connect(highpass).connect(lowpass).connect(gain).connect(master);
    if (narration) {
      narrationSource = track(source, [source, highpass, lowpass, gain]);
      narrationGain = gain;
    } else radioSource = track(source, [source, highpass, lowpass, gain]);
    // Controller may poll frequently; overlap and the brief quiet gap live here.
    if (!narration) nextRadio = time + buffer.duration + 5 + Math.random() * 4;
    updateBreathing();
    if (!narration) {
      burst(0.06, 0.035, 2400);
      burst(0.06, 0.025, 1800, buffer.duration + 0.08);
    }
    source.start(time);
    source.stop(time + buffer.duration + 0.02);
    return true;
  }
  function flyby(pan = 0, proximity = 1) {
    if (!audible() || context.currentTime < nextFlyby) return false;
    const close = clamp(Number(proximity) || 0, 0, 1);
    if (close < 0.03) return false;
    const side = clamp(Number(pan) || 0, -1, 1),
      time = context.currentTime,
      duration = 0.6 + close * 0.25;
    const source = context.createBufferSource(),
      filter = context.createBiquadFilter(),
      gain = context.createGain();
    const panner = context.createStereoPanner();
    source.buffer = noise;
    source.playbackRate.setValueAtTime(1.3, time);
    source.playbackRate.exponentialRampToValueAtTime(0.65, time + duration);
    filter.type = "bandpass";
    filter.Q.value = 0.7;
    filter.frequency.setValueAtTime(1900, time);
    filter.frequency.exponentialRampToValueAtTime(380, time + duration);
    panner.pan.setValueAtTime(side, time);
    panner.pan.linearRampToValueAtTime(side * 0.45, time + duration * 0.4);
    panner.pan.linearRampToValueAtTime(side, time + duration);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(
      0.08 + close * 0.25,
      time + duration * 0.32,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter).connect(gain).connect(panner).connect(master);
    track(source, [source, filter, gain, panner]);
    source.start(time);
    source.stop(time + duration);
    nextFlyby = time + 0.3;
    // A suit warning/sonification cue, not a claim that sound travels in vacuum.
    tone(95 + close * 35, duration * 0.6, 0.04 + close * 0.05);
    return true;
  }
  return {
    boot,
    radio,
    flyby,
    setFirstPerson(value) {
      firstPerson = Boolean(value);
      updateBreathing();
    },
    shot() {
      burst(0.09, 0.38, 2600);
      tone(160, 0.1, 0.28);
    },
    reload() {
      tone(720, 0.045, 0.1, "triangle");
      tone(470, 0.06, 0.1, "triangle", 0.55);
      tone(900, 0.04, 0.12, "triangle", 1.32);
    },
    hit() {
      burst(0.18, 0.22, 900);
      tone(120, 0.18, 0.18);
    },
    impact() {
      burst(0.35, 0.3, 350);
      tone(75, 0.45, 0.35);
    },
    empty() {
      tone(420, 0.035, 0.13, "triangle");
      burst(0.018, 0.06, 1800);
    },
    thrust(speed) {
      if (active) music?.tick();
      if (hum && active)
        hum.gain.setTargetAtTime(
          muted ? 0 : Math.min(0.065, Math.max(0, speed) * 0.018),
          context.currentTime,
          0.15,
        );
    },
    pause() {
      active = false;
      if (context) {
        stopTransient(true);
        music?.setActive(false);
        hum.gain.cancelScheduledValues(context.currentTime);
        hum.gain.value = 0;
        if (breathing) {
          breathing.gain.cancelScheduledValues(context.currentTime);
          breathing.gain.value = 0;
        }
        context.suspend().catch(() => {});
      }
    },
    toggle() {
      muted = !muted;
      if (muted) stopTransient(true);
      if (master) {
        master.gain.cancelScheduledValues(context.currentTime);
        master.gain.setTargetAtTime(
          muted ? 0 : 0.35,
          context.currentTime,
          0.03,
        );
      }
      updateBreathing();
      return muted;
    },
  };
}
