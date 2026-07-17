import React, { useMemo, useState, useSyncExternalStore } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LinkIcon from "@mui/icons-material/Link";
import PublicIcon from "@mui/icons-material/Public";
import StopCircleIcon from "@mui/icons-material/StopCircle";
import { multiplayerSession } from "../../game/multiplayer/MultiplayerSession";
import { updateBrowserPlayerProfile } from "../../game/multiplayer/browserIdentity";

function extractAnswerToken(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (!raw.includes("answer=")) return raw;
  try {
    const parsed = new URL(raw);
    const hashText = parsed.hash.replace(/^#/, "");
    const hashQuery = hashText.includes("?") ? hashText.slice(hashText.indexOf("?") + 1) : hashText;
    const hash = new URLSearchParams(hashQuery);
    return hash.get("answer") || parsed.searchParams.get("answer") || "";
  } catch (_) {
    const match = raw.match(/answer=([^&#]+)/);
    return match ? decodeURIComponent(match[1]) : raw;
  }
}

export default function MultiplayerDialog({ open, onClose, world }) {
  const snapshot = useSyncExternalStore(multiplayerSession.subscribe, multiplayerSession.getSnapshot, multiplayerSession.getServerSnapshot);
  const [inviteUrl, setInviteUrl] = useState("");
  const [answerValue, setAnswerValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [chatText, setChatText] = useState("");
  const [playerName, setPlayerName] = useState(snapshot.player.name);
  const [lanOnly, setLanOnly] = useState(localStorage.getItem("voxel:multiplayerLanOnly") === "true");
  const connected = useMemo(() => snapshot.connections.filter((entry) => entry.state === "connected"), [snapshot.connections]);

  const createInvite = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await multiplayerSession.createHostInvite({ worldId: world.id, worldName: world.name, worldSeed: world.seed });
      setInviteUrl(result.url);
      await navigator.clipboard?.writeText(result.url);
    } catch (nextError) {
      setError(nextError?.message || "The lobby invite could not be created.");
    } finally {
      setBusy(false);
    }
  };

  const acceptAnswer = async () => {
    setBusy(true);
    setError("");
    try {
      await multiplayerSession.acceptAnswerToken(extractAnswerToken(answerValue));
      setAnswerValue("");
    } catch (nextError) {
      setError(nextError?.message || "The return link could not be accepted.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Browser-hosted multiplayer lobby</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Alert severity={snapshot.role === "offline" ? "info" : snapshot.status.includes("error") ? "error" : "success"}>
            {snapshot.role === "offline"
              ? "Open this saved world as a peer-to-peer lobby. The host browser remains the temporary server."
              : `${snapshot.role.toUpperCase()} · ${snapshot.status.replaceAll(":", " · ")}`}
          </Alert>

          <TextField
            label="Player name"
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value.slice(0, 28))}
            onBlur={() => {
              const next = updateBrowserPlayerProfile({ name: playerName.trim() || snapshot.player.name });
              multiplayerSession.profile = next;
              multiplayerSession.emit();
            }}
          />
          <FormControlLabel
            control={<Switch checked={lanOnly} onChange={(event) => {
              const checked = event.target.checked;
              setLanOnly(checked);
              localStorage.setItem("voxel:multiplayerLanOnly", String(checked));
            }} />}
            label="LAN-only ICE mode (disable public STUN)"
          />

          {snapshot.role !== "guest" && (
            <>
              <Button variant="contained" startIcon={<LinkIcon />} disabled={busy} onClick={createInvite}>
                Create fresh join link
              </Button>
              {inviteUrl && (
                <TextField
                  label="Join link"
                  value={inviteUrl}
                  multiline
                  minRows={3}
                  InputProps={{ readOnly: true }}
                  helperText="Send this to one friend. Create another fresh link for each additional player."
                />
              )}
              {inviteUrl && (
                <Button startIcon={<ContentCopyIcon />} onClick={() => navigator.clipboard?.writeText(inviteUrl)}>
                  Copy join link
                </Button>
              )}
              <Divider />
              <Typography fontWeight={900}>Manual return-link fallback</Typography>
              <TextField
                label="Paste the friend’s return link"
                value={answerValue}
                onChange={(event) => setAnswerValue(event.target.value)}
                multiline
                minRows={2}
              />
              <Button disabled={!answerValue.trim() || busy} onClick={acceptAnswer}>Accept response</Button>
            </>
          )}

          <Box>
            <Typography fontWeight={900} sx={{ mb: 1 }}>Players ({connected.length + 1}/8)</Typography>
            <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
              <Chip icon={<PublicIcon />} color="primary" label={`${snapshot.player.name} (${snapshot.role === "host" ? "Host" : "You"})`} />
              {snapshot.connections.map((connection) => (
                <Chip key={connection.id} variant="outlined" color={connection.state === "connected" ? "success" : "default"} label={`${connection.playerName} · ${connection.state}`} />
              ))}
            </Stack>
          </Box>

          {snapshot.role !== "offline" && (
            <>
              <Divider />
              <Typography fontWeight={900}>Lobby chat</Typography>
              <Box sx={{ maxHeight: 170, overflowY: "auto", p: 1.25, bgcolor: "rgba(0,0,0,.22)", borderRadius: 1 }}>
                {snapshot.chat.length === 0 && <Typography color="text.secondary" variant="body2">No messages yet.</Typography>}
                {snapshot.chat.map((entry) => (
                  <Typography key={entry.id} variant="body2"><b>{entry.playerName}:</b> {entry.text}</Typography>
                ))}
              </Box>
              <Stack direction="row" gap={1}>
                <TextField size="small" fullWidth value={chatText} onChange={(event) => setChatText(event.target.value)} onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    multiplayerSession.sendChat(chatText);
                    setChatText("");
                  }
                }} />
                <Button onClick={() => { multiplayerSession.sendChat(chatText); setChatText(""); }}>Send</Button>
              </Stack>
            </>
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        {snapshot.role !== "offline" && (
          <Button color="warning" startIcon={<StopCircleIcon />} onClick={() => multiplayerSession.close()}>Close lobby</Button>
        )}
        <Button onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}
