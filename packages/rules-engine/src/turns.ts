/** Paso 26 · Economía de acciones de un solo personaje (PHB 2024, cap. 1).
 * No sustituye iniciativa ni controla los turnos de otras criaturas.
 */
export type TurnTracker=Readonly<{
  number:number;
  active:boolean;
  actionLimit:1|2;
  actionsUsed:number;
  bonusUsed:boolean;
  reactionUsed:boolean;
  movementUsedFeet:number;
  dashes:number;
  attackActionUsed:boolean;
  lightExtraUsed:boolean;
  cleaveExtraUsed:boolean;
  /** El golpe anterior con Tajo permite intentar el golpe adicional, si el DM confirma la geometría. */
  cleaveReadyWeapon:string|null;
  cleaveFirstTarget:string|null;
}>;
export type TurnSlot='action'|'bonus'|'reaction'|'dash';
export type AttackTurnUsage='attack_action'|'light_bonus'|'light_nick'|'cleave_extra'|'reaction'|'untracked';
const MAX_TURNS=100_000;
const MAX_MOVE=1_000;
function fail(message:string):never{throw new RangeError(message);}
function safeInt(value:unknown,min:number,max:number,label:string):number{
  if(typeof value!=='number'||!Number.isSafeInteger(value)||value<min||value>max)fail(`${label}: valor inválido`);
  return value as number;
}
export function initialTurnTracker():TurnTracker{return {
  number:0,active:false,actionLimit:1,actionsUsed:0,bonusUsed:false,reactionUsed:false,movementUsedFeet:0,
  dashes:0,attackActionUsed:false,lightExtraUsed:false,cleaveExtraUsed:false,cleaveReadyWeapon:null,cleaveFirstTarget:null,
};}
export function validateTurnTracker(raw:unknown):TurnTracker{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))fail('Estado de turno inválido');
  const o=raw as Record<string,unknown>;
  const keys=Object.keys(initialTurnTracker());
  if(Object.keys(o).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(o,k)))fail('Campos de turno inválidos');
  const number=safeInt(o.number,0,MAX_TURNS,'Número de turno');
  const actionLimit=safeInt(o.actionLimit,1,2,'Límite de acciones') as 1|2;
  const actionsUsed=safeInt(o.actionsUsed,0,actionLimit,'Acciones gastadas');
  const movementUsedFeet=safeInt(o.movementUsedFeet,0,MAX_MOVE,'Movimiento gastado');
  const dashes=safeInt(o.dashes,0,actionLimit,'Acciones Correr');
  for(const k of ['active','bonusUsed','reactionUsed','attackActionUsed','lightExtraUsed','cleaveExtraUsed'])
    if(typeof o[k]!=='boolean')fail(`Bandera ${k} inválida`);
  const active=o.active as boolean;
  if(number===0&&(active||actionsUsed||o.bonusUsed||o.reactionUsed||movementUsedFeet||dashes||o.attackActionUsed||o.lightExtraUsed||o.cleaveExtraUsed||actionLimit!==1))fail('No se puede utilizar un turno que no ha comenzado');
  if(dashes>actionsUsed)fail('Correr requiere una acción gastada');
  if(o.attackActionUsed&&actionsUsed===0)fail('Falta acción Atacar');
  if(o.lightExtraUsed&&!o.attackActionUsed)fail('El ataque Ligera requiere la acción Atacar');
  if(o.cleaveExtraUsed&&!o.attackActionUsed)fail('Tajo requiere la acción Atacar');
  if(o.cleaveReadyWeapon!==null&&(typeof o.cleaveReadyWeapon!=='string'||!o.cleaveReadyWeapon.trim()||o.cleaveReadyWeapon.length>60))fail('Arma preparada para Tajo inválida');
  if(o.cleaveFirstTarget!==null&&(typeof o.cleaveFirstTarget!=='string'||!o.cleaveFirstTarget.trim()||o.cleaveFirstTarget.length>60))fail('Primer objetivo de Tajo inválido');
  if((o.cleaveReadyWeapon===null)!==(o.cleaveFirstTarget===null))fail('Preparación de Tajo incompleta');
  if(o.cleaveExtraUsed&&o.cleaveReadyWeapon!==null)fail('Tajo ya utilizado');
  if(o.cleaveReadyWeapon!==null&&!o.attackActionUsed)fail('Tajo requiere impacto con la acción Atacar');
  return {number,active,actionLimit,actionsUsed,bonusUsed:o.bonusUsed as boolean,reactionUsed:o.reactionUsed as boolean,
    movementUsedFeet,dashes,attackActionUsed:o.attackActionUsed as boolean,lightExtraUsed:o.lightExtraUsed as boolean,
    cleaveExtraUsed:o.cleaveExtraUsed as boolean,cleaveReadyWeapon:o.cleaveReadyWeapon as string|null,
    cleaveFirstTarget:o.cleaveFirstTarget as string|null};
}
export function startTurnTracker(raw:TurnTracker):TurnTracker{
  const t=validateTurnTracker(raw);
  if(t.active)fail('Termina tu turno actual antes de iniciar otro');
  if(t.number===MAX_TURNS)fail('Se ha alcanzado el límite de turnos');
  return {...initialTurnTracker(),number:t.number+1,active:true};
}
export function endTurnTracker(raw:TurnTracker):TurnTracker{
  const t=validateTurnTracker(raw);
  if(!t.active)fail('No hay ningún turno activo');
  return {...t,active:false};
}
export function spendTurnSlot(raw:TurnTracker,kind:TurnSlot):TurnTracker{
  const t=validateTurnTracker(raw);
  if(kind==='reaction'){
    if(t.number===0||t.reactionUsed)fail('No hay una reacción disponible');
    return {...t,reactionUsed:true};
  }
  if(!t.active)fail('Primero inicia tu turno');
  if(kind==='bonus'){
    if(t.bonusUsed)fail('Ya se ha gastado la acción adicional');
    return {...t,bonusUsed:true};
  }
  if(kind!=='action'&&kind!=='dash')fail('Tipo de acción desconocido');
  if(t.actionsUsed>=t.actionLimit)fail('No quedan acciones disponibles');
  return {...t,actionsUsed:t.actionsUsed+1,...(kind==='dash'?{dashes:t.dashes+1}:{})};
}
export function grantActionSurgeSlot(raw:TurnTracker):TurnTracker{
  const t=validateTurnTracker(raw);
  if(!t.active||t.actionLimit!==1)fail('Acción súbita: debes estar en tu turno y no haberla aplicado ya');
  return {...t,actionLimit:2};
}
/** La velocidad ya debe tener aplicadas las condiciones. Correr añade esa velocidad otra vez. */
export function moveOnTurn(raw:TurnTracker,feet:number,adjustedSpeedFeet:number):TurnTracker{
  const t=validateTurnTracker(raw);
  if(!t.active)fail('Primero inicia tu turno');
  safeInt(feet,1,MAX_MOVE,'Movimiento');
  safeInt(adjustedSpeedFeet,0,MAX_MOVE,'Velocidad efectiva');
  const max=adjustedSpeedFeet*(1+t.dashes);
  if(t.movementUsedFeet+feet>max||t.movementUsedFeet+feet>MAX_MOVE)fail('No queda suficiente movimiento: comprueba velocidad, terreno y Correr');
  return {...t,movementUsedFeet:t.movementUsedFeet+feet};
}
/** Registro declarado de un ataque: se comprueban espacios, no se inventan enemigos. */
export function spendAttackOnTurn(raw:TurnTracker,kind:AttackTurnUsage,details:Readonly<{
  lightExtra:boolean;nickMastery:boolean;cleaveMastery:boolean;hitCreature:boolean;
  weaponId:string;targetName:string;
}>):TurnTracker{
  const t=validateTurnTracker(raw);
  if(kind==='untracked')return t;
  if(kind==='reaction')return spendTurnSlot(t,'reaction');
  if(!t.active)fail('Primero inicia tu turno para registrar este tipo de ataque');
  if(kind==='attack_action'){
    const next=spendTurnSlot(t,'action');
    return {...next,attackActionUsed:true,
      ...(details.cleaveMastery&&details.hitCreature&&details.targetName.trim()&&!t.cleaveExtraUsed
        ?{cleaveReadyWeapon:details.weaponId,cleaveFirstTarget:details.targetName.trim()}:{}),
    };
  }
  if(!t.attackActionUsed)fail('Primero realiza una acción Atacar en este turno');
  if(kind==='light_bonus'||kind==='light_nick'){
    if(!details.lightExtra)fail('El ataque adicional requiere la propiedad Ligera');
    if(t.lightExtraUsed)fail('El ataque adicional de Ligera ya se utilizó este turno');
    if(kind==='light_nick'&&!details.nickMastery)fail('Mella requiere la maestría Nick elegida');
    const updated=kind==='light_bonus'?spendTurnSlot(t,'bonus'):t;
    return {...updated,lightExtraUsed:true};
  }
  if(kind==='cleave_extra'){
    if(!details.cleaveMastery||t.cleaveExtraUsed||t.cleaveReadyWeapon!==details.weaponId||!t.cleaveFirstTarget)
      fail('No hay un ataque adicional de Tajo disponible con esta arma');
    if(!details.targetName.trim()||details.targetName.trim().toLocaleLowerCase('es')===t.cleaveFirstTarget.toLocaleLowerCase('es'))
      fail('Tajo requiere una segunda criatura distinta');
    return {...t,cleaveExtraUsed:true,cleaveReadyWeapon:null,cleaveFirstTarget:null};
  }
  return fail('Modalidad de ataque desconocida');
}
