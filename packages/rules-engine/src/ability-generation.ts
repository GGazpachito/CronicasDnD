/** Elección explícita de puntuaciones iniciales, independiente de los aumentos de trasfondo.
 * La matriz estándar sigue siendo el valor por defecto para guardados antiguos.
 * El método aleatorio oficial usa 4d6 descartando el resultado inferior.
 * 'd20' solo permanece para leer guardados de la actualización 67 sin falsearlos.
 */
import {ABILITIES,type Ability,type AbilityScores,validateAbilityScores} from './abilities';
import {rollDie} from './dice';

export type AbilityGenerationMethod='standard_array'|'point_buy'|'roll_4d6'|'d20';
export const POINT_BUY_BUDGET=27;
export const POINT_BUY_COSTS:Readonly<Record<number,number>>={8:0,9:1,10:2,11:3,12:4,13:5,14:7,15:9};
const STANDARD=[8,10,12,13,14,15] as const;
export const DEFAULT_POINT_BUY:AbilityScores={strength:8,dexterity:8,constitution:8,intelligence:8,wisdom:8,charisma:8};
export const POINT_BUY_EXAMPLE:AbilityScores={strength:15,dexterity:14,constitution:13,intelligence:12,wisdom:10,charisma:8};

export function pointBuySpent(scores:AbilityScores):number{
 return ABILITIES.reduce((total,ability)=>total+(POINT_BUY_COSTS[scores[ability]]??NaN),0);
}

/** Valida valores de creación sin aplicar todavía el aumento del trasfondo. */
export function validateGeneratedAbilities(scores:unknown,method:AbilityGenerationMethod='standard_array'):AbilityScores{
 if(!['standard_array','point_buy','roll_4d6','d20'].includes(method))throw new RangeError('Método de características desconocido');
 const checked=validateAbilityScores(scores);
 const values=ABILITIES.map(ability=>checked[ability]);
 if(method==='standard_array'&&[...values].sort((a,b)=>a-b).join(',')!==STANDARD.join(','))
  throw new RangeError('Distribuye exactamente la matriz estándar: 15, 14, 13, 12, 10 y 8');
 if(method==='point_buy'){
  if(values.some(score=>score<8||score>15))throw new RangeError('La compra de puntos admite valores de 8 a 15 antes del trasfondo');
  if(pointBuySpent(checked)>POINT_BUY_BUDGET)throw new RangeError('Compra de puntos: no puedes gastar más de 27 puntos');
 }
 if(method==='roll_4d6'&&values.some(score=>score<3||score>18))
  throw new RangeError('Las tiradas 4d6 descartando el menor deben sumar entre 3 y 18');
 if(method==='d20'&&values.some(score=>score<1||score>20))
  throw new RangeError('Las tiradas de d20 deben dar valores de 1 a 20');
 return checked;
}

export function rollD20AbilityScores(draw?:()=>number):AbilityScores{
 const generated={} as Record<Ability,number>;
 for(const ability of ABILITIES)generated[ability]=rollDie(20,draw);
 return generated;
}

/** Devuelve los cuatro dados para enseñar también cuál se ha descartado. */
export function rollAbilityScore4d6(draw?:()=>number):Readonly<{dice:readonly number[];discarded:number;total:number}>{
 const dice=Array.from({length:4},()=>rollDie(6,draw));
 const discarded=Math.min(...dice);
 return {dice,discarded,total:dice.reduce((sum,value)=>sum+value,0)-discarded};
}
export function rollAbilityScores4d6(draw?:()=>number):AbilityScores{
 const generated={} as Record<Ability,number>;
 for(const ability of ABILITIES)generated[ability]=rollAbilityScore4d6(draw).total;
 return generated;
}
