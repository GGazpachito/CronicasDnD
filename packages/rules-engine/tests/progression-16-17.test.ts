import {describe,it,expect} from 'vitest';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';
import {adjacentFighterLevel,applyFighterLevel16Improvement} from '../src/progression';
import {fighterResourceMaximum,initialFighterState,spendFighterResource,finishFighterRest,advanceFighterLevel} from '../src/resources';
import {initialAdventureState,advanceAdventureLevel,applyAdventureAction,resourceDisplay} from '../src/adventure';
import {makeCharacterSnapshot,validateCharacterSnapshot} from '../src/persistence';
import {prepareFighterLevelUp,prepareFighterLevelUpWithFreshSession} from '../src/level-up';
import {initialTurnTracker,startTurnTracker,grantActionSurgeSlot,endTurnTracker} from '../src/turns';
import {calculateWeaponAttack} from '../src/attacks';

const start:GuidedFighterInput={
  name:'Campeón de pruebas',level:15,background:'soldier',species:'human',
  assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
  increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
  fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'alert',humanSize:'medium',
  armor:'chain_mail',shield:false,
  level4Improvement:{mode:'plus_two',first:'strength'},
  level6Improvement:{mode:'plus_two',first:'constitution'},
  level8Improvement:{mode:'plus_two',first:'wisdom'},
  level12Improvement:{mode:'plus_two',first:'wisdom'},
  level14Improvement:{mode:'plus_two',first:'charisma'},
  martial:{fightingStyle:'defense',additionalFightingStyle:'archery',weaponMasteries:['greatsword','flail','javelin','shortsword','longbow'],startingPackage:'a'},
  backgroundEquipment:{startingPackage:'a',gamingSet:'dice_set'},
};
const at16=():GuidedFighterInput=>({...start,level:16,level16Improvement:{mode:'plus_two',first:'intelligence'},
  martial:{...start.martial!,weaponMasteries:[...start.martial!.weaponMasteries,'warhammer']}});
const at17=():GuidedFighterInput=>({...at16(),level:17});
const sheet=(i:GuidedFighterInput)=>calculateGuidedFighter(i).sheet;

describe('Actualización 33 · Guerrero niveles 16 y 17',()=>{
  it('el selector llega a 17 y se detiene, sin saltos',()=>{
    expect(adjacentFighterLevel(15,1)).toBe(16);
    expect(adjacentFighterLevel(16,1)).toBe(17);
    expect(adjacentFighterLevel(17,1)).toBe(18);
    expect(adjacentFighterLevel(18,1)).toBe(19);
    expect(adjacentFighterLevel(19,1)).toBe(20);
    expect(adjacentFighterLevel(20,1)).toBeNull();
    expect(adjacentFighterLevel(17,-1)).toBe(16);
  });
  it('la sexta maestría y la mejora se desbloquean juntas en nivel 16',()=>{
    expect(sheet(at16()).level).toBe(16);
    expect(sheet(at16()).features).toContain('ability_score_improvement_level_16');
    expect(sheet(at16()).features).toContain('weapon_mastery_sixth');
    expect(calculateGuidedFighter(at16()).martial?.masteries).toHaveLength(6);
  });
  it('nivel 15 no acepta elecciones de nivel 16',()=>{
    expect(()=>calculateGuidedFighter({...start,level16Improvement:at16().level16Improvement})).toThrow();
    expect(()=>calculateGuidedFighter({...start,martial:at16().martial})).toThrow();
  });
  it('nivel 16 necesita sexta arma distinta y una mejora válida',()=>{
    expect(()=>calculateGuidedFighter({...at16(),level16Improvement:undefined})).toThrow();
    expect(()=>calculateGuidedFighter({...at16(),martial:start.martial})).toThrow();
    expect(()=>calculateGuidedFighter({...at16(),martial:{...at16().martial!,weaponMasteries:[...start.martial!.weaponMasteries,'flail']}})).toThrow();
  });
  it('aplica +2 o +1/+1 en nivel 16 y respeta el máximo de 20',()=>{
    const s=sheet(at16());expect(s.abilityScores.intelligence).toBe(12);
    const variant=sheet({...at16(),level16Improvement:{mode:'two_ones',first:'intelligence',second:'charisma'}});
    expect(variant.abilityScores.intelligence).toBe(11);
    expect(variant.abilityScores.charisma).toBe(11);
    expect(()=>applyFighterLevel16Improvement(s.abilityScores,{mode:'plus_two',first:'strength'})).toThrow();
  });
  it('subir Constitución en nivel 16 actualiza PG del personaje entero',()=>{
    const base=sheet(at16());const con=sheet({...at16(),level16Improvement:{mode:'plus_two',first:'constitution'}});
    expect(con.maximumHitPoints-base.maximumHitPoints).toBe(16);
  });
  it('nivel 17 aplica competencia +6 y conserva Crítico superior',()=>{
    const s=sheet(at17());expect(s.proficiencyBonus).toBe(6);
    expect(s.features).toContain('champion_superior_critical');
    expect(s.features).toContain('action_surge_two_uses');
    expect(s.features).toContain('indomitable_three_uses');
    expect(new Set(s.features).size).toBe(s.features.length);
    expect(calculateWeaponAttack(s,'greatsword',['defense','archery'],at17().martial!.weaponMasteries).criticalMinimum).toBe(18);
  });
  it('los máximos de recursos son 4, 2 y 3 a nivel 17',()=>{
    expect(fighterResourceMaximum(16,'action_surge')).toBe(1);
    expect(fighterResourceMaximum(17,'action_surge')).toBe(2);
    expect(fighterResourceMaximum(16,'indomitable')).toBe(2);
    expect(fighterResourceMaximum(17,'indomitable')).toBe(3);
    const r=initialFighterState(17,150).resources;
    expect(r.second_wind?.current).toBe(4);
    expect(r.action_surge?.current).toBe(2);
    expect(r.indomitable?.current).toBe(3);
  });
  it('nivel 17 mantiene tres ataques por una acción Atacar',()=>{
    const s=sheet(at17());expect(s.features).toContain('two_extra_attacks');
    expect(s.features.includes('three_extra_attacks')).toBe(false);
  });
  it('ambos usos de Acción súbita se recuperan en descanso corto',()=>{
    let f=initialFighterState(17,150);
    f=spendFighterResource(spendFighterResource(f,'action_surge'),'action_surge');
    expect(f.resources.action_surge?.current).toBe(0);
    const result=finishFighterRest(f,'short_rest');
    expect(result.resources.action_surge?.current).toBe(2);
    expect(result.resources.indomitable?.current).toBe(3);
  });
  it('Indomable de nivel 17 se recupera solo con descanso largo',()=>{
    let f=initialFighterState(17,150);
    for(let i=0;i<3;i++)f=spendFighterResource(f,'indomitable');
    expect(finishFighterRest(f,'short_rest').resources.indomitable?.current).toBe(0);
    expect(finishFighterRest(f,'long_rest').resources.indomitable?.current).toBe(3);
  });
  it('un aumento de usos añade uno sin reponer los usos gastados',()=>{
    let f=initialFighterState(16,130);
    f=spendFighterResource(f,'action_surge');
    f=spendFighterResource(f,'indomitable');
    const up=advanceFighterLevel(f,17,139);
    expect(up.resources.action_surge?.current).toBe(1);
    expect(up.resources.indomitable?.current).toBe(2);
    expect(up.hitPoints.current).toBe(139);
  });
  it('Acción súbita se limita a una vez en un mismo turno',()=>{
    const turn=grantActionSurgeSlot(startTurnTracker(initialTurnTracker()));
    expect(turn.actionLimit).toBe(2);
    expect(()=>grantActionSurgeSlot(turn)).toThrow();
    expect(grantActionSurgeSlot(startTurnTracker(endTurnTracker(turn))).actionLimit).toBe(2);
  });
  it('la resolución del turno no gasta la segunda carga en el mismo turno',()=>{
    const s=sheet(at17());
    let state=initialAdventureState(s);
    const started={...state,combat:{...state.combat,turn:startTurnTracker(state.combat.turn??initialTurnTracker())}};
    state=applyAdventureAction(started,{type:'action_surge'},s).state;
    expect(state.fighter.resources.action_surge?.current).toBe(1);
    expect(()=>applyAdventureAction(state,{type:'action_surge'},s)).toThrow();
    expect(state.fighter.resources.action_surge?.current).toBe(1);
  });
  it('el cambio 15→16→17 preserva daño, recursos y nivel persistido',()=>{
    let oldInput=start;let oldSheet=sheet(oldInput);
    let session=applyAdventureAction(initialAdventureState(oldSheet),{type:'damage',amount:10},oldSheet).state;
    for(const input of [at16(),at17()]){
      const nextSheet=sheet(input);
      session=advanceAdventureLevel(session,oldSheet,nextSheet);
      expect(session.fighter.hitPoints.maximum-session.fighter.hitPoints.current).toBe(10);
      const restored=validateCharacterSnapshot(JSON.parse(JSON.stringify(makeCharacterSnapshot(input,session))));
      expect(restored.input.level).toBe(input.level);
      expect(restored.adventure.fighter.fighterLevel).toBe(input.level);
      oldInput=input;oldSheet=nextSheet;
    }
    expect(oldInput.level).toBe(17);
  });
  it('la transición de hoja usa la misma instantánea que el guardado',()=>{
    const s15=sheet(start);
    const up16=prepareFighterLevelUp(start,initialAdventureState(s15),at16());
    const up17=prepareFighterLevelUp(at16(),up16.snapshot.adventure,at17());
    expect(up17.snapshot.input.level).toBe(17);
    expect(up17.snapshot.adventure.fighter.fighterLevel).toBe(17);
    expect(prepareFighterLevelUpWithFreshSession(at16(),at17()).snapshot.input.level).toBe(17);
  });
  it('la visualización de recursos ofrece máximos propios para cada recurso',()=>{
    const s=sheet(at17());const d=resourceDisplay(initialAdventureState(s),s);
    expect(d.action_surge?.maximum).toBe(2);
    expect(d.indomitable?.maximum).toBe(3);
  });
});
