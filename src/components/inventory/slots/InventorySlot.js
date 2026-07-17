import React, { memo, useCallback, useState } from "react";
import { Box, LinearProgress, Typography } from "@mui/material";
import ItemIcon from "../../items/icons/ItemIcon";
import { getItemDefinition } from "../../../game/config/blockTypes";

const DRAG_MIME = "application/x-voxel-frontier-item";

function readDragPayload(event) {
  try {
    const encoded = event.dataTransfer.getData(DRAG_MIME);
    if (encoded) return JSON.parse(encoded);
  } catch (_) {}
  const itemId = event.dataTransfer.getData("text/plain");
  return itemId ? { source: "inventory", itemId } : null;
}

function InventorySlot({
  itemId,
  count,
  durability,
  selected,
  hotbarNumber,
  onClick,
  onActivate,
  activationValue,
  emptyLabel,
  label,
  compact = false,
  draggable = false,
  dragData,
  onDropItem,
  onDoubleClick,
}) {
  const [dragOver, setDragOver] = useState(false);
  const definition = itemId ? getItemDefinition(itemId) : null;
  const durabilityPercent = definition?.durability && durability != null
    ? Math.max(0, Math.min(100, (durability / definition.durability) * 100))
    : null;
  const interactive = Boolean(onClick || onActivate || onDropItem);
  const handleClick = useCallback(() => {
    if (onActivate) onActivate(activationValue ?? itemId);
    else onClick?.();
  }, [activationValue, itemId, onActivate, onClick]);
  const handleDragStart = useCallback((event) => {
    if (!draggable || !itemId) return;
    const payload = dragData || { source: "inventory", itemId };
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
    event.dataTransfer.setData("text/plain", itemId);
  }, [dragData, draggable, itemId]);
  const handleDragOver = useCallback((event) => {
    if (!onDropItem) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOver(true);
  }, [onDropItem]);
  const handleDrop = useCallback((event) => {
    if (!onDropItem) return;
    event.preventDefault();
    setDragOver(false);
    const payload = readDragPayload(event);
    if (payload) onDropItem(payload);
  }, [onDropItem]);

  return (
    <Box
      component="button"
      className={`inventory-slot ${selected ? "is-selected" : ""} ${dragOver ? "is-drag-over" : ""}`}
      type="button"
      draggable={Boolean(draggable && itemId)}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onDragEnd={() => setDragOver(false)}
      onDoubleClick={onDoubleClick}
      onClick={interactive ? handleClick : undefined}
      title={definition?.name || emptyLabel || "Empty slot"}
      sx={{
        appearance: "none",
        border: selected ? "3px solid #fff" : "2px solid rgba(255,255,255,.17)",
        bgcolor: selected ? "rgba(255,255,255,.18)" : "rgba(7,12,17,.92)",
        color: "inherit", p: 0, minWidth: 0, width: "100%", aspectRatio: "1 / 1",
        position: "relative", display: "grid", placeItems: "center",
        cursor: draggable && itemId ? "grab" : interactive ? "pointer" : "default",
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,.6)",
        "&:hover": interactive ? { bgcolor: "rgba(255,255,255,.12)" } : undefined,
      }}
    >
      {hotbarNumber != null && <Typography variant="caption" sx={{ position: "absolute", top: 1, left: 4, opacity: 0.72 }}>{hotbarNumber}</Typography>}
      {label && <Typography variant="caption" sx={{ position: "absolute", top: 2, left: 4, opacity: 0.72, fontSize: 9 }}>{label}</Typography>}
      {definition ? (
        <>
          <ItemIcon itemId={itemId} size={compact ? 32 : 42} alt="" />
          {count > 0 && definition.maxStack !== 1 && <Typography variant="caption" sx={{ position: "absolute", right: 4, bottom: 1, fontWeight: 1000 }}>{count}</Typography>}
          {durabilityPercent != null && <LinearProgress variant="determinate" value={durabilityPercent} color={durabilityPercent < 20 ? "error" : "success"} sx={{ position: "absolute", left: 4, right: 4, bottom: 4, height: 4, bgcolor: "rgba(0,0,0,.65)" }} />}
        </>
      ) : <Typography variant="caption" sx={{ opacity: 0.22 }}>—</Typography>}
    </Box>
  );
}
export default memo(InventorySlot);
