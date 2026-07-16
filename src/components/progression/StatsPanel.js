import React from "react";
import { Box, Button, LinearProgress, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { allocateStat } from "../../features/world/worldSlice";
import { STAT_KEYS, STAT_LABELS, experienceForLevel, getMaxHealth } from "../../game/config/progression";
import { getUnlockedPerks } from "../../game/config/perks";

const STAT_META = {
  strength: { glyph: "⚔", color: "#d96b57", description: "Raises melee damage and unlocks warrior perks." },
  agility: { glyph: "➶", color: "#64bd88", description: "Improves movement, jumping support, and survival mobility." },
  intelligence: { glyph: "✦", color: "#729ae6", description: "Improves furnace speed and advanced crafting knowledge." },
  vitality: { glyph: "♥", color: "#c982a5", description: "Adds maximum health and unlocks recovery perks." },
  mining: { glyph: "⛏", color: "#d6a957", description: "Reduces block breaking time and improves ore rewards." },
};

export default function StatsPanel() {
  const dispatch = useDispatch();
  const progression = useSelector((state) => state.world.progression);
  const nextExperience = experienceForLevel(progression.level);
  const percent = Math.min(100, progression.experience / nextExperience * 100);
  const unlockedPerks = getUnlockedPerks(progression);

  return (
    <Box>
      <div className="rpg-section-heading">
        <div>
          <Typography variant="h5" fontWeight={1000}>Character constellation</Typography>
          <Typography color="text.secondary" variant="body2">
            Mining, crafting, exploration, and combat grant experience. Each level awards two points.
          </Typography>
        </div>
        <div className="level-orb">
          <span>{progression.level}</span>
          <small>LEVEL</small>
        </div>
      </div>

      <section className="level-banner">
        <div>
          <Typography variant="overline">Experience</Typography>
          <Typography variant="h6" fontWeight={1000}>{Math.floor(progression.experience)} / {nextExperience} XP</Typography>
        </div>
        <div className="level-banner-progress"><LinearProgress value={percent} variant="determinate" /></div>
        <div className="level-banner-meta">
          <strong>{progression.unspentPoints}</strong><span>unspent points</span>
          <strong>{getMaxHealth(progression)}</strong><span>maximum health</span>
          <strong>{unlockedPerks.length}</strong><span>active perks</span>
        </div>
      </section>

      <div className="attribute-grid">
        {STAT_KEYS.map((stat) => {
          const meta = STAT_META[stat];
          const value = progression.stats[stat];
          return (
            <article key={stat} className="attribute-card" style={{ "--attribute-color": meta.color }}>
              <div className="attribute-glyph">{meta.glyph}</div>
              <div className="attribute-copy">
                <Typography variant="overline">{STAT_LABELS[stat]}</Typography>
                <Typography variant="h4" fontWeight={1000}>{value}</Typography>
                <Typography variant="body2" color="text.secondary">{meta.description}</Typography>
              </div>
              <div className="attribute-pips" aria-label={`${value} ${STAT_LABELS[stat]}`}>
                {Array.from({ length: 10 }, (_, index) => <span key={index} className={index < Math.min(10, Math.ceil(value / 5)) ? "is-filled" : ""} />)}
              </div>
              <Button
                variant="contained"
                disabled={progression.unspentPoints <= 0 || value >= 50}
                onClick={() => dispatch(allocateStat(stat))}
              >
                Spend point
              </Button>
            </article>
          );
        })}
      </div>
    </Box>
  );
}
