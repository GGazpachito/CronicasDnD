import {describe,expect,it} from 'vitest';
import {combineStartingInventory,validateBackgroundEquipment} from '../src/background-equipment';
import {applyInventoryAction,initialInventoryState,replayInventory} from '../src/inventory';
import {equippedInventory,inventoryOverview} from '../src/inventory-view';
import {makeCharacterSnapshot,validateCharacterSnapshot} from '../src/persistence';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';

const starting=()=>combineStartingInventory('a',validateBackgroundEquipment('soldier',{startingPackage:'a',gamingSet:'dice_set'}));
const base=()=>initialInventoryState(starting(),'chain_mail');

describe('Actualización 41.1: casillas y objetos equipados',()=>{
  it('las armas se marcan mediante acciones persistentes sin duplicar inventario',()=>{
    const initial=base();
    const next=applyInventoryAction(initial,{type:'equip_weapon',weaponId:'greatsword',equipped:true});
    expect(initial.equipped.weapons).toEqual([]);
    expect(next.equipped.weapons).toEqual(['greatsword']);
    expect(inventoryOverview(next).entries.find(i=>i.id==='greatsword')?.equipped).toBe(true);
    expect(equippedInventory(next).some(i=>i.key==='normal:greatsword')).toBe(true);
    expect(next.items).toEqual(initial.items);
    expect(replayInventory(starting(),'chain_mail',[{type:'equip_weapon',weaponId:'greatsword',equipped:true}])).toEqual(next);
  });
  it('marcar y desmarcar varias armas nunca genera duplicados',()=>{
    const x=applyInventoryAction(base(),{type:'equip_weapon',weaponId:'greatsword',equipped:true});
    const y=applyInventoryAction(x,{type:'equip_weapon',weaponId:'greatsword',equipped:true});
    const z=applyInventoryAction(y,{type:'equip_weapon',weaponId:'javelin',equipped:true});
    expect(z.equipped.weapons).toEqual(['greatsword','javelin']);
    expect(applyInventoryAction(z,{type:'equip_weapon',weaponId:'greatsword',equipped:false}).equipped.weapons).toEqual(['javelin']);
  });
  it('no deja equipar armas que no posea ni ids desconocidos',()=>{
    expect(()=>applyInventoryAction(base(),{type:'equip_weapon',weaponId:'longbow',equipped:true})).toThrow(/poseer/);
    expect(()=>applyInventoryAction(base(),{type:'equip_weapon',weaponId:'desconocida' as never,equipped:true})).toThrow(/reconocida/);
    expect(()=>applyInventoryAction(base(),{type:'equip_weapon',weaponId:'greatsword',equipped:1 as never})).toThrow(/inválido/);
  });
  it('al vender o descartar la última unidad se desequipa automáticamente',()=>{
    const x=applyInventoryAction(base(),{type:'equip_weapon',weaponId:'greatsword',equipped:true});
    const removed=applyInventoryAction(x,{type:'remove',itemId:'greatsword',quantity:1});
    expect(removed.equipped.weapons).toEqual([]);
    expect(equippedInventory(removed).some(i=>i.key==='normal:greatsword')).toBe(false);
  });
  it('las armaduras y los escudos siguen usando sus reglas existentes',()=>{
    const x=base();
    const shield=applyInventoryAction(x,{type:'add',itemId:'shield',quantity:1});
    const worn=applyInventoryAction(shield,{type:'equip_shield',equipped:true});
    const view=equippedInventory(worn);
    expect(view.some(i=>i.key==='normal:chain_mail'&&i.category==='armor')).toBe(true);
    expect(view.some(i=>i.key==='normal:shield'&&i.category==='shield')).toBe(true);
  });
  it('conserva las armas marcadas en un guardado de personaje v2',()=>{
    const input:GuidedFighterInput={
      name:'Guerrero de prueba',level:1,background:'soldier',species:'human',
      assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
      increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
      fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'tough',humanSize:'medium',
      armor:'chain_mail',shield:false,
      martial:{fightingStyle:'defense',weaponMasteries:['greatsword','flail','javelin'],startingPackage:'a'},
      backgroundEquipment:{startingPackage:'a',gamingSet:'dice_set'},
      inventoryActions:[{type:'equip_weapon',weaponId:'greatsword',equipped:true}],
    };
    const restored=validateCharacterSnapshot(JSON.parse(JSON.stringify(makeCharacterSnapshot(input))));
    expect(restored.schemaVersion).toBe(2);
    expect(calculateGuidedFighter(restored.input).inventory?.equipped.weapons).toEqual(['greatsword']);
  });
  it('recupera diarios antiguos y muestra equipo mágico sin contaminar el mundano',()=>{
    const before=replayInventory(starting(),'chain_mail',[{type:'equip_armor',armor:null}]);
    expect(before.equipped.weapons).toEqual([]);
    const granted=applyInventoryAction(before,{type:'magic_grant',itemId:'weapon_enhancement',weaponId:'longsword',enhancement:1});
    const id=granted.magicItems[0].instanceId;
    const worn=applyInventoryAction(granted,{type:'magic_wear',instanceId:id,worn:true});
    expect(equippedInventory(worn)).toContainEqual(expect.objectContaining({key:`magic:${id}`,category:'weapon',magical:true}));
    expect(worn.equipped.weapons).toEqual([]);
  });
});
