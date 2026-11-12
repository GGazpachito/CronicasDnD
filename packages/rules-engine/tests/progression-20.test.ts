import {describe,it,expect} from 'vitest';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';
import {calculateWeaponAttack,resolveWeaponAttack} from '../src/attacks';
import {adjacentFighterLevel,type SupportedFighterLevel} from '../src/progression';
import {initialAdventureState,applyAdventureAction} from '../src/adventure';
import {initialCombatState,startCharacterTurn,grantCombatActionSurge,recordWeaponAttack,endCharacterTurn} from '../src/combat';
import {startTurnTracker,initialTurnTracker,spendAttackOnTurn,grantActionSurgeSlot,validateTurnTracker,suggestAttackTurnUsage} from '../src/turns';
import {fighterResourceMaximum,spendFighterResource} from '../src/resources';
import {makeCharacterSnapshot,validateCharacterSnapshot} from '../src/persistence';
import {prepareFighterLevelUp} from '../src/level-up';

const base:GuidedFighterInput={
  name:'Campeón',level:19,background:'soldier',species:'human',
  assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
  increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
  fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'tough',humanSize:'medium',
  armor:'chain_mail',shield:false,
  level4Improvement:{mode:'plus_two',first:'strength'},
  level6Improvement:{mode:'plus_two',first:'constitution'},
  level8Improvement:{mode:'plus_two',first:'wisdom'},
  level12Improvement:{mode:'plus_two',first:'wisdom'},
  level14Improvement:{mode:'plus_two',first:'charisma'},
  level16Improvement:{mode:'plus_two',first:'intelligence'},
  epicBoon:{id:'speed',ability:'charisma'},
  martial:{fightingStyle:'defense',additionalFightingStyle:'archery',weaponMasteries:['greatsword','flail','javelin','shortsword','longbow','warhammer'],startingPackage:'a'},
  backgroundEquipment:{startingPackage:'a',gamingSet:'dice_set'},
};
const input20:GuidedFighterInput={...base,level:20};
const details={lightExtra:false,nickMastery:false,cleaveMastery:false,hitCreature:true,weaponId:'greatsword',targetName:'Orco',attackLimit:4 as const};

function runAction(turn:ReturnType<typeof startTurnTracker>){
  turn=spendAttackOnTurn(turn,'attack_action',details);
  for(let i=0;i<3;i++)turn=spendAttackOnTurn(turn,'extra_attack',details);
  return turn;
}

describe('Actualización 35: Guerrero y Campeón nivel 20',()=>{
  it('el selector alcanza 20 y prohíbe avanzar a 21',()=>{
    expect(adjacentFighterLevel(19,1)).toBe(20);
    expect(adjacentFighterLevel(20,1)).toBeNull();
    expect(adjacentFighterLevel(20,-1)).toBe(19);
    expect(()=>adjacentFighterLevel(21 as SupportedFighterLevel,1)).toThrow();
  });
  it('la hoja muestra Tres ataques adicionales sin duplicar ningún rasgo',()=>{
    const sheet=calculateGuidedFighter(input20).sheet;
    expect(sheet.level).toBe(20);
    expect(sheet.features).toContain('three_extra_attacks');
    expect(sheet.features.filter(f=>f==='three_extra_attacks')).toHaveLength(1);
    expect(sheet.features).toHaveLength(new Set(sheet.features).size);
    expect(calculateGuidedFighter(base).sheet.features.includes('three_extra_attacks')).toBe(false);
  });
  it('competencia, maestrías y máximos de recursos no cambian entre 19 y 20',()=>{
    const old=calculateGuidedFighter(base);
    const next=calculateGuidedFighter(input20);
    expect(next.sheet.proficiencyBonus).toBe(6);
    expect(next.sheet.proficiencyBonus).toBe(old.sheet.proficiencyBonus);
    expect(next.martial?.masteries).toHaveLength(6);
    for(const id of ['second_wind','action_surge','indomitable'] as const)
      expect(fighterResourceMaximum(20,id)).toBe(fighterResourceMaximum(19,id));
    expect(next.sheet.resources.second_wind?.maximum).toBe(4);
    expect(next.sheet.resources.action_surge?.maximum).toBe(2);
    expect(next.sheet.resources.indomitable?.maximum).toBe(3);
  });
  it('mantiene el beneficio épico y sus efectos de nivel 19',()=>{
    const old=calculateGuidedFighter(base),next=calculateGuidedFighter(input20);
    expect(next.sheet.features).toContain('epic_boon_speed');
    expect(next.origin.speedFeet).toBe(old.origin.speedFeet);
    expect(next.sheet.abilityScores.charisma).toBe(old.sheet.abilityScores.charisma);
    expect(()=>calculateGuidedFighter({...input20,epicBoon:undefined})).toThrow();
  });
  it('un nivel 19 solo puede confirmar tres golpes por acción Atacar',()=>{
    let turn=startTurnTracker(initialTurnTracker());
    turn=spendAttackOnTurn(turn,'attack_action',{...details,attackLimit:3});
    turn=spendAttackOnTurn(turn,'extra_attack',{...details,attackLimit:3});
    turn=spendAttackOnTurn(turn,'extra_attack',{...details,attackLimit:3});
    expect(()=>spendAttackOnTurn(turn,'extra_attack',{...details,attackLimit:3})).toThrow();
    expect(suggestAttackTurnUsage(turn,19)).toBe('attack_action');
  });
  it('nivel 20: cuatro golpes en UNA acción Atacar y quinto bloqueado',()=>{
    let turn=startTurnTracker(initialTurnTracker());
    expect(suggestAttackTurnUsage(turn,20)).toBe('attack_action');
    for(let i=1;i<=4;i++){
      turn=spendAttackOnTurn(turn,i===1?'attack_action':'extra_attack',details);
      expect(turn.actionsUsed).toBe(1);
      expect(turn.attackActionAttacksUsed).toBe(i);
      expect(suggestAttackTurnUsage(turn,20)).toBe(i===4?'attack_action':'extra_attack');
      expect(validateTurnTracker(turn).attackActionAttacksUsed).toBe(i);
    }
    expect(()=>spendAttackOnTurn(turn,'extra_attack',details)).toThrow();
    expect(()=>spendAttackOnTurn(turn,'attack_action',details)).toThrow();
  });
  it('Acción súbita permite dos acciones Atacar de cuatro golpes cada una',()=>{
    let turn=startTurnTracker(initialTurnTracker());
    turn=runAction(turn);
    turn=grantActionSurgeSlot(turn);
    expect(turn.actionLimit).toBe(2);
    turn=runAction(turn);
    expect(turn.actionsUsed).toBe(2);
    expect(turn.attackActionAttacksUsed).toBe(4);
    expect(()=>spendAttackOnTurn(turn,'extra_attack',details)).toThrow();
    expect(()=>spendAttackOnTurn(turn,'attack_action',details)).toThrow();
    expect(()=>grantActionSurgeSlot(turn)).toThrow();
  });
  it('los golpes adicionales no gastan otra acción ni una reacción',()=>{
    const turn=runAction(startTurnTracker(initialTurnTracker()));
    expect(turn.actionsUsed).toBe(1);
    expect(turn.bonusUsed).toBe(false);
    expect(turn.reactionUsed).toBe(false);
    expect(turn.lightExtraUsed).toBe(false);
  });
  it('registro de cuatro ataques reales conserva el contador y el historial',()=>{
    const data=calculateGuidedFighter(input20);
    const profile=calculateWeaponAttack(data.sheet,'greatsword',['defense','archery'],input20.martial!.weaponMasteries);
    const miss=resolveWeaponAttack(profile,{firstD20:2,targetAC:35});
    let combat=startCharacterTurn(initialCombatState(),true);
    for(const usage of ['attack_action','extra_attack','extra_attack','extra_attack'] as const)
      combat=recordWeaponAttack(combat,data.inventory!,profile,miss,undefined,usage,20).combat;
    expect(combat.turn?.attackActionAttacksUsed).toBe(4);
    expect(combat.turn?.actionsUsed).toBe(1);
    expect(combat.attacks).toHaveLength(4);
    expect(()=>recordWeaponAttack(combat,data.inventory!,profile,miss,undefined,'extra_attack',20)).toThrow();
    expect(endCharacterTurn(combat).turn?.active).toBe(false);
  });
  it('Acción súbita registra ocho golpes en el motor de combate sin exceder acciones',()=>{
    const data=calculateGuidedFighter(input20);
    const profile=calculateWeaponAttack(data.sheet,'greatsword',['defense','archery'],input20.martial!.weaponMasteries);
    const miss=resolveWeaponAttack(profile,{firstD20:2,targetAC:35});
    let combat=startCharacterTurn(initialCombatState(),true);
    for(let action=0;action<2;action++){
      if(action)combat=grantCombatActionSurge(combat);
      for(const usage of ['attack_action','extra_attack','extra_attack','extra_attack'] as const)
        combat=recordWeaponAttack(combat,data.inventory!,profile,miss,undefined,usage,20).combat;
    }
    expect(combat.attacks).toHaveLength(8);
    expect(combat.turn?.actionsUsed).toBe(2);
    expect(combat.turn?.attackActionAttacksUsed).toBe(4);
    expect(()=>recordWeaponAttack(combat,data.inventory!,profile,miss,undefined,'attack_action',20)).toThrow();
  });
  it('subir 19→20 conserva el daño, los usos gastados y el nivel persistido',()=>{
    const before=calculateGuidedFighter(base).sheet;
    let game=applyAdventureAction(initialAdventureState(before),{type:'damage',amount:15},before).state;
    game={...game,fighter:spendFighterResource(game.fighter,'action_surge')};
    const {snapshot}=prepareFighterLevelUp(base,game,input20);
    const restored=validateCharacterSnapshot(JSON.parse(JSON.stringify(snapshot)));
    const after=calculateGuidedFighter(input20).sheet;
    expect(restored.input.level).toBe(20);
    expect(restored.adventure.fighter.fighterLevel).toBe(20);
    expect(restored.adventure.fighter.hitPoints.maximum).toBe(after.maximumHitPoints);
    expect(after.maximumHitPoints-restored.adventure.fighter.hitPoints.current).toBe(15);
    expect(restored.adventure.fighter.resources.action_surge?.current).toBe(1);
    expect(restored.input.epicBoon?.id).toBe('speed');
    expect(()=>prepareFighterLevelUp(base,game,{...input20,level:19})).toThrow();
  });
  it('el guardado de nivel 19 rechaza un contador de cuatro ataques de nivel 20',()=>{
    const sheet=calculateGuidedFighter(base).sheet;
    const initial=initialAdventureState(sheet);
    const turn=runAction(startTurnTracker(initialTurnTracker()));
    const corrupted={...initial,combat:{...initial.combat,turn}};
    expect(()=>makeCharacterSnapshot(base,corrupted)).toThrow();
    expect(makeCharacterSnapshot(input20,{...initialAdventureState(calculateGuidedFighter(input20).sheet),combat:{...initial.combat,turn}}).input.level).toBe(20);
  });
  it('el guardado conserva el cuarto ataque tras serializar la sesión',()=>{
    const data=calculateGuidedFighter(input20);
    const profile=calculateWeaponAttack(data.sheet,'greatsword',['defense','archery'],input20.martial!.weaponMasteries);
    const miss=resolveWeaponAttack(profile,{firstD20:2,targetAC:35});
    let combat=startCharacterTurn(initialCombatState(),true);
    for(const usage of ['attack_action','extra_attack','extra_attack','extra_attack'] as const)
      combat=recordWeaponAttack(combat,data.inventory!,profile,miss,undefined,usage,20).combat;
    const game={...initialAdventureState(data.sheet),combat};
    const snapshot=validateCharacterSnapshot(JSON.parse(JSON.stringify(makeCharacterSnapshot(input20,game))));
    expect(snapshot.adventure.combat.turn?.attackActionAttacksUsed).toBe(4);
    expect(snapshot.adventure.combat.attacks).toHaveLength(4);
  });
});
