import React from "react";
import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useSelector } from "react-redux";
import { PERK_DEFINITIONS, hasPerk } from "../../../game/config/perks";
import { STAT_LABELS } from "../../../game/config/progression";

export default function PerksPanel() {
  const progression = useSelector((state) => state.world.progression);
  return (
    <Box>
      <Typography variant="h6" fontWeight={1000}>Automatic perks</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Perks unlock automatically when a stat reaches its milestone. They are passive and remain active while the requirement is met.
      </Typography>
      <Stack spacing={1.1}>
        {PERK_DEFINITIONS.map((perk) => {
          const unlocked = hasPerk(progression, perk.id);
          const current = progression.stats[perk.stat] || 1;
          return (
            <Paper key={perk.id} sx={{ p: 1.6, border: unlocked ? "1px solid rgba(123,229,98,.42)" : "1px solid rgba(255,255,255,.1)", bgcolor: unlocked ? "rgba(87,180,70,.08)" : "rgba(255,255,255,.02)" }}>
              <Stack direction="row" alignItems="center" gap={1.2}>
                {unlocked ? <AutoAwesomeIcon color="success" /> : <LockIcon color="disabled" />}
                <Box sx={{ flexGrow: 1 }}>
                  <Typography fontWeight={1000}>{perk.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{perk.description}</Typography>
                </Box>
                <Chip size="small" color={unlocked ? "success" : "default"} label={`${STAT_LABELS[perk.stat]} ${current}/${perk.threshold}`} />
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
}
