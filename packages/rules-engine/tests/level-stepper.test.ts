import { describe, it, expect } from 'vitest';
import { adjacentFighterLevel, type SupportedFighterLevel } from '../src/progression';
import { calculateGuidedFighter, type GuidedFighterInput } from '../src/guided';
import { initialAdventureState, advanceAdventureLevel, applyAdventureAction, validateAdventureState } from '../src/adventure';
import { makeCharacterSnapshot, validateCharacterSnapshot } from '../src/persistence';

const base: GuidedFighterInput = {
  name: 'Aldric', level: 6, background: 'soldier', species: 'human',
  assignedAbilities: {strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
  increaseMode:'two_plus_one', plusTwoAbility:'strength', plusOneAbility:'constitution',
  fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'tough',humanSize:'medium',
  armor:'chain_mail',shield:false,
  level4Improvement:{mode:'plus_two',first:'strength'},
  level6Improvement:{mode:'plus_two',first:'constitution'},
  martial:{fightingStyle:'defense',weaponMasteries:['greatsword','flail','javelin','shortsword'],startingPackage:'a'},
  backgroundEquipment:{startingPackage:'a',gamingSet:'dice_set'}
};
const atLevel=(level:SupportedFighterLevel):GuidedFighterInput=>({
  ...base,level,
  ...(level>=7?{martial:{...base.martial!,additionalFightingStyle:'archery' as const}}:{}),
  ...(level>=8?{level8Improvement:{mode:'plus_two' as const,first:'wisdom' as const}}:{})
});

describe('Selector de nivel con flechas',()=>{
  it('la flecha anterior está bloqueada en nivel 1',()=>{
    expect(adjacentFighterLevel(1,-1)).toBeNull();
    expect(adjacentFighterLevel(1,1)).toBe(2);
  });
  it('la flecha siguiente está bloqueada en nivel 19',()=>{
    expect(adjacentFighterLevel(11,1)).toBe(12);
    expect(adjacentFighterLevel(12,1)).toBe(13);
    expect(adjacentFighterLevel(13,1)).toBe(14);
    expect(adjacentFighterLevel(14,1)).toBe(15);
    expect(adjacentFighterLevel(15,1)).toBe(16);
    expect(adjacentFighterLevel(16,1)).toBe(17);
    expect(adjacentFighterLevel(17,1)).toBe(18);
    expect(adjacentFighterLevel(18,1)).toBe(19);
    expect(adjacentFighterLevel(19,1)).toBeNull();
    expect(adjacentFighterLevel(9,1)).toBe(10);
    expect(adjacentFighterLevel(10,1)).toBe(11);
    expect(adjacentFighterLevel(11,-1)).toBe(10);
  });
  it('los niveles 6, 7, 8 y 9 se recorren consecutivamente',()=>{
    expect(adjacentFighterLevel(6,1)).toBe(7);
    expect(adjacentFighterLevel(7,1)).toBe(8);
    expect(adjacentFighterLevel(8,1)).toBe(9);
    expect(adjacentFighterLevel(11,-1)).toBe(10);
    expect(adjacentFighterLevel(8,-1)).toBe(7);
    expect(adjacentFighterLevel(7,-1)).toBe(6);
  });
  it('la navegación rechaza niveles y saltos inválidos',()=>{
    expect(()=>adjacentFighterLevel(0 as SupportedFighterLevel,1)).toThrow();
    expect(()=>adjacentFighterLevel(20 as SupportedFighterLevel,-1)).toThrow();
    expect(()=>adjacentFighterLevel(7,2 as 1)).toThrow();
  });
  it('la subida consecutiva 6→7→8→9 mantiene el estado y los PG gastados',()=>{
    let level:SupportedFighterLevel=6;
    let sheet=calculateGuidedFighter(atLevel(level)).sheet;
    let state=applyAdventureAction(initialAdventureState(sheet),{type:'damage',amount:7},sheet).state;
    for(let i=0;i<3;i++){
      const next=adjacentFighterLevel(level,1);
      if(next===null)throw new Error('La flecha siguiente no debería bloquearse antes del nivel 9');
      const nextSheet=calculateGuidedFighter(atLevel(next)).sheet;
      state=advanceAdventureLevel(state,sheet,nextSheet);
      expect(state.fighter.fighterLevel).toBe(next);
      expect(state.fighter.hitPoints.current).toBe(nextSheet.maximumHitPoints-7);
      expect(validateAdventureState(state,nextSheet).fighter.fighterLevel).toBe(next);
      sheet=nextSheet;level=next;
    }
    expect(level).toBe(9);
    const snapshot=makeCharacterSnapshot(atLevel(level),state);
    expect(validateCharacterSnapshot(JSON.parse(JSON.stringify(snapshot))).input.level).toBe(9);
  });
  it('el nivel 7 requiere elegir el segundo estilo de combate',()=>{
    expect(()=>calculateGuidedFighter({...base,level:7})).toThrow();
    expect(calculateGuidedFighter(atLevel(7)).sheet.level).toBe(7);
  });
});
