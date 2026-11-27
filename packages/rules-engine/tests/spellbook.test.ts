import {describe,it,expect} from 'vitest';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';
import {collectCharacterSpellbook} from '../src/spellbook';

const base=():GuidedFighterInput=>({
  name:'Aldric',level:1,background:'soldier',species:'human',
  assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
  increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
  fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'alert',humanSize:'medium',
  armor:'chain_mail',shield:false,
  martial:{fightingStyle:'defense',weaponMasteries:['greatsword','flail','javelin'],startingPackage:'a'},
});
const cleric=()=>({list:'cleric' as const,spellcastingAbility:'wisdom' as const,cantrips:['guidance','sacred_flame'],level1Spell:'bless'});
const druid=()=>({list:'druid' as const,spellcastingAbility:'charisma' as const,cantrips:['guidance','druidcraft'],level1Spell:'goodberry'});

function acolyte():GuidedFighterInput{return {...base(),background:'acolyte',plusTwoAbility:'intelligence',plusOneAbility:'wisdom',backgroundMagicInitiate:cleric()};}

describe('Actualización 43: proyección de hechizos de origen',()=>{
  it('no inventa conjuros, ranuras ni características de lanzador al Guerrero corriente',()=>{
    const book=collectCharacterSpellbook(calculateGuidedFighter(base()));
    expect(book.totalGrants).toBe(0);
    expect(book.abilities).toHaveLength(0);
    expect(book.classSpellSlotsAvailable).toBe(false);
  });
  it('reconoce trucos y conjuro de nivel 1 de Iniciado en la Magia',()=>{
    const book=collectCharacterSpellbook(calculateGuidedFighter(acolyte()));
    expect(book.totalGrants).toBe(3);
    expect(book.cantrips).toBe(2);
    expect(book.leveledSpells).toBe(1);
    expect(book.entries[0].sourceLabel).toBe('Trasfondo: Acólito');
    expect(book.entries[0].freeCastPerLongRest).toBe(false);
    expect(book.entries[2].freeCastPerLongRest).toBe(true);
    expect(book.entries[2].allowsSpellSlot).toBe(true);
    expect(book.classSpellSlotsAvailable).toBe(false);
  });
  it('usa puntuaciones finales y competencia para CD y ataque mágico',()=>{
    const result=calculateGuidedFighter(acolyte());
    const book=collectCharacterSpellbook(result);
    const wisdom=result.sheet.abilityModifiers.wisdom;
    expect(book.entries[0].attackBonus).toBe(wisdom+result.sheet.proficiencyBonus);
    expect(book.entries[0].saveDC).toBe(8+wisdom+result.sheet.proficiencyBonus);
  });
  it('conserva concesiones iguales de dos fuentes distintas, sin perder su fuente o característica',()=>{
    const input:GuidedFighterInput={...acolyte(),humanFeat:'magic_initiate',humanFeatDetails:{magicInitiate:druid()}};
    const book=collectCharacterSpellbook(calculateGuidedFighter(input));
    const guidance=book.entries.filter(e=>e.id==='guidance');
    expect(book.totalGrants).toBe(6);
    expect(book.uniqueSpells).toBe(5);
    expect(guidance).toHaveLength(2);
    expect(guidance.map(e=>e.source)).toEqual(['background','human_feat']);
    expect(guidance.map(e=>e.spellcastingAbility)).toEqual(['wisdom','charisma']);
    expect(new Set(book.entries.map(e=>e.key)).size).toBe(book.entries.length);
  });
  it('respeta desbloqueos del linaje élfico en niveles 1, 3 y 5',()=>{
    const selected=base();
    for(const [level,expected] of [[1,1],[3,2],[5,3]] as const){
      const input:GuidedFighterInput={...selected,level,species:'elf',elfLineage:'wood_elf',elfSpellAbility:'wisdom',elfSenseSkill:'insight',
        ...(level>=4?{level4Improvement:{mode:'plus_two' as const,first:'strength' as const},martial:{...selected.martial!,weaponMasteries:['greatsword','flail','javelin','shortsword'] as const}}:{})};
      const book=collectCharacterSpellbook(calculateGuidedFighter(input));
      expect(book.totalGrants).toBe(expected);
      expect(book.entries.map(e=>e.level)).toEqual(level===1?[0]:level===3?[0,1]:[0,1,2]);
      expect(book.entries.every(e=>e.source==='elf_lineage')).toBe(true);
    }
  });
  it('admite varios orígenes de conjuro y genera estadísticas separadas por característica',()=>{
    const input:GuidedFighterInput={...acolyte(),humanFeat:'magic_initiate',humanFeatDetails:{magicInitiate:druid()}};
    const result=calculateGuidedFighter(input);
    const book=collectCharacterSpellbook(result);
    expect(book.abilities.map(a=>a.ability)).toEqual(['wisdom','charisma']);
    expect(book.abilities.map(a=>a.saveDC)).toEqual([
      8+result.sheet.proficiencyBonus+result.sheet.abilityModifiers.wisdom,
      8+result.sheet.proficiencyBonus+result.sheet.abilityModifiers.charisma,
    ]);
  });
  it('no altera el resultado validado ni sus conjuros originales',()=>{
    const result=calculateGuidedFighter(acolyte());
    const before=JSON.stringify(result);
    const first=collectCharacterSpellbook(result);
    const second=collectCharacterSpellbook(result);
    expect(first).toEqual(second);
    expect(JSON.stringify(result)).toBe(before);
  });
});
