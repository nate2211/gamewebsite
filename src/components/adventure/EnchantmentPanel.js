import React, { useMemo, useState } from "react";
import { Box, Button, Chip, Divider, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { enchantItem } from "../../features/world/worldSlice";
import { ENCHANTMENT_LIST, enchantmentApplies } from "../../game/config/adventure";
import { ITEM_TYPES } from "../../game/config/blockTypes";

export default function EnchantmentPanel() {
  const dispatch = useDispatch();
  const inventory = useSelector((state) => state.world.inventory);
  const enchantments = useSelector((state) => state.world.enchantments || {});
  const candidates = useMemo(() => Object.keys(inventory).filter((id) => inventory[id] > 0 && ["tool", "armor"].includes(ITEM_TYPES[id]?.category)), [inventory]);
  const [itemId, setItemId] = useState(candidates[0] || "");
  const item = ITEM_TYPES[itemId];
  const available = ENCHANTMENT_LIST.filter((entry) => enchantmentApplies(item, entry));

  return (
    <Box>
      <Typography variant="h5" fontWeight={1000}>Enchantment Table</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>Bind arcane patterns to equipment. Elite enemies and fortress treasure provide enchantment shards.</Typography>
      <Stack direction={{ xs: "column", md: "row" }} gap={2}>
        <Paper variant="outlined" sx={{ p: 2, minWidth: 260 }}>
          <Typography fontWeight={900}>Equipment</Typography>
          <TextField select fullWidth size="small" sx={{ mt: 1 }} value={itemId} onChange={(event) => setItemId(event.target.value)}>
            {candidates.map((id) => <MenuItem key={id} value={id}>{ITEM_TYPES[id]?.name || id} × {inventory[id]}</MenuItem>)}
          </TextField>
          <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 2 }}>
            <Chip label={`${inventory.enchantment_shard || 0} shards`} />
            <Chip label={`${inventory.arcane_dust || 0} arcane dust`} />
          </Stack>
          {itemId && <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Current bindings: {Object.entries(enchantments[itemId] || {}).map(([id, level]) => `${id} ${level}`).join(", ") || "none"}</Typography>}
        </Paper>
        <Stack gap={1.2} flex={1}>
          {available.map((entry) => {
            const level = Math.max(Number(enchantments[itemId]?.[entry.id] || 0), Number(item?.preEnchanted?.[entry.id] || 0));
            const shardCost = Math.max(1, Math.ceil(entry.cost / 3) + level);
            const dustCost = entry.cost + level * 2;
            const canAfford = (inventory.enchantment_shard || 0) >= shardCost && (inventory.arcane_dust || 0) >= dustCost && level < entry.maxLevel;
            return (
              <Paper key={entry.id} variant="outlined" sx={{ p: 1.6 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                  <Box><Typography fontWeight={1000}>{entry.name} {level ? `· ${level}/${entry.maxLevel}` : ""}</Typography><Typography variant="body2" color="text.secondary">{entry.description}</Typography></Box>
                  <Button variant="contained" disabled={!itemId || !canAfford} onClick={() => dispatch(enchantItem({ itemId, enchantmentId: entry.id }))}>{level >= entry.maxLevel ? "Maxed" : `Bind · ${shardCost}◆ ${dustCost} dust`}</Button>
                </Stack>
              </Paper>
            );
          })}
          {!candidates.length && <Paper variant="outlined" sx={{ p: 3 }}><Typography>No equipment is available to enchant.</Typography></Paper>}
        </Stack>
      </Stack>
      <Divider sx={{ mt: 2 }} />
    </Box>
  );
}
