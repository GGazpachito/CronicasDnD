'use client';

import type {D20Mode,D20Result} from '../../../../packages/rules-engine/src/d20';

/** Tarjetas comunes de resultado de arma: idénticas a las tiradas visibles de la hoja.
 * Solo presentan dados y modificadores; no adjudican éxitos ni consumen recursos.
 */
export type WeaponRollCard=Readonly<{
 label:string;kind:'attack'|'damage';dice:readonly number[];bonus:number;total:number;
 formula:string;note?:string;critical?:boolean;fixedDamage?:number;
 chosen?:number;mode?:D20Mode;
}>;
const signed=(value:number)=>value>=0?`+${value}`:String(value);
export function weaponAttackCard(label:string,result:D20Result):WeaponRollCard{
 return {label,kind:'attack',dice:result.dice,bonus:result.modifier,total:result.total,
  formula:`d20 · ${result.mode==='advantage'?'ventaja':result.mode==='disadvantage'?'desventaja':'normal'}`,
  chosen:result.chosen,mode:result.mode,
  note:result.dice.length>1?`Dado elegido: ${result.chosen}. El director decide si impacta.`:'El director decide si impacta.'};
}
export function WeaponRollCards({rolls}:{rolls:readonly WeaponRollCard[]}){
 if(rolls.length===0)return null;
 return <output className="overview-roll-cards" aria-live="polite" role="status">{rolls.map((roll,index)=><article key={`${roll.kind}-${index}`} className="overview-roll-result overview-dice-card">
  <div className="overview-roll-result-heading"><strong>{roll.label}</strong><span>{roll.formula}</span></div>
  <div className="overview-roll-equation">
   {roll.dice.length>0?<div className="overview-roll-dice">{roll.dice.map((die,dieIndex)=><span key={dieIndex} className={`overview-die${roll.kind==='damage'||die===roll.chosen?' is-chosen':''}`}>{die}</span>)}</div>:<span className="overview-roll-fixed">{roll.fixedDamage??0} fijo</span>}
   <div className="overview-roll-formula">{roll.fixedDamage?`${signed(roll.fixedDamage)} `:''}{signed(roll.bonus)} <span aria-hidden="true">=</span> <strong>{roll.total}</strong></div>
  </div>
  <small>{roll.dice.length?roll.dice.join(' + '):String(roll.fixedDamage??0)} {roll.fixedDamage&&roll.dice.length?`+ ${roll.fixedDamage} `:''}{signed(roll.bonus)} = {roll.total}{roll.note?` · ${roll.note}`:''}</small>
 </article>)}</output>;
}
