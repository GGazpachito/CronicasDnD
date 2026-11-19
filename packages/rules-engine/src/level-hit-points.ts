/** Contrato compartido de PG ganados tras el primer nivel (D&D 2024).
 * Cada elemento de `levelHitPointRolls` representa el resultado natural del dado
 * para el nivel índice + 2. Elegir el promedio registra el valor fijo del dado;
 * no se mezclan métodos globales ni se recalculan tiradas al recargar.
 */
export const CLASS_HIT_DICE={fighter:{sides:10,average:6},wizard:{sides:6,average:4},warlock:{sides:8,average:5}} as const;
export type HitDieClass=keyof typeof CLASS_HIT_DICE;

export function validateLevelHitPointRolls(level:number,rolls:readonly number[]|undefined,sides:6|8|10):void{
 if(rolls===undefined)return;
 if(!Array.isArray(rolls)||rolls.length!==level-1||rolls.some(roll=>!Number.isInteger(roll)||roll<1||roll>sides))
  throw new RangeError(`PG: se requiere un resultado de 1d${sides} por cada nivel posterior al primero`);
}

export function appendLevelHitPointRoll(
 level:number,previous:readonly number[]|undefined,sides:6|8|10,average:number,chosen:number
):number[]{
 if(!Number.isInteger(chosen)||chosen<1||chosen>sides)throw new RangeError(`El dado de golpe debe estar entre 1 y ${sides}`);
 validateLevelHitPointRolls(level,previous,sides);
 return [...(previous??Array<number>(level-1).fill(average)),chosen];
}

export function trimLevelHitPointRolls(rolls:readonly number[]|undefined,targetLevel:number):number[]|undefined{
 return rolls===undefined?undefined:rolls.slice(0,Math.max(0,targetLevel-1));
}
