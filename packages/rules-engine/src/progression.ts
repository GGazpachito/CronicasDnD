/** Guerrero niveles 4 y 6: dos mejoras independientes, acumulativas. Dotes generales alternativas pendientes. */
import {ABILITIES,type Ability,type AbilityScores} from './abilities';

export type FighterAbilityImprovement=Readonly<{
  mode:'plus_two'|'two_ones';first:Ability;second?:Ability;
}>;
export type FighterLevel4Improvement=FighterAbilityImprovement;
export type FighterLevel6Improvement=FighterAbilityImprovement;

/** Valida y aplica una sola dote Mejora de característica, sin sobrepasar 20. */
export function applyFighterAbilityImprovement(scores:AbilityScores,choice:FighterAbilityImprovement,level:4|6):AbilityScores{
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
