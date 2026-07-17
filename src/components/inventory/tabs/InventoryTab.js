import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { assignHotbarItem, clearHotbarSlot, setSelectedIndex, swapHotbarItems } from "../../../features/world/worldSlice";
import { ITEM_TYPES, getItemDefinition, getPlantTotalGrowthMs } from "../../../game/config/blockTypes";
import InventorySlot from "../slots/InventorySlot";
import ItemIcon, { preloadItemIcons } from "../../items/icons/ItemIcon";
import ItemInspectionCanvas from "../../items/inspection/ItemInspectionCanvas";

const CATEGORY_LABELS = {
  all: "All",
  tool: "Weapons & Tools",
  armor: "Armor",
  arcane: "Arcane",
  block: "Blocks",
  material: "Materials",
  food: "Food",
  utility: "Utility",
  seed: "Seeds",
  throwable: "Throwables",
  vehicle: "Vehicles",
};

function itemDescription(definition) {
  if (!definition) return "Select an item to inspect it.";
  if (definition.category === "tool") {
    const mining = definition.toolType === "sword" ? "combat weapon" : `${definition.toolType} mining tool`;
    return `Tier ${definition.tier || 1} ${mining}. Built for expeditions, combat, and survival progression.`;
  }
  if (definition.category === "armor") return `${definition.materialId} ${definition.armorSlot} armor with ${definition.defense} defense.`;
  if (definition.category === "food") return `Restores ${definition.food || 0} hunger when consumed.`;
  if (definition.plantType) {
    const growSeconds = Math.ceil(getPlantTotalGrowthMs(definition.plantType) / 1000);
    return `Plantable seed item. Places a physical voxel crop that advances through saved growth stages in about ${growSeconds} seconds before harvest.`;
  }
  if (definition.category === "block") return "Placeable voxel material used for building and world interaction.";
  if (definition.category === "vehicle") return "Place this vehicle in the world and interact with it to ride.";
  return "A survival material used by recipes, stations, and progression systems.";
}

function ItemDetailPanel({ itemId, count, durability, onAssign, showPreview, onTogglePreview }) {
  const definition = itemId ? getItemDefinition(itemId) : null;
  const maxDurability = definition?.durability || null;
  return (
    <aside className="item-detail-panel">
      <div className="item-detail-glow" style={{ "--item-color": definition?.color || "#59697a" }} />
      <div className="item-detail-hero">
        {showPreview ? (
          <ItemInspectionCanvas itemId={itemId} />
        ) : (
          <button type="button" className="inventory-preview-placeholder inventory-preview-button" onClick={onTogglePreview} aria-label="Load optional 3D item preview">
            {itemId ? <ItemIcon itemId={itemId} size={96} alt={definition?.name || "Item"} /> : <span>?</span>}
            <small>Click for 3D preview</small>
          </button>
        )}
        <div className="item-detail-icon item-detail-icon-corner">
          {itemId ? <ItemIcon itemId={itemId} size={56} alt={definition.name} /> : <span>?</span>}
        </div>
        <span className="item-detail-rarity">{definition?.tier ? `Tier ${definition.tier}` : definition?.category || "Unknown"}</span>
      </div>
      <Typography variant="overline" color="text.secondary">{definition?.category || "No item selected"}</Typography>
      <Typography variant="h5" fontWeight={1000}>{definition?.name || "Choose an item"}</Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>{itemDescription(definition)}</Typography>
      {definition && (
        <div className="item-stat-list">
          <div><span>Owned</span><strong>{count}</strong></div>
          {definition.attackDamage != null && <div><span>Attack</span><strong>{definition.attackDamage}</strong></div>}
          {definition.speed != null && <div><span>Mining speed</span><strong>{definition.speed}</strong></div>}
          {definition.defense != null && <div><span>Defense</span><strong>{definition.defense}</strong></div>}
          {maxDurability != null && <div><span>Durability</span><strong>{durability ?? maxDurability}/{maxDurability}</strong></div>}
          {definition.tier != null && <div><span>Tier</span><strong>{definition.tier}</strong></div>}
        </div>
      )}
      <Button variant="contained" fullWidth disabled={!itemId} onClick={onAssign} sx={{ mt: 2 }}>
        Assign to selected hotbar slot
      </Button>
    </aside>
  );
}

export default function InventoryTab() {
  const dispatch = useDispatch();
  const inventory = useSelector((state) => state.world.inventory);
  const toolDurability = useSelector((state) => state.world.toolDurability);
  const armorDurability = useSelector((state) => state.world.armorDurability);
  const hotbar = useSelector((state) => state.world.hotbar);
  const selectedIndex = useSelector((state) => state.world.selectedIndex);
  const [category, setCategory] = useState("all");
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [showInspectionPreview, setShowInspectionPreview] = useState(false);

  const handleSelectItem = useCallback((itemId) => {
    setSelectedItemId(itemId);
    setShowInspectionPreview(false);
  }, []);

  const handleSelectHotbar = useCallback((index) => {
    dispatch(setSelectedIndex(index));
  }, [dispatch]);

  const handleDropOnHotbar = useCallback((index, payload) => {
    if (!payload) return;
    if (payload.source === "hotbar" && Number.isInteger(payload.index)) {
      dispatch(swapHotbarItems({ fromIndex: payload.index, toIndex: index }));
      return;
    }
    if (payload.itemId && (inventory[payload.itemId] || 0) > 0) dispatch(assignHotbarItem({ index, itemId: payload.itemId }));
  }, [dispatch, inventory]);

  const handleDropOnInventory = useCallback((payload) => {
    if (payload?.source === "hotbar" && Number.isInteger(payload.index)) dispatch(clearHotbarSlot({ index: payload.index }));
  }, [dispatch]);

  const ownedItems = useMemo(() => Object.entries(inventory)
    .filter(([itemId, count]) => count > 0 && ITEM_TYPES[itemId])
    .filter(([itemId]) => category === "all" || getItemDefinition(itemId).category === category)
    .sort(([first], [second]) => {
      const a = getItemDefinition(first);
      const b = getItemDefinition(second);
      return `${a.category}-${a.name}`.localeCompare(`${b.category}-${b.name}`);
    }), [category, inventory]);

  const activeItemId = selectedItemId && (inventory[selectedItemId] || 0) > 0
    ? selectedItemId
    : ownedItems[0]?.[0] || null;
  const activeCount = activeItemId ? inventory[activeItemId] || 0 : 0;
  const activeDurability = activeItemId ? toolDurability[activeItemId] ?? armorDurability[activeItemId] : null;
  const slots = useMemo(() => Array.from({ length: 36 }, (_, index) => ownedItems[index] || null), [ownedItems]);

  useEffect(() => {
    preloadItemIcons([...ownedItems.map(([itemId]) => itemId), ...hotbar]);
  }, [hotbar, ownedItems]);

  return (
    <Box>
      <div className="rpg-section-heading">
        <div>
          <Typography variant="h5" fontWeight={1000}>Inventory</Typography>
          <Typography variant="body2" color="text.secondary">
            Drag items into Quick Access, drag quick slots to swap them, or drag a quick slot back into the inventory to clear it.
          </Typography>
        </div>
        <Chip label={`Hotbar slot ${selectedIndex + 1} selected`} color="primary" />
      </div>

      <div className="inventory-category-strip">
        {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
          <button key={id} type="button" className={category === id ? "is-active" : ""} onClick={() => setCategory(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="inventory-adventure-layout">
        <section className="inventory-grid-panel">
          <div className="inventory-slot-grid">
            {slots.map((entry, index) => {
              const itemId = entry?.[0] || null;
              const count = entry?.[1] || 0;
              return (
                <InventorySlot
                  key={`${itemId || "empty"}-${index}`}
                  itemId={itemId}
                  count={count}
                  selected={itemId && itemId === activeItemId}
                  durability={toolDurability[itemId] ?? armorDurability[itemId]}
                  emptyLabel={`Inventory slot ${index + 1}`}
                  onActivate={itemId ? handleSelectItem : undefined}
                  activationValue={itemId}
                  draggable={Boolean(itemId)}
                  dragData={itemId ? { source: "inventory", itemId } : null}
                  onDropItem={handleDropOnInventory}
                  onDoubleClick={itemId ? () => dispatch(assignHotbarItem({ index: selectedIndex, itemId })) : undefined}
                />
              );
            })}
          </div>

          <Typography fontWeight={1000} sx={{ mt: 2.5, mb: 1 }}>Quick access</Typography>
          <div className="hotbar-display-grid">
            {hotbar.map((itemId, index) => (
              <InventorySlot
                key={`hotbar-${index}`}
                itemId={itemId}
                count={inventory[itemId] || 0}
                durability={toolDurability[itemId] ?? armorDurability[itemId]}
                selected={selectedIndex === index}
                hotbarNumber={index + 1}
                onActivate={handleSelectHotbar}
                activationValue={index}
                draggable={Boolean(itemId)}
                dragData={itemId ? { source: "hotbar", index, itemId } : null}
                onDropItem={(payload) => handleDropOnHotbar(index, payload)}
                onDoubleClick={() => dispatch(clearHotbarSlot({ index }))}
              />
            ))}
          </div>
        </section>

        <ItemDetailPanel
          itemId={activeItemId}
          count={activeCount}
          durability={activeDurability}
          onAssign={() => activeItemId && dispatch(assignHotbarItem({ index: selectedIndex, itemId: activeItemId }))}
          showPreview={showInspectionPreview}
          onTogglePreview={() => activeItemId && setShowInspectionPreview((current) => !current)}
        />
      </div>

      {ownedItems.length > 36 && (
        <Stack direction="row" gap={0.6} flexWrap="wrap" sx={{ mt: 2 }}>
          {ownedItems.slice(36).map(([itemId, count]) => (
            <Chip key={itemId} size="small" label={`${getItemDefinition(itemId).name}: ${count}`} />
          ))}
        </Stack>
      )}
    </Box>
  );
}
