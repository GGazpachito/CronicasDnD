import { describe, it, expect } from 'vitest';
import { combineStartingInventory, validateBackgroundEquipment } from '../src/background-equipment';
import { applyInventoryAction, initialInventoryState } from '../src/inventory';
import { inventoryCategory, inventoryOverview } from '../src/inventory-view';

const initial=()=>initialInventoryState(
  combineStartingInventory('a',validateBackgroundEquipment('soldier',{startingPackage:'a',gamingSet:'dice_set'})),
  'chain_mail'
);

describe('Actualización 41: proyección de Equipo',()=>{
  it('clasifica armas, armaduras, munición y equipo sin alterar el catálogo',()=>{
    expect(inventoryCategory('greatsword')).toBe('weapons');
    expect(inventoryCategory('chain_mail')).toBe('armor');
    expect(inventoryCategory('shield')).toBe('armor');
    expect(inventoryCategory('arrow')).toBe('ammunition');
    expect(inventoryCategory('healers_kit')).toBe('gear');
  });
  it('presenta cantidades y procedencia de las compras y el equipo de origen',()=>{
    const before=initial();
    const withLoot=applyInventoryAction(before,{type:'add',itemId:'shield',quantity:2});
    const withPurchase=applyInventoryAction(withLoot,{type:'buy',itemId:'arrow',quantity:10});
    const view=inventoryOverview(withPurchase);
    expect(view.entries.find(item=>item.id==='chain_mail')?.equipped).toBe(true);
    expect(view.entries.find(item=>item.id==='shield')?.sourceText).toContain('Botín ×2');
    expect(view.entries.find(item=>item.id==='arrow')?.unitPriceCopper).toBe(5);
    expect(view.categories.ammunition).toBeGreaterThanOrEqual(10);
    expect(inventoryOverview(before).entries.find(item=>item.id==='shield')).toBeUndefined();
  });
  it('refleja el escudo equipado y el descarte sin datos duplicados',()=>{
    const before=initial();
    const withShield=applyInventoryAction(before,{type:'add',itemId:'shield',quantity:1});
    const equipped=applyInventoryAction(withShield,{type:'equip_shield',equipped:true});
    expect(inventoryOverview(equipped).entries.find(item=>item.id==='shield')?.equipped).toBe(true);
    const removed=applyInventoryAction(equipped,{type:'remove',itemId:'shield',quantity:1});
    expect(inventoryOverview(removed).entries.find(item=>item.id==='shield')).toBeUndefined();
    expect(equipped.equipped.shield).toBe(true);
  });
  it('separa la vinculación del uso de un objeto mágico y no muta el origen',()=>{
    const before=initial();
    const granted=applyInventoryAction(before,{type:'magic_grant',itemId:'cloak_protection'});
    const id=granted.magicItems[0].instanceId;
    const worn=applyInventoryAction(granted,{type:'magic_wear',instanceId:id,worn:true});
    expect(inventoryOverview(worn).magicActive).toBe(0);
    const attuned=applyInventoryAction(worn,{type:'magic_attune',instanceId:id,attuned:true});
    expect(inventoryOverview(attuned)).toMatchObject({magicOwned:1,magicActive:1,magicAttuned:1,attunementCapacity:3});
    expect(inventoryOverview(before)).toMatchObject({magicOwned:0,magicActive:0,magicAttuned:0});
  });
  it('distingue objetos sin precio de los comprables',()=>{
    const state=applyInventoryAction(initial(),{type:'add',itemId:'holy_symbol',quantity:1});
    const item=inventoryOverview(state).entries.find(entry=>entry.id==='holy_symbol');
    expect(item?.unitPriceCopper).toBeNull();
  });
});
