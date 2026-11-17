/** Ranuras persistidas por nivel. `true` significa gastada EN EL MODELO.
 * El rombo visual muestra justo lo inverso: MARCADO = disponible.
 * Los guardados antiguos sin marcas se reconstruyen a partir del contador.
 */
import {createSlotPool} from './spellcasting-core';
import {wizardArcaneRecovery,wizardLongRest,wizardProgression} from './wizard';
import type {WizardLevelOneState} from './wizard-creation';

function offset(maximum:readonly number[],slotLevel:number):number{
 if(!Number.isInteger(slotLevel)||slotLevel<1||slotLevel>9||maximum[slotLevel-1]===0)
  throw new RangeError('Nivel de ranura no disponible');
 return maximum.slice(0,slotLevel-1).reduce((sum,n)=>sum+n,0);
}
export function wizardAllSlotMarks(state:WizardLevelOneState):readonly boolean[]{
 const {maximum,remaining}=state.magic.slots;
 const count=maximum.reduce((sum,n)=>sum+n,0);
 if(state.slotMarks&&state.slotMarks.length===count)return [...state.slotMarks];
 return maximum.flatMap((total,i)=>[...Array(total-remaining[i]).fill(true),...Array(remaining[i]).fill(false)] as boolean[]);
}
/** API antigua: sin segundo argumento consulta las marcas del nivel 1. */
export function wizardSlotMarks(state:WizardLevelOneState,slotLevel=1):readonly boolean[]{
 const {maximum}=state.magic.slots;
 const start=offset(maximum,slotLevel);
 return wizardAllSlotMarks(state).slice(start,start+maximum[slotLevel-1]);
}
export function toggleWizardSlotMark(state:WizardLevelOneState,index:number,slotLevel=1):WizardLevelOneState{
 const {maximum}=state.magic.slots;
 const start=offset(maximum,slotLevel);
 if(!Number.isInteger(index)||index<0||index>=maximum[slotLevel-1])throw new RangeError('Marcador de ranura desconocido');
 const marks=[...wizardAllSlotMarks(state)]; marks[start+index]=!marks[start+index];
 const counts=maximum.map((count,i)=>count-marks.slice(maximum.slice(0,i).reduce((a,b)=>a+b,0),maximum.slice(0,i+1).reduce((a,b)=>a+b,0)).filter(Boolean).length);
 return {...state,slotMarks:marks,magic:{...state.magic,slots:createSlotPool(maximum,counts)}};
}
/** El nivel no se infiere por la presencia de ranuras de nivel 2: el Mago
 * de nivel 3, 4 y posteriores comparten varios niveles de ranura.
 * Para mantener la API histórica se permite omitirlo solo donde la fila
 * coincide unívocamente con un nivel ya implementado.
 */
function actualWizardLevel(state:WizardLevelOneState,explicitLevel?:number):number{
 const same=(level:number)=>wizardProgression(level,level>=3?'evoker':undefined).spellSlots.join(',')===state.magic.slots.maximum.join(',');
 if(explicitLevel!==undefined){
  if(!same(explicitLevel))throw new RangeError('Nivel de Mago y ranuras desincronizados');
  return explicitLevel;
 }
 for(let level=1;level<=11;level++)if(same(level))return level;
 throw new RangeError('Indica explícitamente el nivel de Mago');
}
/** Combinaciones válidas y actualmente recuperables con un descanso corto.
 * Ninguna supera la mitad de niveles redondeada hacia arriba ni recupera
 * ranuras inexistentes. El resultado permite reutilizar controles entre clases.
 */
export function wizardArcaneRecoveryOptions(state:WizardLevelOneState,wizardLevel:number):readonly (readonly number[])[]{
 const level=actualWizardLevel(state,wizardLevel);
 if(state.magic.arcaneRecoveryUsed)return [];
 const limit=Math.ceil(level/2);
 const missing=state.magic.slots.maximum.map((n,i)=>n-state.magic.slots.remaining[i]);
 const solutions:number[][]=[];
 function visit(slotLevel:number,remaining:number,chosen:number[]){
  if(slotLevel>Math.min(5,remaining)){
   if(chosen.length>0)solutions.push(chosen);
   return;
  }
  visit(slotLevel+1,remaining,chosen);
  for(let n=1;n<=missing[slotLevel-1]&&n*slotLevel<=remaining;n++){
   visit(slotLevel+1,remaining-n*slotLevel,[...chosen,...Array(n).fill(slotLevel)]);
  }
 }
 visit(1,limit,[]);
 return solutions.sort((a,b)=>b.reduce((x,y)=>x+y,0)-a.reduce((x,y)=>x+y,0)||a.length-b.length);
}
/** Recuperación arcana requiere un descanso corto declarado por el jugador.
 * Permite, en nivel 3, recuperar dos ranuras de nivel 1 o una de nivel 2.
 * La operación es atómica: no permite gastar el uso sin ranuras suficientes.
 */
export function recoverWizardArcaneSlots(state:WizardLevelOneState,slotLevels:readonly number[],wizardLevel?:number):WizardLevelOneState{
 const level=actualWizardLevel(state,wizardLevel);
 if(!Array.isArray(slotLevels)||slotLevels.length===0)throw new RangeError('Elige ranuras que recuperar');
 const marks=[...wizardAllSlotMarks(state)];
 for(const slotLevel of slotLevels){
  const start=offset(state.magic.slots.maximum,slotLevel);
  const relative=marks.slice(start,start+state.magic.slots.maximum[slotLevel-1]).findIndex(Boolean);
  if(relative<0)throw new RangeError('No hay suficientes ranuras gastadas de ese nivel');
  marks[start+relative]=false;
 }
 const magic=wizardArcaneRecovery(state.magic,level,slotLevels,level>=3?'evoker':undefined);
 return {...state,magic,slotMarks:marks};
}
/** API histórica: recupera exactamente una ranura. */
export function recoverWizardArcaneSlot(state:WizardLevelOneState,slotLevel=1,wizardLevel?:number):WizardLevelOneState{
 return recoverWizardArcaneSlots(state,[slotLevel],wizardLevel);
}
export function resetWizardSlots(state:WizardLevelOneState,wizardLevel?:number):WizardLevelOneState{
 const level=actualWizardLevel(state,wizardLevel);
 const magic=wizardLongRest(state.magic,level,level>=3?'evoker':undefined);
 return {...state,magic,slotMarks:Array(magic.slots.maximum.reduce((a,b)=>a+b,0)).fill(false)};
}
