import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import {
  Construction as ConstructionIcon,
  Gavel as GuardIcon,
  Agriculture as FarmIcon,
  Pets as RanchIcon,
  Phishing as FishingIcon,
  Inventory2 as Inventory2Icon,
  Landscape as MinerIcon,
} from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import {
  collectColonyStorage,
  toggleColonyStation,
} from "../../../features/world/worldSlice";
import { COLONY_JOB_TYPES } from "../../../game/config/colony";
import { getItemDefinition } from "../../../game/config/blockTypes";
import ItemIcon from "../../items/icons/ItemIcon";

const JOB_ICONS = {
  guard: GuardIcon,
  miner: MinerIcon,
  farmer: FarmIcon,
  rancher: RanchIcon,
  fisher: FishingIcon,
};

function formatCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

function StorageGrid({ storage }) {
  const entries = Object.entries(storage || {}).filter(([, amount]) => amount > 0);
  if (!entries.length) return <Typography color="text.secondary">Workers have not delivered anything yet.</Typography>;
  return (
    <div className="colony-storage-grid">
      {entries.map(([item, amount]) => (
        <Paper key={item} className="colony-storage-item">
          <ItemIcon itemId={item} size={42} alt="" />
          <div>
            <Typography fontWeight={1000}>{getItemDefinition(item).name}</Typography>
            <Typography variant="caption">{amount} stored</Typography>
          </div>
        </Paper>
      ))}
    </div>
  );
}

export default function ColonyPanel({ stationKey = null }) {
  const dispatch = useDispatch();
  const colony = useSelector((state) => state.world.colony);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const selected = useMemo(
    () => colony.stations.find((station) => station.key === stationKey) || null,
    [colony.stations, stationKey]
  );
  const stations = selected
    ? [selected, ...colony.stations.filter((station) => station.id !== selected.id)]
    : colony.stations;
  const total = Object.values(colony.storage || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);

  return (
    <Box className="colony-command-panel">
      <div className="rpg-section-heading">
        <div>
          <Typography variant="h4" fontWeight={1000}>Frontier colony command</Typography>
          <Typography color="text.secondary">
            Colony workers can be attacked. Guards defend the settlement, exposed workers flee or fight,
            and defeated colonists respawn at their assigned station after five to ten minutes.
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<Inventory2Icon />}
          disabled={!total}
          onClick={() => dispatch(collectColonyStorage())}
        >
          Collect {total || "storage"}
        </Button>
      </div>

      <div className="colony-summary-grid">
        {Object.entries(colony.totals || {}).map(([key, value]) => (
          <Paper key={key} className="colony-summary-card">
            <Typography variant="overline">{key.replace(/([A-Z])/g, " $1")}</Typography>
            <Typography variant="h4" fontWeight={1000}>{value || 0}</Typography>
          </Paper>
        ))}
      </div>

      <Typography variant="h5" fontWeight={1000} sx={{ mt: 3, mb: 1 }}>Worker stations</Typography>
      <Stack spacing={1.2}>
        {stations.length === 0 && (
          <Paper sx={{ p: 2.5 }}><Typography color="text.secondary">Place a colony job box to recruit your first worker.</Typography></Paper>
        )}
        {stations.map((station) => {
          const job = COLONY_JOB_TYPES[station.job];
          const Icon = JOB_ICONS[station.job] || ConstructionIcon;
          const respawning = Boolean(station.respawnAt && station.respawnAt > now);
          const workerState = station.destroyed
            ? "Station destroyed"
            : respawning
              ? `Respawning ${formatCountdown(station.respawnAt - now)}`
              : station.workerState || (station.enabled ? "Working" : "Paused");
          const health = Math.max(0, Number(station.health ?? station.maxHealth ?? 60));
          const maxHealth = Math.max(1, Number(station.maxHealth || 60));
          return (
            <Paper key={station.id} className={`colony-station-card ${station.id === selected?.id ? "is-selected" : ""}`}>
              <div className="colony-station-icon" style={{ "--job-color": job?.color || "#777" }}><Icon /></div>
              <div className="colony-station-copy">
                <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                  <Typography fontWeight={1000}>{job?.label || station.job}</Typography>
                  <Chip size="small" label={station.workerName || "Colonist"} />
                  <Chip
                    size="small"
                    color={station.destroyed ? "error" : respawning ? "warning" : station.enabled ? "success" : "default"}
                    label={workerState}
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {station.status || job?.description}
                </Typography>
                <Typography variant="caption">Station health {Math.ceil(health)} / {maxHealth}</Typography>
                <LinearProgress
                  color={health / maxHealth < 0.3 ? "error" : "success"}
                  variant="determinate"
                  value={(health / maxHealth) * 100}
                  sx={{ mt: 0.4, height: 6 }}
                />
                <LinearProgress variant="determinate" value={(station.progress || 0) * 100} sx={{ mt: 0.8, height: 7 }} />
                <Typography variant="caption">
                  Production {station.production || 0} · Level {station.level || 1} · Defeats {station.deathCount || 0}
                </Typography>
              </div>
              <Button
                color={station.enabled ? "warning" : "success"}
                disabled={station.destroyed || respawning}
                onClick={() => dispatch(toggleColonyStation(station.id))}
              >
                {station.enabled ? "Pause" : "Resume"}
              </Button>
            </Paper>
          );
        })}
      </Stack>

      <Typography variant="h5" fontWeight={1000} sx={{ mt: 3, mb: 1 }}>Shared colony storage</Typography>
      <StorageGrid storage={colony.storage} />
    </Box>
  );
}
