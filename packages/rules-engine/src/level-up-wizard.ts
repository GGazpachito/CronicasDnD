/** Actualización 44. Borrador puro, validable y sin efectos secundarios de la subida 1 a 1.
 * Referencia: PHB 2024, tabla de Guerrero p. 91 y Campeón p. 96.
 * La transición que conserva la sesión sigue estando en level-up.ts.
 */
import {calculateGuidedFighter,type GuidedFighterInput} from './guided';
import {collectCharacterTraits,type CharacterTrait} from './traits';
import {type FighterAbilityImprovement} from './progression';
import {type FightingStyleId,type WeaponId} from './martial';
import {type EpicBoonChoice} from './epic-boons';
import {explainFighterFeature} from './rules-explanations';
import {appendLevelHitPointRoll} from './level-hit-points';

/** Las novedades y los desplegables comparten el mismo catálogo de explicaciones de Rasgos. */
const MILESTONE_FEATURE_IDS:Readonly<Record<string,string>>={
  'Acción súbita (un uso)':'action_surge','Mente táctica':'tactical_mind',
  'Crítico mejorado':'champion_improved_critical','Atleta extraordinario':'champion_remarkable_athlete',
  'Mejora de característica':'ability_score_improvement',
  'Cuarta maestría de armas':'weapon_mastery','Quinta maestría de armas':'weapon_mastery','Sexta maestría de armas':'weapon_mastery_sixth',
  'Ataque adicional':'extra_attack','Desplazamiento táctico':'tactical_shift',
  'Campeón: segundo estilo de combate':'champion_additional_fighting_style',
  'Indomable (un uso)':'indomitable','Indomable (dos usos)':'indomitable','Indomable (tres usos)':'indomitable_three_uses',
  'Dominio táctico':'tactical_master','Campeón: Guerrero heroico':'champion_heroic_warrior',
  'Dos ataques adicionales':'two_extra_attacks','Ataques estudiados':'studied_attacks',
  'Campeón: Crítico superior':'champion_superior_critical','Acción súbita (dos usos)':'action_surge_two_uses',
  'Campeón: Superviviente':'champion_survivor','Beneficio épico':'epic_boon',
  'Tres ataques adicionales: cuatro ataques por acción Atacar':'three_extra_attacks',
};
const SUBCLASS_INFO='En este proyecto se implementa Campeón: mejora tu intervalo de crítico, destaca en Atletismo e iniciativa y obtiene más capacidades de resistencia y combate al subir de nivel.';
export function explainFighterMilestone(title:string):string|undefined{
  if(title==='Subclase Campeón')return SUBCLASS_INFO;
  const id=MILESTONE_FEATURE_IDS[title];
  // La mejora numérica se explica directamente mediante sus dos opciones de reparto.
  return id&&id!=='ability_score_improvement'?explainFighterFeature(id):undefined;
}
export const FIGHTER_IMPROVEMENT_LEVELS=[4,6,8,12,14,16] as const;
export type FighterImprovementLevel=typeof FIGHTER_IMPROVEMENT_LEVELS[number];

export type FighterLevelUpChoices=Readonly<{
  /** 6 para promedio, 1..10 para tirada de dado; opcional para llamadas antiguas. */
  hitDieRoll?:number;
  improvement?: FighterAbilityImprovement;
  newMastery?: WeaponId;
  additionalFightingStyle?: FightingStyleId;
  epicBoon?: EpicBoonChoice;
}>;

export type FighterLevelUpPreview=Readonly<{
  input:GuidedFighterInput;
  fromLevel:number;
  toLevel:number;
  before:ReturnType<typeof calculateGuidedFighter>;
  after:ReturnType<typeof calculateGuidedFighter>;
  newTraits:readonly CharacterTrait[];
}>;

/** Resume los hitos oficiales implementados; no anuncia otras dotes generales aún no disponibles. */
export const FIGHTER_LEVEL_MILESTONES:Readonly<Record<number,readonly string[]>>={
  2:['Acción súbita (un uso)','Mente táctica'],
  3:['Subclase Campeón','Crítico mejorado','Atleta extraordinario'],
  4:['Mejora de característica','Cuarta maestría de armas'],
  5:['Ataque adicional','Desplazamiento táctico'],
  6:['Mejora de característica'],
  7:['Campeón: segundo estilo de combate'],
  8:['Mejora de característica'],
  9:['Indomable (un uso)','Dominio táctico'],
  10:['Campeón: Guerrero heroico','Quinta maestría de armas'],
  11:['Dos ataques adicionales'],
  12:['Mejora de característica'],
  13:['Indomable (dos usos)','Ataques estudiados'],
  14:['Mejora de característica'],
  15:['Campeón: Crítico superior'],
  16:['Mejora de característica','Sexta maestría de armas'],
  17:['Acción súbita (dos usos)','Indomable (tres usos)'],
  18:['Campeón: Superviviente'],
  19:['Beneficio épico'],
  20:['Tres ataques adicionales: cuatro ataques por acción Atacar'],
};

export function fighterLevelUpRequirements(level:number):Readonly<{
  improvement:boolean;mastery:boolean;additionalStyle:boolean;epicBoon:boolean;
}>{
  return {
    improvement:(FIGHTER_IMPROVEMENT_LEVELS as readonly number[]).includes(level),
    mastery:level===4||level===10||level===16,
    additionalStyle:level===7,
    epicBoon:level===19,
  };
}

/** Crea la hoja candidata, sin mutar el personaje de partida ni su inventario.
 * La validación completa se delega a calculateGuidedFighter.
 */
export function buildFighterLevelUpCandidate(current:GuidedFighterInput,choices:FighterLevelUpChoices):GuidedFighterInput{
  if(!Number.isInteger(current.level)||current.level<1||current.level>=20)
    throw new RangeError('La subida solo está disponible desde niveles 1 a 19');
  if(!current.martial)throw new RangeError('Completa primero las elecciones de combate del Guerrero');
  const target=current.level+1;
  const requirement=fighterLevelUpRequirements(target);
  if(requirement.improvement&&!choices.improvement)
    throw new RangeError(`Elige la mejora de característica del nivel ${target}`);
  if(requirement.mastery&&!choices.newMastery)
    throw new RangeError(`Elige la nueva maestría de armas del nivel ${target}`);
  if(requirement.additionalStyle&&!choices.additionalFightingStyle)
    throw new RangeError('Elige el segundo estilo de combate del Campeón');
  if(requirement.epicBoon&&!choices.epicBoon)
    throw new RangeError('Elige un beneficio épico para el nivel 19');
  if(!requirement.improvement&&choices.improvement!==undefined)throw new RangeError('Este nivel no concede mejora de característica');
  if(!requirement.mastery&&choices.newMastery!==undefined)throw new RangeError('Este nivel no concede maestría adicional');
  if(!requirement.additionalStyle&&choices.additionalFightingStyle!==undefined)throw new RangeError('Este nivel no concede segundo estilo');
  if(!requirement.epicBoon&&choices.epicBoon!==undefined)throw new RangeError('Este nivel no concede beneficio épico');

  const mastery=current.martial.weaponMasteries;
  if(requirement.mastery&&mastery.includes(choices.newMastery!))
    throw new RangeError('La nueva maestría debe ser de un arma diferente');
  if(requirement.additionalStyle&&current.martial.fightingStyle===choices.additionalFightingStyle)
    throw new RangeError('El segundo estilo debe ser distinto del primero');

  const improvementKey=`level${target}Improvement` as 'level4Improvement'|'level6Improvement'|'level8Improvement'|'level12Improvement'|'level14Improvement'|'level16Improvement';
  const next:GuidedFighterInput={
    ...current,
    level:target as GuidedFighterInput['level'],
    levelHitPointRolls:appendLevelHitPointRoll(current.level,current.levelHitPointRolls,10,6,choices.hitDieRoll??6),
    ...(requirement.improvement?{[improvementKey]:choices.improvement}:{}),
    ...(requirement.epicBoon?{epicBoon:choices.epicBoon}:{}),
    martial:{...current.martial,
      weaponMasteries:requirement.mastery?[...mastery,choices.newMastery!]:[...mastery],
      ...(requirement.additionalStyle?{additionalFightingStyle:choices.additionalFightingStyle}:{})},
  };
  calculateGuidedFighter(next);
  return next;
}

export function previewFighterLevelUp(current:GuidedFighterInput,choices:FighterLevelUpChoices):FighterLevelUpPreview{
  const before=calculateGuidedFighter(current);
  const input=buildFighterLevelUpCandidate(current,choices);
  const after=calculateGuidedFighter(input);
  const existing=new Set(collectCharacterTraits(current,before).traits.map(t=>t.id));
  const newTraits=collectCharacterTraits(input,after).traits.filter(t=>!existing.has(t.id));
  if(new Set(after.sheet.features).size!==after.sheet.features.length)
    throw new RangeError('La subida ha generado rasgos duplicados');
  return {input,fromLevel:current.level,toLevel:input.level,before,after,newTraits};
}
