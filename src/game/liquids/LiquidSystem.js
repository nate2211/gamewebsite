import React,{useEffect,useLayoutEffect,useMemo,useRef,useSyncExternalStore} from "react";
import * as THREE from "three";
import {useFrame} from "@react-three/fiber";
import {liquidRuntime,WATER_MICRO_LEVELS} from "./liquidRuntime";
import waterFlowTextureUrl from "../../assets/water-physics-pack/flow-level-00.jpg";
import waterRippleTextureUrl from "../../assets/water-physics-pack/ocean-surface.jpg";
const WATER_VOLUME_GEOMETRY=new THREE.BoxGeometry(1,1,1); const WATER_SURFACE_GEOMETRY=new THREE.PlaneGeometry(1,1);
function loadTexture(url){const t=new THREE.TextureLoader().load(url);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestMipmapNearestFilter;t.colorSpace=THREE.SRGBColorSpace;t.repeat.set(1.5,1.5);return t;}
export default function LiquidSystem({enabled=true}){
 const snapshot=useSyncExternalStore(liquidRuntime.subscribe,liquidRuntime.getSnapshot,liquidRuntime.getServerSnapshot); const groupRef=useRef(),volumeRef=useRef(),surfaceRef=useRef(),timerRef=useRef(0); const dummy=useMemo(()=>new THREE.Object3D(),[]),color=useMemo(()=>new THREE.Color(),[]); const sideTexture=useMemo(()=>loadTexture(waterFlowTextureUrl),[]),topTexture=useMemo(()=>loadTexture(waterRippleTextureUrl),[]);
 const volumeMaterial=useMemo(()=>new THREE.MeshBasicMaterial({map:sideTexture,color:'#3f9fe8',transparent:true,opacity:.64,depthWrite:false,vertexColors:true,toneMapped:false,fog:true,side:THREE.DoubleSide}),[sideTexture]);
 const surfaceMaterial=useMemo(()=>new THREE.MeshBasicMaterial({map:topTexture,color:'#79c8ff',transparent:true,opacity:.78,depthWrite:false,vertexColors:true,toneMapped:false,fog:true,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),[topTexture]);
 useEffect(()=>()=>{sideTexture.dispose();topTexture.dispose();volumeMaterial.dispose();surfaceMaterial.dispose();},[sideTexture,topTexture,volumeMaterial,surfaceMaterial]);
 useEffect(()=>{if(!enabled)return undefined;const id=window.setInterval(()=>liquidRuntime.step(true),140);return()=>window.clearInterval(id);},[enabled]);
 useLayoutEffect(()=>{const volume=volumeRef.current,surface=surfaceRef.current;if(!volume||!surface)return;const count=snapshot.cells.length;volume.count=surface.count=count;volume.instanceMatrix.setUsage(THREE.DynamicDrawUsage);surface.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  snapshot.cells.forEach((cell,index)=>{const units=Math.max(1,Math.min(WATER_MICRO_LEVELS,cell.heightUnits||WATER_MICRO_LEVELS));const height=cell.falling?1:Math.min(15/WATER_MICRO_LEVELS,units/WATER_MICRO_LEVELS);const bottom=cell.y-.5;const width=cell.falling?Math.max(.42,.64-cell.level*.012):.985;
   dummy.position.set(cell.x,bottom+height/2,cell.z);dummy.scale.set(width,height,width);dummy.rotation.set(0,0,0);dummy.updateMatrix();volume.setMatrixAt(index,dummy.matrix);
   dummy.position.set(cell.x,bottom+height+.006,cell.z);dummy.scale.set(cell.falling?width:.985,cell.falling?width:.985,1);dummy.rotation.set(-Math.PI/2,0,0);dummy.updateMatrix();surface.setMatrixAt(index,dummy.matrix);
   const thin=1-units/WATER_MICRO_LEVELS;color.setHSL(.565+thin*.018,.72,.58+thin*.14);volume.setColorAt(index,color);color.setHSL(.56+thin*.02,.66,.7+thin*.12);surface.setColorAt(index,color);
  });volume.instanceMatrix.needsUpdate=surface.instanceMatrix.needsUpdate=true;if(volume.instanceColor)volume.instanceColor.needsUpdate=true;if(surface.instanceColor)surface.instanceColor.needsUpdate=true;volume.computeBoundingSphere();surface.computeBoundingSphere();},[color,dummy,snapshot]);
 useFrame(({clock},delta)=>{timerRef.current+=Math.min(delta,.1);if(timerRef.current<.04)return;timerRef.current=0;const t=clock.elapsedTime;sideTexture.offset.set((t*.018)%1,(-t*.032)%1);topTexture.offset.set((t*.024)%1,(t*.014)%1);surfaceMaterial.opacity=.75+Math.sin(t*2.2)*.035;if(groupRef.current)groupRef.current.position.y=Math.sin(t*1.9)*.008;});
 if(!snapshot.cells.length)return null;const cap=Math.max(1,snapshot.cells.length);return <group ref={groupRef} name="micro-height-water-system" renderOrder={4}><instancedMesh ref={volumeRef} args={[WATER_VOLUME_GEOMETRY,volumeMaterial,cap]} frustumCulled={false} renderOrder={4} dispose={null} userData={{liquidVolumes:true,microLevels:WATER_MICRO_LEVELS}}/><instancedMesh ref={surfaceRef} args={[WATER_SURFACE_GEOMETRY,surfaceMaterial,cap]} frustumCulled={false} renderOrder={5} dispose={null} userData={{liquidSurfaces:true,microLevels:WATER_MICRO_LEVELS}}/></group>;
}
