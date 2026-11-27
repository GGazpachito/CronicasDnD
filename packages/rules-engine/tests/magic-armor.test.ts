import {describe,it,expect} from 'vitest';
import {combineStartingInventory,validateBackgroundEquipment} from '../src/background-equipment';
import {applyInventoryAction,equippedArmor,hasEquippedShield,replayInventory,type InventoryAction} from '../src/inventory';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';
import {makeCharacterSnapshot,validateCharacterSnapshot} from '../src/persistence';
import {initialAdventureState} from '../src/adventure';
import {previewIncomingAttack,type IncomingAttackInput} from '../src/incoming';
import {collectMagicWardBonuses,collectMagicWardDefenses,applyMagicWardAction} from '../src/magic-wards';

const starting=()=>combineStartingInventory('a',validateBackgroundEquipment('soldier',{startingPackage:'a',gamingSet:'dice_set'}));
const base=():GuidedFighterInput=>({
  name:'Defensa 2024',level:1,background:'soldier',species:'human',
  assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
  increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
  fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'alert',humanSize:'medium',
  armor:'chain_mail',shield:false,
  martial:{fightingStyle:'defense',weaponMasteries:['greatsword','flail','javelin'],startingPackage:'a'},
  backgroundEquipment:{startingPackage:'a',gamingSet:'dice_set'}
});
const armor=(name:'chain_mail'|'plate'|'studded_leather'='chain_mail',enhancement:1|2|3=1):InventoryAction=>({type:'magic_grant',itemId:'armor_enhancement',armorId:name,enhancement});
const shield=(enhancement:1|2|3=1):InventoryAction=>({type:'magic_grant',itemId:'shield_enhancement',enhancement});
const wear=(instanceId='ward-1',worn=true):InventoryAction=>({type:'magic_wear',instanceId,worn});
function state(actions:InventoryAction[]){return replayInventory(starting(),'chain_mail',actions);}
function sheet(actions:InventoryAction[]){const inv=state(actions);return calculateGuidedFighter({...base(),inventoryActions:actions,armor:equippedArmor(inv),shield:hasEquippedShield(inv)}).sheet;}

describe('Paso 23: armaduras y escudos mágicos del SRD 5.2.1',()=>{
  it('concede armadura +1 con base concreta sin exigir poseer una mundana adicional',()=>{
    const x=state([armor('plate',1)]);
    expect(x.magicItems[0].armorId).toBe('plate');expect(x.magicItems[0].enhancement).toBe(1);
    expect(x.items.some(i=>i.id==='plate')).toBe(false);
    expect(x.equipped.armor).toBe('chain_mail');
  });
  it('sin equipar no altera CA ni cambia la armadura existente',()=>{
    expect(sheet([armor('plate',3)]).armorClass).toBe(17);
    expect(equippedArmor(state([armor('plate',3)]))).toBe('chain_mail');
  });
  it('armadura de placas +1: reemplaza la cota de malla y añade solo +1',()=>{
    const a=[armor('plate'),wear()];
    const inv=state(a);
    expect(inv.equipped.armor).toBeNull();expect(equippedArmor(inv)).toBe('plate');
    expect(sheet(a).armorClass).toBe(20); // placas 18 + Defensa 1 + magia 1
  });
  it('admite armaduras +2 y +3 sin duplicar la CA de base',()=>{
    expect(sheet([armor('chain_mail',2),wear()]).armorClass).toBe(19);
    expect(sheet([armor('plate',3),wear()]).armorClass).toBe(22);
  });
  it('respeta la fórmula de armadura ligera y Destreza',()=>{
    expect(sheet([armor('studded_leather',2),wear()]).armorClass).toBe(17); // 12 + DES 2 + DEF 1 + 2
  });
  it('quitar armadura mágica deja al personaje sin armadura, no restaura automáticamente otra',()=>{
    const a=[armor('plate',3),wear(),wear('ward-1',false)];
    expect(equippedArmor(state(a))).toBeNull();
    expect(sheet(a).armorClass).toBe(12); // sin armadura DES 2, pierde estilo Defensa
  });
  it('equipar armadura mundana reemplaza y desactiva la mágica',()=>{
    const a=[armor('plate',3),wear(),{type:'equip_armor',armor:'chain_mail'}] as InventoryAction[];
    const inv=state(a);
    expect(inv.magicItems[0].worn).toBe(false);
    expect(equippedArmor(inv)).toBe('chain_mail');
    expect(sheet(a).armorClass).toBe(17);
  });
  it('escudo mágico +1 concede escudo 2 + magia 1, sin escudo mundano',()=>{
    const a=[shield(1),wear()];
    expect(hasEquippedShield(state(a))).toBe(true);
    expect(sheet(a).armorClass).toBe(20);
  });
  it('escudo mágico +3 incrementa CA en 5, no en 6',()=>{
    expect(sheet([shield(3),wear()]).armorClass).toBe(22);
  });
  it('armadura +3 y escudo +2 suman correctamente sobre una sola fórmula',()=>{
    const a=[armor('plate',3),wear(),shield(2),wear('ward-2')];
    expect(sheet(a).armorClass).toBe(26); // placas 18 + Defensa 1 +3 + escudo 2 +2
  });
  it('combina escudo +3 con Capa de protección sin cambiar salvaciones por el escudo',()=>{
    const baseSheet=sheet([]);
    const a=[shield(3),wear(),{type:'magic_grant',itemId:'cloak_protection'},wear('ward-2'),{type:'magic_attune',instanceId:'ward-2',attuned:true}] as InventoryAction[];
    const enhanced=sheet(a);
    expect(enhanced.armorClass).toBe(baseSheet.armorClass+6); // +5 escudo y +1 capa
    expect(enhanced.savingThrowBonuses.constitution).toBe(baseSheet.savingThrowBonuses.constitution+1);
  });
  it('bonificaciones de armaduras y escudos no alteran salvaciones',()=>{
    const bonuses=collectMagicWardBonuses(state([armor('plate',1),wear(),shield(2),wear('ward-2')]).magicItems);
    expect(bonuses.map(b=>b.armorClass)).toEqual([1,2]);
    expect(bonuses.every(b=>b.savingThrows===0)).toBe(true);
  });
  it('equipar escudo mundano desactiva el mágico al disponer de él',()=>{
    const a=[shield(2),wear(),{type:'add',itemId:'shield',quantity:1},{type:'equip_shield',equipped:true}] as InventoryAction[];
    const inv=state(a);
    expect(inv.magicItems[0].worn).toBe(false);
    expect(inv.equipped.shield).toBe(true);
    expect(sheet(a).armorClass).toBe(19);
  });
  it('rechaza tener dos armaduras mágicas equipadas simultáneamente',()=>{
    expect(()=>state([armor('chain_mail'),wear(),armor('plate',2),wear('ward-2')])).toThrow();
  });
  it('rechaza dos escudos mágicos empuñados simultáneamente',()=>{
    expect(()=>state([shield(1),wear(),shield(2),wear('ward-2')])).toThrow();
  });
  it('no requiere ni permite vincular armaduras o escudos mejorados',()=>{
    expect(()=>state([armor(),{type:'magic_attune',instanceId:'ward-1',attuned:true}])).toThrow();
    expect(()=>state([shield(),{type:'magic_attune',instanceId:'ward-1',attuned:true}])).toThrow();
  });
  it('rechaza bonus 0, 4, decimales y armadura desconocida',()=>{
    for(const enhancement of [0,4,1.5,-1]){
      expect(()=>state([{type:'magic_grant',itemId:'shield_enhancement',enhancement} as never])).toThrow();
    }
    expect(()=>state([{type:'magic_grant',itemId:'armor_enhancement',armorId:'laser',enhancement:1} as never])).toThrow();
  });
  it('rechaza campos mezclados o de objetos diferentes',()=>{
    expect(()=>state([{type:'magic_grant',itemId:'armor_enhancement',armorId:'plate',enhancement:1,damageType:'fire'} as never])).toThrow();
    expect(()=>state([{type:'magic_grant',itemId:'ring_protection',enhancement:2} as never])).toThrow();
  });
  it('no inventa resistencia al daño por llevar armadura o escudo mágico',()=>{
    expect(collectMagicWardDefenses(state([armor('chain_mail',2),wear(),shield(3),wear('ward-2')]).magicItems)).toHaveLength(0);
  });
  it('despejar el inventario no modifica el original',()=>{
    const source=state([armor('plate',1)]);
    const next=applyInventoryAction(source,wear());
    expect(source.magicItems[0].worn).toBe(false);
    expect(next.magicItems[0].worn).toBe(true);
  });
  it('ataques recibidos comparan contra CA mágica recalculada',()=>{
    const hitInput:IncomingAttackInput={attacker:'Soldado hostil',attackBonus:6,firstD20:12,
      attackerDistanceFeet:10,damageType:'slashing',rolledDamage:7,mitigation:'normal'};
    const normal=sheet([]),armored=sheet([armor('plate',2),wear()]);
    expect(previewIncomingAttack(initialAdventureState(normal),normal,hitInput).hit).toBe(true);
    expect(previewIncomingAttack(initialAdventureState(armored),armored,hitInput).hit).toBe(false);
  });
  it('bonificador de escudo no cambia la fórmula base de la armadura',()=>{
    const enhanced=sheet([shield(2),wear()]);
    expect(enhanced.armorClassDetails.formula).toBe('armor:chain_mail');
    expect(enhanced.armorClass).toBe(21);
  });
  it('guarda y recupera armadura y escudo mágicos sin migración SQL',()=>{
    const actions=[armor('plate',1),wear(),shield(3),wear('ward-2')];
    const inv=state(actions);
    const input={...base(),armor:equippedArmor(inv),shield:hasEquippedShield(inv),inventoryActions:actions};
    const snapshot=makeCharacterSnapshot(input);
    const restored=validateCharacterSnapshot(JSON.parse(JSON.stringify(snapshot)));
    const calculated=calculateGuidedFighter(restored.input);
    expect(calculated.sheet.armorClass).toBe(25); // placas 18 + 1 Defensa +1 armadura +2+3 escudo
    expect(calculated.inventory?.magicItems).toHaveLength(2);
  });
  it('mantiene los personajes antiguos y las joyas mágicas existentes',()=>{
    const previous=makeCharacterSnapshot(base());
    const loaded=validateCharacterSnapshot(JSON.parse(JSON.stringify(previous)));
    expect(calculateGuidedFighter(loaded.input).sheet.armorClass).toBe(17);
    const ring=applyMagicWardAction([],{type:'grant',itemId:'ring_resistance',damageType:'fire'});
    expect(collectMagicWardDefenses(applyMagicWardAction(ring,{type:'wear',instanceId:'ward-1',worn:true}))).toHaveLength(1);
  });
});
