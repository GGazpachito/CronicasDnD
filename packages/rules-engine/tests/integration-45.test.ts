import {describe,it,expect} from 'vitest';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';
import {EMPTY_CHARACTER_PROFILE} from '../src/character-profile';
import {coinAdjustment} from '../src/inventory';
import {equippedInventory,inventoryOverview} from '../src/inventory-view';
import {equippedWeaponChoices,calculateOwnedWeaponAttack,resolveWeaponDamage} from '../src/attacks';
import {collectCharacterTraits} from '../src/traits';
import {collectCharacterSpellbook} from '../src/spellbook';
import {initialAdventureState,applyAdventureAction,setManualDeathSaveMark} from '../src/adventure';
import {makeCharacterSnapshot,validateCharacterSnapshot} from '../src/persistence';
import {previewFighterLevelUp} from '../src/level-up-wizard';
import {prepareFighterLevelUp} from '../src/level-up';

const base=():GuidedFighterInput=>({
  name:'Integración 45',level:1,background:'soldier',species:'human',
  assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
  increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
  fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'alert',humanSize:'medium',
  armor:'chain_mail',shield:false,
  martial:{fightingStyle:'defense',weaponMasteries:['greatsword','flail','javelin'],startingPackage:'a'},
  backgroundEquipment:{startingPackage:'a',gamingSet:'dice_set'},
  profile:{...EMPTY_CHARACTER_PROFILE,backstory:'La promesa del guerrero',notes:'Buscar el mapa'},
  inventoryActions:[],
});
function roundTrip(input:GuidedFighterInput,game?:ReturnType<typeof initialAdventureState>){
  return validateCharacterSnapshot(JSON.parse(JSON.stringify(makeCharacterSnapshot(input,game))));
}

describe('Actualización 45: integración entre pestañas y persistencia',()=>{
  it('conserva inventario, PG, inspiración, marcas y perfil en un mismo guardado',()=>{
    const input:GuidedFighterInput={...base(),inventoryActions:[
      coinAdjustment('platinum',1),
      {type:'equip_weapon',weaponId:'greatsword',equipped:true},
    ]};
    const result=calculateGuidedFighter(input);
    const fresh=initialAdventureState(result.sheet);
    const damaged=applyAdventureAction(fresh,{type:'damage',amount:7},result.sheet).state;
    const inspired=applyAdventureAction(damaged,{type:'gain_heroic_inspiration'},result.sheet).state;
    const marked=setManualDeathSaveMark(inspired,result.sheet,'failures',1,true);
    const originalInput=JSON.stringify(input),originalGame=JSON.stringify(marked);
    const snapshot=roundTrip(input,marked);
    const inventory=calculateGuidedFighter(snapshot.input).inventory!;
    expect(snapshot.input.profile?.backstory).toBe('La promesa del guerrero');
    expect(snapshot.input.profile?.notes).toBe('Buscar el mapa');
    expect(snapshot.adventure.fighter.hitPoints.maximum-snapshot.adventure.fighter.hitPoints.current).toBe(7);
    expect(snapshot.adventure.combat.heroicInspiration).toBe(true);
    expect(snapshot.adventure.manualDeathMarks?.failures).toEqual([false,true,false]);
    expect(inventoryOverview(inventory).categories.weapons).toBeGreaterThan(0);
    expect(equippedInventory(inventory).some(item=>item.name.toLowerCase().includes('espad'))).toBe(true);
    expect(equippedWeaponChoices(inventory).map(w=>w.selectionId)).toEqual(['normal:greatsword']);
    expect(JSON.stringify(input)).toBe(originalInput);
    expect(JSON.stringify(marked)).toBe(originalGame);
  });

  it('al equipar un arma, Principal consulta el mismo perfil que Equipo y tira los dados correctos',()=>{
    const character={...base(),inventoryActions:[{type:'equip_weapon' as const,weaponId:'greatsword' as const,equipped:true}]};
    const result=calculateGuidedFighter(character);
    const inv=result.inventory!;
    const equipped=equippedWeaponChoices(inv);
    expect(equipped.map(w=>w.selectionId)).toEqual(['normal:greatsword']);
    const attack=calculateOwnedWeaponAttack(result.sheet,inv,equipped[0].selectionId,character.martial!.fightingStyle,character.martial!.weaponMasteries);
    expect(attack.attackBonus).toBe(result.sheet.abilityModifiers.strength+result.sheet.proficiencyBonus);
    expect(resolveWeaponDamage(attack,[2,3]).total).toBe(5+result.sheet.abilityModifiers.strength);
    expect(resolveWeaponDamage(attack,[1,2,3,4],true).dice).toHaveLength(4);
    const removed=calculateGuidedFighter({...character,inventoryActions:[...character.inventoryActions!,{type:'equip_weapon',weaponId:'greatsword',equipped:false}]});
    expect(equippedWeaponChoices(removed.inventory!)).toHaveLength(0);
  });

  it('los rasgos y los hechizos son proyecciones: consultar las pestañas no altera la ficha',()=>{
    const input=base();
    const result=calculateGuidedFighter(input),before=JSON.stringify(result);
    const traits=collectCharacterTraits(input,result);
    const book=collectCharacterSpellbook(result);
    expect(traits.traits.length).toBeGreaterThan(0);
    expect(new Set(traits.traits.map(t=>t.id)).size).toBe(traits.traits.length);
    expect(book.classSpellSlotsAvailable).toBe(false);
    expect(book.entries).toHaveLength(0);
    expect(JSON.stringify(result)).toBe(before);
  });

  it('una subida normal mantiene cambios de partida e inventario sin duplicar rasgos',()=>{
    const current:GuidedFighterInput={...base(),inventoryActions:[coinAdjustment('gold',2),{type:'equip_weapon',weaponId:'greatsword',equipped:true}]};
    const sheet=calculateGuidedFighter(current).sheet;
    const damaged=applyAdventureAction(initialAdventureState(sheet),{type:'damage',amount:9},sheet).state;
    const marked=setManualDeathSaveMark(damaged,sheet,'successes',0,true);
    const next=previewFighterLevelUp(current,{}).input;
    const upgraded=prepareFighterLevelUp(current,marked,next).snapshot;
    const restored=roundTrip(upgraded.input,upgraded.adventure);
    const newResult=calculateGuidedFighter(restored.input);
    expect(restored.input.level).toBe(2);
    expect(restored.adventure.fighter.fighterLevel).toBe(2);
    expect(restored.adventure.fighter.hitPoints.maximum-restored.adventure.fighter.hitPoints.current).toBe(9);
    expect(restored.adventure.manualDeathMarks?.successes).toEqual([true,false,false]);
    expect(restored.input.inventoryActions).toEqual(current.inventoryActions);
    expect(restored.input.profile).toEqual(current.profile);
    expect(new Set(newResult.sheet.features).size).toBe(newResult.sheet.features.length);
    expect(equippedWeaponChoices(newResult.inventory!).map(w=>w.selectionId)).toEqual(['normal:greatsword']);
  });

  it('un guardado inválido se rechaza sin modificar la copia original',()=>{
    const good=roundTrip(base()),before=JSON.stringify(good);
    const broken={...good,adventure:{...good.adventure,fighter:{...good.adventure.fighter,fighterLevel:20}}};
    expect(()=>validateCharacterSnapshot(broken)).toThrow();
    expect(JSON.stringify(good)).toBe(before);
    const badRuleset={...good,ruleset:'dnd-2014'};
    expect(()=>validateCharacterSnapshot(badRuleset)).toThrow();
  });
});
