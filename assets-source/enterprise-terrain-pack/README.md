# Enterprise Terrain Source Pack

This directory contains a deterministic 4096×4096 RGB terrain material master atlas. It is source material for future block-atlas baking and is not imported by the runtime bundle. Keeping the 4K master outside `src` and `public` preserves production memory, download, and frame-time performance while retaining high-resolution editable source data in the project package.

Quadrants contain grass-top material, dirt-with-grass side material, crop/seed material families, and packed authoring channels. The manifest records dimensions, byte size, and SHA-256 integrity.
