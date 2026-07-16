import React, { useRef, useSyncExternalStore } from "react";
import { useFrame } from "@react-three/fiber";
import { useDispatch } from "react-redux";
import { hatchChicken } from "../../features/world/worldSlice";
import { projectileRuntime } from "./projectileRuntime";
import { worldRuntime } from "../core/worldRuntime";
function EggProjectile({ projectile }) {
  const ref=useRef(); const velocity=useRef({x:projectile.vx,y:projectile.vy,z:projectile.vz}); const position=useRef({x:projectile.x,y:projectile.y,z:projectile.z}); const dispatch=useDispatch();
  useFrame((_,rawDelta)=>{ const delta=Math.min(rawDelta,.05); const p=position.current; const v=velocity.current; v.y-=12.5*delta; p.x+=v.x*delta;p.y+=v.y*delta;p.z+=v.z*delta; if(ref.current){ref.current.position.set(p.x,p.y,p.z);ref.current.rotation.x+=delta*8;ref.current.rotation.z+=delta*5;} const ground=worldRuntime.findTopSolidY(p.x,p.z,Math.ceil(p.y+1),-4); if((ground!=null&&p.y<=ground+.65)||Date.now()-projectile.createdAt>6000){if(ground!=null&&Math.random()<.24)dispatch(hatchChicken({x:p.x,y:ground+.55,z:p.z}));projectileRuntime.remove(projectile.id);} });
  return <mesh ref={ref} position={[projectile.x,projectile.y,projectile.z]} scale={[.18,.24,.18]}><sphereGeometry args={[1,10,8]}/><meshLambertMaterial color="#eee5c8"/></mesh>;
}
export default function ProjectileSystem(){const projectiles=useSyncExternalStore(projectileRuntime.subscribe,projectileRuntime.getSnapshot,projectileRuntime.getServerSnapshot);return projectiles.map((p)=>p.type==="egg"?<EggProjectile key={p.id} projectile={p}/>:null);}
