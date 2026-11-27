import {describe,it,expect} from 'vitest';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';
import {collectCharacterTraits} from '../src/traits';

const base=():GuidedFighterInput=>({
  name:'Aldric',level:1,background:'soldier',species:'human',
  assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
  increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
  fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'alert',
  humanSize:'medium',armor:'chain_mail',shield:false,
});
const champion=():GuidedFighterInput=>({...base(),level:7,
  level4Improvement:{mode:'plus_two',first:'strength'},
  level6Improvement:{mode:'two_ones',first:'wisdom',second:'dexterity'},
  martial:{fightingStyle:'defense',additionalFightingStyle:'archery',weaponMasteries:['greatsword','flail','javelin','shortsword'],startingPackage:'a'},
  backgroundEquipment:{startingPackage:'a',gamingSet:'dice_set'},
});
const projection=(input:GuidedFighterInput)=>collectCharacterTraits(input,calculateGuidedFighter(input));

describe('Actualización 40: catálogo de rasgos',()=>{
  it('obtiene rasgos de clase, especie y dotes sin duplicados',()=>{
    const traits=projection(base()).traits;
    expect(traits.filter(t=>t.group==='class').length).toBe(3);
    expect(traits.filter(t=>t.group==='subclass')).toHaveLength(0);
    expect(traits.some(t=>t.id==='species:skillful' && t.automation==='calculated')).toBe(true);
    expect(traits.some(t=>t.id==='feat:human_feat:alert')).toBe(true);
    expect(traits.some(t=>t.id==='feat:background:savage_attacker')).toBe(true);
    expect(new Set(traits.map(t=>t.id)).size).toBe(traits.length);
  });
  it('respeta niveles, la selección marcial y mejoras de característica',()=>{
    const traits=projection(champion()).traits;
    expect(traits.some(t=>t.id==='feature:champion_improved_critical')).toBe(true);
    expect(traits.some(t=>t.id==='feature:champion_additional_fighting_style')).toBe(true);
    expect(traits.find(t=>t.id==='feature:champion_additional_fighting_style')?.details).toContain('Segundo estilo: Tiro con arco.');
    expect(traits.find(t=>t.id==='feature:ability_score_improvement_level_6')?.details[0]).toContain('Sabiduría +1');
    expect(traits.find(t=>t.id==='feature:weapon_mastery')?.details).toHaveLength(4);
    expect(traits.some(t=>t.id==='feature:champion_heroic_warrior')).toBe(false);
  });
  it('no confunde el bono de puntos de golpe del enano con una dote humana',()=>{
    const input={...base(),species:'dwarf' as const};
    const traits=projection(input).traits;
    expect(traits.find(t=>t.id==='species:dwarven_toughness')?.details[0]).toContain('+1 PG');
    expect(traits.find(t=>t.id==='species:dwarven_resilience')?.automation).toBe('manual');
    expect(traits.some(t=>t.id==='feat:human_feat:alert')).toBe(false);
    expect(traits.some(t=>t.id==='species:versatile')).toBe(false);
  });
  it('muestra el linaje élfico sin simular el lanzamiento de hechizos',()=>{
    const input={...base(),species:'elf' as const,elfLineage:'wood_elf' as const,elfSenseSkill:'insight' as const,elfSpellAbility:'wisdom' as const};
    const traits=projection(input).traits;
    const lineage=traits.find(t=>t.id==='species:lineage');
    expect(lineage?.title).toBe('Elfo de los bosques');
    expect(lineage?.automation).toBe('partial');
    expect(lineage?.details).toContain('Velocidad calculada: 35 pies.');
    expect(traits.find(t=>t.id==='species:keen_senses')?.details[0]).toContain('Perspicacia');
  });
  it('incluye únicamente la elección épica vigente y su mejora sin duplicarla',()=>{
    const input:GuidedFighterInput={...champion(),level:19,
      level8Improvement:{mode:'plus_two',first:'wisdom'},
      level12Improvement:{mode:'plus_two',first:'wisdom'},
      level14Improvement:{mode:'plus_two',first:'charisma'},
      level16Improvement:{mode:'plus_two',first:'intelligence'},
      martial:{...champion().martial!,weaponMasteries:['greatsword','flail','javelin','shortsword','longbow','warhammer']},
      epicBoon:{id:'combat_prowess',ability:'dexterity'},
    };
    const traits=projection(input).traits;
    expect(traits.filter(t=>t.id==='feat:epic:combat_prowess')).toHaveLength(1);
    expect(traits.filter(t=>t.id==='feature:epic_boon')).toHaveLength(1);
    expect(traits.some(t=>t.id==='feature:epic_boon_combat_prowess')).toBe(false);
    expect(traits.find(t=>t.id==='feat:epic:combat_prowess')?.details).toContain('El uso se registra al confirmar el ataque desde el panel existente.');
    expect(new Set(traits.map(t=>t.id)).size).toBe(traits.length);
  });
  it('mantiene las advertencias pendientes y no altera entradas ni resultados',()=>{
    const input=base();const result=calculateGuidedFighter(input);
    const beforeInput=JSON.stringify(input),beforeResult=JSON.stringify(result);
    const collection=collectCharacterTraits(input,result);
    expect(collection.pendingAutomation).toEqual(result.pendingAutomation);
    expect(collection.pendingAutomation === result.pendingAutomation).toBe(false);
    expect(JSON.stringify(input)).toBe(beforeInput);
    expect(JSON.stringify(result)).toBe(beforeResult);
  });
});
