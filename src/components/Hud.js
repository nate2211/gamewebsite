import React, { useEffect } from "react";
import { Box, LinearProgress, Paper, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { clearMessage } from "../features/world/worldSlice";
import { getItemDefinition } from "../game/blockTypes";

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
  const worldTime = useSelector((state) => state.world.worldTime);
  const message = useSelector((state) => state.world.message);
  const selectedItem = hotbar[selectedIndex];
  const selectedDefinition = selectedItem ? getItemDefinition(selectedItem) : null;
  const selectedDurability = selectedItem ? toolDurability[selectedItem] : null;
  const timeHours = Math.floor(((worldTime / 1000 + 6) % 24));
  const timeMinutes = Math.floor(((worldTime % 1000) / 1000) * 60);
  const isNight = worldTime >= 13000 && worldTime <= 23000;

  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => dispatch(clearMessage()), 2600);
    return () => window.clearTimeout(timer);
  }, [dispatch, message]);

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 5,
      }}
    >
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
          Right click places, eats, or opens a workstation · E inventory
        </Typography>
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
          {String(timeMinutes).padStart(2, "0")}
        </Typography>
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
            content: '\"\"',
            position: "absolute",
            bgcolor: "white",
            boxShadow: "0 0 2px #000, 0 0 4px #000",
          },
          "&::before": { width: 2, height: 18, left: 8, top: 0 },
          "&::after": { width: 18, height: 2, left: 0, top: 8 },
        }}
      />

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
        <Box>
          <Typography
            className="pixel-shadow"
            sx={{ color: "#f65b5b", fontSize: { xs: 15, sm: 20 }, letterSpacing: 1 }}
          >
            {meterSymbols(health, "♥", "♡")}
          </Typography>
          <Typography variant="caption" className="pixel-shadow">
            Health {Math.ceil(health)}/20
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
                {definition && (
                  <Typography
                    sx={{
                      fontSize: { xs: 19, sm: 28 },
                      color: definition.color,
                      lineHeight: 1,
                      textShadow: "0 2px 0 #000, 0 0 5px rgba(255,255,255,.25)",
                    }}
                  >
                    {definition.icon || "■"}
                  </Typography>
                )}
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
