import React, { memo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import DayNightCycle from "../game/DayNightCycle";
import InteractionController from "../game/InteractionController";
import MobSystem from "../game/MobSystem";
import PlayerController from "../game/PlayerController";
import WorldRenderer from "../game/WorldRenderer";

function GameCanvas({
  playerRef,
  controlsEnabled,
  onCanvasReady,
  onOpenStation,
}) {
  const blockTargetRef = useRef(null);
  const mobTargetRef = useRef(null);
  const miningVisualRef = useRef(null);

  return (
    <div className="game-canvas-wrap">
      <Canvas
        shadows={false}
        camera={{ fov: 72, near: 0.05, far: 220 }}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        dpr={[1, 1.5]}
        onCreated={({ gl }) => {
          gl.domElement.id = "voxel-game-canvas";
          gl.domElement.tabIndex = 0;
          gl.domElement.style.imageRendering = "pixelated";
          onCanvasReady(gl.domElement);
        }}
      >
        <DayNightCycle />
        <WorldRenderer
          targetRef={blockTargetRef}
          miningVisualRef={miningVisualRef}
        />
        <MobSystem playerRef={playerRef} targetRef={mobTargetRef} />
        <PlayerController
          playerRef={playerRef}
          controlsEnabled={controlsEnabled}
        />
        <InteractionController
          blockTargetRef={blockTargetRef}
          mobTargetRef={mobTargetRef}
          miningVisualRef={miningVisualRef}
          playerRef={playerRef}
          enabled={controlsEnabled}
          onOpenStation={onOpenStation}
        />
      </Canvas>
    </div>
  );
}

export default memo(GameCanvas);
