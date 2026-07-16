import React, { lazy, memo, Suspense, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import BuildIcon from "@mui/icons-material/Build";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import SecurityIcon from "@mui/icons-material/Security";
import AutoGraphIcon from "@mui/icons-material/AutoGraph";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import MemoryIcon from "@mui/icons-material/Memory";
import SaveAltIcon from "@mui/icons-material/SaveAlt";
import HomeWorkIcon from "@mui/icons-material/HomeWork";
import CloseIcon from "@mui/icons-material/Close";
import { useDispatch, useSelector } from "react-redux";
import { craftRecipe } from "../../../features/world/worldSlice";
import { RECIPES, getItemDefinition } from "../../../game/config/blockTypes";
import InventoryTab from "../tabs/InventoryTab";


const ArmorPanel = lazy(() => import("../../armor/ArmorPanel"));
const StatsPanel = lazy(() => import("../../progression/StatsPanel"));
const CraftingTablePanel = lazy(() => import("../../crafting/table/CraftingTablePanel"));
const FurnacePanel = lazy(() => import("../../crafting/furnace/FurnacePanel"));
const PerksPanel = lazy(() => import("../../progression/perks/PerksPanel"));
const QuestJournalPanel = lazy(() => import("../../quests/journal/QuestJournalPanel"));
const CodexPanel = lazy(() => import("../../codex/entries/CodexPanel"));
const PerformancePanel = lazy(() => import("../../system/performance/PerformancePanel"));
const WorldBackupPanel = lazy(() => import("../../system/backups/WorldBackupPanel"));
const ColonyPanel = lazy(() => import("../../colonies/panel/ColonyPanel"));

export function preloadEssentialInventoryPanels() {
  return Promise.allSettled([import("../../progression/StatsPanel")]);
}
export function preloadStationPanel(stationType) {
  if (stationType === "crafting_table") return import("../../crafting/table/CraftingTablePanel");
  if (stationType === "furnace") return import("../../crafting/furnace/FurnacePanel");
  if (stationType === "colony_box") return import("../../colonies/panel/ColonyPanel");
  return Promise.resolve();
}

function MenuPanelFallback() {
  return (
    <Box className="menu-panel-fallback" role="status" aria-live="polite">
      <div className="menu-panel-fallback-cube" />
      <Typography fontWeight={1000}>Loading this menu panel…</Typography>
      <Typography variant="body2" color="text.secondary">The game world remains paused and rendered.</Typography>
    </Box>
  );
}

const TABS = {
  inventory: { label: "Inventory", subtitle: "Items and hotbar", icon: Inventory2Icon },
  crafting: { label: "Field Crafting", subtitle: "Pocket recipes", icon: BuildIcon },
  workbench: { label: "Workbench", subtitle: "3×3 master crafting", icon: BuildIcon },
  furnace: { label: "Forge", subtitle: "Fuel and smelting", icon: LocalFireDepartmentIcon },
  armor: { label: "Armory", subtitle: "3D equipment", icon: SecurityIcon },
  stats: { label: "Attributes", subtitle: "Level and growth", icon: AutoGraphIcon },
  perks: { label: "Perk Paths", subtitle: "Passive talents", icon: AutoAwesomeIcon },
  quests: { label: "Journal", subtitle: "Objectives and rewards", icon: AssignmentTurnedInIcon },
  codex: { label: "Codex", subtitle: "World knowledge", icon: MenuBookIcon },
  performance: { label: "Systems", subtitle: "Rendering controls", icon: MemoryIcon },
  backups: { label: "World Archive", subtitle: "Export and recovery", icon: SaveAltIcon },
  colony: { label: "Colony", subtitle: "Workers and storage", icon: HomeWorkIcon },
};

function titleForStation(station) {
  if (station === "crafting_table") return "Artisan Workbench";
  if (station === "furnace") return "Ember Forge";
  if (station === "colony_box") return "Colony Command";
  return "Adventurer Menu";
}

function InventoryCraftingPanel({ inventory }) {
  const dispatch = useDispatch();
  const recipes = useMemo(() => RECIPES.filter((recipe) => recipe.station === "inventory"), []);
  return (
    <Box>
      <div className="rpg-section-heading">
        <div>
          <Typography variant="h5" fontWeight={1000}>Field crafting</Typography>
          <Typography variant="body2" color="text.secondary">
            Quick recipes made without a station. Advanced tools, armor, boats, and mechanisms require a placed crafting table.
          </Typography>
        </div>
      </div>
      <div className="recipe-card-grid compact-recipes">
        {recipes.map((recipe) => {
          const available = Object.entries(recipe.inputs).every(([item, amount]) => (inventory[item] || 0) >= amount);
          const outputSpace = Object.entries(recipe.outputs).every(([item, amount]) => (inventory[item] || 0) + amount <= (getItemDefinition(item).maxStack || 64));
          return (
            <article key={recipe.id} className={`rpg-recipe-card ${available ? "is-ready" : ""}`}>
              <div className="rpg-recipe-card-header">
                <div>
                  <Typography fontWeight={1000}>{recipe.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{recipe.description}</Typography>
                </div>
                <Button
                  variant="contained"
                  disabled={!available || !outputSpace}
                  onClick={() => dispatch(craftRecipe({ recipeId: recipe.id, station: "inventory" }))}
                >
                  Craft
                </Button>
              </div>
              <Stack direction="row" gap={0.6} flexWrap="wrap" sx={{ mt: 1.2 }}>
                {Object.entries(recipe.inputs).map(([item, amount]) => (
                  <Chip
                    key={item}
                    size="small"
                    color={(inventory[item] || 0) >= amount ? "success" : "default"}
                    label={`${amount} ${getItemDefinition(item).name} · ${inventory[item] || 0} owned`}
                  />
                ))}
              </Stack>
            </article>
          );
        })}
      </div>
    </Box>
  );
}

function RpgTabRail({ tabs, value, onChange }) {
  return (
    <nav className="rpg-tab-rail" aria-label="Character menu sections">
      {tabs.map((tabId) => {
        const tab = TABS[tabId];
        const Icon = tab.icon;
        return (
          <button
            type="button"
            key={tabId}
            className={`rpg-tab-button ${value === tabId ? "is-active" : ""}`}
            onClick={() => onChange(tabId)}
          >
            <span className="rpg-tab-glyph"><Icon fontSize="small" /></span>
            <span className="rpg-tab-copy">
              <strong>{tab.label}</strong>
              <small>{tab.subtitle}</small>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function InventoryDialog({ open, onClose, station = { type: "inventory", key: null } }) {
  const inventory = useSelector((state) => state.world.inventory);
  const furnaces = useSelector((state) => state.world.furnaces);
  const level = useSelector((state) => state.world.progression.level);
  const stationType = station?.type || "inventory";
  const stationKey = station?.key || null;
  const defaultTab = stationType === "crafting_table" ? "workbench" : stationType === "furnace" ? "furnace" : stationType === "colony_box" ? "colony" : "inventory";
  const [tab, setTab] = useState(defaultTab);
  const [effectsReady, setEffectsReady] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    setTab(defaultTab);
    setEffectsReady(false);
    const reveal = () => setEffectsReady(true);
    const timer = window.setTimeout(reveal, 120);
    const onKeyDown = (event) => {
      if (event.code !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onClose?.();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [defaultTab, onClose, open]);

  const allowedTabs = stationType === "furnace"
    ? ["furnace", "inventory", "armor", "stats", "perks", "quests", "codex", "performance", "backups"]
    : stationType === "crafting_table"
      ? ["workbench", "inventory", "armor", "stats", "perks", "quests", "codex", "performance", "backups"]
      : stationType === "colony_box"
        ? ["colony", "inventory", "crafting", "armor", "stats", "quests", "performance"]
        : ["inventory", "crafting", "armor", "stats", "perks", "quests", "codex", "performance", "backups"];

  const activeMeta = TABS[tab] || TABS.inventory;

  if (!open) return null;

  return (
    <div className="fast-inventory-overlay" role="dialog" aria-modal="true" aria-label={titleForStation(stationType)}>
      <section className={`rpg-menu-shell fast-inventory-shell ${effectsReady ? "menu-effects-ready" : ""} station-${stationType} tab-${tab}`}>
        <header className="rpg-menu-header">
          <div className="rpg-menu-brand">
            <span className="rpg-menu-sigil">VF</span>
            <div>
              <Typography variant="overline">Voxel Frontier · Level {level}</Typography>
              <Typography variant="h4" fontWeight={1000}>{titleForStation(stationType)}</Typography>
            </div>
          </div>
          <div className="rpg-menu-active-title">
            <strong>{activeMeta.label}</strong>
            <span>{activeMeta.subtitle}</span>
          </div>
          <IconButton onClick={onClose} className="rpg-close-button" aria-label="Close menu">
            <CloseIcon />
          </IconButton>
        </header>

        <div className="rpg-menu-body">
          <RpgTabRail tabs={allowedTabs} value={tab} onChange={setTab} />
          <main className="rpg-menu-content">
            <div className="rpg-content-scroll">
              <Suspense fallback={<MenuPanelFallback />}>
                {tab === "inventory" && <InventoryTab />}
                {tab === "crafting" && <InventoryCraftingPanel inventory={inventory} />}
                {tab === "workbench" && <CraftingTablePanel inventory={inventory} />}
                {tab === "furnace" && <FurnacePanel stationKey={stationKey} inventory={inventory} job={stationKey ? furnaces[stationKey] : null} />}
                {tab === "armor" && <ArmorPanel />}
                {tab === "stats" && <StatsPanel />}
                {tab === "perks" && <PerksPanel />}
                {tab === "quests" && <QuestJournalPanel />}
                {tab === "codex" && <CodexPanel />}
                {tab === "performance" && <PerformancePanel />}
                {tab === "backups" && <WorldBackupPanel />}
                {tab === "colony" && <ColonyPanel stationKey={stationKey} />}
              </Suspense>
            </div>
          </main>
        </div>

        <footer className="rpg-menu-footer">
          <span>Esc / E closes the menu</span>
          <span>Simulation paused · furnaces continue</span>
        </footer>
      </section>
    </div>
  );
}

export default memo(InventoryDialog);
