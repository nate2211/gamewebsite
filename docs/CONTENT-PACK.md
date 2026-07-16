# Original content pack

`public/assets` contains original generated pixel-art files:

- Individual block textures
- Individual inventory and hotbar icons
- A block texture atlas and JSON coordinates
- A menu panorama
- A title badge

The interface first attempts to load the static item icon and falls back to the original runtime canvas icon generator if an asset is missing. Custom packs can replace files while keeping the same ids.
