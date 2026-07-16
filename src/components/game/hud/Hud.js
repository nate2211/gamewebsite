import React, { useEffect, useMemo, useState } from "react";
import { Box, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { clearMessage } from "../../../features/world/worldSlice";
import { getItemDefinition } from "../../../game/config/blockTypes";
import { PERFORMANCE_EVENT } from "../../../game/systems/PerformanceGovernor";
import { sampleBiome } from "../../../game/world/generation/worldGenerator";
import { experienceForLevel, getMaxHealth } from "../../../game/config/progression";
import ItemIcon from "../../items/icons/ItemIcon";


function FpsCounter() {
  const enabled = typeof window !== "undefined" && localStorage.getItem("voxel:showFps") === "true";
  const [sample, setSample] = useState({ fps: 0, pixelRatio: 1 });
  useEffect(() => {
    if (!enabled) return undefined;
    const onSample = (event) => setSample(event.detail || { fps: 0, pixelRatio: 1 });
    window.addEventListener(PERFORMANCE_EVENT, onSample);
    return () => window.removeEventListener(PERFORMANCE_EVENT, onSample);
  }, [enabled]);
  if (!enabled) return null;
  return (
    <Typography
      variant="caption"
      display="block"
      sx={{ color: sample.fps < 45 ? "#ff9b8f" : "#9dffb1", fontWeight: 900 }}
    >
      {sample.fps || "–"} FPS · {sample.pixelRatio.toFixed?.(2) || sample.pixelRatio}× render
    </Typography>
  );
}

function meterSymbols(value, full, empty) {
  const filled = Math.max(0, Math.min(10, Math.ceil(value / 2)));
  return `${full.repeat(filled)}${empty.repeat(10 - filled)}`;
}

export default function Hud({ worldName }) {
  const dispatch = useDispatch();
  const selectedIndex = useSelector((state) => state.world.selectedIndex);
  const inventory = useSelector((state) => state.world.inventory);
  const hotbar = useSelector((state) => state.world.hotbar);
  const toolDurability = useSelector((state) => state.world.toolDurability);
  const health = useSelector((state) => state.world.health);
  const hunger = useSelector((state) => state.world.hunger);
  const playerDamageAt = useSelector((state) => state.world.playerDamageAt);
  const playerDamageAmount = useSelector((state) => state.world.playerDamageAmount);
  const playerDamageFlashUntil = useSelector((state) => state.world.playerDamageFlashUntil);
  const worldTime = useSelector((state) => state.world.worldTime);
  const player = useSelector((state) => state.world.player);
  const seed = useSelector((state) => state.world.seed);
  const message = useSelector((state) => state.world.message);
  const mount = useSelector((state) => state.world.mount);
  const progression = useSelector((state) => state.world.progression);
  const levelUpEvent = useSelector((state) => state.world.levelUpEvent);
  const armor = useSelector((state) => state.world.armor);
  const weather = useSelector((state) => state.world.weather);
  const fishing = useSelector((state) => state.world.fishing);
  const colony = useSelector((state) => state.world.colony);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [damageIndicatorVisible, setDamageIndicatorVisible] = useState(false);
  const [damageFlashStrength, setDamageFlashStrength] = useState(0);
  const selectedItem = hotbar[selectedIndex];
  const selectedDefinition = selectedItem ? getItemDefinition(selectedItem) : null;
  const selectedDurability = selectedItem ? toolDurability[selectedItem] : null;
  const timeHours = Math.floor(((worldTime / 1000 + 6) % 24));
  const timeMinutes = Math.floor(((worldTime % 1000) / 1000) * 60);
  const isNight = worldTime >= 13000 && worldTime <= 23000;
  const biome = sampleBiome(seed, Math.round(player.x), Math.round(player.z)).replaceAll("_", " ");

  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => dispatch(clearMessage()), 2600);
    return () => window.clearTimeout(timer);
  }, [dispatch, message]);

  useEffect(() => {
    if (!levelUpEvent) return undefined;
    setShowLevelUp(true);
    const timer = window.setTimeout(() => setShowLevelUp(false), 2400);
    return () => window.clearTimeout(timer);
  }, [levelUpEvent]);

  useEffect(() => {
    if (!playerDamageAt) return undefined;
    setDamageIndicatorVisible(true);
    const timer = window.setTimeout(() => setDamageIndicatorVisible(false), 950);
    return () => window.clearTimeout(timer);
  }, [playerDamageAt]);

  useEffect(() => {
    if (!playerDamageFlashUntil) {
      setDamageFlashStrength(0);
      return undefined;
    }
    let frame = 0;
    const tick = () => {
      const remaining = Math.max(0, playerDamageFlashUntil - Date.now());
      setDamageFlashStrength(Math.min(1, remaining / 650));
      if (remaining > 0) frame = window.requestAnimationFrame(tick);
    };
    tick();
    return () => window.cancelAnimationFrame(frame);
  }, [playerDamageFlashUntil]);

  const maxHealth = getMaxHealth(progression);
  const nextLevelXp = experienceForLevel(progression.level);
  const armorCount = Object.values(armor || {}).filter(Boolean).length;
  const damagePulseStyle = useMemo(() => ({
    transform: damageIndicatorVisible ? "translateY(-2px) scale(1.05)" : "translateY(0) scale(1)",
    transition: "transform 120ms ease-out",
  }), [damageIndicatorVisible]);

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 5,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          opacity: damageFlashStrength * 0.68,
          background: "radial-gradient(circle at center, rgba(255,72,72,0.08) 0%, rgba(255,72,72,0.18) 32%, rgba(120,0,0,0.48) 100%)",
          boxShadow: damageFlashStrength > 0 ? "inset 0 0 120px rgba(255,32,32,.65)" : "none",
          transition: "opacity 90ms linear, box-shadow 90ms linear",
        }}
      />
      <Typography
        className="pixel-shadow"
        sx={{ position: "absolute", top: 14, left: 16, fontWeight: 900 }}
      >
        {worldName}
      </Typography>

      <Paper
        elevation={8}
        sx={{
          position: "absolute",
          top: 44,
          left: 16,
          p: 1.2,
          bgcolor: "rgba(5,10,15,0.72)",
          border: "1px solid rgba(255,255,255,0.14)",
        }}
      >
        <Typography variant="caption" display="block">
          WASD move · Space jump · Shift sprint
        </Typography>
        <Typography variant="caption" display="block">
          Hold left click to mine · Left click attacks mobs
        </Typography>
        <Typography variant="caption" display="block">
          Right click uses/tames/rides, places boats/blocks, or opens stations · E toggles inventory
        </Typography>
        <Typography variant="caption" display="block">
          Hoe + right click tills soil · Seeds plant crops · Fishing rod casts with right click and reels with left click
        </Typography>
        {mount && (
          <Typography variant="caption" display="block" sx={{ color: "#8ce7ff", fontWeight: 900 }}>
            Mounted: {mount.type.replaceAll("_", " ")} · Shift dismount · Space horse jump
          </Typography>
        )}
      </Paper>

      <Paper
        elevation={8}
        sx={{
          position: "absolute",
          top: 14,
          right: 16,
          py: 0.7,
          px: 1.1,
          bgcolor: "rgba(5,10,15,0.72)",
          border: "1px solid rgba(255,255,255,0.14)",
        }}
      >
        <Typography variant="caption" fontWeight={900}>
          {isNight ? "Night" : "Day"} · {String(timeHours).padStart(2, "0")}:
          {String(timeMinutes).padStart(2, "0")} · {biome}
        </Typography>
        <Typography variant="caption" display="block" sx={{ textTransform: "capitalize", color: weather.type === "clear" ? "text.secondary" : weather.type === "snow" ? "#eff8ff" : "#9fccef" }}>
          Weather: {weather.type || "clear"}{weather.type !== "clear" ? ` · ${Math.round((weather.intensity || 0) * 100)}%` : ""}
        </Typography>
        <FpsCounter />
      </Paper>

      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 18,
          height: 18,
          transform: "translate(-50%, -50%)",
          "&::before, &::after": {
            content: '""',
            position: "absolute",
            bgcolor: "white",
            boxShadow: "0 0 2px #000, 0 0 4px #000",
          },
          "&::before": { width: 2, height: 18, left: 8, top: 0 },
          "&::after": { width: 18, height: 2, left: 0, top: 8 },
        }}
      />

      {fishing?.active && (
        <Paper
          sx={{
            position: "absolute",
            left: "50%",
            top: "55%",
            transform: "translateX(-50%)",
            px: 2,
            py: 0.8,
            bgcolor: fishing.bite ? "rgba(123,31,22,.94)" : "rgba(5,10,15,.82)",
            border: fishing.bite ? "3px solid #ffdd55" : "2px solid rgba(255,255,255,.4)",
          }}
        >
          <Typography fontWeight={1000} className="pixel-shadow" sx={{ color: fishing.bite ? "#fff16b" : "#eaf4ff" }}>
            {fishing.bite ? "BITE! LEFT CLICK NOW" : (fishing.message || "Watch the bobber…")}
          </Typography>
        </Paper>
      )}

      {message && (
        <Typography
          className="pixel-shadow"
          sx={{
            position: "absolute",
            left: "50%",
            top: "62%",
            transform: "translateX(-50%)",
            fontWeight: 900,
            textAlign: "center",
          }}
        >
          {message}
        </Typography>
      )}

      {damageIndicatorVisible && playerDamageAmount > 0 && (
        <Paper
          sx={{
            position: "absolute",
            left: "50%",
            top: "32%",
            transform: `translateX(-50%) translateY(${damageFlashStrength > 0 ? 0 : -8}px)`,
            px: 2.2,
            py: 0.8,
            bgcolor: "rgba(105,10,10,.86)",
            border: "2px solid rgba(255,160,160,.8)",
          }}
        >
          <Typography fontWeight={1000} className="pixel-shadow" sx={{ color: "#ffd6d6", letterSpacing: 1 }}>
            -{Math.ceil(playerDamageAmount)} HP · TAKING DAMAGE
          </Typography>
        </Paper>
      )}

      {showLevelUp && (
        <Paper sx={{ position: "absolute", left: "50%", top: "25%", transform: "translateX(-50%)", px: 3, py: 1.5, bgcolor: "rgba(29,68,20,.92)", border: "2px solid #a8ff75" }}>
          <Typography variant="h4" fontWeight={1000} className="pixel-shadow">LEVEL {progression.level}</Typography>
          <Typography textAlign="center">Spend {progression.unspentPoints} points in Inventory → Stats</Typography>
        </Paper>
      )}

      {colony?.stations?.length > 0 && (
        <Paper sx={{ position: "absolute", left: 16, bottom: 104, width: 240, p: 1, bgcolor: "rgba(5,10,15,.75)", border: "2px solid rgba(132,185,84,.5)" }}>
          <Typography variant="caption" fontWeight={1000}>Colony · {colony.stations.length} workers</Typography>
          <Typography variant="caption" display="block" color="text.secondary">
            Storage {Object.values(colony.storage || {}).reduce((sum, amount) => sum + Number(amount || 0), 0)} items · Guards {colony.totals?.hostilesStopped || 0} · Crops {colony.totals?.cropsHarvested || 0}
          </Typography>
        </Paper>
      )}

      <Paper sx={{ position: "absolute", left: 16, bottom: 16, width: 220, p: 1, bgcolor: "rgba(5,10,15,.75)" }}>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="caption" fontWeight={900}>Level {progression.level}</Typography>
          <Typography variant="caption">Armor {armorCount}/4</Typography>
        </Stack>
        <LinearProgress variant="determinate" value={Math.min(100, progression.experience / nextLevelXp * 100)} sx={{ mt: .5, height: 6 }} />
        <Typography variant="caption" color="text.secondary">{Math.floor(progression.experience)} / {nextLevelXp} XP</Typography>
      </Paper>

      <Box
        sx={{
          position: "absolute",
          bottom: 93,
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(94vw, 590px)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "end",
          gap: 2,
        }}
      >
        <Box sx={damagePulseStyle}>
          <Typography
            className="pixel-shadow"
            sx={{ color: "#f65b5b", fontSize: { xs: 15, sm: 20 }, letterSpacing: 1 }}
          >
            {meterSymbols((health / maxHealth) * 20, "♥", "♡")}
          </Typography>
          <Typography variant="caption" className="pixel-shadow">
            Health {Math.ceil(health)}/{maxHealth}
          </Typography>
        </Box>
        <Box sx={{ textAlign: "right" }}>
          <Typography
            className="pixel-shadow"
            sx={{ color: "#d8a54c", fontSize: { xs: 15, sm: 20 }, letterSpacing: 1 }}
          >
            {meterSymbols(hunger, "●", "○")}
          </Typography>
          <Typography variant="caption" className="pixel-shadow">
            Hunger {Math.ceil(hunger)}/20
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          position: "absolute",
          bottom: 18,
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(96vw, 650px)",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(9, minmax(42px, 1fr))",
            gap: 0.45,
            p: 0.7,
            bgcolor: "rgba(0,0,0,0.66)",
            border: "2px solid rgba(255,255,255,0.24)",
            borderRadius: 1,
          }}
        >
          {hotbar.map((itemId, index) => {
            const definition = itemId ? getItemDefinition(itemId) : null;
            const selected = selectedIndex === index;
            const count = itemId ? inventory[itemId] || 0 : 0;
            const durability = itemId ? toolDurability[itemId] : null;
            const durabilityPercent =
              definition?.durability && durability != null
                ? (durability / definition.durability) * 100
                : null;

            return (
              <Box
                key={`hud-slot-${index}`}
                sx={{
                  minWidth: 0,
                  aspectRatio: "1 / 1",
                  position: "relative",
                  display: "grid",
                  placeItems: "center",
                  bgcolor: selected
                    ? "rgba(255,255,255,0.24)"
                    : "rgba(15,22,28,0.85)",
                  border: selected
                    ? "3px solid #fff"
                    : "2px solid rgba(255,255,255,0.18)",
                  opacity: itemId && count <= 0 ? 0.38 : 1,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ position: "absolute", top: 1, left: 4, opacity: 0.78 }}
                >
                  {index + 1}
                </Typography>
                {definition && <ItemIcon itemId={itemId} size={36} alt="" />}
                {definition && definition.maxStack !== 1 && count > 0 && (
                  <Typography
                    variant="caption"
                    sx={{ position: "absolute", right: 3, bottom: 0, fontWeight: 900 }}
                  >
                    {count}
                  </Typography>
                )}
                {durabilityPercent != null && count > 0 && (
                  <LinearProgress
                    variant="determinate"
                    value={Math.max(0, durabilityPercent)}
                    color={durabilityPercent < 20 ? "error" : "success"}
                    sx={{
                      position: "absolute",
                      left: 3,
                      right: 3,
                      bottom: 3,
                      height: 3,
                      bgcolor: "rgba(0,0,0,.7)",
                    }}
                  />
                )}
              </Box>
            );
          })}
        </Box>
        <Typography
          className="pixel-shadow"
          variant="caption"
          sx={{ display: "block", mt: 0.6, textAlign: "center", fontWeight: 900 }}
        >
          {selectedDefinition?.name || "Empty hand"}
          {selectedDefinition?.durability && selectedDurability != null
            ? ` · ${selectedDurability}/${selectedDefinition.durability}`
            : ""}
        </Typography>
      </Box>
    </Box>
  );
}
