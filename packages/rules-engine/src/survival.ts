/** Paso 18: salvaciones de muerte y concentración, PHB 2024.
 * Operaciones puras, entradas explícitas y sin tiradas aleatorias ocultas.
 * El estado de 0 PG implica Inconsciente de forma derivada; no añade una
 * condición editable al registro de otras fuentes de Inconsciente.
 */
export type DeathTrack=Readonly<{
  successes:number; failures:number; stable:boolean; dead:boolean;
}>;
export type ConcentrationTrack=Readonly<{
  name:string;
  /** null: duración fuera del contador de rondas, finalizada manualmente. */
  remainingRounds:number|null;
  /** Cada fuente de daño requiere una salvación independiente. */
  pendingDCs:readonly number[];
}>;
export type SurvivalState=Readonly<{
  death:DeathTrack;
  concentration:ConcentrationTrack|null;
}>;
const emptyDeath=():DeathTrack=>({successes:0,failures:0,stable:false,dead:false});
export function initialSurvivalState():SurvivalState{
  return {death:emptyDeath(),concentration:null};
}
function fail(message:string):never{throw new RangeError(message);}
function record(v:unknown):v is Record<string,unknown>{return v!==null&&typeof v==='object'&&!Array.isArray(v);}
function keys(v:Record<string,unknown>,allowed:readonly string[],label:string):void{
  if(Object.keys(v).some(k=>!allowed.includes(k))||allowed.some(k=>!Object.hasOwn(v,k)))fail(`${label}: campos desconocidos u omitidos`);
}
function int(v:unknown,min:number,max:number,label:string):number{
  if(typeof v!=='number'||!Number.isSafeInteger(v)||v<min||v>max)fail(`${label}: debe ser entero entre ${min} y ${max}`);
  return v;
}
export function validateSurvivalState(value:unknown,currentHP:number):SurvivalState{
  if(!record(value))fail('Estado de supervivencia inválido');
  keys(value,['death','concentration'],'Supervivencia');
  int(currentHP,0,100000,'PG actuales');
  if(!record(value.death))fail('Salvaciones contra muerte inválidas');
  const raw=value.death;
  keys(raw,['successes','failures','stable','dead'],'Salvaciones contra muerte');
  const successes=int(raw.successes,0,2,'Éxitos');
  const failures=int(raw.failures,0,3,'Fallos');
  if(typeof raw.stable!=='boolean'||typeof raw.dead!=='boolean')fail('Banderas de supervivencia inválidas');
  if((raw.stable||raw.dead)&&(successes!==0||failures!==0))fail('El contador debe reiniciarse al estabilizarse o morir');
  if(failures===3&&!raw.dead)fail('Tres fallos provocan la muerte');
  if(currentHP>0&&(successes!==0||failures!==0||raw.stable||raw.dead))fail('Con PG positivos no puede estar muriendo');
  const death:DeathTrack={successes,failures,stable:raw.stable,dead:raw.dead};
  let concentration:ConcentrationTrack|null=null;
  if(value.concentration!==null){
    if(!record(value.concentration))fail('Concentración inválida');
    const c=value.concentration;
    keys(c,['name','remainingRounds','pendingDCs'],'Concentración');
    if(typeof c.name!=='string'||!c.name.trim()||c.name.length>100||/[\u0000-\u001f]/.test(c.name))fail('Nombre de concentración inválido');
    if(!Array.isArray(c.pendingDCs)||c.pendingDCs.length>12)fail('Demasiadas salvaciones de concentración pendientes');
    const pendingDCs=c.pendingDCs.map(dc=>int(dc,10,30,'CD de concentración'));
    concentration={name:c.name.trim(),remainingRounds:c.remainingRounds===null?null:int(c.remainingRounds,1,10000,'Rondas de concentración'),pendingDCs};
    if(currentHP===0||death.dead)fail('No se puede concentrar con 0 PG o muerto');
  }
  return {death,concentration};
}
export function concentrationDC(damageTaken:number):number{
  const amount=int(damageTaken,1,100000,'Daño sufrido');
  return Math.min(30,Math.max(10,Math.floor(amount/2)));
}
export function resetDeathTrack():DeathTrack{return emptyDeath();}
export function deathSavingThrow(death:DeathTrack,d20:number,d20Penalty=0):Readonly<{death:DeathTrack;regainHP:boolean;message:string}>{
  const n=int(d20,1,20,'Dado de salvación de muerte');
  int(d20Penalty,-12,0,'Penalización al d20 por agotamiento');
  if(death.dead||death.stable)fail('No se realizan salvaciones de muerte si está muerto o estable');
  if(n===20)return {death:emptyDeath(),regainHP:true,message:'20 natural: recupera 1 PG y termina la agonía.'};
  const success=n+d20Penalty>=10?1:0;
  const failure=n===1?2:success===0?1:0;
  const successes=death.successes+success;
  const failures=death.failures+failure;
  if(failures>=3)return {death:{...emptyDeath(),dead:true},regainHP:false,message:'Tres fallos: el personaje muere.'};
  if(successes>=3)return {death:{...emptyDeath(),stable:true},regainHP:false,message:'Tres éxitos: el personaje queda estable a 0 PG.'};
  return {death:{successes,failures,stable:false,dead:false},regainHP:false,message:`Salvación de muerte: ${successes} éxitos y ${failures} fallos.`};
}
export function stabilize(death:DeathTrack,totalMedicine:number):Readonly<{death:DeathTrack;message:string}>{
  int(totalMedicine,-1000,1000,'Total de Medicina');
  if(death.dead||death.stable)fail('El personaje ya está muerto o estabilizado');
  return totalMedicine>=10?{death:{...emptyDeath(),stable:true},message:'Medicina CD 10 superada: personaje estable.'}
    :{death,message:'Medicina CD 10 fallida: sigue agonizando.'};
}
export function damageAtZero(death:DeathTrack,amount:number,hpMaximum:number,critical=false):Readonly<{death:DeathTrack;message:string}>{
  int(amount,1,100000,'Daño');int(hpMaximum,1,100000,'PG máximos');
  if(death.dead)fail('El personaje ya está muerto');
  if(amount>=hpMaximum)return {death:{...emptyDeath(),dead:true},message:'Daño a 0 PG igual o superior al máximo: muerte instantánea.'};
  const failures=death.failures+(critical?2:1);
  if(failures>=3)return {death:{...emptyDeath(),dead:true},message:'Tres fallos acumulados: el personaje muere.'};
  return {death:{successes:death.stable?0:death.successes,failures,stable:false,dead:false},message:`Daño recibido a 0 PG: ${critical?2:1} fallo(s) de salvación de muerte.`};
}
export function recoverFromStable(death:DeathTrack,rolledHours:number,elapsedHours:number):void{
  if(!death.stable||death.dead)fail('Solo un personaje estable puede recuperar 1 PG de esta manera');
  const required=int(rolledHours,1,4,'1d4 horas');
  const elapsed=int(elapsedHours,0,10000,'Horas transcurridas');
  if(elapsed<required)fail('Todavía no han transcurrido las horas requeridas por la tirada');
}
export function startConcentration(previous:SurvivalState,name:string,rounds:number|null):SurvivalState{
  if(typeof name!=='string'||!name.trim()||name.length>100||/[\u0000-\u001f]/.test(name))fail('Nombre de concentración inválido');
  if(rounds!==null)int(rounds,1,10000,'Rondas');
  if(previous.concentration?.pendingDCs.length)fail('Resuelve primero las salvaciones de concentración pendientes');
  return {...previous,concentration:{name:name.trim(),remainingRounds:rounds,pendingDCs:[]}};
}
export function recordConcentrationDamage(s:SurvivalState,damage:number):SurvivalState{
  if(!s.concentration)return s;
  const dc=concentrationDC(damage);
  if(s.concentration.pendingDCs.length>=12)fail('Resuelve las salvaciones de concentración pendientes antes de registrar más daño');
  return {...s,concentration:{...s.concentration,pendingDCs:[...s.concentration.pendingDCs,dc]}};
}
export function resolveConcentration(s:SurvivalState,total:number):Readonly<{state:SurvivalState;passed:boolean;dc:number}>{
  const dc=s.concentration?.pendingDCs[0];
  if(dc===undefined)fail('No hay salvación de concentración pendiente');
  int(total,-1000,1000,'Resultado de salvación de Constitución');
  const passed=total>=dc;
  const state:SurvivalState={...s,concentration:passed?{...s.concentration!,pendingDCs:s.concentration!.pendingDCs.slice(1)}:null};
  return {state,passed,dc};
}
export function advanceSurvivalRound(s:SurvivalState):SurvivalState{
  const c=s.concentration;
  if(!c||c.remainingRounds===null)return s;
  if(c.remainingRounds<=1)return {...s,concentration:null};
  return {...s,concentration:{...c,remainingRounds:c.remainingRounds-1}};
}
