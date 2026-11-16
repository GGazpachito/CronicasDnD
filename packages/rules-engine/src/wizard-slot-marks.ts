/** Marcadores individuales de ranuras. El conteo se deriva exclusivamente de estas marcas.
 * Las hojas antiguas no guardaban marcas: se reconstruyen sin perder ranuras gastadas.
 */
import {createSlotPool} from './spellcasting-core';
import {wizardArcaneRecovery,wizardLongRest} from './wizard';
import type {WizardLevelOneState} from './wizard-creation';
export function wizardSlotMarks(state:WizardLevelOneState):readonly boolean[]{
  const remaining=state.magic.slots.remaining[0];
  return state.slotMarks??[...Array(2-remaining).fill(true),...Array(remaining).fill(false)];
}
export function toggleWizardSlotMark(state:WizardLevelOneState,index:number):WizardLevelOneState{
  if(!Number.isInteger(index)||index<0||index>=2)throw new RangeError('Marcador de ranura desconocido');
  const marks=[...wizardSlotMarks(state)]; marks[index]=!marks[index];
  return {...state,slotMarks:marks,magic:{...state.magic,slots:createSlotPool(state.magic.slots.maximum,[2-marks.filter(Boolean).length,...state.magic.slots.remaining.slice(1)])}};
}
export function recoverWizardArcaneSlot(state:WizardLevelOneState):WizardLevelOneState{
  const magic=wizardArcaneRecovery(state.magic,1,[1]);
  const marks=[...wizardSlotMarks(state)];const first=marks.findIndex(Boolean);
  if(first>=0)marks[first]=false;
  return {...state,magic,slotMarks:marks};
}
export function resetWizardSlots(state:WizardLevelOneState):WizardLevelOneState{
  return {...state,magic:wizardLongRest(state.magic,1),slotMarks:[false,false]};
}
