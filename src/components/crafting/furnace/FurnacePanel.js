import React, { useEffect, useState } from "react";
import { Box, Button, Divider, LinearProgress, MenuItem, Select, Stack, Typography } from "@mui/material";
import { useDispatch } from "react-redux";
import { startFurnaceJob } from "../../../features/world/worldSlice";
import { FUEL_ITEMS, SMELTING_RECIPES, getFuelPower, getItemDefinition } from "../../../game/config/blockTypes";

export default function FurnacePanel({ stationKey, inventory, job }) {
  const dispatch = useDispatch();
  const [fuelId, setFuelId] = useState("coal");
  const [now, setNow] = useState(Date.now());
  const availableFuels = FUEL_ITEMS.filter((item) => (inventory[item] || 0) > 0 && getFuelPower(item) > 0);

  useEffect(() => {
    if (!availableFuels.includes(fuelId)) setFuelId(availableFuels[0] || "coal");
  }, [availableFuels, fuelId]);

  useEffect(() => {
    if (!job) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 150);
    return () => window.clearInterval(timer);
  }, [job]);

  const progress = job ? Math.max(0, Math.min(100, ((now - job.startedAt) / job.durationMs) * 100)) : 0;
  const activeRecipe = job ? SMELTING_RECIPES.find((recipe) => recipe.id === job.recipeId) : null;

  return (
    <Box>
      <Typography fontWeight={1000} variant="h6">Furnace smelting</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Coal and charcoal provide strong fuel. Logs and planks also work. Jobs continue while menus are open.
      </Typography>
      <Box sx={{ p: 2, mb: 2, border: "1px solid rgba(255,255,255,.14)", bgcolor: "rgba(255,120,30,.06)" }}>
        {job ? (
          <>
            <Stack direction="row" justifyContent="space-between" gap={2}>
              <Typography fontWeight={900}>{activeRecipe?.name || "Smelting"}</Typography>
              <Typography variant="body2">{Math.round(progress)}%</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={progress} color="warning" sx={{ mt: 1, height: 9 }} />
            <Typography variant="caption" color="text.secondary">
              Fuel: {getItemDefinition(job.fuelId).name} · Output: {getItemDefinition(job.output).name}
            </Typography>
          </>
        ) : <Typography color="text.secondary">The furnace is idle.</Typography>}
      </Box>
      <Stack direction={{ xs: "column", sm: "row" }} gap={1} alignItems={{ sm: "center" }} sx={{ mb: 2 }}>
        <Typography fontWeight={900}>Fuel</Typography>
        <Select size="small" value={fuelId} onChange={(event) => setFuelId(event.target.value)} sx={{ minWidth: 190 }}>
          {(availableFuels.length ? availableFuels : ["coal"]).map((item) => (
            <MenuItem key={item} value={item} disabled={(inventory[item] || 0) <= 0}>
              {getItemDefinition(item).name} ({inventory[item] || 0})
            </MenuItem>
          ))}
        </Select>
      </Stack>
      <Stack spacing={1.3} divider={<Divider flexItem />}>
        {SMELTING_RECIPES.map((recipe) => {
          const hasInput = (inventory[recipe.input] || 0) > 0;
          const hasFuel = (inventory[fuelId] || 0) > 0 && getFuelPower(fuelId) > 0;
          const outputSpace = (inventory[recipe.output] || 0) < (getItemDefinition(recipe.output).maxStack || 64);
          return (
            <Stack key={recipe.id} direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1.2}>
              <Box>
                <Typography fontWeight={900}>{recipe.name}</Typography>
                <Typography variant="body2" color="text.secondary">{recipe.description}</Typography>
                <Typography variant="caption">Needs 1 {getItemDefinition(recipe.input).name} ({inventory[recipe.input] || 0}) · {recipe.seconds}s</Typography>
              </Box>
              <Button variant="contained" color="warning" disabled={Boolean(job) || !hasInput || !hasFuel || !outputSpace}
                onClick={() => dispatch(startFurnaceJob({ furnaceKey: stationKey, recipeId: recipe.id, fuelId, now: Date.now() }))}>
                Smelt
              </Button>
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
}
