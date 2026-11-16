/** Ranuras persistidas por nivel. `true` significa gastada EN EL MODELO.
 * El rombo visual muestra justo lo inverso: MARCADO = disponible.
 * Los guardados antiguos sin marcas se reconstruyen a partir del contador.
 */
import {createSlotPool} from './spellcasting-core';
import {wizardArcaneRecovery,wizardLongRest} from './wizard';
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
/** Recuperación arcana requiere un descanso corto declarado por el jugador.
 * Permite, en nivel 3, recuperar dos ranuras de nivel 1 o una de nivel 2.
 * La operación es atómica: no permite gastar el uso sin ranuras suficientes.
 */
export function recoverWizardArcaneSlots(state:WizardLevelOneState,slotLevels:readonly number[]):WizardLevelOneState{
 const level=state.magic.slots.maximum[1]>0?3:state.magic.slots.maximum[0]===3?2:1;
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
export function recoverWizardArcaneSlot(state:WizardLevelOneState,slotLevel=1):WizardLevelOneState{
 return recoverWizardArcaneSlots(state,[slotLevel]);
}
export function resetWizardSlots(state:WizardLevelOneState):WizardLevelOneState{
 const level=state.magic.slots.maximum[1]>0?3:state.magic.slots.maximum[0]===3?2:1;
 const magic=wizardLongRest(state.magic,level,level>=3?'evoker':undefined);
 return {...state,magic,slotMarks:Array(magic.slots.maximum.reduce((a,b)=>a+b,0)).fill(false)};
}
