/** Actualización 34. Primera selección de beneficios épicos del PHB 2024, nivel 19.
 * El resto de dotes generales y beneficios épicos se añadirán al catálogo después.
 */
import {ABILITIES,type Ability,type AbilityScores} from './abilities';
export const EPIC_BOONS={
  combat_prowess:'Beneficio épico: Pericia en combate',
} as const;
export type EpicBoonId=keyof typeof EPIC_BOONS;
export type EpicBoonChoice=Readonly<{id:EpicBoonId;ability:Ability}>;
export function applyEpicBoon(scores:AbilityScores,choice:EpicBoonChoice):AbilityScores{
  if(!choice||typeof choice!=='object'||Array.isArray(choice)||!Object.hasOwn(EPIC_BOONS,choice.id))
    throw new RangeError('Elige una dote de beneficio épico para nivel 19');
  if(!ABILITIES.includes(choice.ability))throw new RangeError('Característica de beneficio épico inválida');
  if(scores[choice.ability]>=30)throw new RangeError('El beneficio épico no puede superar 30');
  return {...scores,[choice.ability]:scores[choice.ability]+1};
}
