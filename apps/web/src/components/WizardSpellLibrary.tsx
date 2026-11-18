'use client';
import {wizardProgression} from '../../../../packages/rules-engine/src/wizard';
import {WIZARD_SPELL_RULES} from '../../../../packages/rules-engine/src/wizard-spell-details';
import {setWizardSpellLearned,setWizardSpellPrepared,wizardEditableSpellSelection,wizardSpellSelection,type WizardSpellSelection} from '../../../../packages/rules-engine/src/wizard-spell-library';
import type {GuidedWizardInput} from '../../../../packages/rules-engine/src/wizard-creation';
import type {D20Mode} from '../../../../packages/rules-engine/src/d20';
import SpellLibraryPanel from './SpellLibraryPanel';

type Props=Readonly<{input:GuidedWizardInput;spellAttackBonus:number;spellSaveDC:number;mode:D20Mode;onChange:(selection:WizardSpellSelection)=>void}>;
/** Adaptador de reglas de Mago al panel de biblioteca común a las clases lanzadoras. */
export default function WizardSpellLibrary({input,spellAttackBonus,spellSaveDC,mode,onChange}:Props){
 // La vista incluye Maestría y firmas; las acciones escriben solo la base editable.
 const selection=wizardSpellSelection(input);
 const editable=wizardEditableSpellSelection(input);
 const recommended=wizardProgression(input.level,input.level>=3?'evoker':undefined);
 const mastered=new Set([...(input.level>=18?input.spellMasteryIds??[]:[]),...(input.level>=20?input.signatureSpellIds??[]:[])]);
 return <SpellLibraryPanel
  rules={WIZARD_SPELL_RULES}
  classLists={[{id:'wizard',label:'Mago',spellIds:WIZARD_SPELL_RULES.map(spell=>spell.id)}]}
  selection={selection}
  limits={{cantrips:recommended.cantripsKnown,learnedMinimum:recommended.minimumSpellbookCount,prepared:recommended.preparedSpellCount}}
  characterLevel={input.level} spellAttackBonus={spellAttackBonus} spellSaveDC={spellSaveDC} mode={mode}
  onLearned={(id,checked)=>{if(!mastered.has(id))onChange(setWizardSpellLearned(editable,id,checked));}}
  onPrepared={(id,checked)=>{if(!mastered.has(id))onChange(setWizardSpellPrepared(editable,id,checked));}}
 />;
}
