import {describe,expect,it} from 'vitest';
import {
 calculateWarlockOne,initialWarlockOneState,makeWarlockCharacterSnapshot,
 validateWarlockCharacterSnapshot,warlockShortRest,warlockLongRest,warlockWeaponProfile,
 type GuidedWarlockInput
} from '../src/warlock';
import {WARLOCK_LEVEL_ONE_CANTRIPS,WARLOCK_LEVEL_ONE_SPELLS,warlockSpellRule,warlockSpellIsShared} from '../src/warlock-spells';
import {wizardSpellRule} from '../src/wizard-spell-details';
import {applyInventoryAction} from '../src/inventory';

const basic:GuidedWarlockInput={
 classId:'warlock',level:1,name:'Lys',background:'acolyte',species:'dwarf',
 assignedAbilities:{strength:8,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:15},
 increaseMode:'two_plus_one',plusTwoAbility:'charisma',plusOneAbility:'wisdom',
 warlockSkills:['arcana','deception'],equipmentChoice:'equipment',
 cantripIds:['eldritch_blast','prestidigitation'],preparedIds:['hex','charm_person'],
 invocations:['pact_of_blade'],pactWeaponId:'sickle'
};

describe('Brujo D&D 2024, nivel 1 (paso 66)',()=>{
 it('calcula PG d8, Carisma, salvaciones, CA por cuero y Magia de Pacto',()=>{
  const sheet=calculateWarlockOne(basic);
  expect(sheet.maximumHitPoints).toBe(10); // 8 + CON 1 + Enano 1
  expect(sheet.abilityScores.charisma).toBe(17);
  expect(sheet.spellAttackBonus).toBe(5);
  expect(sheet.spellSaveDC).toBe(13);
  expect(sheet.armorClass).toBe(13);
  expect(sheet.savingThrowBonuses.charisma).toBe(5);
  expect(sheet.savingThrowBonuses.wisdom).toBe(3);
  expect(sheet.skillProficiencies).toEqual(expect.arrayContaining(['insight','religion','arcana','deception']));
  expect(sheet.inventory.coinsCopper).toBe(2300); // 15 po de clase + 8 po de trasfondo
  expect(sheet.inventory.items.find(item=>item.id==='arcane_focus_orb')?.quantity).toBe(1);
  expect(sheet.inventory.items.find(item=>item.id==='occult_book')?.quantity).toBe(1);
 });

 it('la lista del Brujo reutiliza las instancias existentes del Mago; solo crea conjuros nuevos',()=>{
  expect(WARLOCK_LEVEL_ONE_CANTRIPS).toHaveLength(12);
  expect(WARLOCK_LEVEL_ONE_SPELLS).toHaveLength(15);
  expect(warlockSpellIsShared('charm_person')).toBe(true);
  expect(warlockSpellRule('charm_person')).toBe(wizardSpellRule('charm_person'));
  expect(warlockSpellRule('witch_bolt')).toBe(wizardSpellRule('witch_bolt'));
  expect(warlockSpellIsShared('hex')).toBe(false);
  expect(warlockSpellRule('eldritch_blast')?.rolls[0].formula).toBe('1d10');
 });

 it('Pacto de la Hoja solo funciona cuando el arma seleccionada está equipada',()=>{
  const sheet=calculateWarlockOne(basic);
  const inventory=sheet.inventory;
  expect(inventory.equipped.weapons).not.toContain('sickle');
  expect(()=>warlockWeaponProfile('sickle',inventory,sheet.abilityScores,2,basic.invocations,basic.pactWeaponId)).toThrow();
  const equipped=applyInventoryAction(inventory,{type:'equip_weapon',weaponId:'sickle',equipped:true});
  const pact=warlockWeaponProfile('sickle',equipped,sheet.abilityScores,2,basic.invocations,basic.pactWeaponId);
  expect(pact.pactActive).toBe(true);
  expect(pact.ability).toBe('charisma');
  expect(pact.attackBonus).toBe(5);
  expect(pact.damageBonus).toBe(3);
  const without=warlockWeaponProfile('sickle',equipped,sheet.abilityScores,2,[],basic.pactWeaponId);
  expect(without.pactActive).toBe(false);
  expect(without.ability).toBe('strength');
  expect(without.attackBonus).toBe(1);
  const mundane=warlockWeaponProfile('sickle',equipped,sheet.abilityScores,2,basic.invocations,basic.pactWeaponId,false);
  expect(mundane.ability).toBe('strength');
 });

 it('solo acepta una invocación legal de nivel 1, sin subclase infernal prematura',()=>{
  expect(()=>calculateWarlockOne({...basic,invocations:['pact_of_blade','pact_of_chain']})).toThrow();
  expect(()=>calculateWarlockOne({...basic,invocations:['agonizing_blast' as never]})).toThrow();
  expect(()=>calculateWarlockOne({...basic,level:3 as never})).toThrow();
  expect(()=>calculateWarlockOne({...basic,invocations:['pact_of_chain']})).toThrow(); // no se permite conservar un arma de la Hoja
  expect(calculateWarlockOne({...basic,invocations:['pact_of_chain'],pactWeaponId:undefined}).level).toBe(1);
 });

 it('Cadena permite registrar familiar pero invalida el estado si se retira la invocación',()=>{
  const chain={...basic,invocations:['pact_of_chain' as const],pactWeaponId:undefined};
  const state={...initialWarlockOneState(chain),familiarForm:'imp' as const,familiarName:'Tizón'};
  expect(makeWarlockCharacterSnapshot(chain,state).warlockState.familiarForm).toBe('imp');
  expect(()=>makeWarlockCharacterSnapshot(basic,state)).toThrow();
 });

 it('Armadura de sombras usa CA 13 + DES solo sin armadura y con el efecto activo',()=>{
  const shadows={...basic,invocations:['armor_of_shadows' as const],pactWeaponId:undefined};
  const active={...initialWarlockOneState(shadows),mageArmorActive:true};
  expect(calculateWarlockOne(shadows,active).armorClass).toBe(13); // cuero puesto
  const unarmored=calculateWarlockOne({...shadows,inventoryActions:[{type:'equip_armor' as const,armor:null}]},active);
  expect(unarmored.armorClass).toBe(15);
  expect(()=>makeWarlockCharacterSnapshot(basic,active)).toThrow();
 });

 it('Tomo exige 3 trucos y 2 rituales válidos y registra el libro de forma manual',()=>{
  const tome={...basic,invocations:['pact_of_tome' as const],pactWeaponId:undefined,
   tomeCantripIds:['acid_splash','fire_bolt','light'],tomeRitualIds:['alarm','identify']};
  const state={...initialWarlockOneState(tome),tomePresent:true};
  expect(makeWarlockCharacterSnapshot(tome,state).warlockState.tomePresent).toBe(true);
  expect(()=>calculateWarlockOne({...tome,tomeRitualIds:['alarm','alarm']})).toThrow();
 });

 it('ranura se recupera en descanso corto; largo cura pero no manifiesta un compañero',()=>{
  const current={...initialWarlockOneState(basic),hitPointsCurrent:3,temporaryHitPoints:4,pactSlotSpent:true};
  const short=warlockShortRest(current);
  expect(short.hitPointsCurrent).toBe(3);
  expect(short.pactSlotSpent).toBe(false);
  const long=warlockLongRest(current,10,false);
  expect(long.hitPointsCurrent).toBe(10);
  expect(long.temporaryHitPoints).toBe(0);
  expect(long.familiarForm).toBe(null);
 });

 it('guardado version 4 mantiene elecciones y recursos, y rechaza manipulación de ranuras',()=>{
  const state={...initialWarlockOneState(basic),pactSlotSpent:true};
  const snapshot=makeWarlockCharacterSnapshot(basic,state);
  const loaded=validateWarlockCharacterSnapshot(JSON.parse(JSON.stringify(snapshot)));
  expect(loaded.warlockState.pactSlotSpent).toBe(true);
  expect(loaded.input.pactWeaponId).toBe('sickle');
  expect(()=>validateWarlockCharacterSnapshot({...snapshot,warlockState:{...state,pactSlotSpent:3}})).toThrow();
  expect(()=>validateWarlockCharacterSnapshot({...snapshot,schemaVersion:3})).toThrow();
 });
});
