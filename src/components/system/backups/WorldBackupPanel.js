import React, { useRef, useState } from "react";
import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { useDispatch, useSelector } from "react-redux";
import { db, serializeWorld } from "../../../data/db";
import { loadWorld } from "../../../features/world/worldSlice";
import { buildWorldBackup, downloadJson, readJsonFile, validateWorldBackup } from "../../../game/save/worldBackup";

function safeName(value) {
  return String(value || "world").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "world";
}

export default function WorldBackupPanel() {
  const dispatch = useDispatch();
  const world = useSelector((state) => state.world);
  const inputRef = useRef();
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const exportBackup = () => {
    try {
      const record = serializeWorld(world);
      downloadJson(`${safeName(world.name)}-backup.json`, buildWorldBackup(record));
      setError("");
      setStatus("Backup downloaded. It contains permanent edits, inventory, progression, armor, quests, mobs, liquids, and furnace jobs.");
    } catch (nextError) {
      setError(nextError.message || "Backup export failed.");
    }
  };

  const importBackup = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const worldRecord = validateWorldBackup(await readJsonFile(file));
      const imported = {
        ...worldRecord,
        id: `${worldRecord.id}-import-${Date.now()}`,
        name: `${worldRecord.name || "Imported world"} (Imported)`,
        updatedAt: Date.now(),
      };
      await db.worlds.put(imported);
      dispatch(loadWorld(imported));
      setError("");
      setStatus(`Imported ${imported.name}. Terrain will regenerate from its seed around the saved player position.`);
    } catch (nextError) {
      setError(nextError.message || "Backup import failed.");
    }
  };

  return (
    <Box>
      <Typography variant="h6" fontWeight={1000}>World backups</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Export a compact human-readable JSON backup or import a copy as a separate world. Deterministic generated terrain is not duplicated in the backup.
      </Typography>
      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} gap={1.2}>
          <Button fullWidth variant="contained" startIcon={<DownloadIcon />} onClick={exportBackup}>Export loaded world</Button>
          <Button fullWidth variant="outlined" startIcon={<UploadFileIcon />} onClick={() => inputRef.current?.click()}>Import world copy</Button>
          <input ref={inputRef} hidden type="file" accept="application/json,.json" onChange={importBackup} />
        </Stack>
      </Paper>
      {status && <Alert severity="success" sx={{ mt: 1.5 }}>{status}</Alert>}
      {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
    </Box>
  );
}
