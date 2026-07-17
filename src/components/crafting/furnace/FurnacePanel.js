import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, Divider, LinearProgress, MenuItem, Select, Stack, TextField, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useDispatch } from "react-redux";
import { collectFurnaceOutput, startFurnaceJob } from "../../../features/world/worldSlice";
import { FUEL_ITEMS, SMELTING_RECIPES, getFuelPower, getItemDefinition } from "../../../game/config/blockTypes";

export default function FurnacePanel({ stationKey, inventory, job }) {
  const dispatch = useDispatch();
  const [fuelId, setFuelId] = useState("coal");
  const [query, setQuery] = useState("");
  const [now, setNow] = useState(Date.now());
  const availableFuels = FUEL_ITEMS.filter((item) => (inventory[item] || 0) > 0 && getFuelPower(item) > 0);

  useEffect(() => {
    if (!availableFuels.includes(fuelId)) setFuelId(availableFuels[0] || "coal");
  }, [availableFuels, fuelId]);

  const activeJob = job?.recipeId ? job : null;
  const outputInventory = job?.outputInventory || {};

  useEffect(() => {
    if (!activeJob) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 150);
    return () => window.clearInterval(timer);
  }, [activeJob]);
  const progress = activeJob ? Math.max(0, Math.min(100, ((now - activeJob.startedAt) / activeJob.durationMs) * 100)) : 0;
  const activeRecipe = activeJob ? SMELTING_RECIPES.find((recipe) => recipe.id === activeJob.recipeId) : null;
  const filteredRecipes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return SMELTING_RECIPES;
    return SMELTING_RECIPES.filter((recipe) => `${recipe.name} ${recipe.description || ""} ${getItemDefinition(recipe.input).name} ${getItemDefinition(recipe.output).name}`.toLowerCase().includes(normalized));
  }, [query]);

  return (
    <Box>
      <Typography fontWeight={1000} variant="h6">Furnace smelting</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Coal and charcoal provide strong fuel. Logs and planks also work. Jobs continue while menus are open.
      </Typography>
      <Box sx={{ p: 2, mb: 2, border: "1px solid rgba(255,255,255,.14)", bgcolor: "rgba(255,120,30,.06)" }}>
        {activeJob ? (
          <>
            <Stack direction="row" justifyContent="space-between" gap={2}>
              <Typography fontWeight={900}>{activeRecipe?.name || "Smelting"}</Typography>
              <Typography variant="body2">{Math.round(progress)}%</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={progress} color="warning" sx={{ mt: 1, height: 9 }} />
            <Typography variant="caption" color="text.secondary">
              Fuel: {getItemDefinition(activeJob.fuelId).name} · Output: {getItemDefinition(activeJob.output).name}
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
      <Box sx={{ p: 2, mb: 2, border: "2px solid rgba(255,180,80,.28)", bgcolor: "rgba(20,12,5,.45)" }}>
        <Typography fontWeight={1000}>Output inventory</Typography>
        {Object.keys(outputInventory).length === 0 ? <Typography variant="body2" color="text.secondary">Smelted items stay inside this furnace until you take them out.</Typography> : (
          <Stack spacing={1} sx={{ mt: 1 }}>{Object.entries(outputInventory).map(([itemId, amount]) => <Stack key={itemId} direction="row" alignItems="center" justifyContent="space-between"><Typography>{getItemDefinition(itemId).name} × {amount}</Typography><Button variant="contained" size="small" onClick={() => dispatch(collectFurnaceOutput({ furnaceKey: stationKey, itemId }))}>Take all</Button></Stack>)}</Stack>
        )}
      </Box>
      <TextField
        fullWidth
        size="small"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search smelting recipes, inputs, or outputs"
        inputProps={{ "data-recipe-search": "true", autoComplete: "off", spellCheck: false }}
        onKeyDown={(event) => { if (event.key !== "Escape") event.stopPropagation(); }}
        onKeyUp={(event) => event.stopPropagation()}
        InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} /> }}
        sx={{ mb: 1.5 }}
      />
      <Stack spacing={1.3} divider={<Divider flexItem />}>
        {filteredRecipes.map((recipe) => {
          const hasInput = (inventory[recipe.input] || 0) > 0;
          const hasFuel = (inventory[fuelId] || 0) > 0 && getFuelPower(fuelId) > 0;
          const outputSpace = (outputInventory[recipe.output] || 0) < 64;
          return (
            <Stack key={recipe.id} direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1.2}>
              <Box>
                <Typography fontWeight={900}>{recipe.name}</Typography>
                <Typography variant="body2" color="text.secondary">{recipe.description}</Typography>
                <Typography variant="caption">Needs 1 {getItemDefinition(recipe.input).name} ({inventory[recipe.input] || 0}) · {recipe.seconds}s</Typography>
              </Box>
              <Button variant="contained" color="warning" disabled={Boolean(activeJob) || !hasInput || !hasFuel || !outputSpace}
                onClick={() => dispatch(startFurnaceJob({ furnaceKey: stationKey, recipeId: recipe.id, fuelId, now: Date.now() }))}>
                Smelt
              </Button>
            </Stack>
          );
        })}
        {!filteredRecipes.length && <Typography color="text.secondary">No smelting recipes match this search.</Typography>}
      </Stack>
    </Box>
  );
}
