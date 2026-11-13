import test from "node:test";
import assert from "node:assert/strict";
import {
  missionDifficulty,
  meteorSpawnInterval,
} from "../public/save-earth-difficulty.js";
test("normal preserves pacing while hard starts crowded, accelerates sooner and adds support", () => {
  assert.equal(missionDifficulty("normal").initialMeteors, 1);
  assert.equal(missionDifficulty("normal").shields, 5);
  assert.equal(missionDifficulty("hard").shields, 10);
  assert.equal(missionDifficulty("normal").firstSpawn, 10);
  assert.equal(meteorSpawnInterval("normal", 0), 8);
  assert.equal(meteorSpawnInterval("normal", 60), 5.6);
  assert.equal(missionDifficulty("hard").initialMeteors, 10);
  for (const t of [0, 40, 60, 120, 600])
    assert.ok(
      meteorSpawnInterval("hard", t) < meteorSpawnInterval("normal", t),
    );
  assert.ok(
    missionDifficulty("hard").defense < missionDifficulty("normal").defense,
  );
});
