import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useDispatch, useSelector } from "react-redux";
import { catchFish, setFishingState } from "../../features/world/worldSlice";
import { worldRuntime } from "../core/worldRuntime";
import { liquidRuntime } from "../liquids/liquidRuntime";

const TEMP_DIRECTION = new THREE.Vector3();
const TEMP_POINT = new THREE.Vector3();
function findWaterAlongView(camera) {
  camera.getWorldDirection(TEMP_DIRECTION);
  for (let step=2; step<=13; step+=.5) {
    TEMP_POINT.copy(camera.position).addScaledVector(TEMP_DIRECTION,step);
    const x=Math.round(TEMP_POINT.x), z=Math.round(TEMP_POINT.z), centerY=Math.round(TEMP_POINT.y);
    for (let offset=2; offset>=-7; offset-=1) {
      const y=centerY+offset; const staticWater=worldRuntime.getBlockTypeAt(x,y,z)==="water"; const liquid=liquidRuntime.getCellAt(x,y,z);
      if(!staticWater&&!liquid)continue;
      const surfaceY=liquidRuntime.getSurfaceHeightAt(x,y,z)??y+.46875;
      return {x,y:surfaceY+.03,z};
    }
  }
  return null;
}
function FishingLine({originRef,bobberRef}){
  const lineRef=useRef(); const geometry=useMemo(()=>new THREE.BufferGeometry(),[]); const material=useMemo(()=>new THREE.LineBasicMaterial({color:"#d8d1b7",transparent:true,opacity:.9}),[]);
  useEffect(()=>()=>{geometry.dispose();material.dispose();},[geometry,material]);
  useFrame(()=>{if(!lineRef.current||!bobberRef.current)return;geometry.setFromPoints([new THREE.Vector3(originRef.current.x,originRef.current.y,originRef.current.z),bobberRef.current.position.clone()]);geometry.attributes.position.needsUpdate=true;});
  return <line ref={lineRef} geometry={geometry} material={material} frustumCulled={false}/>;
}
export default function FishingSystem({enabled=true}){
  const dispatch=useDispatch(); const {camera,gl}=useThree(); const selectedIndex=useSelector((s)=>s.world.selectedIndex); const hotbar=useSelector((s)=>s.world.hotbar); const inventory=useSelector((s)=>s.world.inventory);
  const selectedItem=hotbar[selectedIndex]; const hasRod=selectedItem==="fishing_rod"&&(inventory.fishing_rod||0)>0; const [cast,setCast]=useState(null); const bobberRef=useRef(); const originRef=useRef({x:0,y:0,z:0});
  const cancel=useCallback((message="Fishing line reeled in")=>{setCast(null);dispatch(setFishingState({active:false,bite:false,message}));},[dispatch]);
  const castLine=useCallback(()=>{if(!enabled||!hasRod||document.pointerLockElement!==gl.domElement)return;const water=findWaterAlongView(camera);if(!water){dispatch(setFishingState({active:false,bite:false,message:"Aim at visible water to cast"}));return;}const now=performance.now();setCast({...water,castAt:now,biteAt:now+2300+Math.random()*4300,biteEndsAt:0,bite:false,phase:Math.random()*Math.PI*2});dispatch(setFishingState({active:true,bite:false,message:"Bobber cast · wait for it to dip"}));},[camera,dispatch,enabled,gl.domElement,hasRod]);
  const reel=useCallback(()=>{if(!cast)return;if(!cast.bite){cancel("Reeled in too early");return;}const roll=Math.random();const rare=roll>.92;const item=rare?(roll>.975?"emerald":"leather"):"raw_fish";const amount=item==="raw_fish"&&Math.random()>.78?2:1;dispatch(catchFish({item,amount,rare}));setCast(null);},[cancel,cast,dispatch]);
  useEffect(()=>{const handler=(event)=>{if(!enabled||document.pointerLockElement!==gl.domElement)return;if(event.button===2&&hasRod){event.preventDefault();event.stopImmediatePropagation();if(cast)cancel();else castLine();}else if(event.button===0&&cast){event.preventDefault();event.stopImmediatePropagation();reel();}};window.addEventListener("mousedown",handler,true);return()=>window.removeEventListener("mousedown",handler,true);},[cancel,cast,castLine,enabled,gl.domElement,hasRod,reel]);
  useEffect(()=>{if(!hasRod&&cast)cancel("Fishing cancelled");},[cancel,cast,hasRod]);
  useFrame(({clock})=>{if(!cast||!bobberRef.current)return;const now=performance.now();originRef.current={x:camera.position.x+.35,y:camera.position.y-.25,z:camera.position.z};if(!cast.bite&&now>=cast.biteAt){setCast((c)=>c?{...c,bite:true,biteEndsAt:now+1350}:c);dispatch(setFishingState({active:true,bite:true,message:"BITE! Left click now"}));}if(cast.bite&&now>cast.biteEndsAt){cancel("The fish escaped");return;}const bob=Math.sin(clock.elapsedTime*2.8+cast.phase)*.045;const dip=cast.bite?-.28-Math.abs(Math.sin(clock.elapsedTime*11))*.1:0;bobberRef.current.position.set(cast.x,cast.y+bob+dip,cast.z);});
  if(!cast)return null;
  return <group><FishingLine originRef={originRef} bobberRef={bobberRef}/><group ref={bobberRef} position={[cast.x,cast.y,cast.z]}><mesh position={[0,.07,0]}><cylinderGeometry args={[.08,.08,.16,10]}/><meshBasicMaterial color="#f4f2de" toneMapped={false}/></mesh><mesh position={[0,-.07,0]}><cylinderGeometry args={[.08,.08,.14,10]}/><meshBasicMaterial color="#d8493f" toneMapped={false}/></mesh></group></group>;
}
