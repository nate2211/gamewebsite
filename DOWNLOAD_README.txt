Voxel Frontier Frontend Multiplayer Enterprise Edition v12.0.0

Files required:
  voxel-frontier-frontend-multiplayer-enterprise-v12.zip.part-000
  voxel-frontier-frontend-multiplayer-enterprise-v12.zip.part-001
  voxel-frontier-frontend-multiplayer-enterprise-v12.zip.part-002
  voxel-frontier-frontend-multiplayer-enterprise-v12.release-sha256.txt
  voxel-frontier-frontend-multiplayer-enterprise-v12-assemble-release.sh

Linux, macOS, WSL, or Git Bash:
  chmod +x voxel-frontier-frontend-multiplayer-enterprise-v12-assemble-release.sh
  ./voxel-frontier-frontend-multiplayer-enterprise-v12-assemble-release.sh

Manual reconstruction:
  cat voxel-frontier-frontend-multiplayer-enterprise-v12.zip.part-* > voxel-frontier-frontend-multiplayer-enterprise-v12.zip
  unzip -t voxel-frontier-frontend-multiplayer-enterprise-v12.zip

The first two pieces are exactly 150 MiB. The third is the final 103 MiB remainder.
The reconstructed ZIP is approximately 403 MiB and contains source, production build,
documentation, original character/mob source assets, checksums, and release scripts.
node_modules is deliberately excluded.

Multiplayer uses browser-to-browser WebRTC. No custom Cloudflare Worker/backend is
required. The invite URL carries the offer and the returning response link completes
the handshake. Optional public STUN can improve internet connectivity; TURN is not bundled.
