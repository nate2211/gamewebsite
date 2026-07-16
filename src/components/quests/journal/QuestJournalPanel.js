import React from "react";
import { Box, Button, Chip, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import { useDispatch, useSelector } from "react-redux";
import { claimQuestReward } from "../../../features/world/worldSlice";
import { QUESTS, getQuestProgress } from "../../../game/config/quests";

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
    </Box>
  );
}
