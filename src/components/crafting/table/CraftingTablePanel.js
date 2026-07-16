import React, { useMemo, useState } from "react";
import { Box, Button, Chip, Divider, Paper, Stack, Typography } from "@mui/material";
import { useDispatch } from "react-redux";
import { craftRecipe } from "../../../features/world/worldSlice";
import { RECIPES, getItemDefinition } from "../../../game/config/blockTypes";
import ItemIcon from "../../items/icons/ItemIcon";

function derivePattern(recipe) {
  if (recipe.pattern) return recipe.pattern;
  const output = Object.keys(recipe.outputs)[0] || "";
  if (output.includes("pickaxe")) return ["MMM", " S ", " S "];
  if (output.includes("axe")) return ["MM ", "MS ", " S "];
  if (output.includes("shovel")) return [" M ", " S ", " S "];
  if (output.includes("sword")) return [" M ", " M ", " S "];
  if (output === "furnace") return ["MMM", "M M", "MMM"];
  if (output === "boat") return ["M M", "MMM", "   "];
  return ["   ", " M ", "   "];
}

function patternItemMap(recipe) {
  const inputs = Object.keys(recipe.inputs);
  const material = inputs.find((item) => item !== "sticks") || inputs[0] || null;
  return { M: material, S: "sticks", I: material, C: material, G: material, D: material };
}

function PatternGrid({ recipe }) {
  const pattern = derivePattern(recipe);
  const itemMap = patternItemMap(recipe);
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 42px)", gap: 0.45 }}>
      {pattern.join("").split("").map((symbol, index) => {
        const itemId = itemMap[symbol] || null;
        return (
          <Box key={index} sx={{ width: 42, height: 42, display: "grid", placeItems: "center", bgcolor: "rgba(6,10,14,.8)", border: "1px solid rgba(255,255,255,.14)" }}>
            {itemId ? <ItemIcon itemId={itemId} size={34} alt="" /> : null}
          </Box>
        );
      })}
    </Box>
  );
}

export default function CraftingTablePanel({ inventory, station = "crafting_table" }) {
  const dispatch = useDispatch();
  const recipes = useMemo(() => RECIPES.filter((recipe) => recipe.station === "crafting_table"), []);
  const [selectedId, setSelectedId] = useState(recipes[0]?.id || "");
  const selected = recipes.find((recipe) => recipe.id === selectedId) || recipes[0];
  if (!selected) return null;
  const available = Object.entries(selected.inputs).every(([item, amount]) => (inventory[item] || 0) >= amount);
  const outputSpace = Object.entries(selected.outputs).every(([item, amount]) => (inventory[item] || 0) + amount <= (getItemDefinition(item).maxStack || 64));
  const outputId = Object.keys(selected.outputs)[0];

  return (
    <Box>
      <Typography variant="h6" fontWeight={1000}>3×3 crafting table</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Select a recipe to load its pattern into the workbench. This station unlocks tools, workstations, boats, buckets, and ore armor.
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(240px,.8fr) minmax(330px,1.2fr)" }, gap: 2 }}>
        <Stack spacing={0.7} sx={{ maxHeight: 520, overflowY: "auto", pr: 0.5 }}>
          {recipes.map((recipe) => {
            const canCraft = Object.entries(recipe.inputs).every(([item, amount]) => (inventory[item] || 0) >= amount);
            return (
              <Button key={recipe.id} variant={recipe.id === selected.id ? "contained" : "outlined"} color={canCraft ? "primary" : "inherit"}
                onClick={() => setSelectedId(recipe.id)} sx={{ justifyContent: "flex-start", textAlign: "left" }}>
                {recipe.name}
              </Button>
            );
          })}
        </Stack>
        <Paper sx={{ p: 2.2, bgcolor: "rgba(139,86,42,.13)", border: "1px solid rgba(214,163,95,.28)" }}>
          <Stack direction={{ xs: "column", sm: "row" }} gap={2.2} alignItems="center">
            <PatternGrid recipe={selected} />
            <Typography variant="h4" color="text.secondary">→</Typography>
            <Box sx={{ minWidth: 100, textAlign: "center" }}>
              <Box sx={{ width: 84, height: 84, mx: "auto", display: "grid", placeItems: "center", bgcolor: "rgba(0,0,0,.32)", border: "2px solid rgba(255,255,255,.18)" }}>
                <ItemIcon itemId={outputId} size={70} alt="" />
              </Box>
              <Typography fontWeight={1000} sx={{ mt: 0.7 }}>{selected.name}</Typography>
            </Box>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>{selected.description}</Typography>
          <Stack direction="row" flexWrap="wrap" gap={0.65} sx={{ mt: 1.2 }}>
            {Object.entries(selected.inputs).map(([item, amount]) => (
              <Chip key={item} size="small" color={(inventory[item] || 0) >= amount ? "success" : "default"}
                label={`${amount} ${getItemDefinition(item).name} · owned ${inventory[item] || 0}`} />
            ))}
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Button fullWidth size="large" variant="contained" disabled={!available || !outputSpace}
            onClick={() => dispatch(craftRecipe({ recipeId: selected.id, station }))}>
            Craft {selected.name}
          </Button>
        </Paper>
      </Box>
    </Box>
  );
}
