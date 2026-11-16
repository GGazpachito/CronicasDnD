import {describe,it,expect} from 'vitest';
import {
 calculateGuidedWizardOne,initialWizardOneState,makeWizardCharacterSnapshot,
 wizardInputForPreview,WIZARD_LEVEL_ONE_DEFAULTS,type GuidedWizardInput,
} from '../src/wizard-creation';

const creation:GuidedWizardInput={
 classId:'wizard',level:1,name:'',background:'sage',species:'dwarf',
 assignedAbilities:{strength:8,dexterity:13,constitution:14,intelligence:15,wisdom:12,charisma:10},
 increaseMode:'two_plus_one',plusTwoAbility:'intelligence',plusOneAbility:'constitution',
 wizardSkills:['insight','investigation'],equipmentChoice:'equipment',
 cantripIds:[...WIZARD_LEVEL_ONE_DEFAULTS.cantrips],
 spellbookIds:[...WIZARD_LEVEL_ONE_DEFAULTS.spellbook],
 preparedIds:[...WIZARD_LEVEL_ONE_DEFAULTS.prepared],
};

describe('Actualización 50.1: prerender seguro del creador de Mago',()=>{
 it('inicializa la vista de nivel 1 aunque el nombre del formulario esté vacío',()=>{
  const preview=wizardInputForPreview(creation);
  const state=initialWizardOneState(preview);
  const sheet=calculateGuidedWizardOne(preview);
  expect(creation.name).toBe('');
  expect(preview.name).toBe('Mago provisional');
  expect(state.hitPointsCurrent).toBe(sheet.maximumHitPoints);
  expect(state.hitPointsCurrent).toBe(9);
  expect(state.magic.slots.remaining[0]).toBe(2);
 });
 it('no permite persistir un nombre vacío ni introduce el nombre provisional en el guardado',()=>{
  const state=initialWizardOneState(wizardInputForPreview(creation));
  expect(()=>calculateGuidedWizardOne(creation)).toThrow(/Nombre de Mago inválido/);
  expect(()=>makeWizardCharacterSnapshot(creation,state)).toThrow(/Nombre de Mago inválido/);
  const saved=makeWizardCharacterSnapshot({...creation,name:'Lyra'},state);
  expect(saved.input.name).toBe('Lyra');
  expect(saved.input.name).not.toBe('Mago provisional');
 });
 it('respeta nombres existentes y campos solo con espacios',()=>{
  expect(wizardInputForPreview({...creation,name:'  '}).name).toBe('Mago provisional');
  const named={...creation,name:'Lyra'};
  expect(wizardInputForPreview(named)).toBe(named);
 });
 it('mantiene las demás validaciones y permite consultar el inventario en un borrador',()=>{
  expect(()=>calculateGuidedWizardOne(wizardInputForPreview({...creation,name:'x'.repeat(121)}))).toThrow();
  expect(()=>calculateGuidedWizardOne(wizardInputForPreview({...creation,cantripIds:['invalid']}))).toThrow();
  const preview=wizardInputForPreview({...creation,inventoryActions:[{type:'adjust_coins',deltaCopper:25}]});
  expect(calculateGuidedWizardOne(preview).inventory.coinsCopper).toBe(1325);
 });
});
