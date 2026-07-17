import { useFrame } from "@react-three/fiber";
import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useDispatch, useSelector } from "react-redux";
import { collectWorldDrop, spawnWorldDrop } from "../../../features/world/worldSlice";
import { BLOCK_TYPES, getItemDefinition } from "../../config/blockTypes";
import { worldRuntime } from "../../core/worldRuntime";

const liveDropPoses = new Map();
const CUBE = new THREE.BoxGeometry(0.28, 0.28, 0.28);
const SMALL_CUBE = new THREE.BoxGeometry(0.13, 0.13, 0.13);
const HANDLE = new THREE.BoxGeometry(0.07, 0.54, 0.07);
const BLADE = new THREE.BoxGeometry(0.08, 0.72, 0.035);
function Mat({ color }) { return <meshLambertMaterial color={color} flatShading />; }
function DropModel({ itemId, color }) {
  const definition = getItemDefinition(itemId);
  if (definition.weaponClass || definition.category === "tool") return (
    <group rotation={[0.15, 0, -0.55]} scale={0.72}>
      <mesh geometry={HANDLE} position={[0,-0.18,0]}><Mat color="#6f492f" /></mesh>
      <mesh geometry={BLADE} position={[0,0.42,0]}><Mat color={definition.weaponClass ? "#c7d4dc" : color} /></mesh>
      <mesh geometry={SMALL_CUBE} position={[0,0.05,0]} scale={[2.4,.45,1]}><Mat color="#a77b45" /></mesh>
    </group>
  );
  if (BLOCK_TYPES[itemId]) return <mesh geometry={CUBE}><Mat color={color} /></mesh>;
  if (definition.category === "food") return (
    <group>{[[0,0,0],[.1,.05,0],[-.08,.07,.04]].map((p,i)=><mesh key={i} geometry={SMALL_CUBE} position={p}><Mat color={i ? color : "#f0d49b"} /></mesh>)}</group>
  );
  return <group>{[[0,0,0],[.12,.02,.04],[-.1,-.03,.07],[.02,.1,-.06]].map((p,i)=><mesh key={i} geometry={SMALL_CUBE} position={p}><Mat color={i%2 ? color : new THREE.Color(color).offsetHSL(0,0,.12)} /></mesh>)}</group>;
}

function DroppedItem({ drop }) {
  const ref = useRef();
  useEffect(() => () => liveDropPoses.delete(drop.id), [drop.id]);
  const definition = getItemDefinition(drop.item);
  const motion = useRef({ x: drop.x, y: drop.y, z: drop.z, vx: Number(drop.vx)||0, vy: Number(drop.vy)||0, vz: Number(drop.vz)||0, grounded: false });
  useFrame(({ clock }, rawDelta) => {
    if (!ref.current) return;
    const dt=Math.min(rawDelta,.05), m=motion.current;
    if (!m.grounded) {
      m.vy -= 13*dt; m.x += m.vx*dt; m.y += m.vy*dt; m.z += m.vz*dt;
      const floorY=Math.floor(m.y-.18);
      const floorType=worldRuntime.getBlockTypeAt(Math.round(m.x),floorY,Math.round(m.z));
      if (floorType && BLOCK_TYPES[floorType]?.solid !== false && m.y <= floorY+.72) {
        m.y=floorY+.72; m.vy=Math.abs(m.vy)*.24; m.vx*=.62; m.vz*=.62;
        if (Math.abs(m.vy)<.35) { m.vy=0; m.grounded=true; }
      }
    }
    ref.current.rotation.y += dt*1.8;
    ref.current.rotation.x = Math.sin(clock.elapsedTime*1.5+drop.x)*.14;
    const renderedY=m.y+(m.grounded?Math.sin(clock.elapsedTime*2.6+drop.z)*.045:0);
    ref.current.position.set(m.x,renderedY,m.z);
    liveDropPoses.set(drop.id,{x:m.x,y:renderedY,z:m.z});
  });
  return <group ref={ref} position={[drop.x,drop.y,drop.z]}><DropModel itemId={drop.item} color={definition.color||"#fff"} />{drop.amount>1&&<mesh position={[.16,.08,-.04]} geometry={SMALL_CUBE}><Mat color={definition.color||"#fff"}/></mesh>}</group>;
}

export default function ItemDropSystem({ playerRef, enabled = true }) {
  const dispatch=useDispatch(), drops=useSelector(s=>s.world.droppedItems), mobs=useSelector(s=>s.world.mobs);
  const pickupAccumulator=useRef(0), eggAccumulator=useRef(0);
  const visibleDrops=useMemo(()=>{ const p=playerRef.current||{x:0,z:0}; return drops.map(drop=>({drop,d:(drop.x-p.x)**2+(drop.z-p.z)**2})).filter(x=>x.d<52*52).sort((a,b)=>a.d-b.d).slice(0,110).map(x=>x.drop); },[drops,playerRef]);
  useFrame((_,rawDelta)=>{ if(!enabled)return; const delta=Math.min(rawDelta,.1); pickupAccumulator.current+=delta; eggAccumulator.current+=delta; const player=playerRef.current;if(!player)return;
    if(pickupAccumulator.current>=.1){pickupAccumulator.current=0;const now=Date.now();const pickup=drops.find(drop=>{const pose=liveDropPoses.get(drop.id)||drop;return now>=(drop.pickupDelayUntil||0)&&(pose.x-player.x)**2+(pose.y-player.y)**2+(pose.z-player.z)**2<=2.15**2;});if(pickup)dispatch(collectWorldDrop(pickup.id));}
    if(eggAccumulator.current>=22&&drops.length<80){eggAccumulator.current=0;const chicken=mobs.find(m=>m.type==="chicken"&&!m.dyingUntil&&(m.x-player.x)**2+(m.z-player.z)**2<28**2);if(chicken&&!drops.some(d=>d.item==="egg"&&(d.x-chicken.x)**2+(d.z-chicken.z)**2<3))dispatch(spawnWorldDrop({item:"egg",amount:1,x:chicken.x,y:chicken.y+.2,z:chicken.z,vy:1.8,pickupDelayUntil:Date.now()+700}));}
  });
  return visibleDrops.map(drop=><DroppedItem key={drop.id} drop={drop}/>);
}
