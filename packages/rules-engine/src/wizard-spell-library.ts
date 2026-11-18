/** Selección manual de conjuros de una ficha de Mago.
 * Independiente de las elecciones obtenidas legalmente por progresión.
 * No limita las cantidades, pero sí valida catálogo, duplicados y dependencia
 * «preparado implica aprendido». La progresión reglamentaria sigue intacta.
 */
import type {GuidedWizardInput} from './wizard-creation';
import {WIZARD_LEVEL_ONE_CANTRIPS,WIZARD_SPELL_CATALOG} from './wizard-creation';

export type WizardSpellSelection=Readonly<{
  learnedIds:readonly string[];
  preparedIds:readonly string[];
}>;
function validIds(){return new Set<string>([...WIZARD_LEVEL_ONE_CANTRIPS,...WIZARD_SPELL_CATALOG].map(spell=>spell.id));}
export function wizardSpellSelection(input:GuidedWizardInput):WizardSpellSelection{
 const base=input.spellSelection??{
  learnedIds:[...input.cantripIds,...input.spellbookIds,...(input.evokerBonusSpellIds??[]),...(input.evokerLevelThreeSpellId?[input.evokerLevelThreeSpellId]:[]),...(input.evokerLevelFourSpellId?[input.evokerLevelFourSpellId]:[]),...(input.evokerLevelFiveSpellId?[input.evokerLevelFiveSpellId]:[]),...(input.evokerLevelSixSpellId?[input.evokerLevelSixSpellId]:[]),...(input.evokerLevelSevenSpellId?[input.evokerLevelSevenSpellId]:[]),...(input.evokerLevelEightSpellId?[input.evokerLevelEightSpellId]:[]),...(input.evokerLevelNineSpellId?[input.evokerLevelNineSpellId]:[])],
  preparedIds:[...input.cantripIds,...input.preparedIds],
 };
 // La biblioteca editable no puede ocultar Maestría ni Conjuros de firma:
 // ambos rasgos conceden preparación permanente adicional.
 const alwaysPrepared=[...(input.level>=18?input.spellMasteryIds??[]:[]),...(input.level>=20?input.signatureSpellIds??[]:[])];
 return alwaysPrepared.length?{
  learnedIds:[...new Set([...base.learnedIds,...alwaysPrepared])],
  preparedIds:[...new Set([...base.preparedIds,...alwaysPrepared])],
 }:base;
}
export function validateWizardSpellSelection(raw:unknown):WizardSpellSelection{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new RangeError('Biblioteca manual inválida');
 const obj=raw as Record<string,unknown>;
 if(Object.keys(obj).some(key=>key!=='learnedIds'&&key!=='preparedIds')||!Array.isArray(obj.learnedIds)||!Array.isArray(obj.preparedIds))
  throw new RangeError('Biblioteca manual incompleta');
 const learned=obj.learnedIds as unknown[],prepared=obj.preparedIds as unknown[];
 const ids=validIds();
 const valid=(list:unknown[])=>list.every(id=>typeof id==='string'&&ids.has(id))&&new Set(list).size===list.length;
 if(!valid(learned)||!valid(prepared))throw new RangeError('Conjuros desconocidos, duplicados o demasiadas entradas');
 if(prepared.some(id=>!learned.includes(id)))throw new RangeError('Un conjuro preparado debe estar aprendido');
 return {learnedIds:[...learned] as string[],preparedIds:[...prepared] as string[]};
}
export function setWizardSpellLearned(selection:WizardSpellSelection,id:string,learned:boolean):WizardSpellSelection{
 const old=validateWizardSpellSelection(selection);
 if(!validIds().has(id))throw new RangeError('Conjuro desconocido');
 return validateWizardSpellSelection(learned?{
  learnedIds:old.learnedIds.includes(id)?old.learnedIds:[...old.learnedIds,id],preparedIds:old.preparedIds
 }:{learnedIds:old.learnedIds.filter(x=>x!==id),preparedIds:old.preparedIds.filter(x=>x!==id)});
}
export function setWizardSpellPrepared(selection:WizardSpellSelection,id:string,prepared:boolean):WizardSpellSelection{
 const old=validateWizardSpellSelection(selection);
 if(!old.learnedIds.includes(id))throw new RangeError('Primero debes aprender el conjuro');
 return validateWizardSpellSelection({learnedIds:old.learnedIds,preparedIds:prepared?[...new Set([...old.preparedIds,id])]:old.preparedIds.filter(x=>x!==id)});
}
/** Se añaden las nuevas elecciones reglamentarias sin borrar la biblioteca manual. */
export function mergeWizardLevelSpells(previous:GuidedWizardInput,learned:readonly string[],prepared:readonly string[]):WizardSpellSelection|undefined{
 if(previous.spellSelection===undefined)return undefined;
 const selection=wizardSpellSelection(previous);
 const gainedCantrips=learned.filter(id=>WIZARD_LEVEL_ONE_CANTRIPS.some(spell=>spell.id===id));
 return validateWizardSpellSelection({
  learnedIds:[...new Set([...selection.learnedIds,...learned])],
  preparedIds:[...new Set([...selection.preparedIds,...gainedCantrips,...prepared.filter(id=>!previous.preparedIds.includes(id)&&(selection.learnedIds.includes(id)||learned.includes(id)))])],
 });
}
