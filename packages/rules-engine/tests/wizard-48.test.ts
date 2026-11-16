import {describe,it,expect} from 'vitest';
import {
 calculateGuidedWizardOne,initialWizardOneState,makeWizardCharacterSnapshot,
 validateWizardCharacterSnapshot,validateWizardOneState,
 WIZARD_LEVEL_ONE_DEFAULTS,type GuidedWizardInput,
} from '../src/wizard-creation';
import {wizardUseSlot,wizardArcaneRecovery,wizardLongRest} from '../src/wizard';
const wizard:GuidedWizardInput={classId:'wizard',level:1,name:'Elira',species:'dwarf',background:'sage',
 assignedAbilities:{strength:8,dexterity:13,constitution:14,intelligence:15,wisdom:12,charisma:10},
 increaseMode:'two_plus_one',plusTwoAbility:'intelligence',plusOneAbility:'constitution',
 wizardSkills:['insight','investigation'],equipmentChoice:'equipment',
 cantripIds:[...WIZARD_LEVEL_ONE_DEFAULTS.cantrips],spellbookIds:[...WIZARD_LEVEL_ONE_DEFAULTS.spellbook],
 preparedIds:[...WIZARD_LEVEL_ONE_DEFAULTS.prepared]};
const make=(patch:Partial<GuidedWizardInput>={})=>({...wizard,...patch});
describe('Actualización 48: Mago inicial y persistencia independiente',()=>{
 it('aplica el origen y las características oficiales de Mago nivel 1',()=>{
  const s=calculateGuidedWizardOne(wizard);
  expect(s.level).toBe(1);expect(s.abilityScores.intelligence).toBe(17);
  expect(s.maximumHitPoints).toBe(9); // 6+CON 2 + 1 por enano
  expect(s.spellSaveDC).toBe(13);expect(s.spellAttackBonus).toBe(5);
  expect(s.savingThrowBonuses.intelligence).toBe(5);
  expect(s.savingThrowBonuses.wisdom).toBe(3);
  expect(s.skillProficiencies).toContain('arcana');expect(s.skillProficiencies).toContain('insight');
  expect(s.spells.cantrips).toHaveLength(3);expect(s.spells.spellbook).toHaveLength(6);
  expect(s.spells.preparedIds).toHaveLength(4);
 });
 it('no concede el dado de golpe ni los recursos de Guerrero',()=>{
  const state=initialWizardOneState(wizard);
  expect(state.magic.slots.remaining[0]).toBe(2);
  expect('fighter' in state).toBe(false);
 });
 it('valida que los valores de la matriz sean únicos',()=>{
  expect(()=>calculateGuidedWizardOne(make({assignedAbilities:{...wizard.assignedAbilities,strength:15}}))).toThrow();
 });
 it('impide competencias de clase duplicadas y solapadas con trasfondo',()=>{
  expect(()=>calculateGuidedWizardOne(make({wizardSkills:['insight','insight']}))).toThrow();
  expect(()=>calculateGuidedWizardOne(make({wizardSkills:['arcana','insight']}))).toThrow();
 });
 it('no deja elegir conjuros ajenos al catálogo, duplicados o no preparados del libro',()=>{
  expect(()=>calculateGuidedWizardOne(make({spellbookIds:['fireball',...wizard.spellbookIds.slice(1)]}))).toThrow();
  expect(()=>calculateGuidedWizardOne(make({cantripIds:['light','light','mage_hand']}))).toThrow();
  expect(()=>calculateGuidedWizardOne(make({preparedIds:['sleep','mage_armor','magic_missile','fake']}))).toThrow();
 });
 it('registra usos de ranuras y Recuperación arcana, con descanso largo',()=>{
  const initial=initialWizardOneState(wizard);
  const used={...initial,magic:wizardUseSlot(initial.magic,1)};
  expect(used.magic.slots.remaining[0]).toBe(1);
  const recovered={...used,magic:wizardArcaneRecovery(used.magic,1,[1])};
  expect(recovered.magic.slots.remaining[0]).toBe(2);expect(recovered.magic.arcaneRecoveryUsed).toBe(true);
  expect(()=>wizardArcaneRecovery(recovered.magic,1,[1])).toThrow();
  expect(wizardLongRest(recovered.magic,1).arcaneRecoveryUsed).toBe(false);
 });
 it('guarda y recupera el Mago incluyendo ranuras, daño y texto narrativo',()=>{
  const input=make({profile:{age:'',height:'',weight:'',eyes:'',hair:'',skin:'',appearance:'',personality:'',ideals:'',bonds:'',flaws:'',backstory:'En la biblioteca',notes:'Apunte 1'}});
  const initial=initialWizardOneState(input);
  const modified={...initial,hitPointsCurrent:5,magic:wizardUseSlot(initial.magic,1)};
  const stored=makeWizardCharacterSnapshot(input,modified);
  const recovered=validateWizardCharacterSnapshot(JSON.parse(JSON.stringify(stored)));
  expect(recovered.schemaVersion).toBe(3);
  expect(recovered.wizardState.hitPointsCurrent).toBe(5);
  expect(recovered.wizardState.magic.slots.remaining[0]).toBe(1);
  expect(recovered.input.profile?.notes).toBe('Apunte 1');
 });
 it('rechaza estados con PG excedidos o ranuras alteradas',()=>{
  const state=initialWizardOneState(wizard),sheet=calculateGuidedWizardOne(wizard);
  expect(()=>validateWizardOneState({...state,hitPointsCurrent:sheet.maximumHitPoints+1},sheet)).toThrow();
  expect(()=>validateWizardOneState({...state,magic:{...state.magic,slots:{maximum:[3,0,0,0,0,0,0,0,0],remaining:[2,0,0,0,0,0,0,0,0]}}},sheet)).toThrow();
 });
 it('no admite Mago de nivel 2 en el creador inicial',()=>{
  expect(()=>calculateGuidedWizardOne({...wizard,level:2} as unknown as GuidedWizardInput)).toThrow();
 });
 it('concede inspiración heroica inicial al Humano y mantiene la del Enano desactivada',()=>{
  expect(initialWizardOneState(make({species:'human',humanSkill:'perception',humanFeat:'alert',humanSize:'medium'})).heroicInspiration).toBe(true);
  expect(initialWizardOneState(wizard).heroicInspiration).toBe(false);
 });
 it('rechaza subclases o campos inyectados en un guardado de nivel 1',()=>{
  const saved=makeWizardCharacterSnapshot(wizard);
  expect(()=>validateWizardCharacterSnapshot({...saved,input:{...saved.input,subclass:'evoker'}})).toThrow();
 });
 it('mantiene opción de tamaño pequeño para humano y Mediano',()=>{
  const human=calculateGuidedWizardOne(make({species:'human',humanSkill:'perception',humanFeat:'alert',humanSize:'small'}));
  expect(human.size).toBe('small');expect(human.initiative).toBe(3);
  expect(calculateGuidedWizardOne(make({species:'halfling'})).size).toBe('small');
 });
 it('conserva la velocidad del elfo silvano y el tamaño del enano',()=>{
  expect(calculateGuidedWizardOne(make({species:'elf',elfLineage:'wood_elf'})).speedFeet).toBe(35);
  expect(calculateGuidedWizardOne(wizard).size).toBe('medium');
 });
});
