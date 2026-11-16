/** Actualización 47: recursos de lanzamiento reutilizables por las futuras clases.
 * Este módulo no decide si se puede lanzar un conjuro concreto: únicamente lleva
 * un registro inmutable de ranuras y valida que las operaciones sean legales.
 */
export type SpellSlotLevel = 1|2|3|4|5|6|7|8|9;
export type SpellSlotPool = Readonly<{
  maximum: readonly number[];
  remaining: readonly number[];
}>;

function assertSlotLevel(level:number):asserts level is SpellSlotLevel {
  if(!Number.isInteger(level)||level<1||level>9)throw new RangeError('Nivel de ranura inválido (1 a 9)');
}
function assertSlotCounts(values:readonly number[]):void{
  if(!Array.isArray(values)||values.length!==9||values.some(n=>!Number.isInteger(n)||n<0||n>9))
    throw new RangeError('Las ranuras deben ser nueve cantidades enteras entre 0 y 9');
}
export function createSlotPool(maximum:readonly number[],remaining:readonly number[]=maximum):SpellSlotPool{
  assertSlotCounts(maximum);
  assertSlotCounts(remaining);
  if(remaining.some((n,i)=>n>maximum[i]))throw new RangeError('Las ranuras restantes no pueden superar el máximo');
  return {maximum:[...maximum],remaining:[...remaining]};
}
export function useSpellSlot(pool:SpellSlotPool,level:number):SpellSlotPool{
  assertSlotLevel(level);
  const current=createSlotPool(pool.maximum,pool.remaining);
  if(current.remaining[level-1]===0)throw new RangeError(`No quedan ranuras de nivel ${level}`);
  const remaining=[...current.remaining];remaining[level-1]--;
  return createSlotPool(current.maximum,remaining);
}
export function restoreSpellSlots(pool:SpellSlotPool,levels:readonly number[]):SpellSlotPool{
  const current=createSlotPool(pool.maximum,pool.remaining);
  const remaining=[...current.remaining];
  for(const level of levels){
    assertSlotLevel(level);
    if(remaining[level-1]>=current.maximum[level-1])
      throw new RangeError(`No hay ranuras gastadas de nivel ${level}`);
    remaining[level-1]++;
  }
  return createSlotPool(current.maximum,remaining);
}
export function longRestSpellSlots(pool:SpellSlotPool):SpellSlotPool{
  return createSlotPool(pool.maximum);
}
