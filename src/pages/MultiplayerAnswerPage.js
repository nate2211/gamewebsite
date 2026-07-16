import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Container, Paper, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { multiplayerSession } from "../game/multiplayer/MultiplayerSession";
import { readSignalToken } from "../game/multiplayer/inviteCodec";

export default function MultiplayerAnswerPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Forwarding the response to your active host tab…");
  const [severity, setSeverity] = useState("info");

  useEffect(() => {
    const token = readSignalToken("answer");
    if (!token) {
      setSeverity("error");
      setMessage("No multiplayer response was found in this link.");
      return;
    }
    const sent = multiplayerSession.broadcastAnswerToken(token);
    if (sent) {
      setSeverity("success");
      setMessage("Response delivered. Return to the tab that is hosting the world.");
      window.setTimeout(() => window.close(), 1200);
    } else {
      setSeverity("warning");
      setMessage("Your browser does not support BroadcastChannel. Copy this link and paste it into the Multiplayer lobby dialog in the host tab.");
    }
  }, []);

  return (
    <Box sx={{ minHeight: "100%", display: "grid", placeItems: "center", p: 2 }}>
      <Container maxWidth="sm">
        <Paper sx={{ p: 4 }}>
          <Stack spacing={2}>
            <Typography variant="h4" fontWeight={1000}>Multiplayer response</Typography>
            <Alert severity={severity}>{message}</Alert>
            <Button onClick={() => navigate("/")}>Open main menu</Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
