import {describe,it,expect} from 'vitest';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';
import {applyFighterLevel8Improvement} from '../src/progression';
import {initialFighterState,spendFighterResource,finishFighterRest,fighterResourceMaximum,validateFighterState} from '../src/resources';
import {initialAdventureState,advanceAdventureLevel,applyAdventureAction,resourceDisplay,validateAdventureState} from '../src/adventure';
import {makeCharacterSnapshot,validateCharacterSnapshot} from '../src/persistence';
import {calculateWeaponAttack,resolveWeaponAttack,calculateOwnedWeaponAttack} from '../src/attacks';
import {recordWeaponAttack,startCharacterTurn} from '../src/combat';
import {evaluateWeaponMastery} from '../src/mastery-effects';
import {initialConditionLedger} from '../src/conditions';

const at7=():GuidedFighterInput=>({
  name:'Aldric',level:7,background:'soldier',species:'human',
  assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
  increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
  fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'alert',humanSize:'medium',
  armor:'chain_mail',shield:false,
  level4Improvement:{mode:'plus_two',first:'strength'},
  level6Improvement:{mode:'plus_two',first:'constitution'},
  martial:{fightingStyle:'defense',additionalFightingStyle:'archery',weaponMasteries:['greatsword','flail','javelin','shortsword'],startingPackage:'a'},
  backgroundEquipment:{startingPackage:'a',gamingSet:'dice_set'}
});
const at8=():GuidedFighterInput=>({...at7(),level:8,level8Improvement:{mode:'plus_two',first:'wisdom'}});
const at9=():GuidedFighterInput=>({...at8(),level:9});
const styles=['defense','archery'] as const;
const mastery=at9().martial!.weaponMasteries;

describe('Paso 29: Guerrero 8 y 9, Indomable y Dominio táctico',()=>{
  it('un personaje de nivel 7 sigue siendo válido y no recibe rasgos nuevos',()=>{
    const s=calculateGuidedFighter(at7()).sheet;
    expect(s.level).toBe(7);expect(s.features).not.toContain('indomitable');
    expect(s.resources.indomitable).toBeUndefined();
    expect(makeCharacterSnapshot(at7()).input.level).toBe(7);
  });
  it('nivel 8 requiere la tercera mejora y no admite adelantarla',()=>{
    expect(()=>calculateGuidedFighter({...at8(),level8Improvement:undefined})).toThrow();
    expect(()=>calculateGuidedFighter({...at7(),level8Improvement:at8().level8Improvement})).toThrow();
    expect(calculateGuidedFighter(at8()).sheet.features).toContain('ability_score_improvement_level_8');
  });
  it('nivel 8 suma la tercera mejora independientemente de 4 y 6',()=>{
    const s=calculateGuidedFighter(at8()).sheet;
    expect(s.abilityScores.strength).toBe(19);expect(s.abilityScores.constitution).toBe(16);
    expect(s.abilityScores.wisdom).toBe(14);
    expect(s.proficiencyBonus).toBe(3);
    expect(s.resources.indomitable).toBeUndefined();
  });
  it('nivel 8 acepta +1/+1 y rechaza dos veces una misma característica',()=>{
    const v={...at8(),level8Improvement:{mode:'two_ones' as const,first:'wisdom' as const,second:'dexterity' as const}};
    const s=calculateGuidedFighter(v).sheet;
    expect(s.abilityScores.wisdom).toBe(13);expect(s.abilityScores.dexterity).toBe(15);
    expect(()=>calculateGuidedFighter({...at8(),level8Improvement:{mode:'two_ones',first:'wisdom',second:'wisdom'}})).toThrow();
  });
  it('ninguna mejora excede 20 ni acepta campos incompatibles',()=>{
    const scores={strength:19,dexterity:12,constitution:14,intelligence:10,wisdom:10,charisma:8};
    expect(()=>applyFighterLevel8Improvement(scores,{mode:'plus_two',first:'strength'})).toThrow();
    expect(applyFighterLevel8Improvement(scores,{mode:'two_ones',first:'strength',second:'constitution'}).strength).toBe(20);
    expect(()=>applyFighterLevel8Improvement(scores,{mode:'plus_two',first:'wisdom',second:'strength'})).toThrow();
  });
  it('si se mejora Constitución en nivel 8, los PG aumentan retroactivamente',()=>{
    const a=calculateGuidedFighter(at8()).sheet;
    const b=calculateGuidedFighter({...at8(),level8Improvement:{mode:'plus_two',first:'constitution'}}).sheet;
    expect(b.abilityModifiers.constitution).toBe(a.abilityModifiers.constitution+1);
    expect(b.maximumHitPoints).toBe(a.maximumHitPoints+8);
  });
  it('nivel 9 aumenta competencia a +4 y registra los dos nuevos rasgos',()=>{
    const s=calculateGuidedFighter(at9()).sheet;
    expect(s.proficiencyBonus).toBe(4);
    expect(s.features).toContain('indomitable');expect(s.features).toContain('tactical_master');
    expect(s.resources.indomitable?.maximum).toBe(1);
    expect(s.resources.second_wind?.maximum).toBe(3);
  });
  it('nivel 9 conserva cuatro armas dominadas y el segundo estilo del Campeón',()=>{
    const hero=calculateGuidedFighter(at9());
    expect(hero.martial?.masteries).toHaveLength(4);
    expect(calculateWeaponAttack(hero.sheet,'longbow',styles,mastery).attackBonus).toBe(8);
  });
  it('Indomable no aparece en el estado anterior a nivel 9',()=>{
    expect(fighterResourceMaximum(8,'indomitable')).toBe(0);
    expect(fighterResourceMaximum(9,'indomitable')).toBe(1);
    const before=initialFighterState(8,50);
    expect(before.resources.indomitable).toBeUndefined();
    expect(()=>spendFighterResource(before,'indomitable')).toThrow();
    expect(()=>validateFighterState({...before,resources:{...before.resources,indomitable:{current:1}}})).toThrow();
  });
  it('Indomable aparece completo en nivel 9 y su uso se consume una sola vez',()=>{
    const s=calculateGuidedFighter(at9()).sheet;
    const original=initialAdventureState(s);
    expect(resourceDisplay(original,s).indomitable?.current).toBe(1);
    const result=applyAdventureAction(original,{type:'indomitable',originalTotal:10,difficultyClass:15,d20:8,ability:'constitution'},s);
    expect(result.state.fighter.resources.indomitable?.current).toBe(0);
    expect(result.description).toContain('Indomable');
    expect(()=>applyAdventureAction(result.state,{type:'indomitable',originalTotal:9,difficultyClass:15,d20:20,ability:'constitution'},s)).toThrow();
  });
  it('Indomable aplica el nivel de Guerrero incluso cuando la repetición falla',()=>{
    const s=calculateGuidedFighter(at9()).sheet;
    const result=applyAdventureAction(initialAdventureState(s),{type:'indomitable',originalTotal:4,difficultyClass:45,d20:1,ability:'wisdom'},s);
    expect(result.description).toContain('Fallo');
    expect(result.state.fighter.resources.indomitable?.current).toBe(0);
  });
  it('Indomable no se gasta si la salvación original ya tuvo éxito',()=>{
    const s=calculateGuidedFighter(at9()).sheet;
    const state=initialAdventureState(s);
    expect(()=>applyAdventureAction(state,{type:'indomitable',originalTotal:15,difficultyClass:15,d20:4,ability:'wisdom'},s)).toThrow();
    expect(state.fighter.resources.indomitable?.current).toBe(1);
  });
  it('Indomable rechaza d20 inválidos, características inventadas y nivel anterior',()=>{
    const s9=calculateGuidedFighter(at9()).sheet;const st=initialAdventureState(s9);
    expect(()=>applyAdventureAction(st,{type:'indomitable',originalTotal:1,difficultyClass:14,d20:21,ability:'wisdom'},s9)).toThrow();
    expect(()=>applyAdventureAction(st,{type:'indomitable',originalTotal:1,difficultyClass:14,d20:10,ability:'luck' as 'wisdom'},s9)).toThrow();
    const s8=calculateGuidedFighter(at8()).sheet;
    expect(()=>applyAdventureAction(initialAdventureState(s8),{type:'indomitable',originalTotal:2,difficultyClass:15,d20:10,ability:'wisdom'},s8)).toThrow();
  });
  it('Indomable aplica agotamiento y modificadores situacionales',()=>{
    const s=calculateGuidedFighter(at9()).sheet;const st=initialAdventureState(s);
    const ex={...st,combat:{...st.combat,conditions:{...initialConditionLedger(),exhaustion:2}}};
    const result=applyAdventureAction(ex,{type:'indomitable',originalTotal:5,difficultyClass:20,d20:10,ability:'wisdom',extraBonus:2},s);
    expect(result.description).toContain('agotamiento 4');
    expect(result.description).toContain('situacional');
    expect(result.state.fighter.resources.indomitable?.current).toBe(0);
  });
  it('descanso corto no devuelve Indomable; descanso largo sí',()=>{
    const st=spendFighterResource(initialFighterState(9,70),'indomitable');
    expect(finishFighterRest(st,'short_rest').resources.indomitable?.current).toBe(0);
    expect(finishFighterRest(st,'long_rest').resources.indomitable?.current).toBe(1);
  });
  it('subir 7→8→9 conserva recursos anteriores, daño, turnos, historial y objetos',()=>{
    const s7=calculateGuidedFighter(at7()).sheet,s8=calculateGuidedFighter(at8()).sheet,s9=calculateGuidedFighter(at9()).sheet;
    let game=initialAdventureState(s7);
    game=applyAdventureAction(game,{type:'damage',amount:10},s7).state;
    game={...game,combat:startCharacterTurn(game.combat),fighter:spendFighterResource(game.fighter,'second_wind')};
    const st8=advanceAdventureLevel(game,s7,s8);
    const st9=advanceAdventureLevel(st8,s8,s9);
    expect(st9.fighter.fighterLevel).toBe(9);
    expect(st9.fighter.resources.second_wind?.current).toBe(2);
    expect(st9.fighter.resources.indomitable?.current).toBe(1);
    expect(st9.combat).toEqual(game.combat);
    expect(st9.fighter.hitPoints.current).toBe(s9.maximumHitPoints-10);
  });
  it('la persistencia v2 admite nivel 9 con Indomable gastado',()=>{
    const data=at9(),s=calculateGuidedFighter(data).sheet;
    const st=applyAdventureAction(initialAdventureState(s),{type:'indomitable',originalTotal:5,difficultyClass:15,d20:10,ability:'constitution'},s).state;
    const snap=makeCharacterSnapshot(data,st);
    const restored=validateCharacterSnapshot(JSON.parse(JSON.stringify(snap)));
    expect(restored.input.level).toBe(9);
    expect(restored.adventure.fighter.resources.indomitable?.current).toBe(0);
  });
  it('Dominio táctico puede sustituir Rozar por Empujar sin cambiar el arma',()=>{
    const s=calculateGuidedFighter(at9()).sheet;
    const normal=calculateWeaponAttack(s,'greatsword',styles,mastery);
    const tactical=calculateWeaponAttack(s,'greatsword',styles,mastery,{tacticalMastery:'Push'});
    expect(normal.mastery).toBe('Graze');expect(tactical.mastery).toBe('Push');
    expect(tactical.grazeOnMiss).toBeNull();
    expect(tactical.attackBonus).toBe(normal.attackBonus);
    expect(tactical.damageModifier).toBe(normal.damageModifier);
  });
  it('Dominio táctico permite Debilitar y Ralentizar sin cambiar el catálogo',()=>{
    const s=calculateGuidedFighter(at9()).sheet;
    expect(calculateWeaponAttack(s,'greatsword',styles,mastery,{tacticalMastery:'Sap'}).mastery).toBe('Sap');
    expect(calculateWeaponAttack(s,'greatsword',styles,mastery,{tacticalMastery:'Slow'}).mastery).toBe('Slow');
    expect(calculateWeaponAttack(s,'greatsword',styles,mastery).mastery).toBe('Graze');
  });
  it('Dominio táctico exige nivel 9 y arma dominada',()=>{
    const s8=calculateGuidedFighter(at8()).sheet,s9=calculateGuidedFighter(at9()).sheet;
    expect(()=>calculateWeaponAttack(s8,'greatsword',styles,mastery,{tacticalMastery:'Push'})).toThrow();
    expect(()=>calculateWeaponAttack(s9,'longbow',styles,mastery,{tacticalMastery:'Push'})).toThrow();
    expect(()=>calculateWeaponAttack(s9,'greatsword',styles,mastery,{tacticalMastery:'Topple' as 'Push'})).toThrow();
  });
  it('la maestría elegida para un ataque llega a evaluación y al historial',()=>{
    const hero=calculateGuidedFighter(at9());
    const p=calculateWeaponAttack(hero.sheet,'greatsword',styles,mastery,{tacticalMastery:'Sap'});
    const res=resolveWeaponAttack(p,{firstD20:16,targetAC:15,damageRolls:[3,4]});
    expect(evaluateWeaponMastery(p,res,{targetName:'Goblin 1',targetSize:'medium',targetIsCreature:true,dealtDamage:true}).pending?.mastery).toBe('Sap');
    const reg=recordWeaponAttack(startCharacterTurn(initialAdventureState(hero.sheet).combat),hero.inventory!,p,res,{targetName:'Goblin 1',targetSize:'medium',targetIsCreature:true,dealtDamage:true},'attack_action',9);
    expect(reg.combat.masteryEffects?.some(e=>e.mastery==='Sap')).toBe(true);
  });
  it('las armas mágicas mantienen su bonificación sin duplicarla por Dominio táctico',()=>{
    const base=at9();const hero=calculateGuidedFighter({...base,inventoryActions:[{type:'magic_grant',itemId:'weapon_enhancement',weaponId:'greatsword',enhancement:2},{type:'magic_wear',instanceId:'ward-1',worn:true}]});
    const weapon=hero.inventory!.magicItems.find(item=>item.itemId==='weapon_enhancement');
    if(!weapon)throw new Error('Arma no registrada');
    const profile=calculateOwnedWeaponAttack(hero.sheet,hero.inventory!,`magic:${weapon.instanceId}`,styles,mastery,{tacticalMastery:'Slow'});
    expect(profile.mastery).toBe('Slow');
    expect(profile.magicEnhancement).toBe(2);
  });
  it('no se pueden saltar niveles ni subir con estado no sincronizado',()=>{
    const s7=calculateGuidedFighter(at7()).sheet,s9=calculateGuidedFighter(at9()).sheet;
    expect(()=>advanceAdventureLevel(initialAdventureState(s7),s7,s9)).toThrow();
    expect(()=>validateAdventureState(initialAdventureState(s7),s9)).toThrow();
  });
  it('el Ataque adicional sigue consumiendo una acción para dos ataques en nivel 9',()=>{
    const hero=calculateGuidedFighter(at9());const p=calculateWeaponAttack(hero.sheet,'greatsword',styles,mastery);
    const r=resolveWeaponAttack(p,{firstD20:14,targetAC:16,damageRolls:[3,4]});
    let combat=startCharacterTurn(initialAdventureState(hero.sheet).combat);
    combat=recordWeaponAttack(combat,hero.inventory!,p,r,undefined,'attack_action',9).combat;
    combat=recordWeaponAttack(combat,hero.inventory!,p,r,undefined,'extra_attack',9).combat;
    expect(combat.turn?.actionsUsed).toBe(1);
    expect(combat.turn?.attackActionAttacksUsed).toBe(2);
  });
});
