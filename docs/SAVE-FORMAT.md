# Save and backup format

Database records use save version 8. They include the world seed, player and spawn positions, permanent block edits, inventory, hotbar, durability, armor, progression, gameplay metrics, claimed quests, world time, creatures, mount, furnace jobs, liquid sources, and revision metadata.

Generated chunks are intentionally excluded. Importing a JSON backup creates a new world id and regenerates deterministic terrain around the saved player position.
