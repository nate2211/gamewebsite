import React, { useMemo } from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { assignHotbarItem, setSelectedIndex } from "../../../features/world/worldSlice";
import { ITEM_TYPES, getItemDefinition } from "../../../game/config/blockTypes";
import InventorySlot from "../slots/InventorySlot";

export default function InventoryTab() {
  const dispatch = useDispatch();
  const inventory = useSelector((state) => state.world.inventory);
  const toolDurability = useSelector((state) => state.world.toolDurability);
  const armorDurability = useSelector((state) => state.world.armorDurability);
  const hotbar = useSelector((state) => state.world.hotbar);
  const selectedIndex = useSelector((state) => state.world.selectedIndex);
  const ownedItems = useMemo(() => Object.entries(inventory)
    .filter(([itemId, count]) => count > 0 && ITEM_TYPES[itemId])
    .sort(([first], [second]) => {
      const a = getItemDefinition(first);
      const b = getItemDefinition(second);
      return `${a.category}-${a.name}`.localeCompare(`${b.category}-${b.name}`);
    }), [inventory]);
  const slots = Array.from({ length: 36 }, (_, index) => ownedItems[index] || null);

  return (
    <Box>
      <Typography fontWeight={1000} gutterBottom>Survival inventory</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Click an owned item to assign it to the selected hotbar slot. The 3D simulation is paused while this screen is open.
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(9, minmax(31px, 1fr))", gap: 0.45 }}>
        {slots.map((entry, index) => {
          const itemId = entry?.[0] || null;
          const count = entry?.[1] || 0;
          return (
            <InventorySlot
              key={`${itemId || "empty"}-${index}`}
              itemId={itemId}
              count={count}
              durability={toolDurability[itemId] ?? armorDurability[itemId]}
              emptyLabel={`Inventory slot ${index + 1}`}
              onClick={itemId ? () => dispatch(assignHotbarItem({ index: selectedIndex, itemId })) : undefined}
            />
          );
        })}
      </Box>

      <Typography fontWeight={1000} sx={{ mt: 2.5, mb: 1 }}>Hotbar</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(9, minmax(31px, 1fr))", gap: 0.45 }}>
        {hotbar.map((itemId, index) => (
          <InventorySlot
            key={`hotbar-${index}`}
            itemId={itemId}
            count={inventory[itemId] || 0}
            durability={toolDurability[itemId] ?? armorDurability[itemId]}
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
  );
}
