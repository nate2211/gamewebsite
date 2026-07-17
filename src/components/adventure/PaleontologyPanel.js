import React from "react";
import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { analyzeFossils, reviveDinosaur, spliceDinosaurEgg } from "../../features/world/worldSlice";

export default function PaleontologyPanel() {
  const dispatch = useDispatch();
  const inventory = useSelector((state) => state.world.inventory);
  const archaeology = useSelector((state) => state.world.archaeology || {});
  const player = useSelector((state) => state.world.player);
  return (
    <Box>
      <Typography variant="h5" fontWeight={1000}>Paleontology & Genome Laboratory</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>Excavate fossil-bearing stone, extract fragmented genomes, splice viable eggs, then revive an original prehistoric creature.</Typography>
      <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
        <Chip label={`Fossils ${inventory.fossil_fragment || 0}`} /><Chip label={`Ancient bones ${inventory.ancient_bone || 0}`} /><Chip label={`DNA ${inventory.dinosaur_dna || 0}`} /><Chip label={`Dinosaur eggs ${inventory.dinosaur_egg || 0}`} />
      </Stack>
      <Stack gap={1.4}>
        <Paper variant="outlined" sx={{ p: 2 }}><Typography fontWeight={1000}>1 · Analyze fossils</Typography><Typography variant="body2" color="text.secondary">Consumes 3 fossil fragments and 1 ancient bone to extract dinosaur DNA.</Typography><Button sx={{ mt: 1 }} variant="contained" onClick={() => dispatch(analyzeFossils())}>Extract DNA</Button></Paper>
        <Paper variant="outlined" sx={{ p: 2 }}><Typography fontWeight={1000}>2 · Gene-splice an egg</Typography><Typography variant="body2" color="text.secondary">Combines DNA, a chicken egg, and slime stabilizer into a viable dinosaur egg.</Typography><Button sx={{ mt: 1 }} variant="contained" onClick={() => dispatch(spliceDinosaurEgg())}>Splice egg</Button></Paper>
        <Paper variant="outlined" sx={{ p: 2 }}><Typography fontWeight={1000}>3 · Incubate and revive</Typography><Typography variant="body2" color="text.secondary">Produces a raptor, triceratops, or very rarely a dangerous tyrannosaur near the laboratory.</Typography><Button sx={{ mt: 1 }} color="secondary" variant="contained" onClick={() => dispatch(reviveDinosaur({ position: [player.x + 3, player.y, player.z + 2] }))}>Revive dinosaur</Button></Paper>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Analyses: {archaeology.analyzed || 0} · Eggs spliced: {archaeology.eggsSpliced || 0} · Dinosaurs revived: {archaeology.dinosaursRevived || 0}</Typography>
    </Box>
  );
}
