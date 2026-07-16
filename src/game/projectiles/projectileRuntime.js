class ProjectileRuntime {
  constructor() { this.projectiles=[]; this.listeners=new Set(); this.snapshot=Object.freeze([]); this.counter=0; }
  subscribe=(listener)=>{ this.listeners.add(listener); return ()=>this.listeners.delete(listener); };
  getSnapshot=()=>this.snapshot;
  getServerSnapshot=()=>this.snapshot;
  emit(){ this.snapshot=Object.freeze(this.projectiles.map((p)=>Object.freeze({...p}))); this.listeners.forEach((l)=>l()); }
  throwEgg(origin,direction){ const id=`egg-projectile-${Date.now()}-${this.counter++}`; this.projectiles.push({id,type:"egg",x:origin.x,y:origin.y,z:origin.z,vx:direction.x*8,vy:direction.y*8+2.6,vz:direction.z*8,createdAt:Date.now()}); this.emit(); return id; }
  remove(id){ const before=this.projectiles.length; this.projectiles=this.projectiles.filter((p)=>p.id!==id); if(this.projectiles.length!==before)this.emit(); }
  clear(){this.projectiles=[];this.emit();}
}
export const projectileRuntime=new ProjectileRuntime();
