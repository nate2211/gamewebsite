import { blockKey } from "../utils/worldUtils";
import { worldRuntime } from "../core/worldRuntime";

const SIDE_DIRECTIONS = Object.freeze([[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]]);
export const WATER_MICRO_LEVELS = 16;
export const MAX_FLOW_LEVEL = WATER_MICRO_LEVELS - 1;
export const MAX_SOURCE_DISTANCE = 12;
export const MAX_VERTICAL_DISTANCE = 32;
export const MAX_LIQUID_CELLS = 2800;
export const LIQUID_STEP_BUDGET = 220;

function staticBlockTypeAt(x,y,z){return worldRuntime.getBlockTypeAt(Math.round(x),Math.round(y),Math.round(z));}
function isStaticWaterAt(x,y,z){return staticBlockTypeAt(x,y,z)==="water";}
function isSolidAt(x,y,z){const type=staticBlockTypeAt(x,y,z); return Boolean(type && !["water","seagrass","kelp","torch"].includes(type));}
function horizontalDistance(origin,x,z){return Math.max(Math.abs(origin[0]-x),Math.abs(origin[2]-z));}
function verticalDistance(origin,y){return Math.abs(origin[1]-y);}
function levelToHeightUnits(level,falling=false,source=false,pressurized=false){if(source||falling||pressurized)return WATER_MICRO_LEVELS; return Math.max(1,WATER_MICRO_LEVELS-Math.max(0,Math.min(MAX_FLOW_LEVEL,level)));}
function createCell({x,y,z,level=0,source=false,falling=false,origin,distance=0,headY}){const resolvedOrigin=origin||[x,y,z];const resolvedHeadY=Number.isFinite(headY)?headY:resolvedOrigin[1];const pressurized=y<resolvedHeadY;const key=blockKey(x,y,z); const heightUnits=levelToHeightUnits(level,falling,source,pressurized); return {key,x,y,z,level,heightUnits,height:heightUnits/WATER_MICRO_LEVELS,source,falling,pressurized,headY:resolvedHeadY,origin:resolvedOrigin,distance};}
function shouldReplace(existing,candidate){if(!existing)return true; if(existing.source&&!candidate.source)return false; if(candidate.source&&!existing.source)return true; if((candidate.headY||candidate.y)>(existing.headY||existing.y))return true; if(candidate.falling&&!existing.falling)return true; if(!candidate.falling&&existing.falling&&candidate.pressurized)return true; if(!candidate.falling&&existing.falling)return false; if(candidate.level<existing.level)return true; return candidate.level===existing.level&&candidate.distance<existing.distance;}

class LiquidRuntime{
  constructor(){this.cells=new Map();this.sources=new Map();this.transientSources=new Map();this.listeners=new Set();this.version=0;this.snapshot=Object.freeze({version:0,microLevels:WATER_MICRO_LEVELS,cells:Object.freeze([])});}
  subscribe=(listener)=>{this.listeners.add(listener);return()=>this.listeners.delete(listener);};
  getSnapshot=()=>this.snapshot;
  getServerSnapshot=()=>this.snapshot;
  reset(serializedSources=[]){this.cells.clear();this.sources.clear();this.transientSources.clear();(serializedSources||[]).forEach((source)=>{const position=Array.isArray(source)?source:source.position;if(Array.isArray(position))this.addSource(position,false);});this.publish();}
  addSource(position,publish=true){const [x,y,z]=position.map((value)=>Math.round(Number(value)));if(![x,y,z].every(Number.isFinite)||isSolidAt(x,y,z)||isStaticWaterAt(x,y,z))return false;const cell=createCell({x,y,z,source:true,origin:[x,y,z],headY:y});this.sources.set(cell.key,cell);this.cells.set(cell.key,cell);if(publish)this.publish();return true;}
  removeSourceAt(x,y,z){const key=blockKey(Math.round(x),Math.round(y),Math.round(z));const removed=this.sources.delete(key)||this.transientSources.delete(key);if(removed)this.rebuildFromSources();return removed;}
  hasWaterAt(x,y,z){const rx=Math.round(x),ry=Math.round(y),rz=Math.round(z);return this.cells.has(blockKey(rx,ry,rz))||isStaticWaterAt(rx,ry,rz);}
  getCellAt(x,y,z){return this.cells.get(blockKey(Math.round(x),Math.round(y),Math.round(z)))||null;}
  getSurfaceHeightAt(x,y,z){const rx=Math.round(x),ry=Math.round(y),rz=Math.round(z);if(isStaticWaterAt(rx,ry,rz))return ry+0.46875;const cell=this.getCellAt(rx,ry,rz);return cell?cell.y-0.5+cell.height:null;}
  containsPoint(x,y,z){const cellY=Math.floor(Number(y)+0.5);const surface=this.getSurfaceHeightAt(x,cellY,z);return surface!=null&&Number(y)<=surface+0.015&&Number(y)>=cellY-0.52;}
  flowIntoOpenedCell(position,publish=true){const [x,y,z]=(position||[]).map((value)=>Math.round(Number(value)));if(![x,y,z].every(Number.isFinite)||isSolidAt(x,y,z)||isStaticWaterAt(x,y,z))return false;let headY=null;for(const [dx,dy,dz] of [[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],[0,1,0]]){const nx=x+dx,ny=y+dy,nz=z+dz;if(isStaticWaterAt(nx,ny,nz))headY=Math.max(headY??ny,ny);const neighbor=this.getCellAt(nx,ny,nz);if(neighbor)headY=Math.max(headY??neighbor.headY,neighbor.headY??neighbor.y);}if(headY==null)return false;const cell=createCell({x,y,z,level:1,source:true,origin:[x,headY,z],headY});this.transientSources.set(cell.key,cell);this.cells.set(cell.key,cell);if(publish)this.publish();return true;}
  serializeSources(){return Array.from(this.sources.values()).map((source)=>({position:[source.x,source.y,source.z]}));}
  rebuildFromSources(){const positions=Array.from(this.sources.values()).map((s)=>[s.x,s.y,s.z]);this.cells.clear();this.sources.clear();this.transientSources.clear();positions.forEach((p)=>this.addSource(p,false));for(let i=0;i<28;i+=1)this.step(false,LIQUID_STEP_BUDGET*2);this.publish();}
  step(publish=true,budget=LIQUID_STEP_BUDGET){if(!this.cells.size)return false;const next=new Map(this.cells);const ordered=Array.from(this.cells.values()).sort((a,b)=>a.falling!==b.falling?(a.falling?-1:1):b.y-a.y||a.level-b.level||a.distance-b.distance);let changed=false,operations=0;
    const insert=(candidate)=>{if(next.size>=MAX_LIQUID_CELLS||operations>=budget)return false;if(isSolidAt(candidate.x,candidate.y,candidate.z)||isStaticWaterAt(candidate.x,candidate.y,candidate.z))return false;const existing=next.get(candidate.key);if(!shouldReplace(existing,candidate))return false;next.set(candidate.key,candidate);operations+=1;changed=true;return true;};
    for(const cell of ordered){if(next.size>=MAX_LIQUID_CELLS||operations>=budget)break;const origin=cell.origin||[cell.x,cell.y,cell.z];const headY=Number.isFinite(cell.headY)?cell.headY:origin[1];const belowY=cell.y-1;
      // Gravity always wins: unsupported water falls before it spreads.
      const belowHasLiquid=next.has(blockKey(cell.x,belowY,cell.z));
      if(verticalDistance(origin,belowY)<=MAX_VERTICAL_DISTANCE&&!isSolidAt(cell.x,belowY,cell.z)&&!isStaticWaterAt(cell.x,belowY,cell.z)&&!belowHasLiquid){insert(createCell({x:cell.x,y:belowY,z:cell.z,level:Math.min(cell.level,2),falling:true,origin,headY,distance:cell.distance}));continue;}

      // A falling column becomes a stable full-width volume when it reaches a
      // floor. This prevents deep basins from rendering as narrow waterfalls.
      if(cell.falling){insert(createCell({x:cell.x,y:cell.y,z:cell.z,level:cell.level,origin,headY,distance:cell.distance}));}

      // Water connected to a higher source has pressure. Once it reaches lower
      // terrain it fills upward toward the source surface instead of leaving a
      // one-cell puddle at the bottom of a basin.
      if(cell.y<headY){const aboveY=cell.y+1;if(aboveY<=headY&&!isSolidAt(cell.x,aboveY,cell.z)&&!isStaticWaterAt(cell.x,aboveY,cell.z)){insert(createCell({x:cell.x,y:aboveY,z:cell.z,level:cell.level,origin,headY,distance:cell.distance}));}}

      // Supported flow reduces only the exposed top surface by one sixteenth per
      // block. Lower pressurized layers remain full-height while filling basins.
      const nextLevel=cell.source?1:Math.max(1,cell.level+1);if(nextLevel>MAX_FLOW_LEVEL)continue;
      for(const [dx,,dz] of SIDE_DIRECTIONS){if(next.size>=MAX_LIQUID_CELLS||operations>=budget)break;const x=cell.x+dx,y=cell.y,z=cell.z+dz;const distance=horizontalDistance(origin,x,z);if(distance>MAX_SOURCE_DISTANCE)continue;insert(createCell({x,y,z,level:nextLevel,origin,headY,distance}));}
    }
    if(changed){this.cells=next;if(publish)this.publish();}return changed;
  }
  publish(){this.version+=1;const cells=Array.from(this.cells.values()).map((cell)=>Object.freeze({...cell}));this.snapshot=Object.freeze({version:this.version,microLevels:WATER_MICRO_LEVELS,cells:Object.freeze(cells)});this.listeners.forEach((listener)=>listener());}
}
export const liquidRuntime=new LiquidRuntime();
