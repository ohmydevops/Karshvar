import test from "node:test";
import assert from "node:assert/strict";
import { createGameAudio } from "../public/save-earth-audio.js";

function audioFixture(t) {
  const started = [];
  let context;
  const parameter = () => ({
    value: 1,
    setValueAtTime(v) {
      this.value = v;
    },
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
    setTargetAtTime(v) {
      this.value = v;
    },
    cancelScheduledValues() {},
  });
  class Node {
    constructor(kind) {
      this.kind = kind;
      for (const key of [
        "gain",
        "frequency",
        "Q",
        "threshold",
        "knee",
        "ratio",
        "attack",
        "release",
        "delayTime",
        "pan",
        "detune",
        "playbackRate",
      ])
        this[key] = parameter();
    }
    connect(node) {
      this.output = node;
      return node;
    }
    disconnect() {}
    start() {
      this.startedAt = context.currentTime;
      started.push(this);
    }
    stop(at = context.currentTime) {
      this.end = at;
    }
  }
  class Audio {
    constructor() {
      context = this;
      this.currentTime = 0;
      this.state = "running";
      this.sampleRate = 100;
      this.destination = new Node();
    }
    createGain() {
      return new Node();
    }
    createBiquadFilter() {
      return new Node();
    }
    createDynamicsCompressor() {
      return new Node();
    }
    createDelay() {
      return new Node();
    }
    createStereoPanner() {
      return new Node();
    }
    createOscillator() {
      return new Node("oscillator");
    }
    createBufferSource() {
      return new Node("sample");
    }
    createBuffer(channels, length, rate) {
      return {
        numberOfChannels: channels,
        length,
        sampleRate: rate,
        duration: length / rate,
        getChannelData: () => new Float32Array(length),
      };
    }
    async decodeAudioData(id) {
      return { ...this.createBuffer(1, 400, 100), id };
    }
    async resume() {
      this.state = "running";
    }
    async suspend() {
      this.state = "suspended";
    }
    advance(time) {
      this.currentTime = time;
      for (const node of started)
        if (!node.ended && node.end <= time) {
          node.ended = true;
          node.onended?.();
        }
    }
  }
  const oldAudio = globalThis.AudioContext;
  globalThis.AudioContext = Audio;
  t.after(() => {
    if (oldAudio) globalThis.AudioContext = oldAudio;
    else delete globalThis.AudioContext;
  });
  t.mock.method(globalThis, "fetch", async (url) => ({
    ok: true,
    arrayBuffer: async () => String(url),
  }));
  return {
    started,
    get context() {
      return context;
    },
  };
}

test("Sagan plays once per round, resumes after pause and can play again next round", async (t) => {
  const fixture = audioFixture(t),
    audio = createGameAudio();
  audio.startRound();
  audio.boot();
  await new Promise(setImmediate);
  fixture.context.advance(11);
  audio.radio();
  const narration = () =>
    fixture.started.filter((n) => n.buffer?.id?.includes("carl-sagan"));
  assert.equal(narration().length, 1);
  audio.pause();
  audio.boot();
  audio.radio();
  assert.equal(narration().length, 1);
  fixture.context.advance(1000);
  audio.radio();
  assert.equal(narration().length, 1);
  audio.startRound();
  fixture.context.advance(1011);
  audio.radio();
  assert.equal(narration().length, 2);
  audio.pause();
});

test("impacts use three decoded recordings without immediate repeats and respect mute/pause", async (t) => {
  const fixture = audioFixture(t),
    audio = createGameAudio();
  audio.boot();
  await new Promise(setImmediate);
  let n = 0;
  t.mock.method(Math, "random", () => (++n % 17) / 17);
  for (let i = 0; i < 30; i++) audio.impact();
  const impacts = () =>
    fixture.started.filter((n) => n.buffer?.id?.includes("meteor-explosion"));
  const sounds = impacts().map((n) => n.buffer.id);
  assert.equal(sounds.length, 30);
  assert.equal(new Set(sounds).size, 3);
  sounds.forEach((id, i) => {
    if (i) assert.notEqual(id, sounds[i - 1]);
  });
  audio.toggle();
  audio.impact();
  assert.equal(impacts().length, 30);
  audio.toggle();
  audio.pause();
  audio.impact();
  assert.equal(impacts().length, 30);
});
import { Vector3, Quaternion } from "../public/vendor/three.module.min.js";

test("recorded rocket motor follows distance and stops after interception or pause", async (t) => {
  const fixture = audioFixture(t),
    audio = createGameAudio();
  audio.boot();
  await new Promise(setImmediate);
  const pilot = { position: new Vector3(), orientation: new Quaternion() },
    rocket = { position: new Vector3(10, 0, -10), age: 1 };
  audio.syncRockets([rocket], pilot);
  const engines = () =>
    fixture.started.filter((n) => n.buffer?.id?.includes("rocket-engine"));
  assert.equal(engines().length, 1);
  const voice = engines()[0],
    filter = voice.output,
    gain = filter.output;
  const near = gain.gain.value;
  rocket.position.multiplyScalar(20);
  audio.syncRockets([rocket], pilot);
  assert.ok(gain.gain.value < near);
  assert.equal(engines().length, 1);
  audio.syncRockets([], pilot);
  assert.ok(voice.end <= fixture.context.currentTime + 0.6);
  audio.pause();
  audio.syncRockets([rocket], pilot);
  assert.equal(engines().length, 1);
  audio.boot();
  audio.syncRockets([rocket], pilot);
  assert.equal(engines().length, 2);
  audio.pause();
});

test("occasional tuning sounds occupy quiet radio gaps and remain spaced apart", async (t) => {
  const fixture = audioFixture(t),
    audio = createGameAudio();
  audio.boot();
  await new Promise(setImmediate);
  for (let time = 0; time < 150; time += 0.5) {
    fixture.context.advance(time);
    audio.radio();
  }
  const tuning = fixture.started.filter(
    (n) =>
      n.kind === "sample" &&
      !n.buffer?.id &&
      Math.abs(n.end - n.startedAt - 1) < 0.01,
  );
  assert.ok(tuning.length >= 1 && tuning.length <= 6);
  tuning.forEach((n, i) => {
    if (i) assert.ok(n.startedAt - tuning[i - 1].startedAt >= 25);
  });
  audio.pause();
});
