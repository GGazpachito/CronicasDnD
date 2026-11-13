import {describe,expect,it} from 'vitest';
import {combineStartingInventory,validateBackgroundEquipment} from '../src/background-equipment';
import {applyInventoryAction,coinAdjustment,coinBreakdown,initialInventoryState,replayInventory} from '../src/inventory';
import {equippedWeaponChoices,calculateOwnedWeaponAttack,resolveWeaponDamage,resolveWeaponAttack} from '../src/attacks';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';
import {makeCharacterSnapshot,validateCharacterSnapshot} from '../src/persistence';

const starting=()=>combineStartingInventory('a',validateBackgroundEquipment('soldier',{startingPackage:'a',gamingSet:'dice_set'}));
const inventory=()=>initialInventoryState(starting(),'chain_mail');
const input=():GuidedFighterInput=>({
  name:'Guerrero de prueba',level:1,background:'soldier',species:'human',
  assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
  increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
  fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'tough',humanSize:'medium',
  armor:'chain_mail',shield:false,martial:{fightingStyle:'defense',weaponMasteries:['greatsword','flail','javelin'],startingPackage:'a'},
  backgroundEquipment:{startingPackage:'a',gamingSet:'dice_set'},
});

describe('Actualización 41.2: monedero editable y tiradas desde Principal',()=>{
  it('presenta platino por encima de oro, plata y cobre sin perder precisión',()=>{
    expect(coinBreakdown(0)).toEqual({platinum:0,gold:0,silver:0,copper:0});
    expect(coinBreakdown(12_345)).toEqual({platinum:12,gold:3,silver:4,copper:5});
    expect(coinBreakdown(1000)).toEqual({platinum:1,gold:0,silver:0,copper:0});
  });
  it('suma y resta cualquier denominación en el saldo compartido',()=>{
    const start=inventory();
    const increased=applyInventoryAction(start,coinAdjustment('platinum',2));
    const reduced=applyInventoryAction(increased,coinAdjustment('gold',-5));
    const silver=applyInventoryAction(reduced,coinAdjustment('silver',3));
    const copper=applyInventoryAction(silver,coinAdjustment('copper',-4));
    expect(start.coinsCopper).toBe(1800);
    expect(increased.coinsCopper).toBe(3800);
    expect(copper.coinsCopper).toBe(3326);
  });
  it('impide fondos negativos, cantidades fraccionarias y monedas desconocidas',()=>{
    expect(()=>applyInventoryAction(inventory(),coinAdjustment('platinum',-2))).toThrow(/Saldo/);
    expect(()=>coinAdjustment('silver',0)).toThrow(/entero/);
    expect(()=>coinAdjustment('gold',0.5)).toThrow(/entero/);
    expect(()=>coinAdjustment('gold',1_000_001)).toThrow(/millón/);
    expect(()=>coinAdjustment('diamante' as never,1)).toThrow(/Denominación/);
    expect(()=>applyInventoryAction(inventory(),{type:'adjust_coins',deltaCopper:1.5})).toThrow(/entero/);
    expect(()=>coinBreakdown(-1)).toThrow(/rango/);
  });
  it('reproduce las operaciones sin alterar el inventario original ni la compra tradicional',()=>{
    const actions=[coinAdjustment('platinum',1),{type:'buy' as const,itemId:'shield' as const,quantity:1},coinAdjustment('copper',-5)];
    const next=replayInventory(starting(),'chain_mail',actions);
    expect(next.coinsCopper).toBe(1795); // 18 po + 1 ppt - 10 po por el escudo - 5 pc
    expect(next.items.find(item=>item.id==='shield')?.quantity).toBe(1);
    expect(replayInventory(starting(),'chain_mail',actions)).toEqual(next);
    expect(inventory().coinsCopper).toBe(1800);
  });
  it('conserva monedas y armas equipadas en guardados v2',()=>{
    const value={...input(),inventoryActions:[coinAdjustment('platinum',2),{type:'equip_weapon' as const,weaponId:'greatsword' as const,equipped:true}]};
    const snap=makeCharacterSnapshot(value);
    const restored=validateCharacterSnapshot(JSON.parse(JSON.stringify(snap)));
    expect(restored.schemaVersion).toBe(2);
    const recovered=calculateGuidedFighter(restored.input).inventory!;
    expect(recovered.coinsCopper).toBe(3800);
    expect(equippedWeaponChoices(recovered).map(c=>c.selectionId)).toEqual(['normal:greatsword']);
  });
  it('solo ofrece armas mundanas marcadas y objetos mágicos realmente equipados',()=>{
    const base=inventory();
    expect(equippedWeaponChoices(base)).toHaveLength(0);
    const equipped=applyInventoryAction(base,{type:'equip_weapon',weaponId:'greatsword',equipped:true});
    expect(equippedWeaponChoices(equipped).map(c=>c.selectionId)).toEqual(['normal:greatsword']);
    const granted=applyInventoryAction(equipped,{type:'magic_grant',itemId:'weapon_enhancement',weaponId:'longsword',enhancement:1});
    expect(equippedWeaponChoices(granted)).toHaveLength(1);
    const worn=applyInventoryAction(granted,{type:'magic_wear',instanceId:granted.magicItems[0].instanceId,worn:true});
    expect(equippedWeaponChoices(worn).map(c=>c.selectionId)).toEqual(['normal:greatsword',`magic:${granted.magicItems[0].instanceId}`]);
    const removed=applyInventoryAction(worn,{type:'equip_weapon',weaponId:'greatsword',equipped:false});
    expect(equippedWeaponChoices(removed)).toHaveLength(1);
  });
  it('los bonificadores y el daño provienen del calculador existente',()=>{
    const value=calculateGuidedFighter({...input(),inventoryActions:[{type:'equip_weapon',weaponId:'greatsword',equipped:true}]});
    const inv=value.inventory!;
    const martial=input().martial!;
    const profile=calculateOwnedWeaponAttack(value.sheet,inv,'normal:greatsword',martial.fightingStyle,martial.weaponMasteries);
    expect(profile.attackBonus).toBe(value.sheet.abilityModifiers.strength+value.sheet.proficiencyBonus);
    expect(profile.damageDice).toEqual({count:2,sides:6});
    const damage=resolveWeaponDamage(profile,[2,5]);
    const resolution=resolveWeaponAttack(profile,{firstD20:15,damageRolls:[2,5]});
    expect(damage.total).toBe(resolution.damageTotal);
    expect(resolveWeaponDamage(profile,[1,2,4,6],true).dice).toHaveLength(4);
    expect(()=>resolveWeaponDamage(profile,[6],true)).toThrow(/4 resultados/);
  });
});
