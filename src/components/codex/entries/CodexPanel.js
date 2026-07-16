import React, { useMemo, useState } from "react";
import { Box, Chip, Paper, Stack, TextField, Typography } from "@mui/material";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { CODEX_ENTRIES } from "../../../game/config/codex";

export default function CodexPanel() {
  const [query, setQuery] = useState("");
  const entries = useMemo(() => CODEX_ENTRIES.filter((entry) => `${entry.category} ${entry.title} ${entry.body}`.toLowerCase().includes(query.toLowerCase())), [query]);
  return (
    <Box>
      <Typography variant="h6" fontWeight={1000}>Survival codex</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>A searchable guide to the project’s main systems and production architecture.</Typography>
      <TextField fullWidth size="small" placeholder="Search the codex" value={query} onChange={(event) => setQuery(event.target.value)} sx={{ mb: 1.5 }} />
      <Stack spacing={1.1}>
        {entries.map((entry) => (
          <Paper key={entry.title} sx={{ p: 1.6 }}>
            <Stack direction="row" gap={1.1} alignItems="flex-start">
              <MenuBookIcon color="primary" />
              <Box>
                <Stack direction="row" gap={0.8} alignItems="center" flexWrap="wrap">
                  <Typography fontWeight={1000}>{entry.title}</Typography>
                  <Chip size="small" label={entry.category} />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{entry.body}</Typography>
              </Box>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}
