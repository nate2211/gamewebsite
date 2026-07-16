import React, { useSyncExternalStore } from "react";
import StylizedPlayerModel from "../../game/characters/StylizedPlayerModel";
import { multiplayerSession } from "../../game/multiplayer/MultiplayerSession";

export default function RemotePlayersLayer() {
  const snapshot = useSyncExternalStore(multiplayerSession.subscribe, multiplayerSession.getSnapshot, multiplayerSession.getServerSnapshot);
  return snapshot.remotePlayers
    .filter((player) => player.playerId !== snapshot.player.id)
    .map((player) => <StylizedPlayerModel key={player.playerId} playerState={player} />);
}
