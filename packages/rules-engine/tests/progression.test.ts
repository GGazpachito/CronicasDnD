import {describe,it,expect} from 'vitest';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';
import {applyFighterLevel4Improvement} from '../src/progression';
import {initialAdventureState,advanceAdventureLevel,applyAdventureAction,resourceDisplay} from '../src/adventure';
import {initialFighterState,spendFighterResource,finishFighterRest,fighterResourceMaximum} from '../src/resources';
import {makeCharacterSnapshot,validateCharacterSnapshot} from '../src/persistence';
import {calculateWeaponAttack,resolveWeaponAttack} from '../src/attacks';
import {initialTurnTracker,startTurnTracker,spendAttackOnTurn,validateTurnTracker,suggestAttackTurnUsage} from '../src/turns';
import {initialCombatState,startCharacterTurn,recordWeaponAttack} from '../src/combat';
import {elfLineageSpells} from '../src/origin-magic';

const base=():GuidedFighterInput=>({
  name:'Aldric',level:3,background:'soldier',species:'human',
  assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
  increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
  fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'tough',humanSize:'medium',
  armor:'chain_mail',shield:false,martial:{fightingStyle:'defense',weaponMasteries:['greatsword','flail','javelin'],startingPackage:'a'},
  backgroundEquipment:{startingPackage:'a',gamingSet:'dice_set'}
});
const at=(level:4|5,improvement:GuidedFighterInput['level4Improvement']={mode:'plus_two',first:'strength'}):GuidedFighterInput=>({
  ...base(),level,level4Improvement:improvement,
  martial:{...base().martial!,weaponMasteries:['greatsword','flail','javelin','shortsword']},
});

describe('Paso 27: progresión del Guerrero 4 y 5',()=>{
  it('los niveles anteriores siguen intactos y no requieren mejora',()=>{
    const old=calculateGuidedFighter(base()).sheet;
    expect(old.level).toBe(3);expect(old.resources.second_wind?.maximum).toBe(2);
    expect(()=>calculateGuidedFighter({...base(),level4Improvement:{mode:'plus_two',first:'strength'}})).toThrow();
  });
  it('el nivel 4 exige la dote y cuatro maestrías, sin aplicar elecciones implícitas',()=>{
    expect(()=>calculateGuidedFighter({...at(4),level4Improvement:undefined})).toThrow();
    expect(()=>calculateGuidedFighter({...at(4),martial:base().martial})).toThrow();
    expect(()=>calculateGuidedFighter({...at(4),martial:{...at(4).martial!,weaponMasteries:['greatsword','flail','javelin','javelin']}})).toThrow();
  });
  it('mejora +2, no duplica el trasfondo y la segunda característica queda prohibida',()=>{
    const x=calculateGuidedFighter(at(4)).sheet;
    expect(x.abilityScores.strength).toBe(19);expect(x.abilityScores.constitution).toBe(14);
    expect(x.resources.second_wind?.maximum).toBe(3);
    expect(x.features).toContain('ability_score_improvement');
    expect(()=>calculateGuidedFighter(at(4,{mode:'plus_two',first:'strength',second:'dexterity'}))).toThrow();
  });
  it('+1/+1 permite aumentar Constitución con PG retroactivos',()=>{
    const a=calculateGuidedFighter(at(4,{mode:'two_ones',first:'strength',second:'constitution'})).sheet;
    expect(a.abilityScores.strength).toBe(18);expect(a.abilityScores.constitution).toBe(15);
    expect(a.maximumHitPoints).toBe(44);
    expect(()=>calculateGuidedFighter(at(4,{mode:'two_ones',first:'constitution',second:'constitution'}))).toThrow();
  });
  it('no puede excederse 20 en una mejora de característica',()=>{
    expect(()=>applyFighterLevel4Improvement({strength:19,dexterity:10,constitution:10,intelligence:10,wisdom:10,charisma:10},{mode:'plus_two',first:'strength'})).toThrow();
    expect(applyFighterLevel4Improvement({strength:19,dexterity:10,constitution:10,intelligence:10,wisdom:10,charisma:10},{mode:'two_ones',first:'strength',second:'dexterity'}).strength).toBe(20);
  });
  it('nivel 5 tiene competencia +3, 2 ataques, desplazamiento táctico y 4 maestrías',()=>{
    const s=calculateGuidedFighter(at(5)).sheet;
    expect(s.proficiencyBonus).toBe(3);expect(s.features).toContain('extra_attack');
    expect(s.features).toContain('tactical_shift');expect(s.resources.second_wind?.maximum).toBe(3);
    expect(calculateGuidedFighter(at(5)).martial?.masteries).toHaveLength(4);
  });
  it('los ataques usan el +3 de competencia y permiten las cuatro maestrías',()=>{
    const s=calculateGuidedFighter(at(5)).sheet;
    const p=calculateWeaponAttack(s,'greatsword','defense',at(5).martial!.weaponMasteries);
    expect(p.attackBonus).toBe(7);expect(p.damageModifier).toBe(4);
    const resolution=resolveWeaponAttack(p,{firstD20:15,targetAC:15,damageRolls:[3,4]});
    expect(resolution.attackTotal).toBe(22);expect(resolution.damageTotal).toBe(11);
  });
  it('el panel de recursos deriva el máximo del nivel, no de un valor fijo',()=>{
    const s4=calculateGuidedFighter(at(4)).sheet;
    const s5=calculateGuidedFighter(at(5)).sheet;
    expect(resourceDisplay(initialAdventureState(s4),s4).second_wind?.maximum).toBe(3);
    expect(resourceDisplay(initialAdventureState(s5),s5).second_wind?.maximum).toBe(3);
  });
  it('Segundo aliento pasa de dos a tres usos en el nivel 4 y recupera uno en descanso corto',()=>{
    expect(fighterResourceMaximum(3,'second_wind')).toBe(2);
    expect(fighterResourceMaximum(4,'second_wind')).toBe(3);
    const s=spendFighterResource(initialFighterState(4,44),'second_wind');
    expect(s.resources.second_wind?.current).toBe(2);
    expect(finishFighterRest(s,'short_rest').resources.second_wind?.current).toBe(3);
    expect(finishFighterRest(spendFighterResource(s,'second_wind'),'long_rest').resources.second_wind?.current).toBe(3);
  });
  it('subida 3 a 4 conserva daño, recursos gastados, inventario independiente y el turno',()=>{
    const a=calculateGuidedFighter(base()).sheet;const b=calculateGuidedFighter(at(4)).sheet;
    let game=initialAdventureState(a);
    game=applyAdventureAction(game,{type:'damage',amount:5},a).state;
    game=applyAdventureAction(game,{type:'second_wind',d10:1},a).state;
    const next=advanceAdventureLevel(game,a,b);
    expect(next.fighter.fighterLevel).toBe(4);
    expect(next.fighter.hitPoints.maximum).toBe(b.maximumHitPoints);
    expect(next.fighter.hitPoints.current).toBe(game.fighter.hitPoints.current+(b.maximumHitPoints-a.maximumHitPoints));
    expect(next.fighter.resources.second_wind?.current).toBe(2);
    expect(next.combat).toEqual(game.combat);
    expect(next.spentHitDice).toBe(game.spentHitDice);
  });
  it('no permite saltar niveles ni avanzar guardados incoherentes',()=>{
    const a=calculateGuidedFighter(base()).sheet;const b=calculateGuidedFighter(at(5)).sheet;
    expect(()=>advanceAdventureLevel(initialAdventureState(a),a,b)).toThrow();
    expect(()=>advanceAdventureLevel(initialAdventureState(a),a,a)).toThrow();
  });
  it('los guardados anteriores siguen siendo válidos y nivel 5 se recupera sin migración',()=>{
    const v3=makeCharacterSnapshot(base());expect(validateCharacterSnapshot(v3).input.level).toBe(3);
    const v5=makeCharacterSnapshot(at(5));
    expect(validateCharacterSnapshot(JSON.parse(JSON.stringify(v5))).adventure.fighter.fighterLevel).toBe(5);
  });
  it('un elfo recibe también su conjuro de linaje de nivel 5',()=>{
    expect(elfLineageSpells('drow',5,'intelligence').map(x=>x.id)).toContain('darkness');
    expect(elfLineageSpells('high_elf',5,'wisdom').map(x=>x.id)).toContain('misty_step');
    expect(elfLineageSpells('wood_elf',5,'charisma').map(x=>x.id)).toContain('pass_without_trace');
    expect(elfLineageSpells('drow',4,'intelligence')).toHaveLength(2);
  });
  it('un ataque adicional no consume otra acción y queda limitado a dos por acción',()=>{
    let t=startTurnTracker(initialTurnTracker());
    const details={lightExtra:false,nickMastery:false,cleaveMastery:false,hitCreature:true,weaponId:'greatsword',targetName:'Orco',attackLimit:2 as const};
    t=spendAttackOnTurn(t,'attack_action',details);
    expect(t.actionsUsed).toBe(1);expect(t.attackActionAttacksUsed).toBe(1);
    t=spendAttackOnTurn(t,'extra_attack',details);
    expect(t.actionsUsed).toBe(1);expect(t.attackActionAttacksUsed).toBe(2);
    expect(()=>spendAttackOnTurn(t,'extra_attack',details)).toThrow();
  });
  it('propone automáticamente el segundo golpe tras el primero, incluso con 0 acciones libres',()=>{
    let turn=startTurnTracker(initialTurnTracker());
    const details={lightExtra:false,nickMastery:false,cleaveMastery:false,hitCreature:true,
      weaponId:'greatsword',targetName:'Orco',attackLimit:2 as const};
    expect(suggestAttackTurnUsage(turn,5)).toBe('attack_action');
    turn=spendAttackOnTurn(turn,'attack_action',details);
    expect(turn.actionLimit-turn.actionsUsed).toBe(0);
    expect(suggestAttackTurnUsage(turn,5)).toBe('extra_attack');
    expect(suggestAttackTurnUsage(turn,4)).toBe('attack_action');
    turn=spendAttackOnTurn(turn,suggestAttackTurnUsage(turn,5),details);
    expect(turn.actionsUsed).toBe(1);
    expect(turn.attackActionAttacksUsed).toBe(2);
    expect(suggestAttackTurnUsage(turn,5)).toBe('attack_action');
    expect(()=>spendAttackOnTurn(turn,'extra_attack',details)).toThrow();
  });
  it('al empezar otro turno vuelve a proponerse Acción Atacar, no el ataque anterior',()=>{
    const started=startTurnTracker(initialTurnTracker());
    const details={lightExtra:false,nickMastery:false,cleaveMastery:false,hitCreature:true,
      weaponId:'greatsword',targetName:'Orco',attackLimit:2 as const};
    const first=spendAttackOnTurn(started,'attack_action',details);
    const next=startTurnTracker({...first,active:false});
    expect(suggestAttackTurnUsage(next,5)).toBe('attack_action');
    expect(next.attackActionAttacksUsed).toBe(0);
  });
  it('nivel 4 no puede hacer ese ataque y los turnos antiguos se normalizan',()=>{
    let t=startTurnTracker(initialTurnTracker());
    const d={lightExtra:false,nickMastery:false,cleaveMastery:false,hitCreature:false,weaponId:'flail',targetName:'Orco',attackLimit:1 as const};
    t=spendAttackOnTurn(t,'attack_action',d);
    expect(()=>spendAttackOnTurn(t,'extra_attack',d)).toThrow();
    const {attackActionAttacksUsed:_old,...legacy}=t;
    expect(validateTurnTracker(legacy).attackActionAttacksUsed).toBe(1);
  });
  it('el registro de combate admite el segundo ataque de un Guerrero 5',()=>{
    const current=calculateGuidedFighter(at(5));
    const p=calculateWeaponAttack(current.sheet,'greatsword','defense',at(5).martial!.weaponMasteries);
    const r=resolveWeaponAttack(p,{firstD20:15,targetAC:15,damageRolls:[3,4]});
    let c=startCharacterTurn(initialCombatState());
    c=recordWeaponAttack(c,current.inventory!,p,r,undefined,'attack_action',5).combat;
    c=recordWeaponAttack(c,current.inventory!,p,r,undefined,'extra_attack',5).combat;
    expect(c.turn?.actionsUsed).toBe(1);expect(c.attacks).toHaveLength(2);
    expect(()=>recordWeaponAttack(c,current.inventory!,p,r,undefined,'extra_attack',5)).toThrow();
  });
});
