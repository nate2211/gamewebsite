import React, { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, CircularProgress, Container, Paper, Stack, TextField, Typography } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useNavigate } from "react-router-dom";
import { db } from "../data/db";
import { multiplayerSession } from "../game/multiplayer/MultiplayerSession";
import { readSignalToken } from "../game/multiplayer/inviteCodec";

function buildRemoteWorld(bootstrap) {
  const assigned = bootstrap.assignedPlayer || {};
  const shared = bootstrap.shared || {};
  return {
    id: `remote-${bootstrap.roomId}`,
    name: `${bootstrap.worldName || "Shared world"} · Online`,
    seed: bootstrap.worldSeed,
    blockEdits: shared.blockEdits || {},
    inventory: assigned.inventory || {},
    toolDurability: assigned.toolDurability || {},
    armor: assigned.armor || {},
    armorDurability: assigned.armorDurability || {},
    progression: assigned.progression || undefined,
    metrics: assigned.metrics || {},
    claimedQuests: assigned.claimedQuests || [],
    hotbar: assigned.hotbar || [],
    selectedIndex: assigned.selectedIndex || 0,
    player: assigned.player || bootstrap.spawn,
    spawn: bootstrap.spawn,
    health: Number.isFinite(assigned.health) ? assigned.health : 20,
    hunger: Number.isFinite(assigned.hunger) ? assigned.hunger : 20,
    deaths: assigned.deaths || 0,
    worldTime: shared.worldTime,
    mobs: shared.mobs || [],
    mount: assigned.mount || null,
    furnaces: shared.furnaces || {},
    colony: shared.colony || undefined,
    crops: shared.crops || [],
    droppedItems: shared.droppedItems || [],
    weather: shared.weather || { type: "clear", intensity: 0 },
    liquids: [],
    multiplayerPlayers: { [assigned.playerId]: assigned },
    revision: shared.revision || 0,
    remoteRoomId: bootstrap.roomId,
    updatedAt: Date.now(),
    version: 15,
  };
}

export default function JoinWorldPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState("Reading invitation…");
  const [answerUrl, setAnswerUrl] = useState("");
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return undefined;
    started.current = true;
    const inviteToken = readSignalToken("invite");
    if (!inviteToken) {
      setError("This page does not contain a multiplayer invitation token.");
      return undefined;
    }
    let cancelled = false;
    const unsubscribe = multiplayerSession.on("bootstrap", async (bootstrap) => {
      if (cancelled) return;
      try {
        setStage("Saving your restored multiplayer state…");
        const record = buildRemoteWorld(bootstrap);
        await db.worlds.put(record);
        setStage("Entering the shared world…");
        navigate(`/play/${record.id}?online=guest`, { replace: true });
      } catch (nextError) {
        setError(nextError?.message || "The shared world could not be prepared locally.");
      }
    });

    (async () => {
      try {
        setStage("Creating a direct browser connection…");
        const result = await multiplayerSession.joinInviteToken(inviteToken);
        if (cancelled) return;
        setAnswerUrl(result.url);
        setStage("Send the return link to the host, then keep this page open.");
        await navigator.clipboard?.writeText(result.url);
      } catch (nextError) {
        if (!cancelled) setError(nextError?.message || "The invitation could not be opened.");
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [navigate]);

  return (
    <Box sx={{ minHeight: "100%", overflow: "auto", background: "radial-gradient(circle at top, #253c31, #07100d 62%)" }}>
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper sx={{ p: { xs: 2.5, md: 4 } }}>
          <Stack spacing={2.5}>
            <Typography variant="h3" fontWeight={1000}>Join shared world</Typography>
            {!error && <Alert severity="info">{stage}</Alert>}
            {!answerUrl && !error && <CircularProgress />}
            {answerUrl && (
              <>
                <TextField label="Return link for the host" value={answerUrl} multiline minRows={5} InputProps={{ readOnly: true }} />
                <Button variant="contained" startIcon={<ContentCopyIcon />} onClick={() => navigator.clipboard?.writeText(answerUrl)}>
                  Copy return link
                </Button>
                <Typography color="text.secondary">
                  The host opens this return link. It securely forwards the response to the already-running host tab using a same-origin browser channel. Once connected, this page enters the world automatically.
                </Typography>
              </>
            )}
            {error && <Alert severity="error">{error}</Alert>}
            <Button onClick={() => navigate("/")}>Return to main menu</Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
