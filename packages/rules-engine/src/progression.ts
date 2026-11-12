/** Guerrero niveles 4, 6, 8, 12, 14 y 16: mejoras independientes, acumulativas. Dotes alternativas pendientes. */
import {ABILITIES,type Ability,type AbilityScores} from './abilities';

export type FighterAbilityImprovement=Readonly<{
  mode:'plus_two'|'two_ones';first:Ability;second?:Ability;
}>;
export type FighterLevel4Improvement=FighterAbilityImprovement;
export type FighterLevel6Improvement=FighterAbilityImprovement;
export type FighterLevel8Improvement=FighterAbilityImprovement;
export type FighterLevel12Improvement=FighterAbilityImprovement;
export type FighterLevel14Improvement=FighterAbilityImprovement;
export type FighterLevel16Improvement=FighterAbilityImprovement;

/** Valida y aplica una sola dote Mejora de característica, sin sobrepasar 20. */
export function applyFighterAbilityImprovement(scores:AbilityScores,choice:FighterAbilityImprovement,level:4|6|8|12|14|16):AbilityScores{
  if(!choice||typeof choice!=='object'||Array.isArray(choice))throw new RangeError(`Elige la mejora de característica de nivel ${level}`);
  if(choice.mode!=='plus_two'&&choice.mode!=='two_ones')throw new RangeError(`Modo de mejora de nivel ${level} inválido`);
  if(!ABILITIES.includes(choice.first))throw new RangeError('Primera característica inválida');
  const next={...scores};
  if(choice.mode==='plus_two'){
    if(choice.second!==undefined)throw new RangeError('La mejora +2 solo permite una característica');
    next[choice.first]+=2;
  }else{
    if(choice.second===undefined||!ABILITIES.includes(choice.second)||choice.first===choice.second)throw new RangeError('La mejora +1/+1 necesita dos características distintas');
    next[choice.first]+=1;next[choice.second]+=1;
  }
  if(ABILITIES.some(a=>next[a]>20))throw new RangeError(`La mejora de nivel ${level} no puede superar 20`);
  return next;
}
/** Mantiene la API original para las pruebas y personajes de niveles 1–5. */
export function applyFighterLevel4Improvement(scores:AbilityScores,choice:FighterLevel4Improvement):AbilityScores{
  return applyFighterAbilityImprovement(scores,choice,4);
}
export function applyFighterLevel6Improvement(scores:AbilityScores,choice:FighterLevel6Improvement):AbilityScores{
  return applyFighterAbilityImprovement(scores,choice,6);
}

/** Tercera elección independiente al alcanzar nivel 8. */
export function applyFighterLevel8Improvement(scores:AbilityScores,choice:FighterLevel8Improvement):AbilityScores{
  return applyFighterAbilityImprovement(scores,choice,8);
}

/** Cuarta elección independiente al alcanzar nivel 12. */
export function applyFighterLevel12Improvement(scores:AbilityScores,choice:FighterLevel12Improvement):AbilityScores{
  return applyFighterAbilityImprovement(scores,choice,12);
}

/** Quinta elección independiente al alcanzar nivel 14. */
export function applyFighterLevel14Improvement(scores:AbilityScores,choice:FighterLevel14Improvement):AbilityScores{
  return applyFighterAbilityImprovement(scores,choice,14);
}

/** Sexta elección independiente al alcanzar nivel 16. */
export function applyFighterLevel16Improvement(scores:AbilityScores,choice:FighterLevel16Improvement):AbilityScores{
  return applyFighterAbilityImprovement(scores,choice,16);
}

/** Niveles de Guerrero admitidos por el creador actual. El control visual solo da un paso.
 * Devuelve null en los extremos, para deshabilitar la flecha correspondiente.
 */
export type SupportedFighterLevel = 1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17;
export function adjacentFighterLevel(level:SupportedFighterLevel,direction:-1|1):SupportedFighterLevel|null {
  if(!Number.isInteger(level)||level<1||level>17)throw new RangeError('Nivel de Guerrero no reconocido');
  if(direction!==-1&&direction!==1)throw new RangeError('La navegación solo permite subir o bajar un nivel');
  const next=level+direction;
  return next>=1&&next<=17?next as SupportedFighterLevel:null;
}
