import React, { useMemo } from "react";
import { Alert, Box, Button, Chip, LinearProgress, Stack, Typography } from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import LockIcon from "@mui/icons-material/Lock";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useDispatch, useSelector } from "react-redux";
import { craftRecipe, selectArcaneSpell, unlockArcaneResearch } from "../../features/world/worldSlice";
import { ARCANE_RESEARCH, ARCANE_RESEARCH_BY_ID, canUnlockResearch } from "../../game/config/arcana";
import { RECIPES, getItemDefinition } from "../../game/config/blockTypes";

function requirementText(node) {
  if (!node.requires.length) return "Foundation research";
  return node.requires.map((id) => ARCANE_RESEARCH_BY_ID[id]?.name || id).join(" + ");
}

export default function ArcaneResearchPanel({ stationActive = false }) {
  const dispatch = useDispatch();
  const arcana = useSelector((state) => state.world.arcana);
  const inventory = useSelector((state) => state.world.inventory);
  const branches = useMemo(() => [...new Set(ARCANE_RESEARCH.map((entry) => entry.branch))], []);
  const arcaneRecipes = useMemo(() => RECIPES.filter((recipe) => recipe.station === "arcane_table"), []);
  const hasWand = ["wooden_wand", "copper_wand", "ironbound_wand"].some((id) => (inventory[id] || 0) > 0);
  const manaPercent = Math.max(0, Math.min(100, ((arcana.mana || 0) / Math.max(1, arcana.maxMana || 1)) * 100));

  return (
    <Box className="arcane-research-panel">
      <div className="rpg-section-heading arcane-heading">
        <div>
          <Typography variant="overline">Original Voxel Frontier expansion</Typography>
          <Typography variant="h5" fontWeight={1000}>Arcane Worktable</Typography>
          <Typography variant="body2" color="text.secondary">
            Discover spellcraft, protective wards, and animated constructs. Equip a wand and right-click in the world to cast the selected spell.
          </Typography>
        </div>
        <Stack minWidth={220} spacing={0.75}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" fontWeight={900}>Mana</Typography>
            <Typography variant="caption">{Math.floor(arcana.mana)}/{arcana.maxMana}</Typography>
          </Stack>
          <LinearProgress variant="determinate" value={manaPercent} sx={{ height: 9, borderRadius: 10 }} />
          <Stack direction="row" gap={0.7} flexWrap="wrap" useFlexGap>
            <Chip size="small" color="secondary" label={`${arcana.researchPoints} research points`} />
            <Chip size="small" label={`${arcana.knowledge} knowledge`} />
          </Stack>
        </Stack>
      </div>

      {!hasWand && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Craft a Wooden Wand at a crafting table. Arcane dust is found while mining ore, and the Arcane Worktable unlocks the full research interface in-world.
        </Alert>
      )}

      <div className="arcane-branch-grid">
        {branches.map((branch) => (
          <section key={branch} className="arcane-branch-card">
            <Typography variant="overline" color="secondary.light">{branch}</Typography>
            <Stack spacing={1.1}>
              {ARCANE_RESEARCH.filter((node) => node.branch === branch).map((node) => {
                const unlocked = arcana.unlocked.includes(node.id);
                const selected = arcana.selectedSpell === node.id;
                const available = canUnlockResearch(arcana, node.id);
                return (
                  <article
                    key={node.id}
                    className={`arcane-node ${unlocked ? "is-unlocked" : ""} ${selected ? "is-selected" : ""}`}
                    style={{ "--arcane-node-color": node.color }}
                  >
                    <div className="arcane-node-icon">{node.icon}</div>
                    <div className="arcane-node-copy">
                      <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap">
                        <Typography fontWeight={1000}>{node.name}</Typography>
                        <Chip size="small" label={`Tier ${node.tier}`} />
                        <Chip size="small" variant="outlined" label={`${node.manaCost} mana`} />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">{node.description}</Typography>
                      <Typography variant="caption" color="text.secondary">Requires: {requirementText(node)}</Typography>
                    </div>
                    <div className="arcane-node-action">
                      {unlocked ? (
                        <Button
                          size="small"
                          variant={selected ? "contained" : "outlined"}
                          color="secondary"
                          startIcon={selected ? <CheckCircleIcon /> : <AutoAwesomeIcon />}
                          onClick={() => dispatch(selectArcaneSpell(node.id))}
                        >
                          {selected ? "Selected" : "Select"}
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="contained"
                          color="secondary"
                          disabled={!available}
                          startIcon={<LockIcon />}
                          onClick={() => dispatch(unlockArcaneResearch(node.id))}
                        >
                          Unlock · {node.cost}
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </Stack>
          </section>
        ))}
      </div>


      <section className="arcane-crafting-section">
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
          <div>
            <Typography variant="overline" color="secondary.light">Focus workshop</Typography>
            <Typography variant="h6" fontWeight={1000}>Wands and construct cores</Typography>
          </div>
          <Chip size="small" color={stationActive ? "success" : "default"} label={stationActive ? "Worktable active" : "Place and open an Arcane Worktable"} />
        </Stack>
        <div className="recipe-card-grid compact-recipes">
          {arcaneRecipes.map((recipe) => {
            const available = Object.entries(recipe.inputs).every(([item, amount]) => (inventory[item] || 0) >= amount);
            const outputSpace = Object.entries(recipe.outputs).every(([item, amount]) => (inventory[item] || 0) + amount <= (getItemDefinition(item).maxStack || 64));
            return (
              <article key={recipe.id} className={`rpg-recipe-card ${available && stationActive ? "is-ready" : ""}`}>
                <div className="rpg-recipe-card-header">
                  <div>
                    <Typography fontWeight={1000}>{recipe.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{recipe.description}</Typography>
                  </div>
                  <Button variant="contained" color="secondary" disabled={!stationActive || !available || !outputSpace} onClick={() => dispatch(craftRecipe({ recipeId: recipe.id, station: "arcane_table" }))}>
                    Craft
                  </Button>
                </div>
                <Stack direction="row" gap={0.6} flexWrap="wrap" sx={{ mt: 1 }}>
                  {Object.entries(recipe.inputs).map(([item, amount]) => <Chip key={item} size="small" color={(inventory[item] || 0) >= amount ? "success" : "default"} label={`${amount} ${getItemDefinition(item).name} · ${inventory[item] || 0}`} />)}
                </Stack>
              </article>
            );
          })}
        </div>
      </section>

      <Alert severity="info" sx={{ mt: 2 }}>
        Research points come from mining ore, defeating hostiles, crafting arcane equipment, and using spells. Higher-tier wands reduce mana costs.
      </Alert>
    </Box>
  );
}
