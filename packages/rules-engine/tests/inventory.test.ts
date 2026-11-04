import {describe,it,expect} from 'vitest';
import { combineStartingInventory, validateBackgroundEquipment } from '../src/background-equipment';
import { initialInventoryState, applyInventoryAction, replayInventory, formatCopper, INVENTORY_PRICES_CP } from '../src/inventory';
import { calculateGuidedFighter, type GuidedFighterInput } from '../src/guided';
const starting=()=>combineStartingInventory('a',validateBackgroundEquipment('soldier',{startingPackage:'a',gamingSet:'dice_set'}));
const base=():GuidedFighterInput=>({name:'Aldric',level:1,background:'soldier',species:'human',assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'tough',humanSize:'medium',armor:'chain_mail',shield:false,martial:{fightingStyle:'defense',weaponMasteries:['greatsword','flail','javelin'],startingPackage:'a'},backgroundEquipment:{startingPackage:'a',gamingSet:'dice_set'}});

describe('Paso 12: inventario editable y transacciones',()=>{
  it('inicia con 18 po y la cota de malla equipada',()=>{
    const x=initialInventoryState(starting(),'chain_mail');expect(x.coinsCopper).toBe(1800);expect(x.equipped.armor).toBe('chain_mail');expect(x.equipped.shield).toBe(false);
  });
  it('las compras restan monedas y conservan su procedencia',()=>{
    const x=applyInventoryAction(initialInventoryState(starting(),'chain_mail'),{type:'buy',itemId:'shield',quantity:1});
    expect(x.coinsCopper).toBe(800);expect(x.items.find(i=>i.id==='shield')?.sources).toEqual([{from:'purchase',quantity:1}]);
  });
  it('no puede comprar sin fondos suficientes',()=>{
    expect(()=>applyInventoryAction(initialInventoryState(starting(),'chain_mail'),{type:'buy',itemId:'plate',quantity:1})).toThrow(/monedas/);
  });
  it('equipar escudo requiere poseerlo',()=>{
    expect(()=>applyInventoryAction(initialInventoryState(starting(),'chain_mail'),{type:'equip_shield',equipped:true})).toThrow(/poseer/);
  });
  it('comprar y equipar escudo da +2 CA sobre la hoja inicial',()=>{
    const actions=[{type:'buy',itemId:'shield',quantity:1},{type:'equip_shield',equipped:true}] as const;
    const baseline=calculateGuidedFighter(base());
    const advanced=calculateGuidedFighter({...base(),shield:true,inventoryActions:actions});
    expect(baseline.sheet.armorClass).toBe(17);
    expect(advanced.sheet.armorClass).toBe(19);expect(advanced.inventory?.coinsCopper).toBe(800);
  });
  it('quitar armadura elimina la fórmula de armadura y el +1 de Defensa',()=>{
    const advanced=calculateGuidedFighter({...base(),armor:null,inventoryActions:[{type:'equip_armor',armor:null}]});
    expect(advanced.sheet.armorClass).toBe(12);
  });
  it('vender la cota equipada la desequipa automáticamente y aumenta las monedas',()=>{
    const x=applyInventoryAction(initialInventoryState(starting(),'chain_mail'),{type:'sell',itemId:'chain_mail',quantity:1});
    expect(x.equipped.armor).toBe(null);expect(x.coinsCopper).toBe(5550);
  });
  it('descartar escudo equipado lo desequipa',()=>{
    const x=replayInventory(starting(),'chain_mail',[{type:'add',itemId:'shield',quantity:1},{type:'equip_shield',equipped:true},{type:'remove',itemId:'shield',quantity:1}]);
    expect(x.equipped.shield).toBe(false);
  });
  it('el botín se añade gratis sin inventar precio y mantiene su origen',()=>{
    const x=applyInventoryAction(initialInventoryState(starting(),'chain_mail'),{type:'add',itemId:'holy_symbol',quantity:1});
    expect(x.coinsCopper).toBe(1800);expect(x.items.find(i=>i.id==='holy_symbol')?.sources).toEqual([{from:'loot',quantity:1}]);
  });
  it('vender un artículo sin precio definido no está permitido',()=>{
    expect(()=>applyInventoryAction(initialInventoryState(starting(),'chain_mail'),{type:'sell',itemId:'book_prayers',quantity:1})).toThrow(/Precio/);
  });
  it('comprar flechas añade unidades sin borrar su procedencia anterior',()=>{
    const x=applyInventoryAction(initialInventoryState(starting(),'chain_mail'),{type:'buy',itemId:'arrow',quantity:10});
    const arr=x.items.find(i=>i.id==='arrow')!;
    expect(arr.quantity).toBe(30);expect(arr.sources).toEqual([{from:'background',quantity:20},{from:'purchase',quantity:10}]);
    expect(x.coinsCopper).toBe(1750);
  });
  it('descartar unidades consume antes las adquiridas y deja su fuente real',()=>{
    const x=replayInventory(starting(),'chain_mail',[{type:'buy',itemId:'arrow',quantity:10},{type:'remove',itemId:'arrow',quantity:15}]);
    expect(x.items.find(i=>i.id==='arrow')?.sources).toEqual([{from:'background',quantity:15}]);
  });
  it('venta de 20 flechas proporciona exactamente medio precio del lote',()=>{
    const x=applyInventoryAction(initialInventoryState(starting(),'chain_mail'),{type:'sell',itemId:'arrow',quantity:20});
    expect(x.coinsCopper).toBe(1850);
  });
  it('rechaza venta o descarte por encima del stock',()=>{
    const s=initialInventoryState(starting(),'chain_mail');
    expect(()=>applyInventoryAction(s,{type:'sell',itemId:'javelin',quantity:999})).toThrow(/suficientes/);
    expect(()=>applyInventoryAction(s,{type:'remove',itemId:'shield',quantity:1})).toThrow(/suficientes/);
  });
  it('rechaza cantidades inválidas y objetos desconocidos',()=>{
    const s=initialInventoryState(starting(),'chain_mail');
    expect(()=>applyInventoryAction(s,{type:'buy',itemId:'shield',quantity:0})).toThrow(/cantidad/);
    expect(()=>applyInventoryAction(s,{type:'buy',itemId:'shield',quantity:1.5})).toThrow(/cantidad/);
    expect(()=>applyInventoryAction(s,{type:'add',itemId:'cheat' as never,quantity:1})).toThrow(/reconocido/);
  });
  it('no modifica objetos originales ni estado anterior',()=>{
    const source=starting(),first=initialInventoryState(source,'chain_mail');
    const next=applyInventoryAction(first,{type:'remove',itemId:'javelin',quantity:2});
    expect(first.items.find(i=>i.id==='javelin')?.quantity).toBe(8);
    expect(next.items.find(i=>i.id==='javelin')?.quantity).toBe(6);
    expect(source.items.find(i=>i.id==='javelin')?.quantity).toBe(8);
  });
  it('rechaza equipar armaduras no poseídas o desconocidas',()=>{
    const s=initialInventoryState(starting(),'chain_mail');
    expect(()=>applyInventoryAction(s,{type:'equip_armor',armor:'plate'})).toThrow(/poseer/);
    expect(()=>applyInventoryAction(s,{type:'equip_armor',armor:'laser' as never})).toThrow(/reconocida/);
  });
  it('repetir el diario produce siempre el mismo resultado',()=>{
    const actions=[{type:'buy',itemId:'shield',quantity:1},{type:'equip_shield',equipped:true}] as const;
    expect(replayInventory(starting(),'chain_mail',actions)).toEqual(replayInventory(starting(),'chain_mail',actions));
  });
  it('impide historiales superiores al límite',()=>{
    expect(()=>replayInventory(starting(),'chain_mail',Array.from({length:201},()=>({type:'equip_armor' as const,armor:null})))).toThrow(/Historial/);
  });
  it('detecta incoherencias entre el equipo declarado y el inventario real',()=>{
    expect(()=>calculateGuidedFighter({...base(),shield:true,inventoryActions:[]})).toThrow(/no coincide/);
  });
  it('mantiene la compatibilidad con pruebas de versiones anteriores',()=>{
    const old=calculateGuidedFighter(base());expect(old.startingInventory?.totalGold).toBe(18);
    expect(old.inventory?.items.find(i=>i.id==='chain_mail')?.quantity).toBe(1);
  });
  it('formatea cobre, plata y oro de forma exacta',()=>{
    expect(formatCopper(0)).toBe('0 po');expect(formatCopper(1257)).toBe('12 po · 5 plata · 7 cobre');
    expect(INVENTORY_PRICES_CP.shield).toBe(1000);
  });
});
