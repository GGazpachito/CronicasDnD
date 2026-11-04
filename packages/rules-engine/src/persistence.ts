/** Contrato de guardado local v1.
 * Solo se guardan elecciones y acciones de inventario, nunca estadisticas derivadas.
 */
import { calculateGuidedFighter, type GuidedFighterInput } from './guided';

export const CHARACTER_SAVE_SCHEMA_VERSION = 1 as const;
export const CHARACTER_SAVE_RULESET = 'dnd-2024' as const;
export type CharacterSnapshot = Readonly<{
  schemaVersion: 1;
  ruleset: 'dnd-2024';
  input: GuidedFighterInput;
}>;

function record(value:unknown):value is Record<string,unknown>{
  return value!==null&&typeof value==='object'&&!Array.isArray(value);
}

/** Normaliza JSON, rechaza versiones futuras y exige reglas validas.
 * No ejecuta codigo y no modifica la entrada original.
 */
export function validateCharacterSnapshot(value:unknown):CharacterSnapshot{
  if(!record(value)||value.schemaVersion!==1||value.ruleset!==CHARACTER_SAVE_RULESET||!record(value.input)){
    throw new RangeError('Formato o version de personaje no compatible');
  }
  if(Object.keys(value).some(k=>!['schemaVersion','ruleset','input'].includes(k))){
    throw new RangeError('El guardado contiene campos no reconocidos');
  }
  let serial:string;
  try{serial=JSON.stringify(value.input)}catch{throw new RangeError('Los datos no se pueden serializar');}
  if(!serial||serial.length>120_000)throw new RangeError('Personaje demasiado grande para el guardado local');
  let input:GuidedFighterInput;
  try{input=JSON.parse(serial) as GuidedFighterInput;}catch{throw new RangeError('Datos de personaje no validos');}
  try { calculateGuidedFighter(input); } catch(e) {
    throw new RangeError(e instanceof Error ? `Personaje invalido: ${e.message}` : 'Personaje invalido');
  } // valida origen, equipamiento, conjuros, inventario, etc.
  return {schemaVersion:1,ruleset:CHARACTER_SAVE_RULESET,input};
}

export function makeCharacterSnapshot(input:GuidedFighterInput):CharacterSnapshot{
  return validateCharacterSnapshot({schemaVersion:1,ruleset:CHARACTER_SAVE_RULESET,input});
}
