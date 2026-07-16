import React, { useMemo } from "react";
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
  Stack,
  Typography,
} from "@mui/material";
import BuildIcon from "@mui/icons-material/Build";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import { useDispatch, useSelector } from "react-redux";
import {
  assignHotbarItem,
  craftRecipe,
  setSelectedIndex,
} from "../features/world/worldSlice";
import { ITEM_TYPES, RECIPES, getItemDefinition } from "../game/blockTypes";

function stationAllowsRecipe(station, recipeStation) {
  if (station === "crafting_table") {
    return recipeStation === "inventory" || recipeStation === "crafting_table";
  }
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

function InventorySlot({
  itemId,
  count,
  durability,
  selected,
  hotbarNumber,
  onClick,
  emptyLabel,
}) {
  const definition = itemId ? getItemDefinition(itemId) : null;
  const durabilityPercent =
    definition?.durability && durability != null
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
        <Typography
          variant="caption"
          sx={{ position: "absolute", top: 1, left: 4, opacity: 0.72 }}
        >
          {hotbarNumber}
        </Typography>
      )}
      {definition ? (
        <>
          <Typography
            aria-hidden="true"
            sx={{
              fontSize: { xs: 22, sm: 28 },
              lineHeight: 1,
              color: definition.color,
              textShadow: "0 2px 0 #000, 0 0 5px rgba(255,255,255,.25)",
            }}
          >
            {definition.icon || "■"}
          </Typography>
          {count > 0 && definition.maxStack !== 1 && (
            <Typography
              variant="caption"
              sx={{ position: "absolute", right: 4, bottom: 1, fontWeight: 1000 }}
            >
              {count}
            </Typography>
          )}
          {durabilityPercent != null && (
            <LinearProgress
              variant="determinate"
              value={durabilityPercent}
              color={durabilityPercent < 20 ? "error" : "success"}
              sx={{
                position: "absolute",
                left: 4,
                right: 4,
                bottom: 4,
                height: 4,
                bgcolor: "rgba(0,0,0,.65)",
              }}
            />
          )}
        </>
      ) : (
        <Typography variant="caption" sx={{ opacity: 0.22 }}>
          —
        </Typography>
      )}
    </Box>
  );
}

export default function CraftingPanel({ open, onClose, station = "inventory" }) {
  const dispatch = useDispatch();
  const inventory = useSelector((state) => state.world.inventory);
  const toolDurability = useSelector((state) => state.world.toolDurability);
  const hotbar = useSelector((state) => state.world.hotbar);
  const selectedIndex = useSelector((state) => state.world.selectedIndex);

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

  const inventorySlots = Array.from({ length: 27 }, (_, index) => ownedItems[index] || null);
  const recipes = RECIPES.filter((recipe) => stationAllowsRecipe(station, recipe.station));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <StationIcon station={station} /> {stationTitle(station)}
      </DialogTitle>
      <DialogContent>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "minmax(360px, 1.05fr) minmax(330px, .95fr)" },
            gap: 3,
          }}
        >
          <Box>
            <Typography fontWeight={900} gutterBottom>
              Survival inventory
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Click an owned item to put it in the currently selected hotbar slot.
              Tools show their remaining durability as a bar.
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(9, minmax(34px, 1fr))",
                gap: 0.45,
              }}
            >
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
                    onClick={
                      itemId
                        ? () =>
                            dispatch(
                              assignHotbarItem({
                                index: selectedIndex,
                                itemId,
                              })
                            )
                        : undefined
                    }
                  />
                );
              })}
            </Box>

            <Typography fontWeight={900} sx={{ mt: 2.5, mb: 1 }}>
              Hotbar
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(9, minmax(34px, 1fr))",
                gap: 0.45,
              }}
            >
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

            <Stack direction="row" gap={0.8} flexWrap="wrap" sx={{ mt: 2 }}>
              {ownedItems.map(([itemId, count]) => (
                <Chip
                  key={itemId}
                  size="small"
                  label={`${getItemDefinition(itemId).name}: ${count}`}
                />
              ))}
              {ownedItems.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Your inventory is empty. Punch a tree to begin.
                </Typography>
              )}
            </Stack>
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography fontWeight={900} gutterBottom>
              {station === "furnace" ? "Smelting recipes" : "Available recipes"}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Inventory crafting makes basic materials. Place and use a crafting
              table for tools, then use a furnace for iron and cooked food.
            </Typography>

            <Stack
              spacing={1.6}
              divider={<Divider flexItem />}
              sx={{ maxHeight: { md: 520 }, overflowY: "auto", pr: 0.5 }}
            >
              {recipes.map((recipe) => {
                const available = Object.entries(recipe.inputs).every(
                  ([item, amount]) => (inventory[item] || 0) >= amount
                );
                const outputSpace = Object.entries(recipe.outputs).every(
                  ([item, amount]) =>
                    (inventory[item] || 0) + amount <=
                    (getItemDefinition(item).maxStack || 64)
                );

                return (
                  <Box key={recipe.id} sx={{ py: 0.4 }}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      gap={1.4}
                      justifyContent="space-between"
                      alignItems={{ xs: "stretch", sm: "center" }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography fontWeight={900}>{recipe.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {recipe.description}
                        </Typography>
                        <Stack direction="row" gap={0.65} flexWrap="wrap" mt={1}>
                          {Object.entries(recipe.inputs).map(([item, amount]) => (
                            <Chip
                              key={item}
                              size="small"
                              color={(inventory[item] || 0) >= amount ? "success" : "default"}
                              label={`${amount} ${getItemDefinition(item).name} (${inventory[item] || 0})`}
                            />
                          ))}
                        </Stack>
                      </Box>
                      <Button
                        variant="contained"
                        disabled={!available || !outputSpace}
                        onClick={() =>
                          dispatch(
                            craftRecipe({
                              recipeId: recipe.id,
                              station,
                            })
                          )
                        }
                      >
                        {outputSpace ? "Craft" : "Stack full"}
                      </Button>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close and resume</Button>
      </DialogActions>
    </Dialog>
  );
}
