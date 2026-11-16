import {describe,it,expect} from 'vitest';
import {calculateGuidedWizardOne,initialWizardOneState,makeWizardCharacterSnapshot,validateWizardCharacterSnapshot,WIZARD_LEVEL_ONE_DEFAULTS,type GuidedWizardInput} from '../src/wizard-creation';
import {wizardSlotMarks,toggleWizardSlotMark,recoverWizardArcaneSlot,resetWizardSlots} from '../src/wizard-slot-marks';
import {wizardStartingInventory} from '../src/wizard-inventory';
import {collectWizardTraits} from '../src/wizard-traits';
import {initialInventoryState,applyInventoryAction} from '../src/inventory';
const base:GuidedWizardInput={classId:'wizard',level:1,name:'Elira',species:'dwarf',background:'sage',
 assignedAbilities:{strength:8,dexterity:13,constitution:14,intelligence:15,wisdom:12,charisma:10},
 increaseMode:'two_plus_one',plusTwoAbility:'intelligence',plusOneAbility:'constitution',
 wizardSkills:['insight','investigation'],equipmentChoice:'equipment',
 cantripIds:[...WIZARD_LEVEL_ONE_DEFAULTS.cantrips],spellbookIds:[...WIZARD_LEVEL_ONE_DEFAULTS.spellbook],preparedIds:[...WIZARD_LEVEL_ONE_DEFAULTS.prepared]};
describe('Actualización 50: hojas compartidas y persistencia compatible',()=>{
 it('incluye equipo inicial completo y el equipo del trasfondo en un solo inventario',()=>{
  const inv=calculateGuidedWizardOne(base).inventory;
  expect(inv.items.find(i=>i.id==='dagger')?.quantity).toBe(2);
  expect(inv.items.some(i=>i.id==='spellbook')).toBe(true);
  expect(inv.items.some(i=>i.id==='scholars_pack')).toBe(true);
  expect(inv.items.some(i=>i.id==='quarterstaff')).toBe(true);
  expect(inv.items.some(i=>i.id==='book_history')).toBe(true);
  expect(inv.coinsCopper).toBe(1300);
 });
 it('admite el equipo monetario alternativo y evita regalar las dagas',()=>{
  const view=calculateGuidedWizardOne({...base,equipmentChoice:'gold',backgroundEquipment:{startingPackage:'b'}});
  expect(view.inventory.coinsCopper).toBe(10500);
  expect(view.inventory.items.some(i=>i.id==='dagger')).toBe(false);
  expect(view.inventory.items.some(i=>i.id==='spellbook')).toBe(true);
 });
 it('guarda y recupera compras, equipamientos y monedas en la ficha del Mago',()=>{
  const actions=[{type:'equip_weapon',weaponId:'dagger',equipped:true} as const,{type:'add',itemId:'shield',quantity:1} as const,{type:'adjust_coins',deltaCopper:40} as const];
  const input={...base,inventoryActions:actions};
  const saved=makeWizardCharacterSnapshot(input,initialWizardOneState(input));
  const restored=validateWizardCharacterSnapshot(JSON.parse(JSON.stringify(saved)));
  const view=calculateGuidedWizardOne(restored.input);
  expect(view.inventory.equipped.weapons).toContain('dagger');
  expect(view.inventory.items.some(i=>i.id==='shield')).toBe(true);
  expect(view.inventory.coinsCopper).toBe(1340);
 });
 it('rechaza operaciones de equipo sin existencia o saldos insuficientes',()=>{
  expect(()=>calculateGuidedWizardOne({...base,inventoryActions:[{type:'equip_weapon',weaponId:'greatsword',equipped:true}]})).toThrow();
  expect(()=>calculateGuidedWizardOne({...base,inventoryActions:[{type:'adjust_coins',deltaCopper:-20000}]})).toThrow();
 });
 it('un Mago no obtiene +2 de CA por un escudo sin competencia',()=>{
  const input={...base,inventoryActions:[{type:'add',itemId:'shield',quantity:1} as const,{type:'equip_shield',equipped:true} as const]};
  expect(calculateGuidedWizardOne(input).armorClass).toBe(calculateGuidedWizardOne(base).armorClass);
 });
 it('cada rombo representa exactamente una ranura persistida e independiente',()=>{
  const initial=initialWizardOneState(base);
  const one=toggleWizardSlotMark(initial,1);
  expect(wizardSlotMarks(one)).toEqual([false,true]);
  expect(one.magic.slots.remaining[0]).toBe(1);
  const stored=makeWizardCharacterSnapshot(base,one);
  expect(validateWizardCharacterSnapshot(JSON.parse(JSON.stringify(stored))).wizardState.slotMarks).toEqual([false,true]);
  const two=toggleWizardSlotMark(one,0);
  expect(wizardSlotMarks(two)).toEqual([true,true]);
  expect(two.magic.slots.remaining[0]).toBe(0);
  expect(wizardSlotMarks(toggleWizardSlotMark(two,1))).toEqual([true,false]);
 });
 it('Recuperación arcana recupera una marca y el descanso largo limpia ambas',()=>{
  const spent=toggleWizardSlotMark(toggleWizardSlotMark(initialWizardOneState(base),0),1);
  const recovered=recoverWizardArcaneSlot(spent);
  expect(recovered.magic.arcaneRecoveryUsed).toBe(true);
  expect(recovered.magic.slots.remaining[0]).toBe(1);
  expect(wizardSlotMarks(recovered).filter(Boolean)).toHaveLength(1);
  expect(resetWizardSlots(recovered).magic.slots.remaining[0]).toBe(2);
  expect(wizardSlotMarks(resetWizardSlots(recovered))).toEqual([false,false]);
 });
 it('los guardados antiguos sin rombos ni inventario explícito son válidos',()=>{
  const saved=makeWizardCharacterSnapshot(base,{...initialWizardOneState(base),magic:{...initialWizardOneState(base).magic,slots:{maximum:[2,0,0,0,0,0,0,0,0],remaining:[1,0,0,0,0,0,0,0,0]}}});
  const old=JSON.parse(JSON.stringify(saved));delete old.wizardState.slotMarks;delete old.input.inventoryActions;delete old.input.backgroundEquipment;
  const recovered=validateWizardCharacterSnapshot(old);
  expect(recovered.wizardState.magic.slots.remaining[0]).toBe(1);
  expect(wizardSlotMarks(recovered.wizardState)).toEqual([true,false]);
  expect(calculateGuidedWizardOne(recovered.input).inventory.items.length).toBeGreaterThan(0);
 });
 it('rechaza marcas incompatibles con el gasto real',()=>{
  const saved=makeWizardCharacterSnapshot(base);
  expect(()=>validateWizardCharacterSnapshot({...saved,wizardState:{...saved.wizardState,slotMarks:[true,true]}})).toThrow();
 });
 it('la proyección de rasgos del Mago comparte categorías y descripciones',()=>{
  const result=collectWizardTraits(base,calculateGuidedWizardOne(base));
  expect(result.traits.some(t=>t.title==='Adepto ritual'&&Boolean(t.explanation))).toBe(true);
  expect(result.traits.some(t=>t.group==='species'&&Boolean(t.explanation))).toBe(true);
  expect(result.traits.some(t=>t.group==='feats'&&Boolean(t.explanation))).toBe(true);
  expect(result.traits.some(t=>t.group==='subclass')).toBe(false);
 });
});
