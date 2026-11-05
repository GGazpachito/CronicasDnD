/** Version 2: elecciones + estado persistente de partida, sobre la columna JSON existente.
 * Lee personajes de version 1 y los convierte a estado inicial, sin migracion SQL.
 */
import { calculateGuidedFighter, type GuidedFighterInput } from './guided';
import { initialAdventureState, validateAdventureState, type AdventureState } from './adventure';

export const CHARACTER_SAVE_SCHEMA_VERSION = 2 as const;
export const CHARACTER_SAVE_RULESET = 'dnd-2024' as const;
export type CharacterSnapshot = Readonly<{
  schemaVersion: 2;
  ruleset: 'dnd-2024';
  input: GuidedFighterInput;
  adventure: AdventureState;
}>;
function record(value:unknown):value is Record<string,unknown>{
  return value!==null&&typeof value==='object'&&!Array.isArray(value);
}

/** Rechaza formatos incorrectos, recalcula la hoja y valida el estado con los maximos derivados. */
export function validateCharacterSnapshot(value:unknown):CharacterSnapshot{
  if(!record(value)||![1,2].includes(value.schemaVersion as number)||value.ruleset!==CHARACTER_SAVE_RULESET||!record(value.input)){
    throw new RangeError('Formato o version de personaje no compatible');
  }
  const legacy=value.schemaVersion===1;
  if(Object.keys(value).some(k=>!(legacy?['schemaVersion','ruleset','input']:['schemaVersion','ruleset','input','adventure']).includes(k))){
    throw new RangeError('El guardado contiene campos no reconocidos');
  }
  if(!legacy&&!('adventure' in value))throw new RangeError('Falta el estado de partida');
  let serialized:string;
  try{serialized=JSON.stringify(value.input)}catch{throw new RangeError('Los datos no se pueden serializar');}
  if(!serialized||serialized.length>120_000)throw new RangeError('Personaje demasiado grande para guardado local');
  let input:GuidedFighterInput;
  try{input=JSON.parse(serialized) as GuidedFighterInput;}catch{throw new RangeError('Datos de personaje invalidos');}
  let sheet:ReturnType<typeof calculateGuidedFighter>['sheet'];
  try{sheet=calculateGuidedFighter(input).sheet;}catch(e){
    throw new RangeError(e instanceof Error?`Personaje invalido: ${e.message}`:'Personaje invalido');
  }
  const adventure=legacy?initialAdventureState(sheet):validateAdventureState(value.adventure,sheet);
  return {schemaVersion:2,ruleset:CHARACTER_SAVE_RULESET,input,adventure};
}
export function makeCharacterSnapshot(input:GuidedFighterInput,adventure?:AdventureState):CharacterSnapshot{
  const sheet=calculateGuidedFighter(input).sheet;
  return validateCharacterSnapshot({schemaVersion:2,ruleset:CHARACTER_SAVE_RULESET,input,adventure:adventure??initialAdventureState(sheet)});
}
