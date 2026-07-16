# Save and backup format

Database records use save version 12. They include the world seed, player and spawn positions, permanent per-chunk block edits, inventory, hotbar, durability, armor, progression, gameplay metrics, claimed quests, world time, creatures, mount, furnace jobs, liquid sources, colony stations, colony storage, colony totals, crop stages, physical dropped items, fishing state, weather state, and revision metadata.

Generated chunks are intentionally excluded from normal world records. Deterministic terrain regenerates around the player, while permanent mining, placement, water-source, farmland, crop, and colony-box edits are restored from the edit index.

Older records receive safe default colony, crop, drop, fishing, and weather objects during hydration. Imported JSON backups receive a new world ID and regenerate deterministic terrain around the saved player position.
