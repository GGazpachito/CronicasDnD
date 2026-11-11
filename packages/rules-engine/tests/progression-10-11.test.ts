import {describe,it,expect} from 'vitest';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';
import {adjacentFighterLevel,type SupportedFighterLevel} from '../src/progression';
import {initialAdventureState,applyAdventureAction,validateAdventureState,advanceAdventureLevel} from '../src/adventure';
import {initialCombatState,startCharacterTurn,endCharacterTurn,spendHeroicInspiration,grantCombatActionSurge,validateCombatState,recordWeaponAttack} from '../src/combat';
import {calculateWeaponAttack,resolveWeaponAttack} from '../src/attacks';
import {spendAttackOnTurn,startTurnTracker,suggestAttackTurnUsage,validateTurnTracker} from '../src/turns';
import {fighterResourceMaximum,spendFighterResource,finishFighterRest} from '../src/resources';
import {makeCharacterSnapshot,validateCharacterSnapshot} from '../src/persistence';
import {prepareFighterLevelUp} from '../src/level-up';

const base:GuidedFighterInput={
  name:'Mariel',level:9,background:'soldier',species:'human',
  assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
  increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
  fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'tough',humanSize:'medium',
  armor:'chain_mail',shield:false,
  level4Improvement:{mode:'plus_two',first:'strength'},
  level6Improvement:{mode:'plus_two',first:'constitution'},
  level8Improvement:{mode:'plus_two',first:'wisdom'},
  martial:{fightingStyle:'defense',additionalFightingStyle:'archery',
    weaponMasteries:['greatsword','flail','javelin','shortsword'],startingPackage:'a'},
  backgroundEquipment:{startingPackage:'a',gamingSet:'dice_set'}
};
function character(level:9|10|11, fifth='longbow'):GuidedFighterInput{
  return {...base,level,martial:{...base.martial!,weaponMasteries:level>=10?[...base.martial!.weaponMasteries,fifth as 'longbow']:base.martial!.weaponMasteries}};
}
const detail={lightExtra:false,nickMastery:false,cleaveMastery:false,hitCreature:true,weaponId:'greatsword',targetName:'Orco'};

describe('Guerrero y Campeón, niveles 10 y 11',()=>{
  it('flechas llegan hasta 11 y se desactivan ahí',()=>{
    expect(adjacentFighterLevel(9,1)).toBe(10);
    expect(adjacentFighterLevel(10,1)).toBe(11);
    expect(adjacentFighterLevel(11,1)).toBeNull();
    expect(adjacentFighterLevel(11,-1)).toBe(10);
  });
  it('nivel 10: competencia +4, 4 usos de Segundo aliento y cinco maestrías',()=>{
    const calculated=calculateGuidedFighter(character(10));
    expect(calculated.sheet.level).toBe(10);
    expect(calculated.sheet.proficiencyBonus).toBe(4);
    expect(calculated.sheet.resources.second_wind?.maximum).toBe(4);
    expect(calculated.martial?.masteries).toHaveLength(5);
    expect(calculated.sheet.features).toContain('champion_heroic_warrior');
    expect(fighterResourceMaximum(10,'second_wind')).toBe(4);
  });
  it('nivel 11 desbloquea tres ataques por acción y mantiene los cinco dominios',()=>{
    const result=calculateGuidedFighter(character(11));
    expect(result.sheet.features).toContain('two_extra_attacks');
    expect(result.sheet.proficiencyBonus).toBe(4);
    expect(result.martial?.masteries).toHaveLength(5);
    expect(result.sheet.resources.second_wind?.maximum).toBe(4);
  });
  it('cada rasgo se muestra una sola vez en los niveles 9, 10 y 11',()=>{
    for (const level of [9,10,11] as const) {
      const features=calculateGuidedFighter(character(level)).sheet.features;
      expect(features.length).toBe(new Set(features).size);
      expect(features.filter(f=>f==='champion_heroic_warrior')).toHaveLength(level>=10?1:0);
      expect(features.filter(f=>f==='two_extra_attacks')).toHaveLength(level>=11?1:0);
    }
  });
  it('no permite quinta maestría duplicada ni quinta maestría antes de nivel 10',()=>{
    expect(()=>calculateGuidedFighter(character(10,'greatsword'))).toThrow();
    expect(()=>calculateGuidedFighter({...base,level:9,martial:{...base.martial!,weaponMasteries:[...base.martial!.weaponMasteries,'longbow']}})).toThrow();
  });
  it('Segundo aliento pasa de tres a cuatro conservando usos gastados',()=>{
    const a=calculateGuidedFighter(character(9)).sheet;
    const b=calculateGuidedFighter(character(10)).sheet;
    let state=initialAdventureState(a);
    state={...state,fighter:spendFighterResource(state.fighter,'second_wind')};
    const upgraded=advanceAdventureLevel(state,a,b);
    expect(upgraded.fighter.resources.second_wind?.current).toBe(3);
    expect(upgraded.fighter.fighterLevel).toBe(10);
    expect(finishFighterRest(upgraded.fighter,'short_rest').resources.second_wind?.current).toBe(4);
  });
  it('pasar de 10 a 11 no restaura recursos gastados ni borra daños',()=>{
    const a=calculateGuidedFighter(character(10)).sheet;
    const b=calculateGuidedFighter(character(11)).sheet;
    let state=applyAdventureAction(initialAdventureState(a),{type:'damage',amount:9},a).state;
    state={...state,fighter:spendFighterResource(state.fighter,'second_wind')};
    const upgraded=advanceAdventureLevel(state,a,b);
    expect(upgraded.fighter.hitPoints.current).toBe(b.maximumHitPoints-9);
    expect(upgraded.fighter.resources.second_wind?.current).toBe(3);
    expect(validateAdventureState(upgraded,b).fighter.fighterLevel).toBe(11);
  });
  it('Guerrero heroico solo concede inspiración desde nivel 10 al comenzar el turno',()=>{
    const earlier=startCharacterTurn(initialCombatState(),false);
    expect(earlier.heroicInspiration).toBeUndefined();
    let game=startCharacterTurn(initialCombatState(),true);
    expect(game.heroicInspiration).toBe(true);
    game=endCharacterTurn(game);
    game=startCharacterTurn(game,true);
    expect(game.heroicInspiration).toBe(true);
    expect(validateCombatState(game).heroicInspiration).toBe(true);
  });
  it('un Guerrero sin el rasgo de Campeón no recibe Inspiración automática',()=>{
    expect(startCharacterTurn(initialCombatState(),false).heroicInspiration).toBeUndefined();
  });
  it('inspiración se gasta una vez y vuelve al siguiente turno, no antes',()=>{
    let game=startCharacterTurn(initialCombatState(),true);
    game=spendHeroicInspiration(game);
    expect(game.heroicInspiration).toBe(false);
    expect(()=>spendHeroicInspiration(game)).toThrow();
    expect(endCharacterTurn(game).heroicInspiration).toBe(false);
    game=startCharacterTurn(endCharacterTurn(game),true);
    expect(game.heroicInspiration).toBe(true);
  });
  it('inspiración se conserva en la instantánea y se recupera del guardado',()=>{
    const input=character(10);
    const sheet=calculateGuidedFighter(input).sheet;
    const game={...initialAdventureState(sheet),combat:startCharacterTurn(initialCombatState(),true)};
    const snap=validateCharacterSnapshot(makeCharacterSnapshot(input,game));
    expect(snap.input.level).toBe(10);
    expect(snap.adventure.combat.heroicInspiration).toBe(true);
    const spent={...game,combat:spendHeroicInspiration(game.combat)};
    expect(validateCharacterSnapshot(makeCharacterSnapshot(input,spent)).adventure.combat.heroicInspiration).toBe(false);
  });
  it('guardado y recarga en nivel 11 preservan ficha y partida',()=>{
    const input=character(11);
    const sheet=calculateGuidedFighter(input).sheet;
    const game=initialAdventureState(sheet);
    const saved=validateCharacterSnapshot(makeCharacterSnapshot(input,game));
    expect(saved.input.level).toBe(11);
    expect(saved.adventure.fighter.fighterLevel).toBe(11);
    expect(saved.input.martial?.weaponMasteries).toHaveLength(5);
    expect(saved.adventure.fighter.resources.second_wind?.current).toBe(4);
  });
  it('la progresión del nivel 9 a 10 requiere exactamente un nivel y conserva el estado',()=>{
    const first=character(9);const second=character(10);
    const sheet=calculateGuidedFighter(first).sheet;
    const game=applyAdventureAction(initialAdventureState(sheet),{type:'damage',amount:4},sheet).state;
    const {snapshot}=prepareFighterLevelUp(first,game,second);
    expect(snapshot.input.level).toBe(10);
    expect(snapshot.adventure.fighter.hitPoints.current).toBe(snapshot.adventure.fighter.hitPoints.maximum-4);
    expect(()=>prepareFighterLevelUp(first,game,character(11))).toThrow();
  });
  it('a nivel 11 se confirman tres ataques con una sola acción',()=>{
    let turn=startTurnTracker(initialTurn());
    const args={...detail,attackLimit:3 as const};
    expect(suggestAttackTurnUsage(turn,11)).toBe('attack_action');
    turn=spendAttackOnTurn(turn,'attack_action',args);
    expect(turn.actionsUsed).toBe(1);expect(turn.attackActionAttacksUsed).toBe(1);
    expect(suggestAttackTurnUsage(turn,11)).toBe('extra_attack');
    turn=spendAttackOnTurn(turn,'extra_attack',args);
    expect(turn.actionsUsed).toBe(1);expect(turn.attackActionAttacksUsed).toBe(2);
    expect(suggestAttackTurnUsage(turn,11)).toBe('extra_attack');
    turn=spendAttackOnTurn(turn,'extra_attack',args);
    expect(turn.actionsUsed).toBe(1);expect(turn.attackActionAttacksUsed).toBe(3);
    expect(suggestAttackTurnUsage(turn,11)).toBe('attack_action');
    expect(()=>spendAttackOnTurn(turn,'extra_attack',args)).toThrow();
  });
  it('un Guerrero de nivel 10 mantiene el límite de dos ataques',()=>{
    let turn=startTurnTracker(initialTurn());const args={...detail,attackLimit:2 as const};
    turn=spendAttackOnTurn(turn,'attack_action',args);
    turn=spendAttackOnTurn(turn,'extra_attack',args);
    expect(()=>spendAttackOnTurn(turn,'extra_attack',args)).toThrow();
    expect(suggestAttackTurnUsage(turn,10)).toBe('attack_action');
  });
  it('el perfil de arma se calcula con las cinco maestrías',()=>{
    const sheet=calculateGuidedFighter(character(11)).sheet;
    const profile=calculateWeaponAttack(sheet,'greatsword',['defense','archery'],character(11).martial!.weaponMasteries);
    expect(profile.mastery).toBe('Graze');
    expect(profile.criticalMinimum).toBe(19);
  });
  it('registro real de ataques de nivel 11 no consume una segunda acción',()=>{
    const input=character(11),data=calculateGuidedFighter(input);
    const inventory=data.inventory!;
    const profile=calculateWeaponAttack(data.sheet,'greatsword',['defense','archery'],input.martial!.weaponMasteries);
    const miss=resolveWeaponAttack(profile,{firstD20:4,targetAC:30});
    let game=startCharacterTurn(initialCombatState(),true);
    for(const mode of ['attack_action','extra_attack','extra_attack'] as const){
      game=recordWeaponAttack(game,inventory,profile,miss,undefined,mode,11).combat;
    }
    expect(game.turn?.attackActionAttacksUsed).toBe(3);
    expect(game.turn?.actionsUsed).toBe(1);
    expect(game.attacks).toHaveLength(3);
    expect(()=>recordWeaponAttack(game,inventory,profile,miss,undefined,'extra_attack',11)).toThrow();
  });
  it('Acción súbita permite una segunda acción Atacar completa con tres golpes más',()=>{
    const input=character(11),data=calculateGuidedFighter(input);
    const profile=calculateWeaponAttack(data.sheet,'greatsword',['defense','archery'],input.martial!.weaponMasteries);
    const miss=resolveWeaponAttack(profile,{firstD20:4,targetAC:30});
    let game=startCharacterTurn(initialCombatState(),true);
    for(const mode of ['attack_action','extra_attack','extra_attack'] as const)
      game=recordWeaponAttack(game,data.inventory!,profile,miss,undefined,mode,11).combat;
    game=grantCombatActionSurge(game);
    for(const mode of ['attack_action','extra_attack','extra_attack'] as const)
      game=recordWeaponAttack(game,data.inventory!,profile,miss,undefined,mode,11).combat;
    expect(game.turn?.actionsUsed).toBe(2);
    expect(game.turn?.attackActionAttacksUsed).toBe(3);
    expect(game.attacks).toHaveLength(6);
  });
  it('la validación del turno admite tres golpes y rechaza cuatro',()=>{
    let t=startTurnTracker(initialTurn());const args={...detail,attackLimit:3 as const};
    t=spendAttackOnTurn(t,'attack_action',args);
    t=spendAttackOnTurn(t,'extra_attack',args);
    t=spendAttackOnTurn(t,'extra_attack',args);
    expect(validateTurnTracker(t).attackActionAttacksUsed).toBe(3);
    expect(()=>validateTurnTracker({...t,attackActionAttacksUsed:4})).toThrow();
  });
});
function initialTurn(){return {number:0,active:false,actionLimit:1 as const,actionsUsed:0,bonusUsed:false,reactionUsed:false,movementUsedFeet:0,dashes:0,attackActionUsed:false,attackActionAttacksUsed:0,lightExtraUsed:false,cleaveExtraUsed:false,cleaveReadyWeapon:null,cleaveFirstTarget:null};}
