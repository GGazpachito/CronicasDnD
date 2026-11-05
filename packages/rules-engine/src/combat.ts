/** Paso 16. Diario de ataques y efectos temporales anotados manualmente.
 * El registro es determinista y no simula enemigos, turnos reales, hechizos o condiciones.
 * Consume una unidad de municion del inventario al CONFIRMAR un disparo.
 */
import { WEAPON_STATS, type AttackResolution, type WeaponAttackProfile, type DamageType } from './attacks';
import { WEAPONS, type WeaponId } from './martial';
import { applyInventoryAction, type InventoryAction, type InventoryItemId, type InventoryState } from './inventory';
import {advanceConditionRound,initialConditionLedger,validateConditionLedger,type ConditionId,type ConditionLedger} from './conditions';

type AmmoId = NonNullable<WeaponAttackProfile['ammunition']>;
export type CombatAttackEntry = Readonly<{
  id:number;
  round:number;
  weaponId:WeaponId;
  naturalRoll:number;
  attackTotal:number;
  critical:boolean;
  hit:boolean|null;
  damageTotal:number|null;
  grazeDamage:number|null;
  damageType:DamageType;
  ammunitionSpent:AmmoId|null;
}>;
export type TrackedEffect = Readonly<{
  id:number;
  name:string;
  /** null indica duracion indefinida: debe retirarse manualmente. */
  remainingRounds:number|null;
  notes:string;
}>;
export type CombatState = Readonly<{
  round:number;
  nextId:number;
  attacks:readonly CombatAttackEntry[];
  effects:readonly TrackedEffect[];
  /** Opcional para compatibilidad con los guardados anteriores a la actualización 17. */
  conditions?:ConditionLedger;
}>;
const MAX_ATTACKS=100;
const MAX_EFFECTS=30;
const MAX_ROUNDS=100_000;
const MAX_ID=1_000_000;
function fail(message:string):never{throw new RangeError(message);}
function record(value:unknown):value is Record<string,unknown>{return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function exactKeys(value:Record<string,unknown>,keys:readonly string[],label:string):void{
  if(Object.keys(value).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(value,k)))fail(`${label}: campos inválidos`);
}
function bounded(value:unknown,min:number,max:number,label:string):number{
  if(typeof value!=='number'||!Number.isSafeInteger(value)||value<min||value>max)fail(`${label}: valor fuera de rango`);
  return value as number;
}
function textValue(value:unknown,max:number,label:string,allowEmpty=false):string{
  if(typeof value!=='string'||value.length>max||(!allowEmpty&&!value.trim())||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))fail(`${label}: texto inválido`);
  return value.trim();
}
function weapon(value:unknown):value is WeaponId{return typeof value==='string'&&Object.hasOwn(WEAPON_STATS,value);}
function optionalDamage(value:unknown,label:string):number|null{
  return value===null?null:bounded(value,0,10_000,label);
}
/** Inconsciente incluye Derribado y al terminar deja al personaje Derribado (PHB 2024). */
function preserveProneAfterUnconscious(before:ConditionLedger,after:ConditionLedger,nextId:number):
  Readonly<{ledger:ConditionLedger;nextId:number}>{
  const wasUnconscious=before.instances.some(x=>x.kind==='unconscious');
  const stillUnconscious=after.instances.some(x=>x.kind==='unconscious');
  if(!wasUnconscious||stillUnconscious||after.instances.some(x=>x.kind==='prone'))return {ledger:after,nextId};
  if(after.instances.length>=30||nextId>=MAX_ID)fail('No se puede conservar Derribado: límite de condiciones');
  return {ledger:{...after,instances:[...after.instances,{id:nextId,kind:'prone',source:'Tras terminar Inconsciente',remainingRounds:null}]},nextId:nextId+1};
}


export function initialCombatState():CombatState{return {round:1,nextId:1,attacks:[],effects:[]};}

/** Valida y clona estados cargados de PostgreSQL (no confia en el JSON recibido). */
export function validateCombatState(value:unknown):CombatState{
  if(!record(value))fail('Estado de combate inválido');
  exactKeys(value,value.conditions===undefined?['round','nextId','attacks','effects']:['round','nextId','attacks','effects','conditions'],'Combate');
  const round=bounded(value.round,1,MAX_ROUNDS,'Ronda');
  const nextId=bounded(value.nextId,1,MAX_ID,'Siguiente ID');
  if(!Array.isArray(value.attacks)||value.attacks.length>MAX_ATTACKS)fail('Historial de ataques demasiado largo');
  if(!Array.isArray(value.effects)||value.effects.length>MAX_EFFECTS)fail('Demasiados efectos activos');
  const seen=new Set<number>();let previous=0;
  const attacks:CombatAttackEntry[]=value.attacks.map((raw:unknown)=>{
    if(!record(raw))fail('Ataque registrado inválido');
    exactKeys(raw,['id','round','weaponId','naturalRoll','attackTotal','critical','hit','damageTotal','grazeDamage','damageType','ammunitionSpent'],'Ataque');
    const id=bounded(raw.id,1,nextId-1,'ID de ataque');
    if(seen.has(id)||id<=previous)fail('Historial de ataques desordenado o duplicado');
    seen.add(id);previous=id;
    const eventRound=bounded(raw.round,1,round,'Ronda de ataque');
    if(!weapon(raw.weaponId))fail('Arma registrada desconocida');
    const stats=WEAPON_STATS[raw.weaponId];
    if(raw.damageType!==stats.damageType)fail('Tipo de daño incompatible con el arma');
    const ammo=raw.ammunitionSpent;
    if(ammo!==null&&ammo!==stats.ammunition)fail('Munición incompatible con el arma');
    if(stats.ammunition&&ammo!==stats.ammunition)fail('Falta el consumo de munición');
    if(typeof raw.critical!=='boolean'||(raw.hit!==null&&typeof raw.hit!=='boolean'))fail('Resultado de impacto inválido');
    const damageTotal=optionalDamage(raw.damageTotal,'Daño registrado');
    const grazeDamage=optionalDamage(raw.grazeDamage,'Daño de Rozar');
    return {id,round:eventRound,weaponId:raw.weaponId,naturalRoll:bounded(raw.naturalRoll,1,20,'d20'),
      attackTotal:bounded(raw.attackTotal,-1000,1000,'Total de ataque'),critical:raw.critical,hit:raw.hit,
      damageTotal,grazeDamage,damageType:stats.damageType,ammunitionSpent:ammo as AmmoId|null};
  });
  const effects:TrackedEffect[]=value.effects.map((raw:unknown)=>{
    if(!record(raw))fail('Efecto registrado inválido');
    exactKeys(raw,['id','name','remainingRounds','notes'],'Efecto');
    const id=bounded(raw.id,1,nextId-1,'ID de efecto');
    if(seen.has(id))fail('ID de evento duplicado');seen.add(id);
    return {id,name:textValue(raw.name,60,'Nombre del efecto'),
      remainingRounds:raw.remainingRounds===null?null:bounded(raw.remainingRounds,1,100,'Duración'),
      notes:textValue(raw.notes,200,'Notas del efecto',true)};
  });
  const conditions=value.conditions===undefined?undefined:validateConditionLedger(value.conditions,nextId);
  if(conditions){for(const c of conditions.instances){if(seen.has(c.id))fail('ID de evento duplicado');seen.add(c.id);}}
  return {round,nextId,attacks,effects,...(conditions?{conditions}:{})};
}

/** Registrar un ataque y descontar su municion forman una sola operacion logica.
 * Devuelve la accion de inventario que se debe anadir al diario persistente, nunca la ejecuta dos veces.
 */
export function recordWeaponAttack(
  state:CombatState, inventory:InventoryState, profile:WeaponAttackProfile, resolution:AttackResolution,
):Readonly<{combat:CombatState;inventoryAction:InventoryAction|null}> {
  const combat=validateCombatState(state);
  if(combat.nextId>=MAX_ID)fail('Limite del historial de combate alcanzado');
  if(!profile||!resolution||!weapon(profile.weaponId))fail('Perfil de ataque inválido');
  const stats=WEAPON_STATS[profile.weaponId];
  if(profile.ammunition!==stats.ammunition||profile.damageType!==stats.damageType)fail('Perfil de arma incompatible');
  if(!inventory||!Array.isArray(inventory.items)||!(inventory.items.some(i=>i.id===profile.weaponId&&i.quantity>=1)))fail('El personaje no posee esta arma');
  if(typeof resolution.critical!=='boolean'||(resolution.hit!==null&&typeof resolution.hit!=='boolean'))fail('Resultado de ataque inválido');
  const damageTotal=optionalDamage(resolution.damageTotal,'Daño');
  const grazeDamage=optionalDamage(resolution.grazeDamage,'Rozar');
  const ammo=profile.ammunition??null;
  const inventoryAction:InventoryAction|null=ammo?{type:'remove',itemId:ammo as InventoryItemId,quantity:1}:null;
  // Prevalidacion atomica: si no existe municion, no se anade ningun evento.
  if(inventoryAction)applyInventoryAction(inventory,inventoryAction);
  const entry:CombatAttackEntry={id:combat.nextId,round:combat.round,weaponId:profile.weaponId,
    naturalRoll:bounded(resolution.naturalRoll,1,20,'d20'),attackTotal:bounded(resolution.attackTotal,-1000,1000,'Total de ataque'),
    critical:resolution.critical,hit:resolution.hit,damageTotal,grazeDamage,
    damageType:stats.damageType,ammunitionSpent:ammo};
  return {inventoryAction,combat:{...combat,nextId:combat.nextId+1,attacks:[...combat.attacks,entry].slice(-MAX_ATTACKS)}};
}

export function addTrackedEffect(state:CombatState,name:string,remainingRounds:number|null,notes=''):CombatState{
  const s=validateCombatState(state);
  if(s.effects.length>=MAX_EFFECTS)fail('Límite de efectos activos alcanzado');
  if(s.nextId>=MAX_ID)fail('Límite de efectos alcanzado');
  const effect:TrackedEffect={id:s.nextId,name:textValue(name,60,'Nombre del efecto'),
    remainingRounds:remainingRounds===null?null:bounded(remainingRounds,1,100,'Duración'),
    notes:textValue(notes,200,'Notas del efecto',true)};
  return {...s,nextId:s.nextId+1,effects:[...s.effects,effect]};
}
export function removeTrackedEffect(state:CombatState,id:number):CombatState{
  const s=validateCombatState(state);
  bounded(id,1,MAX_ID,'ID de efecto');
  if(!s.effects.some(e=>e.id===id))fail('Efecto desconocido');
  return {...s,effects:s.effects.filter(e=>e.id!==id)};
}
export function advanceCombatRound(state:CombatState):CombatState{
  const s=validateCombatState(state);
  if(s.round>=MAX_ROUNDS)fail('Límite de rondas alcanzado');
  const updated=s.conditions?preserveProneAfterUnconscious(s.conditions,advanceConditionRound(s.conditions),s.nextId):null;
  return {...s,nextId:updated?.nextId??s.nextId,round:s.round+1,
    effects:s.effects.flatMap(e=>e.remainingRounds===null?[e]:e.remainingRounds<=1?[]:[{...e,remainingRounds:e.remainingRounds-1}]),
    ...(updated?{conditions:updated.ledger}:{})};
}

/** Nueva condición con fuente propia. Dos fuentes del mismo tipo mantienen duraciones independientes. */
export function addCharacterCondition(state:CombatState,kind:ConditionId,source:string,remainingRounds:number|null):CombatState{
  const s=validateCombatState(state);
  const ledger=s.conditions??initialConditionLedger();
  if(s.nextId>=MAX_ID)fail('Límite de eventos alcanzado');
  if(ledger.instances.length>=30)fail('Demasiadas condiciones activas');
  const instance={id:s.nextId,kind,source,remainingRounds};
  const conditions=validateConditionLedger({...ledger,instances:[...ledger.instances,instance]},s.nextId+1);
  return {...s,nextId:s.nextId+1,conditions};
}
/** Retira solo la fuente indicada, sin cancelar las restantes. */
export function removeCharacterCondition(state:CombatState,id:number):CombatState{
  const s=validateCombatState(state);
  const ledger=s.conditions??initialConditionLedger();
  bounded(id,1,MAX_ID,'ID de condición');
  if(!ledger.instances.some(c=>c.id===id))fail('Condición desconocida');
  const next={...ledger,instances:ledger.instances.filter(c=>c.id!==id)};
  const updated=preserveProneAfterUnconscious(ledger,next,s.nextId);
  return {...s,nextId:updated.nextId,conditions:updated.ledger};
}
/** El agotamiento no es una condición binaria: registra niveles acumulados entre 0 y 6. */
export function changeExhaustion(state:CombatState,delta:number):CombatState{
  const s=validateCombatState(state);
  bounded(delta,-6,6,'Cambio de agotamiento');
  const ledger=s.conditions??initialConditionLedger();
  const exhaustion=ledger.exhaustion+delta;
  bounded(exhaustion,0,6,'Agotamiento final');
  return {...s,conditions:{...ledger,exhaustion}};
}
