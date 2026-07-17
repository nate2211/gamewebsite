import React from "react";
import { Box, Button, Chip, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import { useDispatch, useSelector } from "react-redux";
import { claimFactionQuest, claimQuestReward, claimVillageQuest } from "../../../features/world/worldSlice";
import { QUESTS, getQuestProgress } from "../../../game/config/quests";
import { VILLAGE_QUESTS } from "../../../game/config/adventure";
import { FACTIONS, FACTION_QUESTS, getFactionStanding } from "../../../game/config/factions";

export default function QuestJournalPanel() {
  const dispatch = useDispatch();
  const world = useSelector((state) => state.world);
  return (
    <Box>
      <Typography variant="h6" fontWeight={1000}>Quest journal</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        These progression goals track mining, crafting, smelting, combat, armor, and character growth. Completed rewards can be claimed once.
      </Typography>
      <Stack spacing={1.2}>
        {QUESTS.map((quest) => {
          const progress = Math.min(quest.target, getQuestProgress(quest, world));
          const complete = progress >= quest.target;
          const claimed = world.claimedQuests?.includes(quest.id);
          return (
            <Paper key={quest.id} sx={{ p: 1.6, bgcolor: claimed ? "rgba(70,160,85,.08)" : "rgba(255,255,255,.025)" }}>
              <Stack direction={{ xs: "column", sm: "row" }} gap={1.2} alignItems={{ sm: "center" }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Stack direction="row" alignItems="center" gap={0.8}>
                    {claimed && <TaskAltIcon color="success" fontSize="small" />}
                    <Typography fontWeight={1000}>{quest.name}</Typography>
                    <Chip size="small" label={`${quest.rewardXp} XP`} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">{quest.description}</Typography>
                  <LinearProgress variant="determinate" value={Math.min(100, progress / quest.target * 100)} sx={{ mt: 1, height: 8 }} />
                  <Typography variant="caption" color="text.secondary">{progress} / {quest.target}</Typography>
                </Box>
                <Button variant="contained" disabled={!complete || claimed} onClick={() => dispatch(claimQuestReward(quest.id))}>
                  {claimed ? "Claimed" : complete ? "Claim reward" : "In progress"}
                </Button>
              </Stack>
            </Paper>
          );
        })}
      </Stack>
      {(world.factions?.accepted?.length || world.factions?.claimed?.length || world.factions?.discovered?.length) > 0 && (
        <>
          <Typography variant="h6" fontWeight={1000} sx={{ mt: 3, mb: 1 }}>Faction reputation and contracts</Typography>
          <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 1.5 }}>
            {Object.values(FACTIONS).filter((faction) => world.factions?.discovered?.includes(faction.id)).map((faction) => {
              const reputation = Number(world.factions?.reputation?.[faction.id]) || 0;
              const standing = getFactionStanding(reputation);
              return <Chip key={faction.id} color={standing.color} label={`${faction.name}: ${standing.label} ${reputation >= 0 ? "+" : ""}${reputation}`} />;
            })}
          </Stack>
          <Stack spacing={1.2}>
            {FACTION_QUESTS.filter((quest) => world.factions?.accepted?.includes(quest.id) || world.factions?.claimed?.includes(quest.id)).map((quest) => {
              const progress = Math.min(quest.target, Number(world.metrics?.[quest.metric] || 0));
              const complete = progress >= quest.target;
              const claimed = world.factions.claimed.includes(quest.id);
              return (
                <Paper key={quest.id} sx={{ p: 1.6, bgcolor: claimed ? "rgba(70,160,85,.08)" : "rgba(50,130,170,.06)" }}>
                  <Stack direction={{ xs: "column", sm: "row" }} gap={1.2} alignItems={{ sm: "center" }}>
                    <Box sx={{ flexGrow: 1 }}><Stack direction="row" gap={0.8} alignItems="center"><Typography fontWeight={1000}>{quest.name}</Typography><Chip size="small" label={FACTIONS[quest.factionId]?.name || quest.factionId} /><Chip size="small" label={`+${quest.reputation} rep`} /></Stack><Typography variant="body2" color="text.secondary">{quest.description}</Typography><LinearProgress variant="determinate" value={Math.min(100, progress / quest.target * 100)} sx={{ mt: 1, height: 8 }} /><Typography variant="caption">{progress} / {quest.target}</Typography></Box>
                    <Button variant="contained" disabled={!complete || claimed} onClick={() => dispatch(claimFactionQuest(quest.id))}>{claimed ? "Claimed" : complete ? "Claim reward" : "In progress"}</Button>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </>
      )}
      {(world.villageQuests?.accepted?.length || world.villageQuests?.claimed?.length) > 0 && (
        <>
          <Typography variant="h6" fontWeight={1000} sx={{ mt: 3, mb: 1 }}>Village contracts</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Contracts are accepted by speaking with villagers. Return to the journal or the quest giver when the objective is complete.</Typography>
          <Stack spacing={1.2}>
            {VILLAGE_QUESTS.filter((quest) => world.villageQuests.accepted.includes(quest.id) || world.villageQuests.claimed.includes(quest.id)).map((quest) => {
              const progress = Math.min(quest.target, Number(world.metrics?.[quest.metric] || 0));
              const complete = progress >= quest.target;
              const claimed = world.villageQuests.claimed.includes(quest.id);
              return (
                <Paper key={quest.id} sx={{ p: 1.6, bgcolor: claimed ? "rgba(70,160,85,.08)" : "rgba(160,110,220,.05)" }}>
                  <Stack direction={{ xs: "column", sm: "row" }} gap={1.2} alignItems={{ sm: "center" }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Stack direction="row" alignItems="center" gap={0.8}>{claimed && <TaskAltIcon color="success" fontSize="small" />}<Typography fontWeight={1000}>{quest.name}</Typography><Chip size="small" label={`${quest.rewardXp} XP`} /></Stack>
                      <Typography variant="body2" color="text.secondary">{quest.description}</Typography>
                      <LinearProgress variant="determinate" value={Math.min(100, progress / quest.target * 100)} sx={{ mt: 1, height: 8 }} />
                      <Typography variant="caption" color="text.secondary">{progress} / {quest.target}</Typography>
                    </Box>
                    <Button variant="contained" disabled={!complete || claimed} onClick={() => dispatch(claimVillageQuest(quest.id))}>{claimed ? "Claimed" : complete ? "Claim reward" : "In progress"}</Button>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </>
      )}
    </Box>
  );
}
