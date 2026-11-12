/** Paso 16. Diario de ataques y efectos temporales anotados manualmente.
 * El registro es determinista y no simula enemigos, turnos reales, hechizos o condiciones.
 * Consume una unidad de municion del inventario al CONFIRMAR un disparo.
 */
import { WEAPON_STATS, type AttackResolution, type WeaponAttackProfile, type DamageType } from './attacks';
import { WEAPONS, type WeaponId } from './martial';
import { applyInventoryAction, type InventoryAction, type InventoryItemId, type InventoryState } from './inventory';
import {advanceConditionRound,initialConditionLedger,validateConditionLedger,type ConditionId,type ConditionLedger,type RollMode} from './conditions';
import type {IncomingDamageType,DamageMitigation,IncomingDamageBreakdown} from './incoming';
import {evaluateWeaponMastery,validateMasteryContext,validateMasteryPendingEffect,hasVexAdvantage,type MasteryContext,type MasteryPendingEffect} from './mastery-effects';
import {initialTurnTracker,validateTurnTracker,startTurnTracker,endTurnTracker,spendTurnSlot,grantActionSurgeSlot,moveOnTurn,spendAttackOnTurn,type TurnTracker,type TurnSlot,type AttackTurnUsage} from './turns';

type AmmoId = NonNullable<WeaponAttackProfile['ammunition']>;
export type CombatAttackEntry = Readonly<{
  id:number;
  round:number;
  weaponId:WeaponId;
  /** Ausentes en ataques anteriores a la actualización 24. */
  magicWeaponInstanceId?:string; magicEnhancement?:1|2|3;
  /** Contexto opcional de ataques desde la fase 25. */
  targetName?:string; masteryNote?:string;
  naturalRoll:number;
  attackTotal:number;
  critical:boolean;
  hit:boolean|null;
  damageTotal:number|null;
  grazeDamage:number|null;
  damageType:DamageType;
  ammunitionSpent:AmmoId|null;
  peerlessAimApplied?:boolean;
}>;
export type StudiedTarget = Readonly<{
  id:number; sourceAttackId:number; round:number; target:string;sourceTurn?:number;
}>;
/** Ataques estudiados solo afectan a la siguiente tirada contra la MISMA criatura. */
export function hasStudiedAdvantage(effects:readonly StudiedTarget[]|undefined,targetName:string):boolean{
  const normalized=targetName.trim().toLocaleLowerCase('es');
  return Boolean(normalized&&effects?.some(e=>e.target.toLocaleLowerCase('es')===normalized));
}
export type TrackedEffect = Readonly<{
  id:number;
  name:string;
  /** null indica duracion indefinida: debe retirarse manualmente. */
  remainingRounds:number|null;
  notes:string;
}>;
export type ReceivedAttackEntry = Readonly<{
  id:number;round:number;attacker:string;naturalRoll:number;attackTotal:number;armorClass:number;mode:RollMode;
  hit:boolean;critical:boolean;damageType:IncomingDamageType;rolledDamage:number;effectiveDamage:number;mitigation:DamageMitigation;
  /** Opcional: guardados anteriores a la fase 4.8 no tienen desglose. */
  damageParts?:readonly IncomingDamageBreakdown[];
}>;
export type CombatState = Readonly<{
  round:number;
  nextId:number;
  attacks:readonly CombatAttackEntry[];
  /** Opcional: historial de ataques recibidos (compatible con guardados antiguos). */
  receivedAttacks?:readonly ReceivedAttackEntry[];
  effects:readonly TrackedEffect[];
  /** Opcional para compatibilidad con los guardados anteriores a la actualización 17. */
  conditions?:ConditionLedger;
  /** Recordatorios manuales ligados a un objetivo, incluido Hostigar para próximos ataques. */
  masteryEffects?:readonly MasteryPendingEffect[];
  /** Opcional en guardados anteriores: el tracker empieza solo cuando se usa la pantalla. */
  turn?:TurnTracker;
  /** Guerrero 13: la siguiente tirada contra un objetivo fallado tiene ventaja. */
  studiedAttacks?:readonly StudiedTarget[];
  /** Campeón 10: recurso de Inspiración heroica, que persiste hasta gastarse. */
  heroicInspiration?:boolean;
  /** Beneficio épico Pericia en combate: un fallo se convierte en impacto hasta el inicio del próximo turno. */
  peerlessAimUsed?:boolean;
  /** Beneficio épico Fortaleza: PG adicionales curados hasta el inicio del siguiente turno. */
  fortitudeHealUsed?:boolean;
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

/** Inicia el turno propio; los efectos Sap/Slow temporizados vencen al COMENZAR. */
export function startCharacterTurn(state:CombatState,heroicWarrior=false):CombatState{
  const s=validateCombatState(state);
  const turn=startTurnTracker(s.turn??initialTurnTracker());
  const masteryEffects=s.masteryEffects?.filter(e=>!(e.sourceTurn!==undefined&&e.sourceTurn<turn.number&&
    (e.mastery==='Sap'||e.mastery==='Slow')));
  return {...s,turn,...(masteryEffects?{masteryEffects}:{}),
    peerlessAimUsed:false,fortitudeHealUsed:false,
    ...(heroicWarrior?{heroicInspiration:true}:{})};
}
/** Hostigar creado en el turno N caduca al TERMINAR el turno N+1. */
export function endCharacterTurn(state:CombatState):CombatState{
  const s=validateCombatState(state);
  const turn=endTurnTracker(s.turn??initialTurnTracker());
  const masteryEffects=s.masteryEffects?.filter(e=>!(e.sourceTurn!==undefined&&e.sourceTurn<turn.number&&e.mastery==='Vex'));
  const studiedAttacks=s.studiedAttacks?.filter(e=>!(e.sourceTurn!==undefined&&e.sourceTurn<turn.number));
  return {...s,turn,...(masteryEffects?{masteryEffects}:{}),...(studiedAttacks?{studiedAttacks}:{})};
}
/** Gasta una Inspiración heroica para volver a tirar un dado; el dado se resuelve en mesa. */
export function spendHeroicInspiration(state:CombatState):CombatState{
  const combat=validateCombatState(state);
  if(!combat.heroicInspiration)fail('No tienes Inspiración heroica disponible');
  return {...combat,heroicInspiration:false};
}
export function spendCombatSlot(state:CombatState,slot:TurnSlot):CombatState{
  const s=validateCombatState(state);
  return {...s,turn:spendTurnSlot(s.turn??initialTurnTracker(),slot)};
}
export function grantCombatActionSurge(state:CombatState):CombatState{
  const s=validateCombatState(state);
  return {...s,turn:grantActionSurgeSlot(s.turn??initialTurnTracker())};
}
/** Beneficio épico de Velocidad: Destrabarse como acción adicional elimina Agarrado.
 * El DM sigue resolviendo movimiento, enemigos y ataques de oportunidad.
 */
export function useEpicSpeedDisengage(state:CombatState):CombatState{
  const s=spendCombatSlot(state,'bonus');
  const ledger=s.conditions??initialConditionLedger();
  const withoutGrapples={...ledger,instances:ledger.instances.filter(x=>x.kind!=='grappled')};
  return {...s,conditions:validateConditionLedger(withoutGrapples,s.nextId)};
}
export function moveCombatCharacter(state:CombatState,feet:number,effectiveSpeedFeet:number):CombatState{
  const s=validateCombatState(state);
  return {...s,turn:moveOnTurn(s.turn??initialTurnTracker(),feet,effectiveSpeedFeet)};
}

/** Valida y clona estados cargados de PostgreSQL (no confia en el JSON recibido). */
export function validateCombatState(value:unknown):CombatState{
  if(!record(value))fail('Estado de combate inválido');
  exactKeys(value,['round','nextId','attacks','effects',...(value.conditions===undefined?[]:['conditions']),...(value.receivedAttacks===undefined?[]:['receivedAttacks']),...(value.masteryEffects===undefined?[]:['masteryEffects']),...(value.studiedAttacks===undefined?[]:['studiedAttacks']),...(value.turn===undefined?[]:['turn']),...(value.heroicInspiration===undefined?[]:['heroicInspiration']),...(value.peerlessAimUsed===undefined?[]:['peerlessAimUsed']),...(value.fortitudeHealUsed===undefined?[]:['fortitudeHealUsed'])],'Combate');
  const round=bounded(value.round,1,MAX_ROUNDS,'Ronda');
  const nextId=bounded(value.nextId,1,MAX_ID,'Siguiente ID');
  if(!Array.isArray(value.attacks)||value.attacks.length>MAX_ATTACKS)fail('Historial de ataques demasiado largo');
  if(!Array.isArray(value.effects)||value.effects.length>MAX_EFFECTS)fail('Demasiados efectos activos');
  const seen=new Set<number>();let previous=0;
  const attacks:CombatAttackEntry[]=value.attacks.map((raw:unknown)=>{
    if(!record(raw))fail('Ataque registrado inválido');
    exactKeys(raw,['id','round','weaponId','naturalRoll','attackTotal','critical','hit','damageTotal','grazeDamage','damageType','ammunitionSpent',
      ...(raw.magicWeaponInstanceId===undefined?[]:['magicWeaponInstanceId']),
      ...(raw.magicEnhancement===undefined?[]:['magicEnhancement']),...(raw.targetName===undefined?[]:['targetName']),...(raw.masteryNote===undefined?[]:['masteryNote']),...(raw.peerlessAimApplied===undefined?[]:['peerlessAimApplied'])],'Ataque');
    if(raw.peerlessAimApplied!==undefined&&(typeof raw.peerlessAimApplied!=='boolean'||(raw.peerlessAimApplied&&raw.hit!==true)))fail('Pericia en combate del historial inválida');
    const id=bounded(raw.id,1,nextId-1,'ID de ataque');
    if(seen.has(id)||id<=previous)fail('Historial de ataques desordenado o duplicado');
    seen.add(id);previous=id;
    const eventRound=bounded(raw.round,1,round,'Ronda de ataque');
    if(!weapon(raw.weaponId))fail('Arma registrada desconocida');
    const stats=WEAPON_STATS[raw.weaponId];
    if(raw.damageType!==stats.damageType)fail('Tipo de daño incompatible con el arma');
    if((raw.magicWeaponInstanceId===undefined)!==(raw.magicEnhancement===undefined))fail('Identidad del arma mágica incompleta');
    if(raw.magicWeaponInstanceId!==undefined && (typeof raw.magicWeaponInstanceId!=='string'||!/^ward-[1-9]\d{0,4}$/.test(raw.magicWeaponInstanceId)||![1,2,3].includes(raw.magicEnhancement as number)))fail('Arma mágica registrada inválida');
    const ammo=raw.ammunitionSpent;
    if(ammo!==null&&ammo!==stats.ammunition)fail('Munición incompatible con el arma');
    if(stats.ammunition&&ammo!==stats.ammunition)fail('Falta el consumo de munición');
    if(typeof raw.critical!=='boolean'||(raw.hit!==null&&typeof raw.hit!=='boolean'))fail('Resultado de impacto inválido');
    if(raw.targetName!==undefined&&(typeof raw.targetName!=='string'||!raw.targetName.trim()||raw.targetName!==raw.targetName.trim()||raw.targetName.length>60||/[\x00-\x1f]/.test(raw.targetName)))fail('Objetivo registrado inválido');
    if(raw.masteryNote!==undefined&&(typeof raw.masteryNote!=='string'||!raw.masteryNote.trim()||raw.masteryNote.length>600||/[\x00-\x1f]/.test(raw.masteryNote)))fail('Nota de maestría inválida');
    const damageTotal=optionalDamage(raw.damageTotal,'Daño registrado');
    const grazeDamage=optionalDamage(raw.grazeDamage,'Daño de Rozar');
    return {id,round:eventRound,weaponId:raw.weaponId,naturalRoll:bounded(raw.naturalRoll,1,20,'d20'),
      attackTotal:bounded(raw.attackTotal,-1000,1000,'Total de ataque'),critical:raw.critical,hit:raw.hit,
      damageTotal,grazeDamage,damageType:stats.damageType,ammunitionSpent:ammo as AmmoId|null,
      ...(raw.magicWeaponInstanceId===undefined?{}:{magicWeaponInstanceId:raw.magicWeaponInstanceId as string,magicEnhancement:raw.magicEnhancement as 1|2|3}),
      ...(raw.targetName===undefined?{}:{targetName:raw.targetName as string}),
      ...(raw.masteryNote===undefined?{}:{masteryNote:raw.masteryNote as string}),
      ...(raw.peerlessAimApplied===undefined?{}:{peerlessAimApplied:raw.peerlessAimApplied as boolean})};
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
  let receivedAttacks:ReceivedAttackEntry[]|undefined;
  if(value.receivedAttacks!==undefined){
    if(!Array.isArray(value.receivedAttacks)||value.receivedAttacks.length>MAX_ATTACKS)fail('Historial de ataques recibidos inválido');
    receivedAttacks=value.receivedAttacks.map((raw:unknown)=>{
      if(!record(raw))fail('Ataque recibido inválido');
      exactKeys(raw,['id','round','attacker','naturalRoll','attackTotal','armorClass','mode','hit','critical','damageType','rolledDamage','effectiveDamage','mitigation',...(raw.damageParts===undefined?[]:['damageParts'])],'Ataque recibido');
      const id=bounded(raw.id,1,nextId-1,'ID de ataque recibido');
      if(seen.has(id))fail('ID de evento duplicado');seen.add(id);
      const eventRound=bounded(raw.round,1,round,'Ronda de ataque recibido');
      if(!['normal','advantage','disadvantage'].includes(raw.mode as string)||typeof raw.hit!=='boolean'||typeof raw.critical!=='boolean'||(raw.critical&&!raw.hit))fail('Resultado de ataque recibido inválido');
      if(!['acid','bludgeoning','cold','fire','force','lightning','necrotic','piercing','poison','psychic','radiant','slashing','thunder'].includes(raw.damageType as string))fail('Tipo de daño recibido inválido');
      if(!['normal','resistance','vulnerability','both','immunity'].includes(raw.mitigation as string))fail('Mitigación inválida');
      if(raw.attacker===undefined||typeof raw.attacker!=='string'||!raw.attacker.trim()||raw.attacker.length>80||/[\u0000-\u001f]/.test(raw.attacker))fail('Atacante inválido');
      const effectiveDamage=bounded(raw.effectiveDamage,0,100_000,'Daño efectivo');
      if(!raw.hit&&effectiveDamage!==0)fail('Un ataque fallido no causa daño de impacto');
      let damageParts:IncomingDamageBreakdown[]|undefined;
      if(raw.damageParts!==undefined){
        if(!Array.isArray(raw.damageParts)||raw.damageParts.length<1||raw.damageParts.length>4)fail('Desglose de daño inválido');
        damageParts=raw.damageParts.map((part:unknown)=>{
          if(!record(part))fail('Componente de daño inválido');
          exactKeys(part,['damageType','rolledDamage','adjustedDamage','effectiveDamage','mitigation','sources'],'Componente de daño');
          if(!['acid','bludgeoning','cold','fire','force','lightning','necrotic','piercing','poison','psychic','radiant','slashing','thunder'].includes(part.damageType as string))fail('Tipo de daño del componente inválido');
          if(!['normal','resistance','vulnerability','both','immunity'].includes(part.mitigation as string))fail('Mitigación del componente inválida');
          if(!Array.isArray(part.sources)||part.sources.length>40||part.sources.some((x:unknown)=>typeof x!=='string'||!x.trim()||x.length>100))fail('Fuentes del componente inválidas');
          const effective=bounded(part.effectiveDamage,0,100_000,'Daño del componente');
          if(!raw.hit&&effective>0)fail('El fallo no puede aplicar daño de un componente');
          return {damageType:part.damageType as IncomingDamageType,rolledDamage:bounded(part.rolledDamage,0,50_000,'Daño tirado'),
            adjustedDamage:bounded(part.adjustedDamage,0,50_000,'Daño ajustado'),effectiveDamage:effective,
            mitigation:part.mitigation as DamageMitigation,sources:[...(part.sources as string[])]};
        });
        if(damageParts.reduce((total,p)=>total+p.effectiveDamage,0)!==effectiveDamage)fail('El desglose de daño no coincide con el total');
        if(damageParts[0].damageType!==raw.damageType||damageParts[0].mitigation!==raw.mitigation||damageParts[0].rolledDamage!==raw.rolledDamage)
          fail('El componente primario no coincide con el historial');
      }
      return {id,round:eventRound,attacker:raw.attacker.trim(),naturalRoll:bounded(raw.naturalRoll,1,20,'d20 recibido'),
        attackTotal:bounded(raw.attackTotal,-200,200,'Total recibido'),armorClass:bounded(raw.armorClass,0,100,'CA recibida'),
        mode:raw.mode as RollMode,hit:raw.hit,critical:raw.critical,damageType:raw.damageType as IncomingDamageType,
        rolledDamage:bounded(raw.rolledDamage,0,50_000,'Daño de la tirada'),effectiveDamage,
        mitigation:raw.mitigation as DamageMitigation,...(damageParts?{damageParts}:{})};
    });
  }
  let masteryEffects:MasteryPendingEffect[]|undefined;
  if(value.masteryEffects!==undefined){
    if(!Array.isArray(value.masteryEffects)||value.masteryEffects.length>30)fail('Demasiados efectos de maestría');
    masteryEffects=value.masteryEffects.map((raw:unknown)=>{
      const e=validateMasteryPendingEffect(raw);
      if(e.id>=nextId||e.round>round||seen.has(e.id))fail('ID de maestría inválido o duplicado');
      seen.add(e.id);
      return e;
    });
  }
  let studiedAttacks:StudiedTarget[]|undefined;
  if(value.studiedAttacks!==undefined){
    if(!Array.isArray(value.studiedAttacks)||value.studiedAttacks.length>30)fail('Demasiados Ataques estudiados pendientes');
    studiedAttacks=value.studiedAttacks.map((raw:unknown)=>{
      if(!record(raw))fail('Ataque estudiado inválido');
      exactKeys(raw,['id','sourceAttackId','round','target',...(raw.sourceTurn===undefined?[]:['sourceTurn'])],'Ataque estudiado');
      const id=bounded(raw.id,1,nextId-1,'ID estudiado');
      const sourceAttackId=bounded(raw.sourceAttackId,1,id-1,'ID de origen estudiado');
      const source=attacks.find(a=>a.id===sourceAttackId);
      if(source&&(source.hit!==false||source.targetName?.toLocaleLowerCase('es')!==String(raw.target).toLocaleLowerCase('es')))
        fail('Ataques estudiados: origen inválido o no corresponde a un fallo');
      if(!source&&attacks.length>0&&sourceAttackId>=attacks[0].id)fail('Falta el ataque que originó el estudio');
      if(seen.has(id))fail('ID de ataque estudiado duplicado');seen.add(id);
      const effectRound=bounded(raw.round,1,round,'Ronda estudiada');
      const target=textValue(raw.target,60,'Objetivo estudiado');
      const sourceTurn=raw.sourceTurn===undefined?undefined:bounded(raw.sourceTurn,1,MAX_ROUNDS,'Turno estudiado');
      return {id,sourceAttackId,round:effectRound,target,...(sourceTurn===undefined?{}:{sourceTurn})};
    });
    if(new Set(studiedAttacks.map(x=>x.target.toLocaleLowerCase('es'))).size!==studiedAttacks.length)fail('Ataque estudiado duplicado para un objetivo');
  }
  const turn=value.turn===undefined?undefined:validateTurnTracker(value.turn);
  if(value.heroicInspiration!==undefined&&typeof value.heroicInspiration!=='boolean')fail('Inspiración heroica inválida');
  if(value.peerlessAimUsed!==undefined&&typeof value.peerlessAimUsed!=='boolean')fail('Uso de Pericia en combate inválido');
  if(value.fortitudeHealUsed!==undefined&&typeof value.fortitudeHealUsed!=='boolean')fail('Uso de Fortaleza inválido');
  if(turn&&masteryEffects?.some(e=>e.sourceTurn!==undefined&&e.sourceTurn>turn.number))fail('El origen de la maestría es posterior al turno actual');
  if(studiedAttacks?.some(e=>e.sourceTurn!==undefined&&(!turn||e.sourceTurn>turn.number)))fail('Turno de Ataques estudiados incoherente');
  return {round,nextId,attacks,effects,...(conditions?{conditions}:{}),...(receivedAttacks?{receivedAttacks}:{}),...(masteryEffects?{masteryEffects}:{}),...(studiedAttacks?{studiedAttacks}:{}),...(turn?{turn}:{}),...(value.heroicInspiration===undefined?{}:{heroicInspiration:value.heroicInspiration as boolean}),
    ...(value.peerlessAimUsed===undefined?{}:{peerlessAimUsed:value.peerlessAimUsed as boolean}),
    ...(value.fortitudeHealUsed===undefined?{}:{fortitudeHealUsed:value.fortitudeHealUsed as boolean})};
}

/** Registrar un ataque y descontar su municion forman una sola operacion logica.
 * Devuelve la accion de inventario que se debe anadir al diario persistente, nunca la ejecuta dos veces.
 */
export function recordWeaponAttack(
  state:CombatState, inventory:InventoryState, profile:WeaponAttackProfile, resolution:AttackResolution, context?:MasteryContext, usage:AttackTurnUsage='untracked',fighterLevel=3,usePeerlessAim=false,hasPeerlessBoon=false,
):Readonly<{combat:CombatState;inventoryAction:InventoryAction|null}> {
  const combat=validateCombatState(state);
  if(usePeerlessAim&&(fighterLevel<19||!hasPeerlessBoon||combat.peerlessAimUsed||resolution.hit!==false))
    fail('Pericia en combate requiere nivel 19, un fallo contra criatura y un uso disponible');
  const finalResolution=usePeerlessAim?{...resolution,hit:true,grazeDamage:null}:resolution;
  const validatedContext=context===undefined?undefined:validateMasteryContext(context);
  const mastery=validatedContext?evaluateWeaponMastery(profile,finalResolution,validatedContext):null;
  if(combat.nextId>=MAX_ID)fail('Limite del historial de combate alcanzado');
  if(usage!=='untracked'&&!combat.turn)fail('Inicia el seguimiento de turnos para utilizar acciones de combate');
  const nextTurn=combat.turn?spendAttackOnTurn(combat.turn,usage,{
    lightExtra:profile.lightExtraAttack,nickMastery:profile.mastery==='Nick',cleaveMastery:profile.mastery==='Cleave',
    hitCreature:finalResolution.hit===true&&validatedContext?.targetIsCreature===true,
    weaponId:profile.weaponId,targetName:validatedContext?.targetName??'',attackLimit:fighterLevel>=20?4:fighterLevel>=11?3:fighterLevel>=5?2:1,
  }):undefined;
  if(!profile||!resolution||!weapon(profile.weaponId))fail('Perfil de ataque inválido');
  const stats=WEAPON_STATS[profile.weaponId];
  if(profile.ammunition!==stats.ammunition||profile.damageType!==stats.damageType)fail('Perfil de arma incompatible');
  if(!inventory||!Array.isArray(inventory.items))fail('El inventario es obligatorio');
  const magic=profile.magicWeaponInstanceId;
  if(magic!==undefined){
    const found=inventory.magicItems?.find(x=>x.instanceId===magic);
    if(!found||found.itemId!=='weapon_enhancement'||!found.worn||found.weaponId!==profile.weaponId||found.enhancement!==profile.magicEnhancement)
      fail('El arma mágica ya no está disponible o su instancia no coincide');
  }else if(profile.magicEnhancement!==undefined)fail('Bonificador mágico sin arma identificada');
  else if(!inventory.items.some(i=>i.id===profile.weaponId&&i.quantity>=1))fail('El personaje no posee esta arma');
  if(typeof finalResolution.critical!=='boolean'||(finalResolution.hit!==null&&typeof finalResolution.hit!=='boolean'))fail('Resultado de ataque inválido');
  const originalDamage=optionalDamage(finalResolution.damageTotal,'Daño');
  // Tajo: se omite el modificador POSITIVO de característica en el ataque adicional;
  // las mejoras mágicas de arma no se pierden. El resultado de los dados sigue intacto.
  const damageTotal=usage==='cleave_extra'&&originalDamage!==null
    ?Math.max(0,originalDamage-Math.max(0,profile.abilityModifier)):originalDamage;
  const grazeDamage=optionalDamage(finalResolution.grazeDamage,'Rozar');
  const ammo=profile.ammunition??null;
  const inventoryAction:InventoryAction|null=ammo?{type:'remove',itemId:ammo as InventoryItemId,quantity:1}:null;
  // Prevalidacion atomica: si no existe municion, no se anade ningun evento.
  if(inventoryAction)applyInventoryAction(inventory,inventoryAction);
  const entry:CombatAttackEntry={id:combat.nextId,round:combat.round,weaponId:profile.weaponId,
    naturalRoll:bounded(finalResolution.naturalRoll,1,20,'d20'),attackTotal:bounded(finalResolution.attackTotal,-1000,1000,'Total de ataque'),
    critical:finalResolution.critical,hit:finalResolution.hit,damageTotal,grazeDamage,
    damageType:stats.damageType,ammunitionSpent:ammo,
    ...(magic===undefined?{}:{magicWeaponInstanceId:magic,magicEnhancement:profile.magicEnhancement}),
    ...(validatedContext?.targetName?{targetName:validatedContext.targetName}:{}),
    ...(mastery?.mastery?{masteryNote:mastery.message}:{}),...(usePeerlessAim?{peerlessAimApplied:true}:{})};
  // Una ventaja previa de Hostigar se consume en el siguiente ataque contra ESA criatura,
  // incluso si el impacto falla. No consume ventajas asociadas a otros objetivos.
  const remaining=(combat.masteryEffects??[]).filter(e=>!(validatedContext?.targetName&&validatedContext.targetIsCreature&&e.mastery==='Vex'&&
    hasVexAdvantage([e],validatedContext.targetName)));
  const pending=mastery?.pending;
  // Debilitar y Ralentizar no acumulan el mismo estado sobre una criatura.
  const unique=pending&&(pending.mastery==='Sap'||pending.mastery==='Slow')
    ?remaining.filter(e=>!(e.mastery===pending.mastery&&e.target.toLocaleLowerCase('es')===pending.target.toLocaleLowerCase('es')))
    :remaining;
  if(pending&&unique.length>=30)fail('Demasiados efectos de maestría pendientes');
  const studiedCandidate=fighterLevel>=13&&validatedContext?.targetIsCreature===true&&Boolean(validatedContext.targetName)&&finalResolution.hit===false;
  const studiedRemaining=(combat.studiedAttacks??[]).filter(e=>!(validatedContext?.targetIsCreature&&validatedContext.targetName&&hasStudiedAdvantage([e],validatedContext.targetName)));
  if(studiedCandidate&&studiedRemaining.length>=30)fail('Demasiados Ataques estudiados pendientes');
  const extraEvents=(pending?1:0)+(studiedCandidate?1:0);
  if(combat.nextId+extraEvents>=MAX_ID)fail('Limite del historial de combate alcanzado');
  const newEffects=pending?[...unique,{id:combat.nextId+1,sourceAttackId:combat.nextId,round:combat.round,...pending,
    ...(combat.turn&&combat.turn.number>0?{sourceTurn:combat.turn.number}:{})}]:unique;
  const newStudied=studiedCandidate?[...studiedRemaining,{id:combat.nextId+1+(pending?1:0),sourceAttackId:combat.nextId,round:combat.round,
    target:validatedContext!.targetName,...(combat.turn&&combat.turn.number>0?{sourceTurn:combat.turn.number}:{})}]:studiedRemaining;
  return {inventoryAction,combat:{...combat,nextId:combat.nextId+1+extraEvents,attacks:[...combat.attacks,entry].slice(-MAX_ATTACKS),
    ...(validatedContext?{masteryEffects:newEffects}:{}),
    ...(validatedContext&&fighterLevel>=13?{studiedAttacks:newStudied}:{}),...(nextTurn?{turn:nextTurn}:{}),...(usePeerlessAim?{peerlessAimUsed:true}:{})}};
}

/** Cancelación manual de Ataques estudiados (p. ej., el DM indica que expiró). */
export function clearStudiedAttack(state:CombatState,id:number):CombatState{
  const s=validateCombatState(state);
  bounded(id,1,MAX_ID,'ID de Ataques estudiados');
  if(!s.studiedAttacks?.some(x=>x.id===id))fail('Ataque estudiado pendiente desconocido');
  return {...s,studiedAttacks:s.studiedAttacks.filter(x=>x.id!==id)};
}
/** Retirada manual: el contador de rondas no identifica el inicio de cada turno. */
export function clearMasteryEffect(state:CombatState,id:number):CombatState{
  const s=validateCombatState(state);
  bounded(id,1,MAX_ID,'ID de maestría');
  if(!s.masteryEffects?.some(e=>e.id===id))fail('Maestría pendiente desconocida');
  return {...s,masteryEffects:s.masteryEffects.filter(e=>e.id!==id)};
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
  if(s.turn?.active)fail('Termina tu turno antes de avanzar la ronda');
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

/** Registra un ataque enemigo ya resuelto. Usa el contador común de eventos para evitar IDs duplicados. */
export function appendReceivedAttack(state:CombatState,entry:Omit<ReceivedAttackEntry,'id'|'round'>):CombatState{
  const s=validateCombatState(state);
  if(s.nextId>=MAX_ID)fail('Límite de historial de combate alcanzado');
  const event:ReceivedAttackEntry={...entry,id:s.nextId,round:s.round};
  return validateCombatState({...s,nextId:s.nextId+1,receivedAttacks:[...(s.receivedAttacks??[]),event].slice(-MAX_ATTACKS)});
}
