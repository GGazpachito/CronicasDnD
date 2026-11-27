import {describe,it,expect} from 'vitest';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';
import {prepareFighterLevelUp} from '../src/level-up';
import {initialAdventureState,applyAdventureAction,validateAdventureState,synchronizeAdventureSheet} from '../src/adventure';
import {makeCharacterSnapshot,validateCharacterSnapshot} from '../src/persistence';
import {spendFighterResource} from '../src/resources';
import {startCharacterTurn} from '../src/combat';

/** Simula la ruta real: personaje guardado en nivel 6, flechas y POST/PUT. */
const at6=():GuidedFighterInput=>({
  name:'Guerrero guardado',level:6,background:'soldier',species:'human',
  assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
  increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
  fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'alert',humanSize:'medium',
  armor:'chain_mail',shield:false,
  level4Improvement:{mode:'plus_two',first:'strength'},
  level6Improvement:{mode:'plus_two',first:'constitution'},
  martial:{fightingStyle:'defense',weaponMasteries:['greatsword','flail','javelin','shortsword'],startingPackage:'a'},
  backgroundEquipment:{startingPackage:'a',gamingSet:'dice_set'},
});
const at7=():GuidedFighterInput=>({...at6(),level:7,martial:{...at6().martial!,additionalFightingStyle:'archery'}});
const at8=():GuidedFighterInput=>({...at7(),level:8,level8Improvement:{mode:'plus_two',first:'wisdom'}});
const at9=():GuidedFighterInput=>({...at8(),level:9});
const roundTrip=(input:GuidedFighterInput,state:ReturnType<typeof initialAdventureState>)=>
  validateCharacterSnapshot(JSON.parse(JSON.stringify(makeCharacterSnapshot(input,state))));

describe('Corrección: nivel visible y guardado de 6 a 9',()=>{
  it('una subida 6->7 consolida el mismo nivel en la hoja, aventura y snapshot',()=>{
    const original=roundTrip(at6(),initialAdventureState(calculateGuidedFighter(at6()).sheet));
    const transition=prepareFighterLevelUp(original.input,original.adventure,at7());
    expect(transition.snapshot.input.level).toBe(7);
    expect(transition.snapshot.adventure.fighter.fighterLevel).toBe(7);
    expect(validateCharacterSnapshot(JSON.parse(JSON.stringify(transition.snapshot))).input.level).toBe(7);
  });
  it('las subidas 6->7->8->9 son consecutivas y cada guardado conserva su nivel',()=>{
    let snapshot=roundTrip(at6(),initialAdventureState(calculateGuidedFighter(at6()).sheet));
    for(const [target,newLevel] of [[at7(),7],[at8(),8],[at9(),9]] as const){
      snapshot=prepareFighterLevelUp(snapshot.input,snapshot.adventure,target).snapshot;
      snapshot=validateCharacterSnapshot(JSON.parse(JSON.stringify(snapshot)));
      expect(snapshot.input.level).toBe(newLevel);
      expect(snapshot.adventure.fighter.fighterLevel).toBe(newLevel);
      expect(calculateGuidedFighter(snapshot.input).sheet.level).toBe(newLevel);
    }
    expect(snapshot.adventure.fighter.resources.indomitable?.current).toBe(1);
  });
  it('al editar CON en el nivel 6, informa de la desincronización antes de subir',()=>{
    const prev={...at6(),level6Improvement:{mode:'plus_two' as const,first:'dexterity' as const}};
    const game=initialAdventureState(calculateGuidedFighter(prev).sheet);
    expect(()=>prepareFighterLevelUp(at6(),game,at7())).toThrow();
  });
  it('la sincronización autorizada conserva el daño, recursos gastados y turno',()=>{
    const prev={...at6(),level6Improvement:{mode:'plus_two' as const,first:'dexterity' as const}};
    const oldSheet=calculateGuidedFighter(prev).sheet;
    const now=calculateGuidedFighter(at6()).sheet;
    let state=applyAdventureAction(initialAdventureState(oldSheet),{type:'damage',amount:12},oldSheet).state;
    state={...state,fighter:spendFighterResource(state.fighter,'second_wind'),combat:startCharacterTurn(state.combat)};
    expect(()=>validateAdventureState(state,now)).toThrow();
    const normalized=synchronizeAdventureSheet(state,now);
    expect(normalized.fighter.hitPoints.current).toBe(now.maximumHitPoints-12);
    expect(normalized.fighter.resources.second_wind?.current).toBe(2);
    expect(normalized.combat).toEqual(state.combat);
    const result=prepareFighterLevelUp(at6(),state,at7(),true);
    expect(result.synchronizedBeforeAdvance).toBe(true);
    expect(result.snapshot.input.level).toBe(7);
    expect(result.snapshot.adventure.fighter.hitPoints.current).toBe(calculateGuidedFighter(at7()).sheet.maximumHitPoints-12);
    expect(result.snapshot.adventure.fighter.resources.second_wind?.current).toBe(2);
    expect(result.snapshot.adventure.combat).toEqual(state.combat);
  });
  it('no permite sincronizar accidentalmente estados de otro nivel',()=>{
    const s6=calculateGuidedFighter(at6()).sheet;
    const s7=calculateGuidedFighter(at7()).sheet;
    expect(()=>synchronizeAdventureSheet(initialAdventureState(s6),s7)).toThrow();
  });
  it('exige escoger segundo estilo antes de subir a 7',()=>{
    const input=at6(),state=initialAdventureState(calculateGuidedFighter(input).sheet);
    expect(()=>prepareFighterLevelUp(input,state,{...at7(),martial:input.martial})).toThrow();
  });
  it('rechaza saltar niveles y guardar hoja 7 con aventura 6',()=>{
    const input=at6(),state=initialAdventureState(calculateGuidedFighter(input).sheet);
    expect(()=>prepareFighterLevelUp(input,state,at8())).toThrow();
    expect(()=>makeCharacterSnapshot(at7(),state)).toThrow();
  });
  it('al cargar la instantánea ya validada el nivel 9 no regresa a 6',()=>{
    const s=calculateGuidedFighter(at9()).sheet;
    const last=makeCharacterSnapshot(at9(),initialAdventureState(s));
    const loaded=validateCharacterSnapshot(JSON.parse(JSON.stringify(last)));
    expect(loaded.input.level).toBe(9);
    expect(loaded.adventure.fighter.fighterLevel).toBe(9);
  });
});
