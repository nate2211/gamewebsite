import React, { useEffect } from "react";
import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import {
  acceptFactionQuest,
  acceptVillageQuest,
  claimFactionQuest,
  claimVillageQuest,
  discoverFaction,
} from "../../features/world/worldSlice";
import { VILLAGE_DIALOGUE, VILLAGE_QUESTS } from "../../game/config/adventure";
import { FACTIONS, FACTION_DIALOGUE, FACTION_QUESTS, getFactionStanding } from "../../game/config/factions";
import { MOB_TYPES } from "../../game/config/mobTypes";
import { getItemDefinition } from "../../game/config/blockTypes";

function QuestCard({ quest, progress, accepted, claimed, onAction, faction = false }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.8 }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography fontWeight={1000}>{quest.name}</Typography>
          <Typography variant="body2" color="text.secondary">{quest.description}</Typography>
          <Stack direction="row" gap={0.6} flexWrap="wrap" sx={{ mt: 1 }}>
            <Chip size="small" label={`${progress}/${quest.target}`} />
            {faction && <Chip size="small" color="info" label={`+${quest.reputation} reputation`} />}
            {Object.entries(quest.rewards).map(([item, amount]) => <Chip key={item} size="small" label={`${getItemDefinition(item).name} × ${amount}`} />)}
          </Stack>
        </Box>
        <Button variant="contained" disabled={claimed || (accepted && progress < quest.target)} onClick={onAction}>
          {claimed ? "Completed" : accepted ? "Claim reward" : "Accept quest"}
        </Button>
      </Stack>
    </Paper>
  );
}

export default function VillageDialoguePanel({ mobId }) {
  const dispatch = useDispatch();
  const mob = useSelector((state) => state.world.mobs.find((entry) => entry.id === mobId));
  const metrics = useSelector((state) => state.world.metrics);
  const villageQuests = useSelector((state) => state.world.villageQuests || { accepted: [], claimed: [] });
  const factions = useSelector((state) => state.world.factions || { reputation: {}, accepted: [], claimed: [], discovered: [] });
  const definition = MOB_TYPES[mob?.type] || MOB_TYPES.villager_scholar;
  const factionId = mob?.factionId || definition.factionId || null;
  const faction = FACTIONS[factionId] || null;

  useEffect(() => {
    if (factionId) dispatch(discoverFaction({ factionId }));
  }, [dispatch, factionId]);

  if (faction) {
    const reputation = Number(factions.reputation?.[factionId]) || 0;
    const standing = getFactionStanding(reputation);
    const quests = FACTION_QUESTS.filter((quest) => quest.factionId === factionId);
    return (
      <Box>
        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
          <Typography variant="h5" fontWeight={1000}>{mob?.customName || definition.name}</Typography>
          <Chip color={standing.color} label={`${faction.name} · ${standing.label} ${reputation >= 0 ? "+" : ""}${reputation}`} />
        </Stack>
        <Typography color="text.secondary">{definition.npcRole?.replaceAll("_", " ")} · {faction.description}</Typography>
        <Paper variant="outlined" sx={{ p: 2, my: 2 }}>{(FACTION_DIALOGUE[factionId] || []).map((line) => <Typography key={line} sx={{ mb: 0.8 }}>“{line}”</Typography>)}</Paper>
        <Typography variant="h6" fontWeight={1000} sx={{ mb: 1 }}>Faction contracts</Typography>
        <Stack gap={1.2}>{quests.map((quest) => {
          const progress = Math.min(quest.target, Number(metrics[quest.metric] || 0));
          const accepted = factions.accepted.includes(quest.id);
          const claimed = factions.claimed.includes(quest.id);
          return <QuestCard key={quest.id} quest={quest} progress={progress} accepted={accepted} claimed={claimed} faction onAction={() => dispatch(accepted ? claimFactionQuest(quest.id) : acceptFactionQuest(quest.id))} />;
        })}</Stack>
      </Box>
    );
  }

  const questIds = definition.questIds || VILLAGE_QUESTS.map((quest) => quest.id);
  const dialogue = VILLAGE_DIALOGUE[mob?.type] || VILLAGE_DIALOGUE.villager_scholar;
  return (
    <Box>
      <Typography variant="h5" fontWeight={1000}>{mob?.customName || definition.name}</Typography>
      <Typography color="text.secondary">{definition.npcRole ? `${definition.npcRole[0].toUpperCase()}${definition.npcRole.slice(1)} · Friendly village resident` : "Village resident"}</Typography>
      <Paper variant="outlined" sx={{ p: 2, my: 2 }}>{dialogue.map((line) => <Typography key={line} sx={{ mb: 0.8 }}>“{line}”</Typography>)}</Paper>
      <Typography variant="h6" fontWeight={1000} sx={{ mb: 1 }}>Village contracts</Typography>
      <Stack gap={1.2}>{VILLAGE_QUESTS.filter((quest) => questIds.includes(quest.id)).map((quest) => {
        const progress = Math.min(quest.target, Number(metrics[quest.metric] || 0));
        const accepted = villageQuests.accepted.includes(quest.id);
        const claimed = villageQuests.claimed.includes(quest.id);
        return <QuestCard key={quest.id} quest={quest} progress={progress} accepted={accepted} claimed={claimed} onAction={() => dispatch(accepted ? claimVillageQuest(quest.id) : acceptVillageQuest(quest.id))} />;
      })}</Stack>
    </Box>
  );
}
