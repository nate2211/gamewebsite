import React, { useMemo } from "react";
import { Alert, Box, Button, Chip, Divider, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { assignHousingBed, collectHousingStorage, releaseHousingBed } from "../../features/world/worldSlice";
import { HOUSING_ROLES } from "../../game/config/housing";
import { analyzeHousingRoom } from "../../game/housing/housingRuntime";
import { getItemDefinition } from "../../game/config/blockTypes";

export default function HousingPanel({ bedKey }) {
  const dispatch = useDispatch();
  const housing = useSelector((state) => state.world.housing || { beds: {}, storage: {} });
  const room = useMemo(() => analyzeHousingRoom(bedKey), [bedKey]);
  const bed = housing.beds?.[bedKey] || null;
  const storageEntries = Object.entries(housing.storage || {}).filter(([, amount]) => Number(amount) > 0);

  return (
    <Box>
      <Typography variant="h5" fontWeight={1000}>Hearthbound Housing</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Build a sealed room with a floor, roof, oak door, light, and Frontier Bed. Assigning the bed recruits a persistent resident who lives and works from this home.
      </Typography>
      <Alert severity={room.valid ? "success" : "warning"} sx={{ mb: 2 }}>{room.reason}</Alert>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Chip label={`${room.cells || 0} interior cells`} />
          <Chip label={`${Math.round((room.floorCoverage || 0) * 100)}% floor`} />
          <Chip label={`${Math.round((room.ceilingCoverage || 0) * 100)}% roof`} />
          <Chip label={`${room.doorCount || 0} door contacts`} />
          <Chip label={`${room.lightCount || 0} lights`} />
          <Chip color="secondary" label={`${room.comfort || 0}% comfort`} />
        </Stack>
        <LinearProgress variant="determinate" value={room.comfort || 0} sx={{ mt: 1.5, height: 10 }} />
      </Paper>

      {bed?.residentId && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {bed.residentName || "Resident"} lives here as a {HOUSING_ROLES[bed.role]?.name || bed.role}. Residents return home, defend nearby allies, and complete work cycles while the world is active.
        </Alert>
      )}

      <div className="recipe-card-grid compact-recipes">
        {Object.values(HOUSING_ROLES).map((role) => (
          <article key={role.id} className={`rpg-recipe-card ${bed?.role === role.id ? "is-ready" : ""}`}>
            <div className="rpg-recipe-card-header">
              <div>
                <Typography fontWeight={1000}>{role.name}</Typography>
                <Typography variant="body2" color="text.secondary">{role.description}</Typography>
              </div>
              <Button
                variant={bed?.role === role.id ? "outlined" : "contained"}
                disabled={!room.valid}
                onClick={() => dispatch(assignHousingBed({ key: bedKey, role: role.id, room }))}
              >
                {bed?.role === role.id ? "Assigned" : bed?.residentId ? "Change role" : "Recruit"}
              </Button>
            </div>
          </article>
        ))}
      </div>

      <Divider sx={{ my: 2.5 }} />
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
        <Box>
          <Typography variant="h6" fontWeight={1000}>Household storage</Typography>
          <Stack direction="row" gap={0.7} flexWrap="wrap" sx={{ mt: 0.8 }}>
            {storageEntries.length ? storageEntries.map(([item, amount]) => <Chip key={item} label={`${amount} ${getItemDefinition(item).name}`} />) : <Chip label="No work output yet" />}
          </Stack>
        </Box>
        <Stack direction="row" gap={1}>
          <Button variant="contained" disabled={!storageEntries.length} onClick={() => dispatch(collectHousingStorage())}>Take all</Button>
          <Button color="error" variant="outlined" disabled={!bed?.residentId} onClick={() => dispatch(releaseHousingBed({ key: bedKey }))}>Release resident</Button>
        </Stack>
      </Stack>
    </Box>
  );
}
