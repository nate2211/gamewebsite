import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import BuildIcon from "@mui/icons-material/Build";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import ItemIcon from "./ItemIcon";
import { useDispatch, useSelector } from "react-redux";
import {
  assignHotbarItem,
  craftRecipe,
  setSelectedIndex,
  startFurnaceJob,
} from "../features/world/worldSlice";
import {
  FUEL_ITEMS,
  ITEM_TYPES,
  RECIPES,
  SMELTING_RECIPES,
  getFuelPower,
  getItemDefinition,
} from "../game/blockTypes";

function stationAllowsRecipe(station, recipeStation) {
  if (station === "crafting_table") return recipeStation === "inventory" || recipeStation === "crafting_table";
  return station === recipeStation;
}

function stationTitle(station) {
  if (station === "crafting_table") return "Crafting Table";
  if (station === "furnace") return "Furnace";
  return "Inventory Crafting";
}

function StationIcon({ station }) {
  if (station === "furnace") return <LocalFireDepartmentIcon />;
  if (station === "crafting_table") return <BuildIcon />;
  return <Inventory2Icon />;
}

function InventorySlot({ itemId, count, durability, selected, hotbarNumber, onClick, emptyLabel }) {
  const definition = itemId ? getItemDefinition(itemId) : null;
  const durabilityPercent = definition?.durability && durability != null
    ? Math.max(0, Math.min(100, (durability / definition.durability) * 100))
    : null;

  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      title={definition?.name || emptyLabel || "Empty slot"}
      sx={{
        appearance: "none",
        border: selected ? "3px solid #ffffff" : "2px solid rgba(255,255,255,.17)",
        bgcolor: selected ? "rgba(255,255,255,.18)" : "rgba(7,12,17,.9)",
        color: "inherit",
        p: 0,
        minWidth: 0,
        width: "100%",
        aspectRatio: "1 / 1",
        position: "relative",
        display: "grid",
        placeItems: "center",
        cursor: onClick ? "pointer" : "default",
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,.6)",
        "&:hover": onClick ? { bgcolor: "rgba(255,255,255,.12)" } : undefined,
      }}
    >
      {hotbarNumber != null && (
        <Typography variant="caption" sx={{ position: "absolute", top: 1, left: 4, opacity: 0.72 }}>
          {hotbarNumber}
        </Typography>
      )}
      {definition ? (
        <>
          <ItemIcon itemId={itemId} size={38} alt="" />
          {count > 0 && definition.maxStack !== 1 && (
            <Typography variant="caption" sx={{ position: "absolute", right: 4, bottom: 1, fontWeight: 1000 }}>
              {count}
            </Typography>
          )}
          {durabilityPercent != null && (
            <LinearProgress
              variant="determinate"
              value={durabilityPercent}
              color={durabilityPercent < 20 ? "error" : "success"}
              sx={{ position: "absolute", left: 4, right: 4, bottom: 4, height: 4, bgcolor: "rgba(0,0,0,.65)" }}
            />
          )}
        </>
      ) : (
        <Typography variant="caption" sx={{ opacity: 0.22 }}>—</Typography>
      )}
    </Box>
  );
}

function FurnacePanel({ stationKey, inventory, job }) {
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
        Coal and charcoal provide strong fuel. Logs and planks also work. Each job continues while menus are open and finishes automatically.
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
        ) : (
          <Typography color="text.secondary">The furnace is idle.</Typography>
        )}
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
                <Typography variant="caption">
                  Needs 1 {getItemDefinition(recipe.input).name} ({inventory[recipe.input] || 0}) · {recipe.seconds}s
                </Typography>
              </Box>
              <Button
                variant="contained"
                color="warning"
                disabled={Boolean(job) || !hasInput || !hasFuel || !outputSpace}
                onClick={() => dispatch(startFurnaceJob({ furnaceKey: stationKey, recipeId: recipe.id, fuelId, now: Date.now() }))}
              >
                Smelt
              </Button>
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
}

export default function CraftingPanel({ open, onClose, station = { type: "inventory", key: null } }) {
  const dispatch = useDispatch();
  const inventory = useSelector((state) => state.world.inventory);
  const toolDurability = useSelector((state) => state.world.toolDurability);
  const hotbar = useSelector((state) => state.world.hotbar);
  const selectedIndex = useSelector((state) => state.world.selectedIndex);
  const furnaces = useSelector((state) => state.world.furnaces);
  const stationType = station?.type || "inventory";
  const stationKey = station?.key || null;
  const furnaceJob = stationKey ? furnaces[stationKey] : null;

  const ownedItems = useMemo(
    () =>
      Object.entries(inventory)
        .filter(([itemId, count]) => count > 0 && ITEM_TYPES[itemId])
        .sort(([first], [second]) => {
          const a = getItemDefinition(first);
          const b = getItemDefinition(second);
          return `${a.category}-${a.name}`.localeCompare(`${b.category}-${b.name}`);
        }),
    [inventory]
  );

  const inventorySlots = Array.from({ length: 36 }, (_, index) => ownedItems[index] || null);
  const recipes = RECIPES.filter((recipe) => stationAllowsRecipe(stationType, recipe.station));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" disableRestoreFocus>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <StationIcon station={stationType} /> {stationTitle(stationType)}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(360px, 1fr) minmax(360px, 1fr)" }, gap: 3 }}>
          <Box>
            <Typography fontWeight={1000} gutterBottom>Survival inventory</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Click an owned item to assign it to the selected hotbar slot. The 3D simulation is paused while this menu is open.
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(9, minmax(31px, 1fr))", gap: 0.4 }}>
              {inventorySlots.map((entry, index) => {
                const itemId = entry?.[0] || null;
                const count = entry?.[1] || 0;
                return (
                  <InventorySlot
                    key={`${itemId || "empty"}-${index}`}
                    itemId={itemId}
                    count={count}
                    durability={toolDurability[itemId]}
                    emptyLabel={`Inventory slot ${index + 1}`}
                    onClick={itemId ? () => dispatch(assignHotbarItem({ index: selectedIndex, itemId })) : undefined}
                  />
                );
              })}
            </Box>

            <Typography fontWeight={1000} sx={{ mt: 2.5, mb: 1 }}>Hotbar</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(9, minmax(31px, 1fr))", gap: 0.4 }}>
              {hotbar.map((itemId, index) => (
                <InventorySlot
                  key={`hotbar-${index}`}
                  itemId={itemId}
                  count={inventory[itemId] || 0}
                  durability={toolDurability[itemId]}
                  selected={selectedIndex === index}
                  hotbarNumber={index + 1}
                  onClick={() => dispatch(setSelectedIndex(index))}
                />
              ))}
            </Box>

            {ownedItems.length > 36 && (
              <Stack direction="row" gap={0.6} flexWrap="wrap" sx={{ mt: 2 }}>
                {ownedItems.slice(36).map(([itemId, count]) => (
                  <Chip key={itemId} size="small" label={`${getItemDefinition(itemId).name}: ${count}`} />
                ))}
              </Stack>
            )}
          </Box>

          <Box sx={{ minWidth: 0, maxHeight: { md: "70vh" }, overflowY: "auto", pr: 0.5 }}>
            {stationType === "furnace" ? (
              <FurnacePanel stationKey={stationKey} inventory={inventory} job={furnaceJob} />
            ) : (
              <>
                <Typography fontWeight={1000} variant="h6">Available recipes</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Make planks, sticks, torches, tools, swords, a crafting table, and a furnace. Better tool tiers mine required ores and shorten break time.
                </Typography>
                <Stack spacing={1.4} divider={<Divider flexItem />}>
                  {recipes.map((recipe) => {
                    const available = Object.entries(recipe.inputs).every(([item, amount]) => (inventory[item] || 0) >= amount);
                    const outputSpace = Object.entries(recipe.outputs).every(([item, amount]) => (inventory[item] || 0) + amount <= (getItemDefinition(item).maxStack || 64));
                    return (
                      <Stack key={recipe.id} direction={{ xs: "column", sm: "row" }} gap={1.2} justifyContent="space-between" alignItems={{ sm: "center" }}>
                        <Box>
                          <Typography fontWeight={900}>{recipe.name}</Typography>
                          <Typography variant="body2" color="text.secondary">{recipe.description}</Typography>
                          <Stack direction="row" gap={0.55} flexWrap="wrap" mt={0.8}>
                            {Object.entries(recipe.inputs).map(([item, amount]) => (
                              <Chip key={item} size="small" color={(inventory[item] || 0) >= amount ? "success" : "default"} label={`${amount} ${getItemDefinition(item).name} (${inventory[item] || 0})`} />
                            ))}
                          </Stack>
                        </Box>
                        <Button variant="contained" disabled={!available || !outputSpace} onClick={() => dispatch(craftRecipe({ recipeId: recipe.id, station: stationType }))}>
                          Craft
                        </Button>
                      </Stack>
                    );
                  })}
                </Stack>
              </>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close inventory</Button>
      </DialogActions>
    </Dialog>
  );
}
