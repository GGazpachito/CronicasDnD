/** Progresión atómica de Mago niveles 1→13, PHB 2024 pp. 165–170 y 174.
 * Conserva ranuras gastadas, inventario, perfil y selección manual de biblioteca.
 */
import {wizardAdvanceMagicState,wizardProgression,WIZARD_FEATURES,EVOKER_FEATURES} from './wizard';
import {calculateGuidedWizard,validateWizardOneState,WIZARD_SPELL_CATALOG,WIZARD_LEVEL_ONE_CANTRIPS,WIZARD_SCHOLAR_OPTIONS,
 type GuidedWizardInput,type WizardLevelOneState,type WizardScholarSkill,type WizardLevel4Improvement} from './wizard-creation';
import {wizardAllSlotMarks} from './wizard-slot-marks';
import {mergeWizardLevelSpells} from './wizard-spell-library';

export type WizardLevelUpChoices=Readonly<{
 newSpellIds:readonly [string,string];
 preparedIds:readonly string[];
 scholarSkill?:WizardScholarSkill;
 evokerBonusSpellIds?:readonly [string,string];
 /** Nivel 4: el Mago aprende su cuarto truco. */
 newCantripId?:string;
 /** Nivel 4: dote Mejora de característica (+2 o +1/+1). */
  level4Improvement?:WizardLevel4Improvement;
  level8Improvement?:WizardLevel4Improvement;
  level12Improvement?:WizardLevel4Improvement;
 /** Nivel 5: Experto en Evocación regala otro conjuro de nivel 1, 2 o 3. */
 evokerLevelThreeSpellId?:string;
 /** Nivel 7: nueva ranura de nivel 4, Evocación gratuita. */
  evokerLevelFourSpellId?:string;
  /** Nivel 9: nueva Evocación gratuita al desbloquear ranuras de nivel 5. */
  evokerLevelFiveSpellId?:string;
  /** Nivel 11: nuevo conjuro gratuito de Evocación al desbloquear nivel 6. */
  evokerLevelSixSpellId?:string;
  /** Nivel 13: nueva Evocación gratuita al desbloquear nivel de conjuro 7. */
  evokerLevelSevenSpellId?:string;
}>;
export type WizardLevelUpResult=Readonly<{
 input:GuidedWizardInput;state:WizardLevelOneState;
 gainedFeatures:readonly {title:string;description:string}[];
 hitPointsIncrease:number;
}>;
export function prepareWizardLevelUp(input:GuidedWizardInput,state:WizardLevelOneState,choices:WizardLevelUpChoices):WizardLevelUpResult{
 if(input.level<1||input.level>=13)throw new RangeError('La progresión guiada de Mago llega actualmente a nivel 13');
 const prior=calculateGuidedWizard(input);
 validateWizardOneState(state,prior);
 const nextLevel=(input.level+1) as 2|3|4|5|6|7|8|9|10|11|12|13;
 const newIds=choices.newSpellIds;
 if(!Array.isArray(newIds)||newIds.length!==2||new Set(newIds).size!==2||newIds.some(id=>input.spellbookIds.includes(id)))
  throw new RangeError('Debes añadir dos conjuros nuevos y diferentes al libro');
 const catalog=new Map<string,(typeof WIZARD_SPELL_CATALOG)[number]>(WIZARD_SPELL_CATALOG.map(spell=>[spell.id,spell]));
 const highest=wizardProgression(nextLevel,nextLevel>=3?'evoker':undefined).highestSlotLevel;
 if(newIds.some(id=>!catalog.has(id)||catalog.get(id)!.level>highest))throw new RangeError('Conjuros fuera del catálogo o nivel disponible');
 if(nextLevel===2){
  if(!WIZARD_SCHOLAR_OPTIONS.includes(choices.scholarSkill as WizardScholarSkill)||choices.evokerBonusSpellIds!==undefined)
   throw new RangeError('Elige una habilidad válida para Erudito');
 }else if(choices.scholarSkill!==undefined)throw new RangeError('La pericia de Erudito se elige una sola vez');
 if(nextLevel===3){
  const bonus=choices.evokerBonusSpellIds;
  if(!Array.isArray(bonus)||bonus.length!==2||new Set(bonus).size!==2||bonus.some(id=>!catalog.has(id)||catalog.get(id)!.level>2||catalog.get(id)!.school!=='evocation'||newIds.includes(id)||input.spellbookIds.includes(id)))
   throw new RangeError('Evocación concede dos conjuros gratuitos nuevos de niveles 1 o 2');
 }else if(choices.evokerBonusSpellIds!==undefined)throw new RangeError('Los dos conjuros de Evocación solo se eligen al nivel 3');
 if(nextLevel===4||nextLevel===10){
  if(!WIZARD_LEVEL_ONE_CANTRIPS.some(s=>s.id===choices.newCantripId)||input.cantripIds.includes(choices.newCantripId!))
   throw new RangeError(`Elige el truco nuevo de Mago del nivel ${nextLevel}`);
 }else if(choices.newCantripId!==undefined)throw new RangeError('Los trucos adicionales se eligen exclusivamente en niveles 4 y 10');
 if(nextLevel===4){
  if(!choices.level4Improvement)throw new RangeError('Elige la mejora de característica del nivel 4');
 }else if(choices.level4Improvement!==undefined)throw new RangeError('La mejora del nivel 4 solo corresponde al nivel 4');
 if(nextLevel===8){
  if(!choices.level8Improvement)throw new RangeError('Elige la mejora de característica del nivel 8');
 }else if(choices.level8Improvement!==undefined)throw new RangeError('La mejora de nivel 8 solo corresponde al nivel 8');
 if(nextLevel===12){
  if(!choices.level12Improvement)throw new RangeError('Elige la mejora de característica del nivel 12');
 }else if(choices.level12Improvement!==undefined)throw new RangeError('La mejora de nivel 12 solo corresponde al nivel 12');
 if(nextLevel===5){
  const spell=choices.evokerLevelThreeSpellId&&catalog.get(choices.evokerLevelThreeSpellId);
  if(!spell||spell.school!=='evocation'||spell.level>highest||newIds.includes(spell.id)||input.spellbookIds.includes(spell.id)||(input.evokerBonusSpellIds??[]).includes(spell.id))
   throw new RangeError('Elige un conjuro nuevo de Evocación de nivel 1–3');
 }else if(choices.evokerLevelThreeSpellId!==undefined)
  throw new RangeError('El conjuro gratuito adicional de Evocación corresponde al nivel 5');
 if(nextLevel===7){
  const spell=choices.evokerLevelFourSpellId&&catalog.get(choices.evokerLevelFourSpellId);
  if(!spell||spell.school!=='evocation'||spell.level>4||newIds.includes(spell.id)||input.spellbookIds.includes(spell.id)||
    (input.evokerBonusSpellIds??[]).includes(spell.id)||input.evokerLevelThreeSpellId===spell.id)
   throw new RangeError('Elige un conjuro nuevo de Evocación de nivel 1–4');
 }else if(choices.evokerLevelFourSpellId!==undefined)
  throw new RangeError('El conjuro gratuito adicional de Evocación corresponde al nivel 7');
 if(nextLevel===9){
  const spell=choices.evokerLevelFiveSpellId&&catalog.get(choices.evokerLevelFiveSpellId);
  if(!spell||spell.school!=='evocation'||spell.level>5||newIds.includes(spell.id)||input.spellbookIds.includes(spell.id)||
    (input.evokerBonusSpellIds??[]).includes(spell.id)||input.evokerLevelThreeSpellId===spell.id||input.evokerLevelFourSpellId===spell.id)
   throw new RangeError('Elige un conjuro nuevo de Evocación de nivel 1–5');
 }else if(choices.evokerLevelFiveSpellId!==undefined)
  throw new RangeError('El conjuro gratuito adicional de Evocación corresponde al nivel 9');
 if(nextLevel===11){
  const spell=choices.evokerLevelSixSpellId&&catalog.get(choices.evokerLevelSixSpellId);
  if(!spell||spell.school!=='evocation'||spell.level>6||newIds.includes(spell.id)||input.spellbookIds.includes(spell.id)||
    (input.evokerBonusSpellIds??[]).includes(spell.id)||input.evokerLevelThreeSpellId===spell.id||
    input.evokerLevelFourSpellId===spell.id||input.evokerLevelFiveSpellId===spell.id)
   throw new RangeError('Elige un conjuro nuevo de Evocación de nivel 1–6');
 }else if(choices.evokerLevelSixSpellId!==undefined)
  throw new RangeError('El conjuro gratuito adicional de Evocación corresponde al nivel 11');
 if(nextLevel===13){
  const spell=choices.evokerLevelSevenSpellId&&catalog.get(choices.evokerLevelSevenSpellId);
  if(!spell||spell.school!=='evocation'||spell.level>7||newIds.includes(spell.id)||input.spellbookIds.includes(spell.id)||
    (input.evokerBonusSpellIds??[]).includes(spell.id)||input.evokerLevelThreeSpellId===spell.id||
    input.evokerLevelFourSpellId===spell.id||input.evokerLevelFiveSpellId===spell.id||input.evokerLevelSixSpellId===spell.id)
   throw new RangeError('Elige un conjuro nuevo de Evocación de nivel 1–7');
 }else if(choices.evokerLevelSevenSpellId!==undefined)
  throw new RangeError('El conjuro gratuito adicional de Evocación corresponde al nivel 13');
 if(input.preparedIds.some(id=>!choices.preparedIds.includes(id)))
  throw new RangeError('Los conjuros preparados anteriores se conservan hasta completar un descanso largo');
 const gained=[...newIds,...(choices.evokerBonusSpellIds??[]),...(choices.evokerLevelThreeSpellId?[choices.evokerLevelThreeSpellId]:[]),...(choices.evokerLevelFourSpellId?[choices.evokerLevelFourSpellId]:[]),...(choices.evokerLevelFiveSpellId?[choices.evokerLevelFiveSpellId]:[]),...(choices.evokerLevelSixSpellId?[choices.evokerLevelSixSpellId]:[]),...(choices.evokerLevelSevenSpellId?[choices.evokerLevelSevenSpellId]:[]),...(choices.newCantripId?[choices.newCantripId]:[])];
 const nextInput:GuidedWizardInput={...input,level:nextLevel,
  spellbookIds:[...input.spellbookIds,...newIds],
  cantripIds:[...input.cantripIds,...(choices.newCantripId?[choices.newCantripId]:[])],
  preparedIds:[...choices.preparedIds],
  ...(nextLevel===2?{scholarSkill:choices.scholarSkill}:{}),
  ...(nextLevel===3?{subclass:'evoker' as const,evokerBonusSpellIds:choices.evokerBonusSpellIds}:{}),
  ...(nextLevel===4?{level4Improvement:choices.level4Improvement}:{}),
  ...(nextLevel===8?{level8Improvement:choices.level8Improvement}:{}),
  ...(nextLevel===12?{level12Improvement:choices.level12Improvement}:{}),
  ...(nextLevel===5?{evokerLevelThreeSpellId:choices.evokerLevelThreeSpellId}:{}),
  ...(nextLevel===7?{evokerLevelFourSpellId:choices.evokerLevelFourSpellId}:{}),
  ...(nextLevel===9?{evokerLevelFiveSpellId:choices.evokerLevelFiveSpellId}:{}),
  ...(nextLevel===11?{evokerLevelSixSpellId:choices.evokerLevelSixSpellId}:{}),
   ...(nextLevel===13?{evokerLevelSevenSpellId:choices.evokerLevelSevenSpellId}:{}),
  ...(input.spellSelection?{spellSelection:mergeWizardLevelSpells(input,gained,choices.preparedIds)}:{})};
 const next=calculateGuidedWizard(nextInput);
 const magic=wizardAdvanceMagicState(state.magic,input.level,nextLevel>=3?'evoker':undefined);
 const oldMaximum=state.magic.slots.maximum,newMaximum=magic.slots.maximum;
 const previousMarks=wizardAllSlotMarks(state),marks:boolean[]=[];
 let oldStart=0;
 for(let i=0;i<9;i++){
  marks.push(...previousMarks.slice(oldStart,oldStart+oldMaximum[i]),...Array(newMaximum[i]-oldMaximum[i]).fill(false));
  oldStart+=oldMaximum[i];
 }
 const hpGain=next.maximumHitPoints-prior.maximumHitPoints;
 const nextState:WizardLevelOneState={...state,magic,slotMarks:marks,
  hitPointsCurrent:Math.min(next.maximumHitPoints,state.hitPointsCurrent+hpGain)};
 validateWizardOneState(nextState,next);
 return {input:nextInput,state:nextState,
  gainedFeatures:[...WIZARD_FEATURES,...EVOKER_FEATURES].filter(feature=>feature.level===nextLevel).map(f=>({title:f.title,description:f.description})),
  hitPointsIncrease:hpGain};
}
export function wizardLevelUpChoicesPreview(input:GuidedWizardInput){
 if(input.level<1||input.level>=13)return null;
 const nextLevel=input.level+1;
 const progression=wizardProgression(nextLevel,nextLevel>=3?'evoker':undefined);
 return {nextLevel,progression,features:[...WIZARD_FEATURES,...EVOKER_FEATURES].filter(f=>f.level===nextLevel)};
}

/** Nivel 5: Memorizar conjuro, tras un descanso corto declarado por el jugador.
 * Cambia exactamente un preparado reglamentario por otro del libro sin
 * modificar el número de preparados ni gastar ranuras. El sistema manual
 * sin límites sigue separado y se sincroniza si está presente.
 */
export function wizardMemorizePreparedSpell(input:GuidedWizardInput,oldId:string,newId:string):GuidedWizardInput{
 if(input.level<5)throw new RangeError('Memorizar conjuro se desbloquea en nivel 5');
 calculateGuidedWizard(input);
 if(!input.preparedIds.includes(oldId)||oldId===newId||input.preparedIds.includes(newId))
  throw new RangeError('Elige un conjuro preparado que sustituir y uno distinto todavía no preparado');
 const known=new Set([...input.spellbookIds,...(input.evokerBonusSpellIds??[]),...(input.evokerLevelThreeSpellId?[input.evokerLevelThreeSpellId]:[]),...(input.evokerLevelFourSpellId?[input.evokerLevelFourSpellId]:[]),...(input.evokerLevelFiveSpellId?[input.evokerLevelFiveSpellId]:[]),...(input.evokerLevelSixSpellId?[input.evokerLevelSixSpellId]:[]),...(input.evokerLevelSevenSpellId?[input.evokerLevelSevenSpellId]:[])]);
 if(!known.has(newId))throw new RangeError('El nuevo conjuro debe estar en tu libro de Mago');
 const manual=input.spellSelection;
 const next:GuidedWizardInput={...input,preparedIds:input.preparedIds.map(id=>id===oldId?newId:id),
  ...(manual?{spellSelection:{
   learnedIds:[...new Set([...manual.learnedIds,newId])],
   preparedIds:[...new Set([...manual.preparedIds.filter(id=>id!==oldId),newId])],
  }}:{})};
 calculateGuidedWizard(next);
 return next;
}
