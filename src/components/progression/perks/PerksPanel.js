import React, { useMemo } from "react";
import { Box, Chip, LinearProgress, Typography } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useSelector } from "react-redux";
import { PERK_DEFINITIONS, hasPerk } from "../../../game/config/perks";
import { STAT_LABELS } from "../../../game/config/progression";
import PerkConstellationCanvas from "../constellation/PerkConstellationCanvas";

const PATH_META = {
  strength: { icon: "⚔", title: "Warrior", color: "#d96b57", description: "Impact, weapon damage, and critical strikes." },
  agility: { icon: "➶", title: "Ranger", color: "#62bd87", description: "Movement, stamina efficiency, and evasion." },
  intelligence: { icon: "✦", title: "Artificer", color: "#729ae6", description: "Smelting, mechanisms, and advanced crafting." },
  vitality: { icon: "♥", title: "Warden", color: "#c982a5", description: "Health, recovery, and damage resistance." },
  mining: { icon: "⛏", title: "Prospector", color: "#d6a957", description: "Ore sense, harvesting, and block efficiency." },
};

export default function PerksPanel() {
  const progression = useSelector((state) => state.world.progression);
  const groups = useMemo(() => Object.keys(PATH_META).map((stat) => ({
    stat,
    meta: PATH_META[stat],
    perks: PERK_DEFINITIONS.filter((perk) => perk.stat === stat).sort((a, b) => a.threshold - b.threshold),
  })), []);

  return (
    <Box className="perk-screen-shell">
      <PerkConstellationCanvas />
      <div className="rpg-section-heading">
        <div>
          <Typography variant="h5" fontWeight={1000}>Perk paths</Typography>
          <Typography variant="body2" color="text.secondary">
            Passive talents awaken automatically when their linked attribute reaches each milestone.
          </Typography>
        </div>
        <Chip color="secondary" label="Automatic unlocks" />
      </div>

      <div className="perk-path-grid">
        {groups.map(({ stat, meta, perks }) => {
          const current = progression.stats[stat] || 1;
          const highest = Math.max(...perks.map((perk) => perk.threshold));
          return (
            <section key={stat} className="perk-path" style={{ "--perk-color": meta.color }}>
              <header className="perk-path-header">
                <span className="perk-path-icon">{meta.icon}</span>
                <div>
                  <Typography variant="overline">{STAT_LABELS[stat]}</Typography>
                  <Typography variant="h6" fontWeight={1000}>{meta.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{meta.description}</Typography>
                </div>
                <strong>{current}</strong>
              </header>
              <LinearProgress variant="determinate" value={Math.min(100, current / highest * 100)} />
              <div className="perk-node-list">
                {perks.map((perk, index) => {
                  const unlocked = hasPerk(progression, perk.id);
                  return (
                    <article key={perk.id} className={`perk-node ${unlocked ? "is-unlocked" : ""}`}>
                      <span className="perk-node-line" aria-hidden="true" />
                      <span className="perk-node-medallion">
                        {unlocked ? <AutoAwesomeIcon fontSize="small" /> : <LockIcon fontSize="small" />}
                      </span>
                      <div>
                        <Typography fontWeight={1000}>{perk.name}</Typography>
                        <Typography variant="body2" color="text.secondary">{perk.description}</Typography>
                        <small>{STAT_LABELS[stat]} {current}/{perk.threshold}</small>
                      </div>
                      {index < perks.length - 1 && <span className="perk-node-connector" aria-hidden="true" />}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </Box>
  );
}
