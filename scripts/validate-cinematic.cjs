const Module = require("module");
const babel = require("@babel/core");

const originalLoader = Module._extensions[".js"];
Module._extensions[".js"] = function transformSource(module, filename) {
  if (filename.includes(`${require("path").sep}src${require("path").sep}`)) {
    const result = babel.transformFileSync(filename, {
      presets: [["@babel/preset-env", { targets: { node: "current" }, modules: "commonjs" }]],
      sourceMaps: false,
      babelrc: false,
      configFile: false,
    });
    module._compile(result.code, filename);
    return;
  }
  originalLoader(module, filename);
};

const worldModule = require("../src/features/world/worldSlice.js");
const { createMob } = require("../src/game/config/mobTypes.js");

let state = worldModule.default(undefined, { type: "@@INIT" });
const mob = createMob("death-test", "pig", 0, 1, 0);
mob.health = 1;
state = worldModule.default(state, worldModule.loadWorld({
  id: "test",
  name: "Test",
  seed: "seed",
  blockEdits: {},
  inventory: {},
  mobs: [mob],
  player: { x: 0, y: 3, z: 0 },
  spawn: { x: 0, y: 3, z: 0 },
  worldTime: 1000,
}));
state = worldModule.default(state, worldModule.damageMob({ mobId: "death-test", itemId: null }));
if (state.mobs.length !== 1 || !state.mobs[0].dyingUntil || state.mobs[0].health !== 0) {
  throw new Error("Mob should remain during the death animation");
}
const dyingUntil = state.mobs[0].dyingUntil;
state = worldModule.default(state, worldModule.finalizeMobDeaths({ now: dyingUntil - 1 }));
if (state.mobs.length !== 1) throw new Error("Mob was removed before the death animation finished");
state = worldModule.default(state, worldModule.finalizeMobDeaths({ now: dyingUntil + 1 }));
if (state.mobs.length !== 0) throw new Error("Mob was not removed after the death animation finished");
console.log("Cinematic regression passed: delayed mob death cleanup behaves correctly.");
