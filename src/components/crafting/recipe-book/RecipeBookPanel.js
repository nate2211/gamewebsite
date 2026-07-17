import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useDispatch } from "react-redux";
import { craftRecipe } from "../../../features/world/worldSlice";
import { RECIPES, getItemDefinition } from "../../../game/config/blockTypes";
import ItemIcon from "../../items/icons/ItemIcon";

function categoryForRecipe(recipe) {
  const output = getItemDefinition(Object.keys(recipe.outputs)[0]);
  if (output.category === "armor") return "armor";
  if (output.category === "tool") return output.toolType === "sword" ? "combat" : "tools";
  if (["crafting_table", "furnace", "torch"].some((id) => recipe.outputs[id])) return "stations";
  if (output.category === "vehicle" || output.category === "utility") return "utility";
  return "building";
}

function maximumCrafts(recipe, inventory) {
  const inputLimit = Math.min(...Object.entries(recipe.inputs).map(([item, amount]) => Math.floor((inventory[item] || 0) / amount)));
  const outputLimit = Math.min(...Object.entries(recipe.outputs).map(([item, amount]) => {
    const definition = getItemDefinition(item);
    return Math.floor(((definition.maxStack || 64) - (inventory[item] || 0)) / amount);
  }));
  return Math.max(0, Math.min(inputLimit, outputLimit));
}

function PatternGrid({ recipe }) {
  const pattern = recipe.pattern || Array(9).fill(null);
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 62px)", gap: 0.65 }}>
      {pattern.map((itemId, index) => (
        <Box key={`${itemId || "empty"}-${index}`} sx={{ width: 62, height: 62, display: "grid", placeItems: "center", bgcolor: "rgba(6,10,14,.82)", border: "1px solid rgba(255,255,255,.16)" }}>
          {itemId ? <ItemIcon itemId={itemId} size={48} alt="" /> : null}
        </Box>
      ))}
    </Box>
  );
}

export default function RecipeBookPanel({ inventory, station = "crafting_table" }) {
  const dispatch = useDispatch();
  const recipes = useMemo(() => RECIPES.filter((recipe) => recipe.station === "crafting_table"), []);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const filtered = useMemo(() => recipes.filter((recipe) => {
    const ingredients = Object.keys(recipe.inputs || {}).map((itemId) => getItemDefinition(itemId).name).join(" ");
    const outputs = Object.keys(recipe.outputs || {}).map((itemId) => getItemDefinition(itemId).name).join(" ");
    const text = `${recipe.name} ${recipe.description || ""} ${ingredients} ${outputs}`.toLowerCase();
    return (!query || text.includes(query.trim().toLowerCase())) && (category === "all" || categoryForRecipe(recipe) === category);
  }), [category, query, recipes]);
  const [selectedId, setSelectedId] = useState(recipes[0]?.id || "");
  const selected = filtered.find((recipe) => recipe.id === selectedId) || filtered[0] || recipes[0];
  if (!selected) return null;
  const maxCrafts = maximumCrafts(selected, inventory);
  const outputId = Object.keys(selected.outputs)[0];

  const craftMany = (count) => {
    const safeCount = Math.max(0, Math.min(maxCrafts, count));
    for (let index = 0; index < safeCount; index += 1) {
      dispatch(craftRecipe({ recipeId: selected.id, station }));
    }
  };

  return (
    <Box>
      <Typography variant="h6" fontWeight={1000}>3×3 recipe book</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Search the full workbench catalog, filter by category, preview the exact pattern, and craft one, five, or the maximum available quantity.
      </Typography>
      <Stack direction={{ xs: "column", md: "row" }} gap={1.2} sx={{ mb: 1.4 }}>
        <TextField fullWidth size="small" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search recipes, ingredients, or outputs" inputProps={{ "data-recipe-search": "true", autoComplete: "off", spellCheck: false }}
        onKeyDown={(event) => { if (event.key !== "Escape") event.stopPropagation(); }}
        onKeyUp={(event) => event.stopPropagation()} InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} /> }} />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Category</InputLabel>
          <Select value={category} label="Category" onChange={(event) => setCategory(event.target.value)}>
            <MenuItem value="all">All recipes</MenuItem>
            <MenuItem value="tools">Tools</MenuItem>
            <MenuItem value="combat">Combat</MenuItem>
            <MenuItem value="armor">Armor</MenuItem>
            <MenuItem value="stations">Stations</MenuItem>
            <MenuItem value="utility">Utility</MenuItem>
            <MenuItem value="building">Building</MenuItem>
          </Select>
        </FormControl>
      </Stack>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(250px,.8fr) minmax(390px,1.2fr)" }, gap: 2 }}>
        <Stack spacing={0.7} sx={{ maxHeight: 535, overflowY: "auto", pr: 0.5 }}>
          {filtered.map((recipe) => {
            const available = maximumCrafts(recipe, inventory) > 0;
            return (
              <Button key={recipe.id} variant={recipe.id === selected.id ? "contained" : "outlined"} color={available ? "primary" : "inherit"} onClick={() => setSelectedId(recipe.id)} sx={{ justifyContent: "flex-start", textAlign: "left" }}>
                {recipe.name}
              </Button>
            );
          })}
          {!filtered.length && <Typography color="text.secondary">No recipes match this filter.</Typography>}
        </Stack>
        <Paper sx={{ p: 2.2, bgcolor: "rgba(139,86,42,.13)", border: "1px solid rgba(214,163,95,.28)" }}>
          <Stack direction={{ xs: "column", sm: "row" }} gap={2.2} alignItems="center">
            <PatternGrid recipe={selected} />
            <Typography variant="h4" color="text.secondary">→</Typography>
            <Box sx={{ minWidth: 110, textAlign: "center" }}>
              <Box sx={{ width: 92, height: 92, mx: "auto", display: "grid", placeItems: "center", bgcolor: "rgba(0,0,0,.34)", border: "2px solid rgba(255,255,255,.18)" }}>
                <ItemIcon itemId={outputId} size={78} alt="" />
              </Box>
              <Typography fontWeight={1000} sx={{ mt: 0.7 }}>{selected.name}</Typography>
              <Typography variant="caption" color="text.secondary">Craftable: {maxCrafts}</Typography>
            </Box>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>{selected.description}</Typography>
          <Stack direction="row" flexWrap="wrap" gap={0.65} sx={{ mt: 1.2 }}>
            {Object.entries(selected.inputs).map(([item, amount]) => (
              <Chip key={item} size="small" color={(inventory[item] || 0) >= amount ? "success" : "default"} label={`${amount} ${getItemDefinition(item).name} · ${inventory[item] || 0} owned`} />
            ))}
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
            <Button fullWidth variant="contained" disabled={maxCrafts < 1} onClick={() => craftMany(1)}>Craft one</Button>
            <Button fullWidth variant="outlined" disabled={maxCrafts < 1} onClick={() => craftMany(5)}>Craft five</Button>
            <Button fullWidth variant="outlined" disabled={maxCrafts < 1} onClick={() => craftMany(maxCrafts)}>Craft max</Button>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
