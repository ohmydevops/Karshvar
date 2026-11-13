import { createAmbientScore } from "./save-earth-music.js";
import { distanceAudio } from "./save-earth-spatial-audio.js";

export function createGameAudio() {
  let context, master, hum, noise, breathing, music;
  let muted = false,
    active = false,
    firstPerson = false,
    radioSource = null,
    nextRadio = 0,
    nextTuning = 8,
    nextFlyby = 0,
    lastRadio = -1;
  let narrationSource = null,
    narrationGain = null;
  const transient = new Set();
  const impacts = new Set();
  let suspensionTimer;
  let lastImpact = -1;
  const impactRecordings = [];
  let rocketRecording;
  const rocketVoices = new Map();
  const spatial = {};
  let impactEndsAt = 0;
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
    "nasa-radio-apu.mp3",
    "nasa-radio-picture.mp3",
    "nasa-radio-houston-two.mp3",
    "nasa-radio-meco.mp3",
    "nasa-radio-on-way.mp3",
    "nasa-radio-ato.mp3",
    "nasa-radio-eagle.mp3",
    "nasa-radio-zero-g.mp3",
  ];
  let radioBag = [];
  function chooseRadio() {
    if (!radioBag.length) {
      radioBag = recordings
        .map((buffer, index) => (buffer ? index : -1))
        .filter((index) => index >= 0);
      for (let i = radioBag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [radioBag[i], radioBag[j]] = [radioBag[j], radioBag[i]];
      }
      if (radioBag.length > 1 && radioBag.at(-1) === lastRadio)
        [radioBag[0], radioBag[radioBag.length - 1]] = [
          radioBag.at(-1),
          radioBag[0],
        ];
    }
    const index = radioBag.pop();
    if (index === undefined) return null;
    lastRadio = index;
    return recordings[index];
  }
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const audible = () =>
    context && active && !muted && context.state === "running";

  function track(source, nodes, impact = false) {
    transient.add(source);
    if (impact) impacts.add(source);
    source.onended = () => {
      transient.delete(source);
      impacts.delete(source);
      if (source === narrationSource) {
        narrationSource = null;
        narrationGain = null;
        updateBreathing();
      }
      if (source === radioSource) {
        radioSource = null;
        updateBreathing();
      }
      for (const node of nodes) node.disconnect();
    };
    return source;
  }
  function stopTransient(preserveNarration = false, preserveImpacts = false) {
    rocketVoices.clear();
    for (const source of transient) {
      if (preserveNarration && source === narrationSource) continue;
      if (preserveImpacts && impacts.has(source)) continue;
      try {
        source.stop();
      } catch {
        /* A source may have finished this frame. */
      }
      transient.delete(source);
      impacts.delete(source);
    }
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
        radioSource ? 0.06 : 0.24,
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
    clearTimeout(suspensionTimer);
    if (!active && impacts.size) stopTransient(true);
    active = true;
    if (!context) {
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Audio) return;
      context = new Audio();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.35;
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.knee.value = 18;
      limiter.ratio.value = 5;
      limiter.attack.value = 0.004;
      limiter.release.value = 0.3;
      master.connect(limiter).connect(context.destination);
      music = createAmbientScore(context, master);
      fetch(new URL("./audio/rocket-engine.wav", import.meta.url))
        .then((response) => {
          if (!response.ok) throw new Error("Rocket audio unavailable");
          return response.arrayBuffer();
        })
        .then((bytes) => context.decodeAudioData(bytes))
        .then((buffer) => {
          rocketRecording = buffer;
        })
        .catch((error) => console.warn("Rocket audio could not load", error));
      for (let i = 0; i < 3; i++) {
        fetch(new URL(`./audio/meteor-explosion-${i + 1}.mp3`, import.meta.url))
          .then((response) => {
            if (!response.ok) throw new Error("Explosion audio unavailable");
            return response.arrayBuffer();
          })
          .then((bytes) => context.decodeAudioData(bytes))
          .then((buffer) => {
            impactRecordings[i] = buffer;
          })
          .catch((error) =>
            console.warn("Explosion audio could not load", error),
          );
      }
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
  function tone(
    frequency,
    duration,
    volume,
    type = "sine",
    delay = 0,
    impact = false,
  ) {
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
    track(osc, [osc, gain], impact);
    osc.start(time);
    osc.stop(time + duration);
  }
  function burst(
    duration,
    volume,
    cutoff,
    delay = 0,
    impact = false,
    pan = 0,
    attack = 0,
  ) {
    if (!audible()) return;
    const source = context.createBufferSource(),
      filter = context.createBiquadFilter(),
      gain = context.createGain();
    const time = context.currentTime + delay;
    source.buffer = noise;
    source.loop = duration > noise.duration;
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(attack ? 0.0001 : volume, time);
    if (attack) gain.gain.linearRampToValueAtTime(volume, time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    const nodes = [source, filter, gain];
    source.connect(filter).connect(gain);
    if (impact) {
      const panner = context.createStereoPanner();
      panner.pan.value = pan;
      gain.connect(panner).connect(master);
      nodes.push(panner);
    } else gain.connect(master);
    track(source, nodes, impact);
    source.start(time);
    source.stop(time + duration);
  }
  function radio() {
    if (!audible()) return false;
    if (
      !radioSource &&
      context.currentTime >= nextTuning &&
      nextRadio - context.currentTime > 1.5 &&
      context.currentTime < nextSagan - 1.5
    ) {
      nextTuning = context.currentTime + 10 + Math.random() * 12;
      const source = context.createBufferSource(),
        filter = context.createBiquadFilter(),
        gain = context.createGain();
      const time = context.currentTime;
      source.buffer = noise;
      filter.type = "bandpass";
      filter.Q.value = 1.2;
      filter.frequency.setValueAtTime(400 + Math.random() * 700, time);
      filter.frequency.exponentialRampToValueAtTime(
        1400 + Math.random() * 1200,
        time + 0.35,
      );
      filter.frequency.exponentialRampToValueAtTime(800, time + 0.85);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(0.045, time + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 1);
      source.connect(filter).connect(gain).connect(master);
      track(source, [source, filter, gain]);
      source.start(time);
      source.stop(time + 1);
      if (Math.random() < 0.5) {
        tone(920, 0.06, 0.025, "sine", 0.64);
        tone(690, 0.08, 0.02, "sine", 0.78);
      }
    }
    if (
      context.currentTime < nextRadio &&
      !(saganRecording && context.currentTime >= nextSagan)
    )
      return false;
    const narration =
      !narrationSource && saganRecording && context.currentTime >= nextSagan;
    if (!narration && radioSource) return false;
    const buffer = narration ? saganRecording : chooseRadio();
    if (!buffer) return false;
    if (narration) nextSagan = Infinity;
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
    const voiceLevel = narration ? 0.24 : 0.29;
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
    if (!narration)
      nextRadio = time + buffer.duration + 2.5 + Math.random() * 3.5;
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
    startRound() {
      if (narrationSource) {
        narrationSource.stop();
        narrationSource = null;
        narrationGain = null;
      }
      nextSagan = (context?.currentTime || 0) + 10;
      updateBreathing();
    },
    syncRockets(rockets, listener) {
      if (!audible() || !rocketRecording) return;
      for (const [rocket, voice] of rocketVoices) {
        if (rockets.includes(rocket)) continue;
        voice.gain.gain.setTargetAtTime(0.0001, context.currentTime, 0.12);
        voice.source.stop(context.currentTime + 0.6);
        rocketVoices.delete(rocket);
      }
      for (const rocket of rockets) {
        let voice = rocketVoices.get(rocket);
        if (!voice) {
          const source = context.createBufferSource(),
            filter = context.createBiquadFilter(),
            gain = context.createGain(),
            pan = context.createStereoPanner();
          source.buffer = rocketRecording;
          source.loop = true;
          source.playbackRate.value = 1.25;
          filter.type = "lowpass";
          gain.gain.value = 0;
          source.connect(filter).connect(gain).connect(pan).connect(master);
          track(source, [source, filter, gain, pan]);
          source.start();
          voice = { source, filter, gain, pan };
          rocketVoices.set(rocket, voice);
        }
        distanceAudio(rocket.position, listener, spatial);
        voice.gain.gain.setTargetAtTime(
          spatial.gain * 1.4 * Math.min(1, rocket.age / 0.35),
          context.currentTime,
          0.15,
        );
        voice.filter.frequency.setTargetAtTime(
          spatial.cutoff,
          context.currentTime,
          0.15,
        );
        voice.pan.pan.setTargetAtTime(spatial.pan, context.currentTime, 0.1);
      }
    },
    impact(position, listener) {
      if (!audible()) return;
      const available = [0, 1, 2].filter(
        (i) => impactRecordings[i] && i !== lastImpact,
      );
      if (!available.length) return;
      lastImpact = available[Math.floor(Math.random() * available.length)];
      const source = context.createBufferSource();
      const bass = context.createBiquadFilter(),
        air = context.createBiquadFilter();
      const gain = context.createGain(),
        panner = context.createStereoPanner();
      source.buffer = impactRecordings[lastImpact];
      source.playbackRate.value = 0.96 + Math.random() * 0.08;
      distanceAudio(position, listener, spatial);
      bass.type = "lowshelf";
      bass.frequency.value = 150;
      bass.gain.value = 5;
      air.type = "lowpass";
      air.frequency.value = spatial.cutoff;
      gain.gain.value = spatial.gain * 0.9;
      panner.pan.value = spatial.pan;
      source
        .connect(bass)
        .connect(air)
        .connect(gain)
        .connect(panner)
        .connect(master);
      track(source, [source, bass, air, gain, panner], true);
      const end =
        context.currentTime +
        source.buffer.duration / source.playbackRate.value +
        0.02;
      impactEndsAt = Math.max(impactEndsAt, end);
      source.start();
      source.stop(end);
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
    pause({ impactTail = false } = {}) {
      active = false;
      clearTimeout(suspensionTimer);
      if (context) {
        stopTransient(!impactTail, impactTail);
        music?.setActive(false);
        hum.gain.cancelScheduledValues(context.currentTime);
        hum.gain.value = 0;
        if (breathing) {
          breathing.gain.cancelScheduledValues(context.currentTime);
          breathing.gain.value = 0;
        }
        if (impactTail && impacts.size)
          suspensionTimer = setTimeout(
            () => {
              if (!active) context.suspend().catch(() => {});
            },
            Math.max(0, impactEndsAt - context.currentTime) * 1000 + 50,
          );
        else context.suspend().catch(() => {});
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
