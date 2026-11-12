/** Transacción validada de progresión: misma instantánea para UI y guardado. */
import {calculateGuidedFighter,type GuidedFighterInput} from './guided';
import {advanceAdventureLevel,synchronizeAdventureSheet,validateAdventureState,type AdventureState} from './adventure';
import {makeCharacterSnapshot,type CharacterSnapshot} from './persistence';

export type FighterLevelUpResult=Readonly<{
  snapshot:CharacterSnapshot;
  synchronizedBeforeAdvance:boolean;
}>;

/** Rechaza saltos y elecciones inválidas ANTES de que React cambie el nivel.
 * Si los PG máximos cambiaron al editar la hoja, se puede reconciliar la partida
 * solamente tras consentimiento explícito, nunca por accidente al guardar.
 */
export function prepareFighterLevelUp(
  currentInput:GuidedFighterInput,
  currentAdventure:AdventureState,
  nextInput:GuidedFighterInput,
  allowSynchronization=false
):FighterLevelUpResult{
  if(nextInput.level!==currentInput.level+1||nextInput.level>20)
    throw new RangeError('La progresión solo permite subir un nivel, hasta el nivel 20');
  if(nextInput.name!==currentInput.name||nextInput.species!==currentInput.species||nextInput.background!==currentInput.background)
    throw new RangeError('La subida de nivel no puede modificar la identidad o el origen del personaje');
  const currentSheet=calculateGuidedFighter(currentInput).sheet;
  // Valida TODAS las elecciones nuevas, incluido el segundo estilo y las mejoras.
  const nextSheet=calculateGuidedFighter(nextInput).sheet;
  let normalized:AdventureState;
  let synchronizedBeforeAdvance=false;
  try{normalized=validateAdventureState(currentAdventure,currentSheet);}
  catch(error){
    if(!allowSynchronization)throw new RangeError('El estado de partida no coincide con los PG de la hoja. Sincronízalo antes de subir de nivel.');
    normalized=synchronizeAdventureSheet(currentAdventure,currentSheet);
    synchronizedBeforeAdvance=true;
  }
  const advanced=advanceAdventureLevel(normalized,currentSheet,nextSheet);
  // La misma validación exacta que usan POST y PUT, antes de habilitar el guardado.
  const snapshot=makeCharacterSnapshot(nextInput,advanced);
  if(snapshot.input.level!==snapshot.adventure.fighter.fighterLevel)
    throw new RangeError('El nivel de la hoja y la partida no coincide');
  return {snapshot,synchronizedBeforeAdvance};
}

/** Recuperación excepcional, solicitada y confirmada por el jugador cuando su
 * sesión de combate es incompatible con la hoja. No se utiliza por defecto.
 * El guardado anterior de PostgreSQL no se modifica en esta función.
 */
export function prepareFighterLevelUpWithFreshSession(
  currentInput:GuidedFighterInput,
  nextInput:GuidedFighterInput
):FighterLevelUpResult{
  if(nextInput.level!==currentInput.level+1||nextInput.level>20)
    throw new RangeError('Solo se permite avanzar un nivel de Guerrero, hasta 20');
  if(nextInput.name!==currentInput.name||nextInput.species!==currentInput.species||nextInput.background!==currentInput.background)
    throw new RangeError('La recuperación no puede alterar la identidad del personaje');
  calculateGuidedFighter(currentInput);
  const newSheet=calculateGuidedFighter(nextInput).sheet;
  const snapshot=makeCharacterSnapshot(nextInput);
  if(snapshot.input.level!==newSheet.level||snapshot.adventure.fighter.fighterLevel!==nextInput.level)
    throw new RangeError('La recuperación no ha consolidado el nuevo nivel');
  return {snapshot,synchronizedBeforeAdvance:false};
}
