import React from "react";
import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { lootTreasureChest } from "../../features/world/worldSlice";
import { getTreasureLoot } from "../../game/config/adventure";
import { getItemDefinition } from "../../game/config/blockTypes";

export default function TreasureChestPanel({ chestKey }) {
  const dispatch = useDispatch();
  const seed = useSelector((state) => state.world.seed);
  const opened = useSelector((state) => state.world.openedTreasureChests || []).includes(chestKey);
  const loot = opened ? getTreasureLoot(seed, chestKey) : null;
  return (
    <Box>
      <Typography variant="h5" fontWeight={1000}>Fortress Treasure</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>The chest is bound to this world seed. Its reward is persistent and can only be claimed once.</Typography>
      <Paper variant="outlined" sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="h2">{opened ? "▣" : "▤"}</Typography>
        <Typography fontWeight={1000}>{opened ? "Chest opened" : "Ancient lock ready"}</Typography>
        {!opened && <Button variant="contained" size="large" sx={{ mt: 2 }} onClick={() => dispatch(lootTreasureChest({ key: chestKey }))}>Open treasure chest</Button>}
        {loot && <Stack direction="row" justifyContent="center" gap={1} flexWrap="wrap" sx={{ mt: 2 }}>{Object.entries(loot).map(([item, amount]) => <Chip key={item} label={`${getItemDefinition(item).name} × ${amount}`} />)}</Stack>}
      </Paper>
    </Box>
  );
}
