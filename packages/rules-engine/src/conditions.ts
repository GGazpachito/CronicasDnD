/** Paso 17: condiciones del Apéndice C, PHB 2024 (reglas del personaje).
 * Datos declarativos y evaluación pura, sin ejecutar scripts de terceros.
 * No simula la percepción, posiciones ni criaturas ajenas: el contexto lo indica la mesa.
 */
import type {Ability} from './abilities';

export const CONDITION_NAMES = {
  blinded:'Cegado', charmed:'Hechizado', deafened:'Ensordecido',
  frightened:'Asustado', grappled:'Agarrado', incapacitated:'Incapacitado',
  invisible:'Invisible', paralyzed:'Paralizado', petrified:'Petrificado',
  poisoned:'Envenenado', prone:'Derribado', restrained:'Apresado',
  stunned:'Aturdido', unconscious:'Inconsciente',
} as const;
export type ConditionId=keyof typeof CONDITION_NAMES;
export type ConditionInstance=Readonly<{
  id:number;
  kind:ConditionId;
  source:string;
  /** Duración manual: cada vez que se avance una ronda disminuye en uno. */
  remainingRounds:number|null;
}>;
export type ConditionLedger=Readonly<{
  instances:readonly ConditionInstance[];
  /** Agotamiento PHB 2024: niveles 0..6; 6 equivale a muerte (sin automatización de muerte). */
  exhaustion:number;
}>;
export type RollMode='normal'|'advantage'|'disadvantage';
export type ConditionRollQuery=Readonly<{
  kind:'attack'|'incoming_attack'|'ability_check'|'saving_throw'|'initiative';
  ability?:Ability;
  /** Solo para pruebas de característica que dependan del sentido indicado. */
  sense?:'sight'|'hearing'|'none';
  /** Frente a Asustado: ¿está la fuente de miedo en la línea de visión? */
  fearSourceVisible?:boolean;
  /** Frente a Agarrado: ¿se ataca a la criatura que agarra? */
  targetIsGrappler?:boolean;
  /** Frente a Hechizado: ¿es el objetivo la criatura que hechizó al personaje? */
  targetIsCharmer?:boolean;
  /** Invisible: ¿puede el otro combatiente ver a nuestro personaje? */
  otherCreatureCanSeeInvisible?:boolean;
  /** Ataques recibidos: distancia de la criatura que ataca en pies. */
  attackerDistanceFeet?:number;
}>;
export type ConditionRollResult=Readonly<{
  mode:RollMode;
  d20Penalty:number;
  automaticFailure:boolean;
  actionForbidden:boolean;
  automaticCriticalIfHit:boolean;
  advantages:readonly string[];
  disadvantages:readonly string[];
  notes:readonly string[];
}>;
export type ConditionCapabilities=Readonly<{
  canTakeAction:boolean;
  canTakeBonusAction:boolean;
  canReact:boolean;
  canSpeak:boolean;
  canConcentrate:boolean;
  speedZero:boolean;
  speedPenaltyFeet:number;
  canApproachFearSource:boolean;
  deadByExhaustion:boolean;
}>;
const allKinds=Object.keys(CONDITION_NAMES) as ConditionId[];
const maxInstances=30;
function fail(message:string):never{throw new RangeError(message);}
function integer(value:unknown,min:number,max:number,label:string):number{
  if(typeof value!=='number'||!Number.isSafeInteger(value)||value<min||value>max)fail(`${label}: valor inválido`);
  return value as number;
}
function object(v:unknown):v is Record<string,unknown>{return v!==null&&typeof v==='object'&&!Array.isArray(v);}
function exactKeys(v:Record<string,unknown>,keys:readonly string[],label:string):void{
  if(Object.keys(v).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(v,k)))fail(`${label}: campos inválidos`);
}
export function initialConditionLedger():ConditionLedger{return {instances:[],exhaustion:0};}
export function validateConditionLedger(value:unknown,nextId?:number):ConditionLedger{
  if(!object(value))fail('Condiciones inválidas');
  exactKeys(value,['instances','exhaustion'],'Condiciones');
  if(!Array.isArray(value.instances)||value.instances.length>maxInstances)fail('Demasiadas condiciones');
  const exhaustion=integer(value.exhaustion,0,6,'Agotamiento');
  const seen=new Set<number>();
  const instances:ConditionInstance[]=value.instances.map((v:unknown)=>{
    if(!object(v))fail('Entrada de condición inválida');
    exactKeys(v,['id','kind','source','remainingRounds'],'Entrada de condición');
    const id=integer(v.id,1,nextId===undefined?1_000_000:nextId-1,'ID de condición');
    if(seen.has(id))fail('Condición duplicada por ID');seen.add(id);
    if(typeof v.kind!=='string'||!allKinds.includes(v.kind as ConditionId))fail('Condición desconocida');
    if(typeof v.source!=='string'||!v.source.trim()||v.source.length>100||/[\u0000-\u001f]/.test(v.source))fail('Origen de condición inválido');
    return {id,kind:v.kind as ConditionId,source:v.source.trim(),
      remainingRounds:v.remainingRounds===null?null:integer(v.remainingRounds,1,100,'Duración de condición')};
  });
  return {instances,exhaustion};
}
export function conditionKinds(ledger:ConditionLedger):ReadonlySet<ConditionId>{
  const kinds=new Set(validateConditionLedger(ledger).instances.map(i=>i.kind));
  // Las condiciones compuestas conceden otras condiciones expresamente.
  if(kinds.has('unconscious'))kinds.add('prone');
  if(['paralyzed','petrified','stunned','unconscious'].some(k=>kinds.has(k as ConditionId)))kinds.add('incapacitated');
  return kinds;
}
export function conditionCapabilities(ledger:ConditionLedger):ConditionCapabilities{
  const s=validateConditionLedger(ledger),k=conditionKinds(s);
  const inactive=k.has('incapacitated')||k.has('paralyzed')||k.has('petrified')||k.has('stunned')||k.has('unconscious')||s.exhaustion===6;
  return {canTakeAction:!inactive,canTakeBonusAction:!inactive,canReact:!inactive,canSpeak:!inactive,
    canConcentrate:!inactive,
    speedZero:k.has('grappled')||k.has('restrained')||k.has('paralyzed')||k.has('petrified')||k.has('unconscious')||s.exhaustion===6,
    speedPenaltyFeet:s.exhaustion*5,canApproachFearSource:!k.has('frightened'),deadByExhaustion:s.exhaustion===6};
}
/** Evaluación de una tirada concreta; no cambia el estado ni hace tiradas aleatorias. */
export function evaluateConditionRoll(ledger:ConditionLedger,query:ConditionRollQuery):ConditionRollResult{
  const s=validateConditionLedger(ledger),k=conditionKinds(s),caps=conditionCapabilities(s);
  if(!query||!['attack','incoming_attack','ability_check','saving_throw','initiative'].includes(query.kind))fail('Tipo de tirada inválido');
  if(query.kind==='saving_throw'&&!['strength','dexterity','constitution','intelligence','wisdom','charisma'].includes(query.ability??''))fail('Falta característica de salvación');
  if(query.attackerDistanceFeet!==undefined&&(!Number.isFinite(query.attackerDistanceFeet)||query.attackerDistanceFeet<0||query.attackerDistanceFeet>10000))fail('Distancia inválida');
  const advantages:string[]=[],disadvantages:string[]=[],notes:string[]=[];
  const adv=(id:ConditionId)=>advantages.push(CONDITION_NAMES[id]);
  const dis=(id:ConditionId)=>disadvantages.push(CONDITION_NAMES[id]);
  let automaticFailure=false,actionForbidden=false,automaticCriticalIfHit=false;
  switch(query.kind){
    case 'attack':
      actionForbidden=!caps.canTakeAction||(k.has('charmed')&&query.targetIsCharmer===true);
      for(const id of ['blinded','poisoned','prone','restrained'] as const)if(k.has(id))dis(id);
      if(k.has('frightened')){
        if(query.fearSourceVisible===true)dis('frightened');
        else if(query.fearSourceVisible===undefined)notes.push('Asustado: indica si la fuente de miedo es visible.');
      }
      if(k.has('grappled')){
        if(query.targetIsGrappler===false)dis('grappled');
        else if(query.targetIsGrappler===undefined)notes.push('Agarrado: indica si atacas al que te agarra.');
      }
      if(k.has('invisible')){
        if(query.otherCreatureCanSeeInvisible===false)adv('invisible');
        else if(query.otherCreatureCanSeeInvisible===undefined)notes.push('Invisible: indica si el objetivo puede verte.');
      }
      if(k.has('charmed')&&query.targetIsCharmer===undefined)notes.push('Hechizado: no puedes atacar a quien te hechizó.');
      break;
    case 'incoming_attack':
      for(const id of ['blinded','paralyzed','petrified','restrained','stunned','unconscious'] as const)if(k.has(id))adv(id);
      if(k.has('prone')){
        if(query.attackerDistanceFeet===undefined)notes.push('Derribado: indica si quien ataca está a 5 pies.');
        else query.attackerDistanceFeet<=5?adv('prone'):dis('prone');
      }
      if(k.has('invisible')){
        if(query.otherCreatureCanSeeInvisible===false)dis('invisible');
        else if(query.otherCreatureCanSeeInvisible===undefined)notes.push('Invisible: indica si el atacante puede verte.');
      }
      automaticCriticalIfHit=(k.has('paralyzed')||k.has('unconscious'))&&query.attackerDistanceFeet!==undefined&&query.attackerDistanceFeet<=5;
      break;
    case 'ability_check':
      if(k.has('poisoned'))dis('poisoned');
      if(k.has('frightened')){
        if(query.fearSourceVisible===true)dis('frightened');
        else if(query.fearSourceVisible===undefined)notes.push('Asustado: comprueba si ves la fuente de miedo.');
      }
      automaticFailure=(k.has('blinded')&&query.sense==='sight')||(k.has('deafened')&&query.sense==='hearing');
      break;
    case 'saving_throw':
      automaticFailure=(query.ability==='strength'||query.ability==='dexterity')&&
        (k.has('paralyzed')||k.has('petrified')||k.has('stunned')||k.has('unconscious'));
      if(query.ability==='dexterity'&&k.has('restrained'))dis('restrained');
      break;
    case 'initiative':
      if(k.has('incapacitated')||k.has('paralyzed')||k.has('petrified')||k.has('stunned')||k.has('unconscious'))dis('incapacitated');
      if(k.has('invisible'))adv('invisible');
      break;
  }
  if(s.exhaustion>=1)notes.push(`Agotamiento ${s.exhaustion}: penalización ${-2*s.exhaustion} a las pruebas d20.`);
  if(caps.deadByExhaustion)notes.push('Agotamiento 6: muerte según el manual; no se automatiza su resolución.');
  if(actionForbidden)notes.push('La acción está impedida por una condición o por el objetivo hechizador.');
  return {mode:advantages.length&&disadvantages.length?'normal':advantages.length?'advantage':disadvantages.length?'disadvantage':'normal',
    d20Penalty:-2*s.exhaustion,automaticFailure,actionForbidden,automaticCriticalIfHit,advantages,disadvantages,notes};
}
/** Combina fuentes, no los resultados agregados, para no perder las cancelaciones. */
export function combineAdvantageSources(adv:boolean,dis:boolean):RollMode{
  return adv&&dis?'normal':adv?'advantage':dis?'disadvantage':'normal';
}
export function advanceConditionRound(ledger:ConditionLedger):ConditionLedger{
  const s=validateConditionLedger(ledger);
  return {...s,instances:s.instances.flatMap(c=>c.remainingRounds===null?[c]:c.remainingRounds===1?[]:[{...c,remainingRounds:c.remainingRounds-1}])};
}
export function longRestConditionUpdate(ledger:ConditionLedger):ConditionLedger{
  const s=validateConditionLedger(ledger);
  return {...s,exhaustion:Math.max(0,s.exhaustion-1)};
}
