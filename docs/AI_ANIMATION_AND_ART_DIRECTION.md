# AI, animation, and art-direction upgrade

The new edition keeps the readable cubic silhouette of a voxel sandbox while adding the layered equipment, muted fantasy palette, stronger body proportions, and activity-driven motion associated with classic low-poly adventure RPGs.

## Runtime character improvements

- Multi-piece remote player rigs with hair, belts, straps, armor accents, hands, fingers, boots, and synchronized action states.
- Repositioned camera-space arm and held-item rig that stays visible on portrait, standard, and ultrawide viewports.
- Replicated mine, attack, use, build, walk, run, hurt, and death animation vocabulary.
- Existing mobs retain lightweight procedural geometry but now use contextual head poses, attack swings, variable gait urgency, grazing/resting poses, and more active movement.

## Smarter creature behavior

The AI adds persistent sensory memory, alertness, fear, hunger, rest, and social drives. An activity planner selects grazing, resting, socializing, shelter seeking, patrol, stalking, circling, foraging, and sunlight avoidance. Terrain steering samples ahead and to both sides to avoid oceans, cliffs, and invalid aquatic terrain.

## Source art pack

`assets-source/enterprise-character-pack` includes seven original glTF 2.0 block-sculpted models. Every model contains idle, walk, run, attack, mine, build, hurt, and death clips. Twenty-one 2K source maps provide diffuse, normal, and ORM material data. These source maps are retained for art iteration and are not loaded at full resolution by default.
