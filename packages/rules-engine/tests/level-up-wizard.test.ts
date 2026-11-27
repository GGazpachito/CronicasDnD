import {describe,it,expect} from 'vitest';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';
import {FIGHTER_LEVEL_MILESTONES,buildFighterLevelUpCandidate,fighterLevelUpRequirements,previewFighterLevelUp,type FighterLevelUpChoices} from '../src/level-up-wizard';
import {initialAdventureState,applyAdventureAction,setManualDeathSaveMark} from '../src/adventure';
import {spendFighterResource} from '../src/resources';
import {prepareFighterLevelUp,prepareFighterLevelUpWithFreshSession} from '../src/level-up';
import {validateCharacterSnapshot} from '../src/persistence';
import {EMPTY_CHARACTER_PROFILE} from '../src/character-profile';

const base:GuidedFighterInput={
  name:'Aldric',level:1,background:'soldier',species:'human',
  assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
  increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
  fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'alert',humanSize:'medium',
  armor:'chain_mail',shield:false,
  martial:{fightingStyle:'defense',weaponMasteries:['greatsword','flail','javelin'],startingPackage:'a'},
  backgroundEquipment:{startingPackage:'a',gamingSet:'dice_set'},
  inventoryActions:[],profile:EMPTY_CHARACTER_PROFILE,
};

const improvementByLevel={
  4:{mode:'plus_two',first:'strength'},6:{mode:'plus_two',first:'constitution'},
  8:{mode:'plus_two',first:'wisdom'},12:{mode:'plus_two',first:'wisdom'},
  14:{mode:'plus_two',first:'charisma'},16:{mode:'plus_two',first:'intelligence'},
} as const;
function choicesFor(level:number):FighterLevelUpChoices{
  return {
    ...((level in improvementByLevel)?{improvement:improvementByLevel[level as keyof typeof improvementByLevel]}:{}),
    ...(level===4?{newMastery:'shortsword' as const}:{}),
    ...(level===7?{additionalFightingStyle:'archery' as const}:{}),
    ...(level===10?{newMastery:'longbow' as const}:{}),
    ...(level===16?{newMastery:'warhammer' as const}:{}),
    ...(level===19?{epicBoon:{id:'combat_prowess' as const,ability:'charisma' as const}}:{}),
  };
}
function atLevel(target:number):GuidedFighterInput{
  let current=base;
  for(let next=2;next<=target;next++)current=buildFighterLevelUpCandidate(current,choicesFor(next));
  return current;
}

describe('Actualización 44: asistente de subida de nivel',()=>{
  it('valida todos los pasos consecutivos de Guerrero y Campeón hasta nivel 20',()=>{
    let current=base;
    for(let next=2;next<=20;next++){
      const preview=previewFighterLevelUp(current,choicesFor(next));
      expect(preview.fromLevel).toBe(next-1);
      expect(preview.toLevel).toBe(next);
      expect(preview.after.sheet.level).toBe(next);
      expect(preview.after.sheet.features.length).toBe(new Set(preview.after.sheet.features).size);
      expect(preview.input.name).toBe(base.name);
      expect(preview.input.inventoryActions).toEqual(base.inventoryActions);
      expect(preview.input.profile).toEqual(base.profile);
      current=preview.input;
    }
    expect(calculateGuidedFighter(current).sheet.features).toContain('three_extra_attacks');
    expect(()=>buildFighterLevelUpCandidate(current,{})).toThrow();
  });
  it('anuncia los hitos y elecciones de niveles importantes sin permitir saltos',()=>{
    expect(FIGHTER_LEVEL_MILESTONES[7]).toContain('Campeón: segundo estilo de combate');
    expect(fighterLevelUpRequirements(4)).toEqual({improvement:true,mastery:true,additionalStyle:false,epicBoon:false});
    expect(fighterLevelUpRequirements(16)).toEqual({improvement:true,mastery:true,additionalStyle:false,epicBoon:false});
    expect(fighterLevelUpRequirements(19).epicBoon).toBe(true);
  });
  it('rechaza la subida a nivel 4 si faltan las elecciones, sin mutar la ficha actual',()=>{
    const current=atLevel(3);
    const before=JSON.stringify(current);
    expect(()=>previewFighterLevelUp(current,{})).toThrow(/mejora/i);
    expect(()=>buildFighterLevelUpCandidate(current,{improvement:improvementByLevel[4]})).toThrow(/maestría/i);
    expect(()=>buildFighterLevelUpCandidate(current,{improvement:improvementByLevel[4],newMastery:'flail'})).toThrow(/diferente/i);
    expect(JSON.stringify(current)).toBe(before);
  });
  it('exige un estilo diferente para Campeón nivel 7',()=>{
    const current=atLevel(6);
    expect(()=>buildFighterLevelUpCandidate(current,{})).toThrow(/segundo estilo/i);
    expect(()=>buildFighterLevelUpCandidate(current,{additionalFightingStyle:'defense'})).toThrow(/distinto/i);
    expect(buildFighterLevelUpCandidate(current,{additionalFightingStyle:'archery'}).martial?.additionalFightingStyle).toBe('archery');
  });
  it('no permite aplicar mejoras o beneficios antes de su nivel',()=>{
    expect(()=>buildFighterLevelUpCandidate(base,{improvement:improvementByLevel[4]})).toThrow(/no concede/i);
    expect(()=>buildFighterLevelUpCandidate(atLevel(18),{})).toThrow(/beneficio épico/i);
    expect(()=>buildFighterLevelUpCandidate(atLevel(18),{epicBoon:{id:'combat_prowess',ability:'charisma'}})).not.toThrow();
  });
  it('no cambia reglas o partidas al construir un borrador y permite descartarlo',()=>{
    const current=atLevel(9),before=JSON.stringify(current);
    const currentSheet=calculateGuidedFighter(current).sheet;
    const session=initialAdventureState(currentSheet);
    const sessionBefore=JSON.stringify(session);
    const preview=previewFighterLevelUp(current,{newMastery:'longbow'});
    expect(preview.input.level).toBe(10);
    expect(current.level).toBe(9);
    expect(JSON.stringify(current)).toBe(before);
    expect(JSON.stringify(session)).toBe(sessionBefore);
  });
  it('conserva daño, gastos y perfil después de confirmar una transición validada',()=>{
    const current=atLevel(9),oldSheet=calculateGuidedFighter(current).sheet;
    let game=applyAdventureAction(initialAdventureState(oldSheet),{type:'damage',amount:12},oldSheet).state;
    game={...game,fighter:spendFighterResource(game.fighter,'action_surge')};
    const candidate=previewFighterLevelUp(current,{newMastery:'longbow'}).input;
    const result=prepareFighterLevelUp(current,game,candidate);
    const restored=validateCharacterSnapshot(JSON.parse(JSON.stringify(result.snapshot)));
    const newSheet=calculateGuidedFighter(candidate).sheet;
    expect(restored.input.level).toBe(10);
    expect(restored.input.profile).toEqual(current.profile);
    expect(restored.input.inventoryActions).toEqual(current.inventoryActions);
    expect(restored.adventure.fighter.hitPoints.maximum-restored.adventure.fighter.hitPoints.current).toBe(12);
    expect(restored.adventure.fighter.hitPoints.maximum).toBe(newSheet.maximumHitPoints);
    expect(restored.adventure.fighter.resources.action_surge?.current).toBe(0);
  });
  it('conserva también los seis marcadores manuales de muerte al subir de nivel',()=>{
    const current=atLevel(4);
    const sheet=calculateGuidedFighter(current).sheet;
    const game=setManualDeathSaveMark(initialAdventureState(sheet),sheet,'failures',1,true);
    const upgraded=prepareFighterLevelUp(current,game,previewFighterLevelUp(current,{}).input);
    expect(upgraded.snapshot.adventure.manualDeathMarks?.failures).toEqual([false,true,false]);
    expect(upgraded.snapshot.adventure.survival?.death).toEqual(game.survival?.death);
  });
  it('el reinicio excepcional solo ocurre si se usa expresamente otra operación',()=>{
    const current=atLevel(6);
    const candidate=previewFighterLevelUp(current,{additionalFightingStyle:'archery'}).input;
    const game=initialAdventureState(calculateGuidedFighter(current).sheet);
    expect(prepareFighterLevelUp(current,game,candidate).snapshot.input.level).toBe(7);
    const fresh=prepareFighterLevelUpWithFreshSession(current,candidate);
    expect(fresh.snapshot.input.level).toBe(7);
    expect(fresh.snapshot.adventure.fighter.fighterLevel).toBe(7);
  });
  it('el nivel 20 no genera dos entradas de un mismo rasgo',()=>{
    const preview=previewFighterLevelUp(atLevel(19),{});
    expect(preview.newTraits.map(t=>t.id)).toContain('feature:three_extra_attacks');
    expect(new Set(preview.newTraits.map(t=>t.id)).size).toBe(preview.newTraits.length);
  });
});
