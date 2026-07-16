import React from "react";
import { Box, LinearProgress, Typography } from "@mui/material";
import ItemIcon from "../../items/icons/ItemIcon";
import { getItemDefinition } from "../../../game/config/blockTypes";

export default function InventorySlot({
  itemId,
  count,
  durability,
  selected,
  hotbarNumber,
  onClick,
  emptyLabel,
  label,
  compact = false,
}) {
  const definition = itemId ? getItemDefinition(itemId) : null;
  const durabilityPercent = definition?.durability && durability != null
    ? Math.max(0, Math.min(100, (durability / definition.durability) * 100))
    : null;

  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      title={definition?.name || emptyLabel || "Empty slot"}
      sx={{
        appearance: "none",
        border: selected ? "3px solid #fff" : "2px solid rgba(255,255,255,.17)",
        bgcolor: selected ? "rgba(255,255,255,.18)" : "rgba(7,12,17,.92)",
        color: "inherit",
        p: 0,
        minWidth: 0,
        width: "100%",
        aspectRatio: "1 / 1",
        position: "relative",
        display: "grid",
        placeItems: "center",
        cursor: onClick ? "pointer" : "default",
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,.6)",
        "&:hover": onClick ? { bgcolor: "rgba(255,255,255,.12)" } : undefined,
      }}
    >
      {hotbarNumber != null && (
        <Typography variant="caption" sx={{ position: "absolute", top: 1, left: 4, opacity: 0.72 }}>
          {hotbarNumber}
        </Typography>
      )}
      {label && (
        <Typography variant="caption" sx={{ position: "absolute", top: 2, left: 4, opacity: 0.72, fontSize: 9 }}>
          {label}
        </Typography>
      )}
      {definition ? (
        <>
          <ItemIcon itemId={itemId} size={compact ? 32 : 42} alt="" />
          {count > 0 && definition.maxStack !== 1 && (
            <Typography variant="caption" sx={{ position: "absolute", right: 4, bottom: 1, fontWeight: 1000 }}>
              {count}
            </Typography>
          )}
          {durabilityPercent != null && (
            <LinearProgress
              variant="determinate"
              value={durabilityPercent}
              color={durabilityPercent < 20 ? "error" : "success"}
              sx={{ position: "absolute", left: 4, right: 4, bottom: 4, height: 4, bgcolor: "rgba(0,0,0,.65)" }}
            />
          )}
        </>
      ) : (
        <Typography variant="caption" sx={{ opacity: 0.22 }}>—</Typography>
      )}
    </Box>
  );
}
