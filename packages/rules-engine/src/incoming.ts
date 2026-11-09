/** Paso 19. Ataques recibidos (PHB 2024).
 * Tiradas introducidas por el usuario. No calcula dados ni inventa rasgos del enemigo.
 * La resolución es pura; la confirmación reutiliza el motor de daño/supervivencia.
 */
import type {CalculatedFighterSheet} from './sheet';
import {evaluateConditionRoll,initialConditionLedger,type RollMode} from './conditions';
import {applyAdventureAction,validateAdventureState,type AdventureState} from './adventure';
import {appendReceivedAttack,type ReceivedAttackEntry} from './combat';
import {collectDamageDefenses,mitigateDamage,resolveDamageDefense,type DefenseContext} from './damage-defenses';

export const INCOMING_DAMAGE_TYPES = [
  'acid','bludgeoning','cold','fire','force','lightning','necrotic','piercing',
  'poison','psychic','radiant','slashing','thunder'
] as const;
export type IncomingDamageType=typeof INCOMING_DAMAGE_TYPES[number];
export type DamageMitigation='normal'|'resistance'|'vulnerability'|'both'|'immunity';
/** Componente adicional del mismo impacto. El primario se mantiene por compatibilidad. */
export type ExtraIncomingDamage=Readonly<{
  damageType:IncomingDamageType;
  rolledDamage:number;
  damageAdjustment?:number;
  mitigation?:DamageMitigation;
}>;
export type IncomingDamageBreakdown=Readonly<{
  damageType:IncomingDamageType;
  rolledDamage:number;
  adjustedDamage:number;
  effectiveDamage:number;
  mitigation:DamageMitigation;
  sources:readonly string[];
}>;

export type IncomingAttackInput=Readonly<{
  attacker:string;
  /** Bonificador del atacante al d20. */
  attackBonus:number;
  firstD20:number;
  /** Obligatorio con ventaja o desventaja, prohibido con tirada normal. */
  secondD20?:number;
  /** Distancia para Derribado y críticos por Paralizado/Inconsciente. */
  attackerDistanceFeet:number;
  /** Se usa para resolver la interacción con Invisible. */
  attackerCanSeeInvisible?:boolean;
  situationalAdvantage?:boolean;
  situationalDisadvantage?:boolean;
  /** Bonificación temporal a la CA aplicada solo a este ataque. */
  armorClassAdjustment?:number;
  damageType:IncomingDamageType;
  /** Daño ya tirado por la mesa, con dados duplicados si fue crítico. */
  rolledDamage:number;
  /** Ajustes planos ANTES de resistencia y vulnerabilidad. */
  damageAdjustment?:number;
  mitigation:DamageMitigation;
  /** Componentes adicionales (máximo tres); todos pertenecen a este mismo impacto. */
  additionalDamage?:readonly ExtraIncomingDamage[];
}>;

export type IncomingAttackPreview=Readonly<{
  attacker:string;
  mode:RollMode;
  selectedD20:number;
  attackTotal:number;
  targetArmorClass:number;
  hit:boolean;
  critical:boolean;
  damageType:IncomingDamageType;
  rolledDamage:number;
  adjustedDamage:number;
  finalDamage:number;
  mitigation:DamageMitigation;
  /** Incluye el componente principal y los adicionales. */
  damageParts:readonly IncomingDamageBreakdown[];
  notes:readonly string[];
}>;

function integer(value:unknown,min:number,max:number,label:string):number{
  if(typeof value!=='number'||!Number.isSafeInteger(value)||value<min||value>max)
    throw new RangeError(`${label}: número entero fuera de rango (${min} a ${max}).`);
  return value;
}
function bool(value:unknown,label:string):boolean{
  if(value!==undefined&&typeof value!=='boolean')throw new RangeError(`${label} debe ser booleano`);
  return value===true;
}
function validName(value:unknown):string{
  if(typeof value!=='string'||!value.trim()||value.length>80||/[\u0000-\u001f]/.test(value))
    throw new RangeError('Nombre de atacante inválido');
  return value.trim();
}

/** Vista previa, sin efectos secundarios. */
export function previewIncomingAttack(state:AdventureState,sheet:CalculatedFighterSheet,input:IncomingAttackInput,context:DefenseContext={}):IncomingAttackPreview{
  const current=validateAdventureState(state,sheet);
  if(current.survival?.death.dead||current.combat.conditions?.exhaustion===6)throw new RangeError('No se registran ataques a un personaje muerto');
  if(!input||typeof input!=='object'||Array.isArray(input))throw new RangeError('Ataque recibido inválido');
  const allowed=['attacker','attackBonus','firstD20','secondD20','attackerDistanceFeet','attackerCanSeeInvisible',
    'situationalAdvantage','situationalDisadvantage','armorClassAdjustment','damageType','rolledDamage','damageAdjustment','mitigation','additionalDamage'];
  if(Object.keys(input).some(k=>!allowed.includes(k)))throw new RangeError('Ataque con campos no reconocidos');
  const attacker=validName(input.attacker);
  const attackBonus=integer(input.attackBonus,-100,100,'Bonificador del atacante');
  const first=integer(input.firstD20,1,20,'Primer d20');
  const distance=integer(input.attackerDistanceFeet,0,10_000,'Distancia del atacante');
  const seeInvisible=input.attackerCanSeeInvisible;
  bool(seeInvisible,'Visión de Invisible');
  const situationalAdvantage=bool(input.situationalAdvantage,'Ventaja situacional');
  const situationalDisadvantage=bool(input.situationalDisadvantage,'Desventaja situacional');
  const acAdjustment=integer(input.armorClassAdjustment??0,-20,20,'Ajuste de CA');
  const targetArmorClass=integer(sheet.armorClass+acAdjustment,0,100,'CA resultante');
  if(!INCOMING_DAMAGE_TYPES.includes(input.damageType))throw new RangeError('Tipo de daño desconocido');
  const rolledDamage=integer(input.rolledDamage,0,50_000,'Daño de la tirada');
  const adjustment=integer(input.damageAdjustment??0,-1000,1000,'Ajuste al daño');
  if(!['normal','resistance','vulnerability','both','immunity'].includes(input.mitigation))
    throw new RangeError('Mitigación desconocida');
  if(input.additionalDamage!==undefined&&(!Array.isArray(input.additionalDamage)||input.additionalDamage.length>3))
    throw new RangeError('El ataque admite hasta cuatro componentes de daño');
  const normalizedExtras=(input.additionalDamage??[]).map((part,i)=>{
    if(!part||typeof part!=='object'||Array.isArray(part)||Object.keys(part).some(k=>!['damageType','rolledDamage','damageAdjustment','mitigation'].includes(k)))
      throw new RangeError(`Componente ${i+2} inválido`);
    if(!INCOMING_DAMAGE_TYPES.includes(part.damageType))throw new RangeError(`Tipo de daño inválido del componente ${i+2}`);
    const rolledDamage=integer(part.rolledDamage,0,50_000,'Daño de componente');
    const damageAdjustment=integer(part.damageAdjustment??0,-1000,1000,'Ajuste de componente');
    const mitigation=part.mitigation??'normal';
    if(!['normal','resistance','vulnerability','both','immunity'].includes(mitigation))throw new RangeError('Defensa del componente inválida');
    return {damageType:part.damageType,rolledDamage,damageAdjustment,mitigation};
  });
  // Todos los componentes de un ataque se resuelven antes de aplicar una sola instancia de daño.
  const grants=collectDamageDefenses(context);

  const ledger=current.combat.conditions??initialConditionLedger();
  const conditions=evaluateConditionRoll(ledger,{kind:'incoming_attack',attackerDistanceFeet:distance,
    ...(seeInvisible===undefined?{}:{otherCreatureCanSeeInvisible:seeInvisible})});
  const atZeroUnconscious=current.fighter.hitPoints.current===0;
  // A 0 PG la condición Inconsciente es implícita aunque no esté escrita en el libro de condiciones.
  const advantages=conditions.advantages.length>0||situationalAdvantage||atZeroUnconscious;
  const disadvantages=conditions.disadvantages.length>0||situationalDisadvantage||(atZeroUnconscious&&distance>5);
  const mode:RollMode=advantages&&disadvantages?'normal':advantages?'advantage':disadvantages?'disadvantage':'normal';
  if(mode==='normal'&&input.secondD20!==undefined)throw new RangeError('Tirada normal: solo un d20');
  if(mode!=='normal'&&input.secondD20===undefined)throw new RangeError('Ventaja/desventaja: proporciona dos d20');
  const second=input.secondD20===undefined?first:integer(input.secondD20,1,20,'Segundo d20');
  const selected=mode==='advantage'?Math.max(first,second):mode==='disadvantage'?Math.min(first,second):first;
  const total=selected+attackBonus;
  const hit=selected!==1&&(selected===20||total>=targetArmorClass);
  const critical=hit&&(selected===20||conditions.automaticCriticalIfHit||(atZeroUnconscious&&distance<=5));
  const normalized=[{damageType:input.damageType,rolledDamage,damageAdjustment:adjustment,mitigation:input.mitigation},...normalizedExtras];
  const damageParts:IncomingDamageBreakdown[]=normalized.map(part=>{
    const adjustedDamage=Math.max(0,part.rolledDamage+part.damageAdjustment);
    const resolved=resolveDamageDefense(part.damageType,grants,part.mitigation);
    const amount=mitigateDamage(adjustedDamage,resolved.mitigation);
    return {damageType:part.damageType,rolledDamage:part.rolledDamage,adjustedDamage,
      effectiveDamage:hit?amount:0,mitigation:resolved.mitigation,sources:resolved.sources};
  });
  const damage=damageParts.reduce((sum,part)=>sum+part.effectiveDamage,0);
  if(!Number.isSafeInteger(damage)||damage>100_000)throw new RangeError('El daño final supera el límite del estado de partida');
  const notes=[...conditions.notes];
  if(atZeroUnconscious)notes.push('A 0 PG estás Inconsciente y Derribado, incluso sin una condición añadida manualmente.');
  if(critical)notes.push('Crítico: introduce el daño YA tirado con los dados apropiados; la aplicación no vuelve a duplicarlos.');
  if(damageParts.length>1)notes.push('Los componentes se mitigan individualmente, y se aplica una sola instancia de daño total.');
  for(const part of damageParts){
    if(part.sources.length)notes.push(`${part.damageType}: ${part.sources.join(', ')} (${part.mitigation}).`);
  }
  if(adjustment)notes.push(`Ajuste plano al daño del primer componente: ${adjustment>=0?'+':''}${adjustment}.`);
  return {attacker,mode,selectedD20:selected,attackTotal:total,targetArmorClass,hit,critical,
    damageType:input.damageType,rolledDamage,adjustedDamage:damageParts[0].adjustedDamage,
    finalDamage:damage,mitigation:damageParts[0].mitigation,damageParts,notes};
}

/** Confirmación única: registra y aplica el daño de manera atómica, sin mutar la entrada. */
export function receiveIncomingAttack(state:AdventureState,sheet:CalculatedFighterSheet,input:IncomingAttackInput,context:DefenseContext={}):
  Readonly<{state:AdventureState;preview:IncomingAttackPreview;description:string}> {
  const preview=previewIncomingAttack(state,sheet,input,context);
  const base=validateAdventureState(state,sheet);
  const applied=preview.hit&&preview.finalDamage>0?
    applyAdventureAction(base,{type:'damage',amount:preview.finalDamage,critical:preview.critical},sheet):
    {state:base,description:preview.hit?'Sin daño efectivo.':'Ataque fallido.'};
  const entry:Omit<ReceivedAttackEntry,'id'|'round'>={
    attacker:preview.attacker,naturalRoll:preview.selectedD20,attackTotal:preview.attackTotal,
    armorClass:preview.targetArmorClass,mode:preview.mode,hit:preview.hit,critical:preview.critical,
    damageType:preview.damageType,rolledDamage:preview.rolledDamage,
    effectiveDamage:preview.finalDamage,mitigation:preview.mitigation,damageParts:preview.damageParts
  };
  const combat=appendReceivedAttack(applied.state.combat,entry);
  return {state:{...applied.state,combat},preview,description:`${preview.attacker}: ${preview.hit?'impacta':'falla'}. ${applied.description}`};
}
