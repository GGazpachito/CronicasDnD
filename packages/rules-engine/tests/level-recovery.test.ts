import {describe,it,expect} from 'vitest';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';
import {initialAdventureState,applyAdventureAction} from '../src/adventure';
import {prepareFighterLevelUp,prepareFighterLevelUpWithFreshSession} from '../src/level-up';
import {makeCharacterSnapshot,validateCharacterSnapshot} from '../src/persistence';

const levelSix=():GuidedFighterInput=>({
  name:'Campeón de campaña',level:6,background:'soldier',species:'human',
  assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
  increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
  fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'tough',humanSize:'medium',
  armor:'chain_mail',shield:false,
  level4Improvement:{mode:'plus_two',first:'strength'},
  level6Improvement:{mode:'plus_two',first:'constitution'},
  martial:{fightingStyle:'defense',weaponMasteries:['greatsword','flail','javelin','shortsword'],startingPackage:'a'},
  backgroundEquipment:{startingPackage:'a',gamingSet:'dice_set'},
});
const levelSeven=():GuidedFighterInput=>({...levelSix(),level:7,martial:{...levelSix().martial!,additionalFightingStyle:'archery'}});

describe('Corrección de nivel 7 sin bloqueos silenciosos',()=>{
  it('puede subir desde nivel 6 y conservar una sesión dañada pero válida',()=>{
    const source=levelSix();
    const original=initialAdventureState(calculateGuidedFighter(source).sheet);
    const damaged=applyAdventureAction(original,{type:'damage',amount:7},calculateGuidedFighter(source).sheet).state;
    const result=prepareFighterLevelUp(source,damaged,levelSeven());
    expect(result.snapshot.input.level).toBe(7);
    expect(result.snapshot.adventure.fighter.fighterLevel).toBe(7);
    expect(result.snapshot.adventure.fighter.hitPoints.current).toBe(result.snapshot.adventure.fighter.hitPoints.maximum-7);
  });
  it('la recuperación no se usa automáticamente si el estado de combate es incompatible',()=>{
    const source=levelSix();
    const game=initialAdventureState(calculateGuidedFighter(source).sheet);
    const broken={...game, fighter:{...game.fighter,hitPoints:{...game.fighter.hitPoints,maximum:game.fighter.hitPoints.maximum-1}}};
    expect(()=>prepareFighterLevelUp(source,broken,levelSeven())).toThrow();
  });
  it('la recuperación voluntaria crea un personaje de nivel 7 validado para guardar',()=>{
    const result=prepareFighterLevelUpWithFreshSession(levelSix(),levelSeven());
    expect(result.snapshot.input.level).toBe(7);
    expect(result.snapshot.adventure.fighter.fighterLevel).toBe(7);
    const saved=validateCharacterSnapshot(JSON.parse(JSON.stringify(result.snapshot)));
    expect(saved.input.level).toBe(7);
    expect(saved.adventure.fighter.hitPoints.current).toBe(saved.adventure.fighter.hitPoints.maximum);
  });
  it('no asigna un segundo estilo en nombre del jugador',()=>{
    const noChoice={...levelSeven(),martial:levelSix().martial};
    expect(()=>prepareFighterLevelUpWithFreshSession(levelSix(),noChoice)).toThrow();
  });
  it('no permite saltos de nivel ni cambios de identidad en recuperación',()=>{
    expect(()=>prepareFighterLevelUpWithFreshSession(levelSix(),{...levelSeven(),level:9})).toThrow();
    expect(()=>prepareFighterLevelUpWithFreshSession(levelSix(),{...levelSeven(),name:'Otro personaje'})).toThrow();
  });
  it('la recuperación no modifica el personaje guardado en nivel 6',()=>{
    const existing=makeCharacterSnapshot(levelSix());
    const before=JSON.stringify(existing);
    const after=prepareFighterLevelUpWithFreshSession(existing.input,levelSeven());
    expect(JSON.stringify(existing)).toBe(before);
    expect(existing.input.level).toBe(6);
    expect(after.snapshot.input.level).toBe(7);
  });
});
