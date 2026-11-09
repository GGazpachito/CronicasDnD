import {describe,it,expect} from 'vitest';
import {initialInventoryState,replayInventory,applyInventoryAction,importLegacyMagicWards,type InventoryAction} from '../src/inventory';
import {combineStartingInventory,validateBackgroundEquipment} from '../src/background-equipment';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';
import {initialAdventureState} from '../src/adventure';
import {previewIncomingAttack,type IncomingAttackInput} from '../src/incoming';
import {makeCharacterSnapshot,validateCharacterSnapshot} from '../src/persistence';
import {applyMagicWardAction,collectMagicWardBonuses,collectMagicWardDefenses} from '../src/magic-wards';

const initial=()=>combineStartingInventory('a',validateBackgroundEquipment('soldier',{startingPackage:'a',gamingSet:'dice_set'}));
const character=():GuidedFighterInput=>({
  name:'Guerrero de pruebas',level:1,background:'soldier',species:'human',
  assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
  increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
  fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'tough',humanSize:'medium',
  armor:'chain_mail',shield:false,
  martial:{fightingStyle:'defense',weaponMasteries:['greatsword','flail','javelin'],startingPackage:'a'},
  backgroundEquipment:{startingPackage:'a',gamingSet:'dice_set'}
});
const action=(id:'cloak_protection'|'ring_protection'|'ring_resistance'|'brooch_shielding'|'periapt_proof_poison',damageType?:'fire'|'poison'):InventoryAction=>({type:'magic_grant',itemId:id,...(damageType?{damageType}:{})});
const wear=(id='ward-1'):InventoryAction=>({type:'magic_wear',instanceId:id,worn:true});
const attune=(id='ward-1'):InventoryAction=>({type:'magic_attune',instanceId:id,attuned:true});
const attack:IncomingAttackInput={attacker:'Dragón',attackBonus:20,firstD20:15,attackerDistanceFeet:30,damageType:'fire',rolledDamage:9,mitigation:'normal'};

describe('Paso 22: inventario mágico unificado',()=>{
  it('empieza sin objetos mágicos y conserva monedas y armadura',()=>{
    const x=initialInventoryState(initial(),'chain_mail');
    expect(x.magicItems).toHaveLength(0);expect(x.coinsCopper).toBe(1800);expect(x.equipped.armor).toBe('chain_mail');
  });
  it('concede un anillo sin comprarlo ni alterar el equipo común',()=>{
    const x=replayInventory(initial(),'chain_mail',[action('ring_resistance','fire')]);
    expect(x.magicItems[0].itemId).toBe('ring_resistance');expect(x.magicItems[0].worn).toBe(false);
    expect(x.coinsCopper).toBe(1800);expect(x.items.find(y=>y.id==='chain_mail')?.quantity).toBe(1);
  });
  it('no se pueden comprar objetos mágicos con el catálogo ordinario',()=>{
    const s=initialInventoryState(initial(),'chain_mail');
    expect(()=>applyInventoryAction(s,{type:'buy',itemId:'cloak_protection' as never,quantity:1})).toThrow();
  });
  it('un anillo puesto aporta resistencia a fuego desde el inventario',()=>{
    const input=character();const inventory=replayInventory(initial(),'chain_mail',[action('ring_resistance','fire'),wear()]);
    const sheet=calculateGuidedFighter(input).sheet;
    const p=previewIncomingAttack(initialAdventureState(sheet),sheet,attack,{inventory});
    expect(p.finalDamage).toBe(4);
  });
  it('un anillo guardado no aporta resistencia',()=>{
    const input=character();const inventory=replayInventory(initial(),'chain_mail',[action('ring_resistance','fire')]);
    const sheet=calculateGuidedFighter(input).sheet;
    expect(previewIncomingAttack(initialAdventureState(sheet),sheet,attack,{inventory}).finalDamage).toBe(9);
  });
  it('la capa guardada, puesta sin vinculación o vinculada sin ponerse no altera CA',()=>{
    const baseline=calculateGuidedFighter(character()).sheet.armorClass;
    for(const actions of [[action('cloak_protection')],[action('cloak_protection'),wear()],[action('cloak_protection'),attune()]]){
      const s=calculateGuidedFighter({...character(),inventoryActions:actions}).sheet;
      expect(s.armorClass).toBe(baseline);
    }
  });
  it('capa puesta y vinculada concede +1 CA y +1 a todas las salvaciones',()=>{
    const plain=calculateGuidedFighter(character()).sheet;
    const enhanced=calculateGuidedFighter({...character(),inventoryActions:[action('cloak_protection'),wear(),attune()]}).sheet;
    expect(enhanced.armorClass).toBe(plain.armorClass+1);
    for(const key of ['strength','dexterity','constitution','intelligence','wisdom','charisma'] as const){
      expect(enhanced.savingThrowBonuses[key]).toBe(plain.savingThrowBonuses[key]+1);
    }
  });
  it('el anillo de protección concede igualmente +1 CA y +1 a salvaciones',()=>{
    const plain=calculateGuidedFighter(character()).sheet;
    const equipped=calculateGuidedFighter({...character(),inventoryActions:[action('ring_protection'),wear(),attune()]}).sheet;
    expect(equipped.armorClass).toBe(plain.armorClass+1);
    expect(equipped.savingThrowBonuses.constitution).toBe(plain.savingThrowBonuses.constitution+1);
  });
  it('la capa y el anillo de protección son fuentes distintas y pueden acumularse',()=>{
    const plain=calculateGuidedFighter(character()).sheet;
    const actions=[action('cloak_protection'),wear(),attune(),action('ring_protection'),wear('ward-2'),attune('ward-2')];
    const enhanced=calculateGuidedFighter({...character(),inventoryActions:actions}).sheet;
    expect(enhanced.armorClass).toBe(plain.armorClass+2);
    expect(enhanced.savingThrowBonuses.constitution).toBe(plain.savingThrowBonuses.constitution+2);
  });
  it('desvincular, quitarse o descartar un objeto revierte sus bonificaciones',()=>{
    const plain=calculateGuidedFighter(character()).sheet;
    const common=[action('cloak_protection'),wear(),attune()];
    for(const last of [{type:'magic_wear',instanceId:'ward-1',worn:false} as const,
      {type:'magic_attune',instanceId:'ward-1',attuned:false} as const,
      {type:'magic_remove',instanceId:'ward-1'} as const]){
      expect(calculateGuidedFighter({...character(),inventoryActions:[...common,last]}).sheet.armorClass).toBe(plain.armorClass);
    }
  });
  it('no altera la entrada al aplicar operaciones mágicas',()=>{
    const s=initialInventoryState(initial(),'chain_mail');const before=JSON.stringify(s);
    const out=applyInventoryAction(s,action('cloak_protection'));
    expect(JSON.stringify(s)).toBe(before);expect(out.magicItems).toHaveLength(1);
  });
  it('prohíbe vincular dos objetos mágicos del mismo tipo',()=>{
    const s=replayInventory(initial(),'chain_mail',[action('cloak_protection'),action('cloak_protection'),attune()]);
    expect(()=>applyInventoryAction(s,attune('ward-2'))).toThrow();
  });
  it('prohíbe vincular más de tres objetos y rechaza la vinculación en anillos que no la requieren',()=>{
    const actions=[action('cloak_protection'),attune(),action('ring_protection'),attune('ward-2'),action('brooch_shielding'),attune('ward-3'),action('periapt_proof_poison')];
    expect(()=>replayInventory(initial(),'chain_mail',[...actions,attune('ward-4')])).toThrow();
    expect(()=>replayInventory(initial(),'chain_mail',[action('ring_resistance','fire'),attune()])).toThrow();
  });
  it('evita alterar el saldo y preserva el orden de compra en el diario',()=>{
    const actions:InventoryAction[]=[{type:'buy',itemId:'shield',quantity:1},action('cloak_protection'),wear(),attune(),{type:'equip_shield',equipped:true}];
    const inv=replayInventory(initial(),'chain_mail',actions);
    expect(inv.coinsCopper).toBe(800);expect(inv.equipped.shield).toBe(true);expect(inv.magicItems).toHaveLength(1);
  });
  it('convierte un objeto mágico legado con equipo y vinculación',()=>{
    let old=applyMagicWardAction([],{type:'grant',itemId:'brooch_shielding'});
    old=applyMagicWardAction(old,{type:'wear',instanceId:'ward-1',worn:true});
    old=applyMagicWardAction(old,{type:'attune',instanceId:'ward-1',attuned:true});
    const actions=importLegacyMagicWards([],old);
    expect(actions).toHaveLength(3);
    const inv=replayInventory(initial(),'chain_mail',actions);
    expect(inv.magicItems).toEqual(old);
    expect(collectMagicWardDefenses(inv.magicItems)).toHaveLength(1);
  });
  it('importa objetos antiguos sin colisionar con las instancias nuevas',()=>{
    const actions=[action('cloak_protection'),wear(),attune()];
    const old=applyMagicWardAction([],{type:'grant',itemId:'ring_resistance',damageType:'fire'});
    const combined=importLegacyMagicWards(actions,old);
    const inventory=replayInventory(initial(),'chain_mail',combined);
    expect(inventory.magicItems).toHaveLength(2);
    expect(inventory.magicItems[0].itemId).toBe('cloak_protection');
    expect(inventory.magicItems[1].instanceId).toBe('ward-2');
  });
  it('no altera el registro legado al importarlo',()=>{
    const old=applyMagicWardAction([],{type:'grant',itemId:'ring_resistance',damageType:'poison'});
    const original=JSON.stringify(old);importLegacyMagicWards([],old);expect(JSON.stringify(old)).toBe(original);
  });
  it('permite guardar y cargar el nuevo inventario mágico sin nueva versión de esquema',()=>{
    const input={...character(),inventoryActions:[action('cloak_protection'),wear(),attune()]};
    const s=calculateGuidedFighter(input).sheet;
    const saved=makeCharacterSnapshot(input,initialAdventureState(s));
    const restored=validateCharacterSnapshot(JSON.parse(JSON.stringify(saved)));
    expect(restored.schemaVersion).toBe(2);
    expect(calculateGuidedFighter(restored.input).inventory?.magicItems[0].itemId).toBe('cloak_protection');
    expect(calculateGuidedFighter(restored.input).sheet.armorClass).toBe(s.armorClass);
  });
  it('el estado de partida legado continúa pudiéndose cargar sin pérdida',()=>{
    const input=character();const base=calculateGuidedFighter(input).sheet;
    let wards=applyMagicWardAction([],{type:'grant',itemId:'ring_resistance',damageType:'fire'});
    wards=applyMagicWardAction(wards,{type:'wear',instanceId:'ward-1',worn:true});
    const saved=makeCharacterSnapshot(input,{...initialAdventureState(base),magicWards:wards});
    const restored=validateCharacterSnapshot(JSON.parse(JSON.stringify(saved)));
    expect(restored.adventure.magicWards).toEqual(wards);
    const actions=importLegacyMagicWards(restored.input.inventoryActions??[],restored.adventure.magicWards??[]);
    const migrated=calculateGuidedFighter({...restored.input,inventoryActions:actions});
    expect(migrated.inventory?.magicItems[0].worn).toBe(true);
  });
  it('las bonificaciones por objetos de CA no inventan resistencias de daño',()=>{
    const inv=replayInventory(initial(),'chain_mail',[action('cloak_protection'),wear(),attune()]);
    expect(collectMagicWardBonuses(inv.magicItems)).toHaveLength(1);
    expect(collectMagicWardDefenses(inv.magicItems)).toHaveLength(0);
  });
  it('identificadores inexistentes y tipos mágicos no permitidos se rechazan',()=>{
    const state=initialInventoryState(initial(),'chain_mail');
    expect(()=>applyInventoryAction(state,{type:'magic_wear',instanceId:'ward-999',worn:true})).toThrow();
    expect(()=>applyInventoryAction(state,{type:'magic_grant',itemId:'no_existe' as never})).toThrow();
    expect(()=>applyInventoryAction(state,{type:'magic_grant',itemId:'ring_resistance',damageType:'slashing' as never})).toThrow();
  });
});
