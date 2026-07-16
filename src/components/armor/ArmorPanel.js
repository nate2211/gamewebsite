import React from "react";
import { Box, Button, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { equipArmor, unequipArmor } from "../../features/world/worldSlice";
import { ARMOR_SLOTS, getArmorDefense } from "../../game/config/armor";
import { ITEM_TYPES, getItemDefinition } from "../../game/config/blockTypes";
import InventorySlot from "../inventory/slots/InventorySlot";

const SLOT_LABELS = {
  helmet: "Helmet",
  chestplate: "Chest",
  leggings: "Legs",
  boots: "Boots",
};

export default function ArmorPanel() {
  const dispatch = useDispatch();
  const inventory = useSelector((state) => state.world.inventory);
  const armor = useSelector((state) => state.world.armor);
  const armorDurability = useSelector((state) => state.world.armorDurability);
  const defense = getArmorDefense(armor, ITEM_TYPES);
  const ownedArmor = Object.entries(inventory)
    .filter(([itemId, count]) => count > 0 && ITEM_TYPES[itemId]?.category === "armor")
    .map(([itemId]) => itemId);

  return (
    <Box>
      <Typography variant="h6" fontWeight={1000}>Armor</Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
        Equip copper, iron, gold, or diamond armor crafted at a crafting table. Armor absorbs damage and loses durability.
      </Typography>
      <Paper sx={{ p: 2, mb: 2, bgcolor: "rgba(84,157,255,.07)" }}>
        <Stack direction="row" justifyContent="space-between">
          <Typography fontWeight={900}>Total defense</Typography>
          <Typography fontWeight={1000}>{defense} armor</Typography>
        </Stack>
        <LinearProgress variant="determinate" value={Math.min(100, defense / 21 * 100)} sx={{ mt: 1, height: 8 }} />
      </Paper>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(72px, 1fr))", gap: 1.2, mb: 2.5 }}>
        {ARMOR_SLOTS.map((slot) => {
          const itemId = armor[slot];
          return (
            <Box key={slot}>
              <Typography variant="caption" fontWeight={900}>{SLOT_LABELS[slot]}</Typography>
              <InventorySlot
                itemId={itemId}
                count={itemId ? 1 : 0}
                durability={itemId ? armorDurability[itemId] : null}
                emptyLabel={`${SLOT_LABELS[slot]} slot`}
                onClick={itemId ? () => dispatch(unequipArmor(slot)) : undefined}
              />
            </Box>
          );
        })}
      </Box>
      <Typography fontWeight={900} sx={{ mb: 1 }}>Owned armor</Typography>
      {ownedArmor.length ? (
        <Stack spacing={1}>
          {ownedArmor.map((itemId) => {
            const definition = getItemDefinition(itemId);
            const equipped = armor[definition.armorSlot] === itemId;
            return (
              <Paper key={itemId} sx={{ p: 1.2 }}>
                <Stack direction="row" alignItems="center" gap={1.2}>
                  <Box sx={{ width: 58 }}>
                    <InventorySlot itemId={itemId} count={1} durability={armorDurability[itemId]} compact />
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography fontWeight={900}>{definition.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {definition.defense} defense · {SLOT_LABELS[definition.armorSlot]}
                    </Typography>
                  </Box>
                  <Button variant={equipped ? "outlined" : "contained"} disabled={equipped} onClick={() => dispatch(equipArmor(itemId))}>
                    {equipped ? "Equipped" : "Equip"}
                  </Button>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      ) : (
        <Typography color="text.secondary">Craft armor at a placed crafting table.</Typography>
      )}
    </Box>
  );
}
