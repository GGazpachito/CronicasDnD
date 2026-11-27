/** Elegibilidad para Maestría de conjuros (PHB 2024, Mago nivel 18).
 * Fuente: D&D Beyond Basic Rules 2024, lista de conjuros y tiempos de lanzamiento.
 * «Acción o Ritual» es válido: el conjuro también admite lanzarse con una acción.
 * Centralizamos las excepciones para evitar una dependencia circular con
 * wizard-spell-details.ts (que ya depende de wizard-creation.ts).
 */
const NON_ACTION_FIRST_LEVEL=new Set<string>([
 'alarm','expeditious_retreat','feather_fall','find_familiar','identify',
 'illusory_script','jump','shield',
]);
const NON_ACTION_SECOND_LEVEL=new Set<string>([
 'augury','dragons_breath','magic_mouth','magic_weapon','misty_step',
]);

/** Contrato de los tiempos de lanzamiento usados por la validación del motor.
 * Otros niveles aún no necesitan esta clasificación en el creador guiado.
 */
export function wizardMasteryCastingTime(id:string,level:number):'action'|'other'|undefined{
 if(level===1)return NON_ACTION_FIRST_LEVEL.has(id)?'other':'action';
 if(level===2)return NON_ACTION_SECOND_LEVEL.has(id)?'other':'action';
 return undefined;
}
