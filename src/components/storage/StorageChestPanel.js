import React, { useMemo } from "react";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { transferFromStorageChest, transferToStorageChest } from "../../features/world/worldSlice";
import { getItemDefinition } from "../../game/config/blockTypes";

export default function StorageChestPanel({ chestKey }) {
  const dispatch = useDispatch();
  const inventory = useSelector((state) => state.world.inventory || {});
  const chest = useSelector((state) => state.world.storageChests?.[chestKey]) || { items: {}, slots: 27 };
  const stored = useMemo(() => Object.entries(chest.items || {}).filter(([, amount]) => amount > 0).sort(([a],[b]) => a.localeCompare(b)), [chest.items]);
  const carried = useMemo(() => Object.entries(inventory).filter(([, amount]) => amount > 0).sort(([a],[b]) => a.localeCompare(b)), [inventory]);
  return <Box>
    <Typography variant="h5" fontWeight={1000}>Frontier Storage Chest</Typography>
    <Typography color="text.secondary" sx={{ mb: 2 }}>Persistent 27-slot storage. Click one to transfer a single item, or All to move the complete stack.</Typography>
    <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}><Chip label={`${stored.length}/${chest.slots || 27} slots used`} /><Chip label={`${stored.reduce((n,[,a])=>n+a,0)} items stored`} /></Stack>
    <Typography fontWeight={1000} sx={{ mb: 1 }}>Chest contents</Typography>
    <div className="recipe-card-grid compact-recipes">
      {stored.length === 0 && <Typography color="text.secondary">The chest is empty.</Typography>}
      {stored.map(([itemId, amount]) => <article key={itemId} className="rpg-recipe-card is-ready"><Typography fontWeight={900}>{getItemDefinition(itemId).name} · {amount}</Typography><Stack direction="row" gap={1} sx={{ mt: 1 }}><Button size="small" onClick={()=>dispatch(transferFromStorageChest({key:chestKey,itemId,amount:1}))}>Take 1</Button><Button size="small" variant="contained" onClick={()=>dispatch(transferFromStorageChest({key:chestKey,itemId,amount}))}>Take All</Button></Stack></article>)}
    </div>
    <Typography fontWeight={1000} sx={{ mt: 3, mb: 1 }}>Backpack</Typography>
    <div className="recipe-card-grid compact-recipes">
      {carried.map(([itemId, amount]) => <article key={itemId} className="rpg-recipe-card"><Typography fontWeight={900}>{getItemDefinition(itemId).name} · {amount}</Typography><Stack direction="row" gap={1} sx={{ mt: 1 }}><Button size="small" onClick={()=>dispatch(transferToStorageChest({key:chestKey,itemId,amount:1}))}>Store 1</Button><Button size="small" variant="outlined" onClick={()=>dispatch(transferToStorageChest({key:chestKey,itemId,amount}))}>Store All</Button></Stack></article>)}
    </div>
  </Box>;
}
