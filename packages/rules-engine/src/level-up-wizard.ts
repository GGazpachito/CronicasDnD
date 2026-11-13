/** Actualización 44. Borrador puro, validable y sin efectos secundarios de la subida 1 a 1.
 * Referencia: PHB 2024, tabla de Guerrero p. 91 y Campeón p. 96.
 * La transición que conserva la sesión sigue estando en level-up.ts.
 */
import {calculateGuidedFighter,type GuidedFighterInput} from './guided';
import {collectCharacterTraits,type CharacterTrait} from './traits';
import {type FighterAbilityImprovement} from './progression';
import {type FightingStyleId,type WeaponId} from './martial';
import {type EpicBoonChoice} from './epic-boons';

export const FIGHTER_IMPROVEMENT_LEVELS=[4,6,8,12,14,16] as const;
export type FighterImprovementLevel=typeof FIGHTER_IMPROVEMENT_LEVELS[number];

export type FighterLevelUpChoices=Readonly<{
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
