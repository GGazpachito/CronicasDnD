import {describe,it,expect} from 'vitest';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';
import {collectCharacterTraits} from '../src/traits';
import {FIGHTER_LEVEL_MILESTONES,explainFighterMilestone,previewFighterLevelUp,buildFighterLevelUpCandidate,fighterLevelUpRequirements,type FighterLevelUpChoices} from '../src/level-up-wizard';
import {WEAPONS,FIGHTING_STYLES} from '../src/martial';
import {EPIC_BOONS} from '../src/epic-boons';
import {FIGHTER_FEATURE_EXPLANATIONS,FIGHTING_STYLE_EXPLANATIONS,MASTERY_EXPLANATIONS,EPIC_BOON_EXPLANATIONS,ORIGIN_FEAT_EXPLANATIONS,SPECIES_TRAIT_EXPLANATIONS} from '../src/rules-explanations';

const initial:GuidedFighterInput={
  name:'Aldric',level:1,background:'soldier',species:'human',
  assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
  increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
  fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'alert',humanSize:'medium',
  armor:'chain_mail',shield:false,
  martial:{fightingStyle:'defense',weaponMasteries:['greatsword','flail','javelin'],startingPackage:'a'},
  backgroundEquipment:{startingPackage:'a',gamingSet:'dice_set'},
};
const improvements:Readonly<Record<number,'strength'|'constitution'|'wisdom'|'charisma'|'intelligence'>>={4:'strength',6:'constitution',8:'wisdom',12:'wisdom',14:'charisma',16:'intelligence'};
const masteries={4:'shortsword',10:'longbow',16:'warhammer'} as const;
function choicesFor(level:number):FighterLevelUpChoices{
  const req=fighterLevelUpRequirements(level);
  return {
    ...(req.improvement?{improvement:{mode:'plus_two' as const,first:improvements[level]}}:{}),
    ...(req.mastery?{newMastery:masteries[level as keyof typeof masteries]}:{}),
    ...(req.additionalStyle?{additionalFightingStyle:'archery' as const}:{}),
    ...(req.epicBoon?{epicBoon:{id:'combat_prowess' as const,ability:'charisma' as const}}:{}),
  };
}

describe('Actualización 44.1: explicaciones de rasgos compartidas',()=>{
  it('describe todos los hitos que no son simples mejoras numéricas',()=>{
    for(const [level,milestones] of Object.entries(FIGHTER_LEVEL_MILESTONES)){
      for(const milestone of milestones){
        if(milestone==='Mejora de característica')continue;
        expect(explainFighterMilestone(milestone),`Nivel ${level}: ${milestone}`).toBeTruthy();
      }
    }
    expect(explainFighterMilestone('Mejora de característica')).toBeUndefined();
  });
  it('explica los rasgos nuevos de las 19 subidas sin cambiar la lógica ni añadir duplicados',()=>{
    let current=initial;
    for(let level=2;level<=20;level++){
      const original=JSON.stringify(current);
      const preview=previewFighterLevelUp(current,choicesFor(level));
      for(const trait of preview.newTraits)expect(trait.explanation,`${level}: ${trait.id}`).toBeTruthy();
      expect(new Set(preview.newTraits.map(t=>t.id)).size).toBe(preview.newTraits.length);
      expect(JSON.stringify(current)).toBe(original);
      current=preview.input;
    }
  });
  it('las ocho propiedades de maestría tienen una explicación comprensible y cada arma tiene una propiedad descrita',()=>{
    expect(Object.keys(MASTERY_EXPLANATIONS)).toHaveLength(8);
    for(const weapon of Object.values(WEAPONS))expect(MASTERY_EXPLANATIONS[weapon.mastery].length).toBeGreaterThan(35);
  });
  it('todos los estilos permitidos tienen explicación, incluida Defensa',()=>{
    for(const id of Object.keys(FIGHTING_STYLES) as (keyof typeof FIGHTING_STYLES)[])
      expect(FIGHTING_STYLE_EXPLANATIONS[id].length).toBeGreaterThan(35);
    expect(FIGHTING_STYLE_EXPLANATIONS.defense).toContain('+1');
  });
  it('todos los beneficios épicos elegibles tienen descripción, sin confundir el efecto con su activación',()=>{
    for(const id of Object.keys(EPIC_BOONS) as (keyof typeof EPIC_BOONS)[])
      expect(EPIC_BOON_EXPLANATIONS[id].length).toBeGreaterThan(35);
    expect(EPIC_BOON_EXPLANATIONS.combat_prowess).toContain('impacto');
  });
  it('los rasgos de clase, especie y origen del personaje inicial muestran efectos, no solo su nombre',()=>{
    const traits=collectCharacterTraits(initial,calculateGuidedFighter(initial)).traits;
    for(const trait of traits)expect(trait.explanation,trait.id).toBeTruthy();
    expect(traits.find(t=>t.id==='feat:human_feat:alert')?.explanation).toContain('iniciativa');
    expect(traits.find(t=>t.id==='feature:fighting_style')?.details.join(' ')).toContain('Defensa');
  });
  it('también describe los rasgos del enano y el elfo',()=>{
    const dwarf:GuidedFighterInput={...initial,species:'dwarf'};
    const elf:GuidedFighterInput={...initial,species:'elf',elfLineage:'wood_elf',elfSenseSkill:'insight',elfSpellAbility:'wisdom'};
    for(const source of [dwarf,elf]){
      const traits=collectCharacterTraits(source,calculateGuidedFighter(source)).traits;
      for(const trait of traits)expect(trait.explanation,trait.id).toBeTruthy();
    }
  });
  it('catálogo contiene los rasgos y dotes de origen previstos y no reescribe los valores del personaje',()=>{
    expect(Object.keys(FIGHTER_FEATURE_EXPLANATIONS).length).toBeGreaterThan(15);
    expect(ORIGIN_FEAT_EXPLANATIONS.savage_attacker).toContain('dados de daño');
    expect(SPECIES_TRAIT_EXPLANATIONS.trance).toContain('cuatro horas');
    const before=JSON.stringify(initial);
    buildFighterLevelUpCandidate(initial,choicesFor(2));
    collectCharacterTraits(initial,calculateGuidedFighter(initial));
    expect(JSON.stringify(initial)).toBe(before);
  });
});
