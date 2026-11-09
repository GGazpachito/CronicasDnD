import {describe,it,expect} from 'vitest';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';
import {replayInventory,applyInventoryAction,importLegacyMagicWards,nextMagicInstanceId,type InventoryAction} from '../src/inventory';
import {combineStartingInventory,validateBackgroundEquipment} from '../src/background-equipment';
import {calculateOwnedWeaponAttack,ownedWeaponChoices,resolveWeaponAttack} from '../src/attacks';
import {recordWeaponAttack,initialCombatState,validateCombatState} from '../src/combat';
import {makeCharacterSnapshot,validateCharacterSnapshot} from '../src/persistence';
import {initialAdventureState} from '../src/adventure';
import {collectMagicWardBonuses,collectMagicWardDefenses,applyMagicWardAction} from '../src/magic-wards';
import type {WeaponId} from '../src/martial';

const setup=():GuidedFighterInput=>({
  name:'Aldric',level:3,background:'soldier',species:'human',
  assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
  increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
  fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'tough',humanSize:'medium',
  armor:'chain_mail',shield:false,
  martial:{fightingStyle:'defense',weaponMasteries:['greatsword','flail','javelin'],startingPackage:'a'},
  backgroundEquipment:{startingPackage:'a',gamingSet:'dice_set'},
});
const initial=()=>combineStartingInventory('a',validateBackgroundEquipment('soldier',{startingPackage:'a',gamingSet:'dice_set'}));
const grant=(weaponId:WeaponId='greatsword',enhancement:1|2|3=1):Extract<InventoryAction,{type:'magic_grant'}>=>({type:'magic_grant',itemId:'weapon_enhancement',weaponId,enhancement});
const wear=(instanceId='ward-1',worn=true):InventoryAction=>({type:'magic_wear',instanceId,worn});
const inv=(actions:InventoryAction[]=[])=>replayInventory(initial(),'chain_mail',actions);
const sheet=()=>calculateGuidedFighter(setup()).sheet;
const profile=(actions:InventoryAction[],selectionId='magic:ward-1')=>calculateOwnedWeaponAttack(sheet(),inv(actions),selectionId,'defense',setup().martial!.weaponMasteries);

describe('Paso 24: armas mágicas +1/+2/+3 en el inventario único',()=>{
  it('concede una espada +1 sin compra y sin requerir su versión común',()=>{
    const x=inv([grant('longsword',1)]);
    expect(x.magicItems[0].weaponId).toBe('longsword');expect(x.magicItems[0].enhancement).toBe(1);
    expect(x.items.find(i=>i.id==='longsword')).toBeUndefined();
    expect(x.magicItems[0].worn).toBe(false);
  });
  it('armas mágicas no se ofrecen hasta estar preparadas',()=>{
    expect(ownedWeaponChoices(inv([grant('rapier',3)])).some(x=>x.selectionId==='magic:ward-1')).toBe(false);
    expect(ownedWeaponChoices(inv([grant('rapier',3),wear()])).some(x=>x.selectionId==='magic:ward-1')).toBe(true);
  });
  it('el arma normal y la mágica son dos elecciones distintas sin duplicar la común',()=>{
    const choices=ownedWeaponChoices(inv([grant(),wear()]));
    expect(choices.find(c=>c.selectionId==='normal:greatsword')?.enhancement).toBeUndefined();
    expect(choices.find(c=>c.selectionId==='magic:ward-1')?.enhancement).toBe(1);
    expect(choices.filter(c=>c.weaponId==='greatsword')).toHaveLength(2);
  });
  it('espada de dos manos +1: +1 para impactar y +1 al daño solamente',()=>{
    const actions=[grant(),wear()];
    const common=profile(actions,'normal:greatsword');const magical=profile(actions);
    expect(magical.attackBonus).toBe(common.attackBonus+1);
    expect(magical.damageModifier).toBe(common.damageModifier+1);
    expect(magical.damageDice).toEqual(common.damageDice);
    expect(magical.magicWeaponInstanceId).toBe('ward-1');
  });
  it('armas +2 y +3 tienen bonificación independiente',()=>{
    expect(profile([grant('greatsword',2),wear()]).attackBonus).toBe(profile([],'normal:greatsword').attackBonus+2);
    expect(profile([grant('greatsword',3),wear()]).damageModifier).toBe(profile([],'normal:greatsword').damageModifier+3);
  });
  it('el crítico duplica dados, pero NO el bonificador mágico',()=>{
    const p=profile([grant('greatsword',2),wear()]);
    const result=resolveWeaponAttack(p,{firstD20:20,targetAC:60,damageRolls:[1,2,3,4]});
    expect(result.damageDiceNeeded).toBe(4);
    expect(result.damageTotal).toBe(15); // 1+2+3+4 + 3 FUE + 2 mágico
  });
  it('la maestría Rozar no añade la mejora mágica al daño por fallo',()=>{
    const p=profile([grant('greatsword',3),wear()]);
    expect(resolveWeaponAttack(p,{firstD20:2,targetAC:30}).grazeDamage).toBe(3);
    expect(resolveWeaponAttack(p,{firstD20:2,targetAC:30,damageRolls:[3,3]}).damageTotal).toBe(0);
  });
  it('la bonificación es válida para armas arrojadizas y a distancia',()=>{
    const a=profile([grant('javelin',2),wear()]);
    expect(a.attackBonus).toBe(7);expect(a.damageModifier).toBe(5);
    const bow=calculateOwnedWeaponAttack(sheet(),inv([grant('longbow',3),wear()]),'magic:ward-1','archery',setup().martial!.weaponMasteries);
    expect(bow.attackBonus).toBe(9); // DES 2 + competencia 2 + estilo 2 + magia 3
  });
  it('no requiere vinculación; no permite registrarla en arma +1',()=>{
    const x=inv([grant(),wear()]);expect(x.magicItems[0].attuned).toBe(false);
    expect(()=>applyInventoryAction(x,{type:'magic_attune',instanceId:'ward-1',attuned:true})).toThrow();
  });
  it('no altera CA, salvaciones ni defensas de daño',()=>{
    const x=inv([grant('rapier',2),wear()]);
    expect(collectMagicWardBonuses(x.magicItems)).toHaveLength(0);
    expect(collectMagicWardDefenses(x.magicItems)).toHaveLength(0);
  });
  it('no concede bonificadores mágicos a otros ejemplares del mismo tipo',()=>{
    const actions=[grant('greatsword',3),wear()];
    const magic=profile(actions,'magic:ward-1');const mundane=profile(actions,'normal:greatsword');
    expect(magic.attackBonus).toBe(mundane.attackBonus+3);
    expect(mundane.magicWeaponInstanceId).toBeUndefined();
  });
  it('dos armas mágicas idénticas guardan identidades distintas',()=>{
    const actions=[grant('dagger',1),wear(),grant('dagger',3),wear('ward-2')];
    const a=profile(actions,'magic:ward-1');const b=profile(actions,'magic:ward-2');
    expect(a.magicWeaponInstanceId).toBe('ward-1');expect(b.magicWeaponInstanceId).toBe('ward-2');
    expect(b.attackBonus).toBe(a.attackBonus+2);
  });
  it('arma desactivada o retirada no permite construir el ataque',()=>{
    expect(()=>profile([grant(),wear('ward-1',false)])).toThrow();
    expect(()=>profile([grant(),wear(),{type:'magic_remove',instanceId:'ward-1'}])).toThrow();
  });
  it('rechaza armas mágicas sin base o sin mejora',()=>{
    expect(()=>inv([{type:'magic_grant',itemId:'weapon_enhancement',enhancement:1} as never])).toThrow();
    expect(()=>inv([{type:'magic_grant',itemId:'weapon_enhancement',weaponId:'greatsword'} as never])).toThrow();
  });
  it('rechaza armas inventadas, valores fuera de 1–3 y combinaciones de variantes',()=>{
    for(const enhancement of [0,4,-1,1.5])expect(()=>inv([{type:'magic_grant',itemId:'weapon_enhancement',weaponId:'greatsword',enhancement} as never])).toThrow();
    expect(()=>inv([{type:'magic_grant',itemId:'weapon_enhancement',weaponId:'laser',enhancement:1} as never])).toThrow();
    expect(()=>inv([{type:'magic_grant',itemId:'weapon_enhancement',weaponId:'greatsword',armorId:'plate',enhancement:1} as never])).toThrow();
    expect(()=>inv([{type:'magic_grant',itemId:'weapon_enhancement',weaponId:'greatsword',damageType:'fire',enhancement:1} as never])).toThrow();
  });
  it('no puede añadirse weaponId a otros objetos mágicos',()=>{
    expect(()=>inv([{type:'magic_grant',itemId:'shield_enhancement',weaponId:'longbow',enhancement:1} as never])).toThrow();
    expect(()=>inv([{type:'magic_grant',itemId:'ring_resistance',weaponId:'dagger',damageType:'fire'} as never])).toThrow();
  });
  it('registra la instancia concreta y el +2 en historial de combate',()=>{
    const actions=[grant('greatsword',2),wear()];const p=profile(actions);
    const resolution=resolveWeaponAttack(p,{firstD20:15,targetAC:13,damageRolls:[5,6]});
    const recorded=recordWeaponAttack(initialCombatState(),inv(actions),p,resolution);
    expect(recorded.inventoryAction).toBeNull();
    expect(recorded.combat.attacks[0].magicWeaponInstanceId).toBe('ward-1');
    expect(recorded.combat.attacks[0].magicEnhancement).toBe(2);
    expect(recorded.combat.attacks[0].damageTotal).toBe(16);
  });
  it('no deja registrar un ataque después de quitar el arma del inventario',()=>{
    const actions=[grant('greatsword',1),wear()];const p=profile(actions);
    const resolution=resolveWeaponAttack(p,{firstD20:15,targetAC:13,damageRolls:[5,6]});
    const gone=inv([...actions,{type:'magic_remove',instanceId:'ward-1'}]);
    expect(()=>recordWeaponAttack(initialCombatState(),gone,p,resolution)).toThrow();
  });
  it('no registra perfil con identidad mágica falsa o bonificación distinta',()=>{
    const actions=[grant('greatsword',1),wear()];const p=profile(actions);
    const resolution=resolveWeaponAttack(p,{firstD20:15,targetAC:13,damageRolls:[5,6]});
    expect(()=>recordWeaponAttack(initialCombatState(),inv(actions),{...p,magicWeaponInstanceId:'ward-20'},resolution)).toThrow();
    expect(()=>recordWeaponAttack(initialCombatState(),inv(actions),{...p,magicEnhancement:3},resolution)).toThrow();
  });
  it('no registra por error el arma mágica si el perfil es mundano y no se posee',()=>{
    const actions=[grant('longsword',1),wear()];const basic=calculateOwnedWeaponAttack(sheet(),inv(actions),'magic:ward-1','defense',setup().martial!.weaponMasteries);
    const response=resolveWeaponAttack(basic,{firstD20:17,targetAC:12,damageRolls:[4]});
    expect(()=>recordWeaponAttack(initialCombatState(),inv(actions),{...basic,magicWeaponInstanceId:undefined,magicEnhancement:undefined},response)).toThrow();
  });
  it('el historial antiguo sin arma mágica continúa validando',()=>{
    const p=profile([],'normal:greatsword');const r=resolveWeaponAttack(p,{firstD20:12,targetAC:12,damageRolls:[2,4]});
    const state=recordWeaponAttack(initialCombatState(),inv([]),p,r).combat;
    const restored=validateCombatState(JSON.parse(JSON.stringify(state)));
    expect(restored.attacks[0].magicWeaponInstanceId).toBeUndefined();
  });
  it('valida el historial nuevo y rechaza mejoras inventadas al cargar',()=>{
    const actions=[grant(),wear()];const p=profile(actions);const r=resolveWeaponAttack(p,{firstD20:12,targetAC:13,damageRolls:[2,4]});
    const state=recordWeaponAttack(initialCombatState(),inv(actions),p,r).combat;
    expect(validateCombatState(JSON.parse(JSON.stringify(state))).attacks[0].magicEnhancement).toBe(1);
    expect(()=>validateCombatState({...state,attacks:[{...state.attacks[0],magicEnhancement:5}]})).toThrow();
    const {magicEnhancement:_removed,...incomplete}=state.attacks[0];
    expect(()=>validateCombatState({...state,attacks:[incomplete]})).toThrow();
  });
  it('guarda y carga el arma +3, su identidad y el ataque, sin migración SQL',()=>{
    const actions=[grant('greatsword',3),wear()];const input={...setup(),inventoryActions:actions};
    const p=profile(actions),r=resolveWeaponAttack(p,{firstD20:15,targetAC:12,damageRolls:[4,4]});
    const adventure=calculateGuidedFighter(input).sheet;
    const initialAdventure=initialAdventureState(adventure);
    const combat=recordWeaponAttack(initialCombatState(),inv(actions),p,r).combat;
    const saved=makeCharacterSnapshot(input,{...initialAdventure,combat});
    const loaded=validateCharacterSnapshot(JSON.parse(JSON.stringify(saved)));
    const item=calculateGuidedFighter(loaded.input).inventory!.magicItems[0];
    expect(item.weaponId).toBe('greatsword');expect(item.enhancement).toBe(3);
    expect(loaded.adventure.combat.attacks[0].magicWeaponInstanceId).toBe(item.instanceId);
    expect(loaded.schemaVersion).toBe(2);
  });
  it('importación legacy de una defensa no crea una espada accidentalmente',()=>{
    const legacy=applyMagicWardAction([],{type:'grant',itemId:'brooch_shielding'});
    const actions=importLegacyMagicWards([],legacy);
    expect(inv(actions).magicItems[0].itemId).toBe('brooch_shielding');
    expect(inv(actions).magicItems[0].weaponId).toBeUndefined();
  });
  it('el diario nuevo nunca reutiliza un ID retirado y el diario antiguo sigue siendo compatible',()=>{
    const old:[InventoryAction,...InventoryAction[]]=[grant(),wear(),{type:'magic_remove',instanceId:'ward-1'}];
    expect(nextMagicInstanceId(old)).toBe('ward-2');
    const actions:InventoryAction[]=[...old,{...grant('dagger',2),instanceId:nextMagicInstanceId(old)},wear('ward-2')];
    const restored=inv(actions);
    expect(restored.magicItems[0].instanceId).toBe('ward-2');
    expect(restored.magicItems[0].weaponId).toBe('dagger');
    expect(inv([...old,grant('dagger',2),wear('ward-1')]).magicItems[0].instanceId).toBe('ward-1'); // Legado.
    expect(nextMagicInstanceId(actions)).toBe('ward-3');
  });
  it('el original no se muta al equipar un arma mágica',()=>{
    const original=inv([grant()]);const serialized=JSON.stringify(original);
    const updated=applyInventoryAction(original,wear());
    expect(JSON.stringify(original)).toBe(serialized);
    expect(updated.magicItems[0].worn).toBe(true);
  });
});
