import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import BuildIcon from "@mui/icons-material/Build";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import SecurityIcon from "@mui/icons-material/Security";
import AutoGraphIcon from "@mui/icons-material/AutoGraph";
import { useDispatch, useSelector } from "react-redux";
import { craftRecipe } from "../../../features/world/worldSlice";
import { RECIPES, getItemDefinition } from "../../../game/config/blockTypes";
import InventoryTab from "../tabs/InventoryTab";
import ArmorPanel from "../../armor/ArmorPanel";
import StatsPanel from "../../progression/StatsPanel";
import CraftingTablePanel from "../../crafting/table/CraftingTablePanel";
import FurnacePanel from "../../crafting/furnace/FurnacePanel";

function titleForStation(station) {
  if (station === "crafting_table") return "Crafting Table";
  if (station === "furnace") return "Furnace";
  return "Inventory";
}

function iconForStation(station) {
  if (station === "crafting_table") return <BuildIcon />;
  if (station === "furnace") return <LocalFireDepartmentIcon />;
  return <Inventory2Icon />;
}

function InventoryCraftingPanel({ inventory }) {
  const dispatch = useDispatch();
  const recipes = useMemo(() => RECIPES.filter((recipe) => recipe.station === "inventory"), []);
  return (
    <Box>
      <Typography variant="h6" fontWeight={1000}>Pocket crafting</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Basic recipes fit in the player crafting area. Place and interact with a crafting table for 3×3 recipes, tools, boats, buckets, and armor.
      </Typography>
      <Stack spacing={1.2}>
        {recipes.map((recipe) => {
          const available = Object.entries(recipe.inputs).every(([item, amount]) => (inventory[item] || 0) >= amount);
          const outputSpace = Object.entries(recipe.outputs).every(([item, amount]) => (inventory[item] || 0) + amount <= (getItemDefinition(item).maxStack || 64));
          return (
            <Box key={recipe.id} sx={{ p: 1.5, border: "1px solid rgba(255,255,255,.12)", bgcolor: "rgba(255,255,255,.025)" }}>
              <Stack direction={{ xs: "column", sm: "row" }} gap={1.2} alignItems={{ sm: "center" }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography fontWeight={1000}>{recipe.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{recipe.description}</Typography>
                  <Stack direction="row" gap={0.6} flexWrap="wrap" sx={{ mt: 0.8 }}>
                    {Object.entries(recipe.inputs).map(([item, amount]) => (
                      <Chip key={item} size="small" color={(inventory[item] || 0) >= amount ? "success" : "default"}
                        label={`${amount} ${getItemDefinition(item).name} (${inventory[item] || 0})`} />
                    ))}
                  </Stack>
                </Box>
                <Button variant="contained" disabled={!available || !outputSpace}
                  onClick={() => dispatch(craftRecipe({ recipeId: recipe.id, station: "inventory" }))}>
                  Craft
                </Button>
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

export default function InventoryDialog({ open, onClose, station = { type: "inventory", key: null } }) {
  const inventory = useSelector((state) => state.world.inventory);
  const furnaces = useSelector((state) => state.world.furnaces);
  const stationType = station?.type || "inventory";
  const stationKey = station?.key || null;
  const defaultTab = stationType === "crafting_table" ? "workbench" : stationType === "furnace" ? "furnace" : "inventory";
  const [tab, setTab] = useState(defaultTab);

  useEffect(() => {
    if (open) setTab(defaultTab);
  }, [defaultTab, open]);

  const allowedTabs = stationType === "furnace"
    ? ["furnace", "inventory", "armor", "stats"]
    : stationType === "crafting_table"
      ? ["workbench", "inventory", "armor", "stats"]
      : ["inventory", "crafting", "armor", "stats"];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl" disableRestoreFocus PaperProps={{ sx: { minHeight: { md: "78vh" } } }}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {iconForStation(stationType)} {titleForStation(stationType)}
      </DialogTitle>
      <DialogContent>
        <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2, borderBottom: "1px solid rgba(255,255,255,.12)" }}>
          {allowedTabs.includes("inventory") && <Tab value="inventory" icon={<Inventory2Icon />} iconPosition="start" label="Inventory" />}
          {allowedTabs.includes("crafting") && <Tab value="crafting" icon={<BuildIcon />} iconPosition="start" label="Crafting" />}
          {allowedTabs.includes("workbench") && <Tab value="workbench" icon={<BuildIcon />} iconPosition="start" label="3×3 Workbench" />}
          {allowedTabs.includes("furnace") && <Tab value="furnace" icon={<LocalFireDepartmentIcon />} iconPosition="start" label="Smelting" />}
          {allowedTabs.includes("armor") && <Tab value="armor" icon={<SecurityIcon />} iconPosition="start" label="Armor" />}
          {allowedTabs.includes("stats") && <Tab value="stats" icon={<AutoGraphIcon />} iconPosition="start" label="Stats" />}
        </Tabs>
        <Box sx={{ maxHeight: { xs: "68vh", md: "66vh" }, overflowY: "auto", pr: 0.6 }}>
          {tab === "inventory" && <InventoryTab />}
          {tab === "crafting" && <InventoryCraftingPanel inventory={inventory} />}
          {tab === "workbench" && <CraftingTablePanel inventory={inventory} />}
          {tab === "furnace" && <FurnacePanel stationKey={stationKey} inventory={inventory} job={stationKey ? furnaces[stationKey] : null} />}
          {tab === "armor" && <ArmorPanel />}
          {tab === "stats" && <StatsPanel />}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close menu</Button>
      </DialogActions>
    </Dialog>
  );
}
