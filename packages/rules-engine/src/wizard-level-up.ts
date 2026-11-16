/** Actualización 51: subida atómica de Mago 1→2→3 (PHB 2024 pp. 165-169 y 174).
 * Reutiliza el modelo de fichas, no introduce un estado de Guerrero.
 */
import {wizardAdvanceMagicState,wizardProgression,WIZARD_FEATURES,EVOKER_FEATURES} from './wizard';
import {calculateGuidedWizard,validateWizardOneState,WIZARD_SPELL_CATALOG,WIZARD_SCHOLAR_OPTIONS,
 type GuidedWizardInput,type WizardLevelOneState,type WizardScholarSkill} from './wizard-creation';
import {wizardAllSlotMarks} from './wizard-slot-marks';
export type WizardLevelUpChoices=Readonly<{
 newSpellIds:readonly [string,string];
 preparedIds:readonly string[];
 scholarSkill?:WizardScholarSkill;
 evokerBonusSpellIds?:readonly [string,string];
}>;
export type WizardLevelUpResult=Readonly<{
 input:GuidedWizardInput;state:WizardLevelOneState;
 gainedFeatures:readonly {title:string;description:string}[];
 hitPointsIncrease:number;
}>;
export function prepareWizardLevelUp(input:GuidedWizardInput,state:WizardLevelOneState,choices:WizardLevelUpChoices):WizardLevelUpResult{
 if(input.level!==1&&input.level!==2)throw new RangeError('La progresión guiada de Mago llega actualmente a nivel 3');
 const prior=calculateGuidedWizard(input);
 validateWizardOneState(state,prior);
 const nextLevel=input.level+1 as 2|3;
 const newIds=choices.newSpellIds;
 if(!Array.isArray(newIds)||newIds.length!==2||new Set(newIds).size!==2||newIds.some(id=>input.spellbookIds.includes(id)))
  throw new RangeError('Debes añadir dos conjuros nuevos y diferentes al libro');
 const catalog=new Map<string,(typeof WIZARD_SPELL_CATALOG)[number]>(WIZARD_SPELL_CATALOG.map(spell=>[spell.id,spell]));
 const highest=nextLevel===2?1:2;
 if(newIds.some(id=>!catalog.has(id)||catalog.get(id)!.level>highest))throw new RangeError('Conjuros fuera del catálogo o nivel disponible');
 if(nextLevel===2&&(!WIZARD_SCHOLAR_OPTIONS.includes(choices.scholarSkill as WizardScholarSkill)||choices.evokerBonusSpellIds!==undefined))
  throw new RangeError('Elige una habilidad válida para Erudito');
 if(nextLevel===3&&choices.scholarSkill!==undefined)throw new RangeError('La pericia de Erudito se elige una sola vez');
 if(nextLevel===3){
  const bonus=choices.evokerBonusSpellIds;
  if(!Array.isArray(bonus)||bonus.length!==2||new Set(bonus).size!==2||bonus.some(id=>!catalog.has(id)||catalog.get(id)!.level>2||catalog.get(id)!.school!=='evocation'||newIds.includes(id)||input.spellbookIds.includes(id)))
   throw new RangeError('Evocación concede dos conjuros gratuitos nuevos de niveles 1 o 2');
 }
 if(input.preparedIds.some(id=>!choices.preparedIds.includes(id)))throw new RangeError('Los conjuros preparados anteriores se conservan hasta completar un descanso largo');
 const nextInput:GuidedWizardInput={...input,level:nextLevel,
  spellbookIds:[...input.spellbookIds,...newIds],preparedIds:[...choices.preparedIds],
  ...(nextLevel===2?{scholarSkill:choices.scholarSkill}:{subclass:'evoker' as const,evokerBonusSpellIds:choices.evokerBonusSpellIds})};
 const next=calculateGuidedWizard(nextInput);
 const magic=wizardAdvanceMagicState(state.magic,input.level,nextLevel===3?'evoker':undefined);
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
 if(input.level!==1&&input.level!==2)return null;
 const nextLevel=input.level+1;
 const progression=wizardProgression(nextLevel,nextLevel===3?'evoker':undefined);
 return {nextLevel,progression,features:[...WIZARD_FEATURES,...EVOKER_FEATURES].filter(f=>f.level===nextLevel)};
}
