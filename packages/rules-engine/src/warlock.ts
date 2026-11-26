/** Brujo Infernal niveles 1 a 12, reglas D&D 2024.
 * Elecciones, proyección, acciones y estado persistido están separados.
 * Patrón Infernal se elige en nivel 3: no concede rasgos prematuros.
 */
import {ABILITIES,abilityModifiers,type Ability,type AbilityScores} from './abilities';
import {validateGeneratedAbilities,type AbilityGenerationMethod} from './ability-generation';
import {validateCompanionSheets,type CompanionSheet} from './companions';
import {SKILLS,calculateSkillBonuses,calculateSavingThrows,type Skill} from './proficiencies';
import {BACKGROUNDS,SPECIES_NAMES,type BackgroundId,type SpeciesId,type ElfLineage} from './guided';
import {EMPTY_CHARACTER_PROFILE,validateCharacterProfile,type CharacterProfile} from './character-profile';
import {calculateArmorClass} from './defense';
import {equippedArmor,type InventoryAction,type InventoryState} from './inventory';
import {WEAPONS,type WeaponId} from './martial';
import {WEAPON_STATS} from './attacks';
import {WARLOCK_LEVEL_ONE_CANTRIPS,WARLOCK_LEVEL_ONE_SPELLS,WARLOCK_SPELLS_THROUGH_LEVEL_TWO,WARLOCK_SPELLS_THROUGH_LEVEL_THREE,WARLOCK_SPELLS_THROUGH_LEVEL_FOUR,WARLOCK_SPELLS_THROUGH_LEVEL_FIVE,WARLOCK_SIXTH_LEVEL_IDS,WARLOCK_FIEND_LEVEL_THREE_IDS,WARLOCK_FIEND_THROUGH_LEVEL_FIVE_IDS,WARLOCK_FIEND_ALWAYS_PREPARED_IDS,TOME_CANTRIP_OPTIONS,TOME_RITUAL_OPTIONS} from './warlock-spells';
import {warlockInventory,type WarlockEquipmentChoice} from './warlock-inventory';
import {applyFighterAbilityImprovement,type FighterAbilityImprovement} from './progression';
import type {BackgroundEquipmentChoice} from './background-equipment';

export const WARLOCK_SKILL_OPTIONS=['arcana','deception','history','intimidation','investigation','nature','religion'] as const satisfies readonly Skill[];
export type WarlockSkill=(typeof WARLOCK_SKILL_OPTIONS)[number];
export const WARLOCK_INVOCATIONS={
 armor_of_shadows:{minLevel:1,name:'Armadura de sombras',summary:'Armadura de mago sobre ti sin consumir ranura; el jugador activa el conjuro.'},
 eldritch_mind:{minLevel:1,name:'Mente sobrenatural',summary:'Ventaja en salvaciones de Constitución para mantener la concentración.'},
 pact_of_blade:{minLevel:1,name:'Pacto de la Hoja',summary:'Arma cuerpo a cuerpo vinculada; competencia y Carisma para ataque y daño, si está equipada.'},
 pact_of_chain:{minLevel:1,name:'Pacto de la Cadena',summary:'Encontrar familiar sin gastar ranura; puede tener formas especiales.'},
 pact_of_tome:{minLevel:1,name:'Pacto del Tomo',summary:'Libro de las sombras con tres trucos y dos rituales de nivel 1, mientras lo lleves.'},
 agonizing_blast:{minLevel:2,name:'Descarga agonizante',summary:'Añade Carisma al daño del truco dañino elegido; Descarga sobrenatural se calcula automáticamente.'},
 devils_sight:{minLevel:2,name:'Vista del diablo',summary:'Ves normalmente en luz tenue y oscuridad, incluso mágica, hasta 120 pies.'},
 eldritch_spear:{minLevel:2,name:'Lanza sobrenatural',summary:'Aumenta el alcance del truco dañino elegido 30 pies por nivel de Brujo.'},
 fiendish_vigor:{minLevel:2,name:'Vigor infernal',summary:'Puedes lanzar Vida falsa sobre ti sin gastar ranura y obtienes el máximo de los dados de PG temporales.'},
 lessons_of_the_first_ones:{minLevel:2,name:'Lecciones de los Primeros',summary:'Adquieres una dote de origen elegida; en esta fase se admiten Alerta y Duro.'},
 mask_of_many_faces:{minLevel:2,name:'Máscara de muchos rostros',summary:'Puedes lanzar Disfrazarse sin consumir una ranura.'},
 misty_visions:{minLevel:2,name:'Visiones brumosas',summary:'Puedes lanzar Imagen silenciosa sin gastar ranura.'},
 otherworldly_leap:{minLevel:2,name:'Salto sobrenatural',summary:'Puedes lanzar Salto sobre ti sin gastar ranura.'},
 repelling_blast:{minLevel:2,name:'Descarga repelente',summary:'El truco dañino elegido puede empujar hasta 10 pies al impactar (resolución manual).'},
 ascendant_step:{minLevel:5,name:'Paso ascendente',summary:'Puedes lanzar Levitar sobre ti sin gastar ranura.'},
 eldritch_smite:{minLevel:5,name:'Castigo sobrenatural',summary:'Al golpear con el arma del pacto, puedes gastar una ranura para causar 1d8 de fuerza + 1d8 por nivel de ranura, una vez por turno. Puedes derribar a criaturas enormes o menores.'},
 gaze_of_two_minds:{minLevel:5,name:'Mirada de dos mentes',summary:'Conectas tus sentidos a una criatura voluntaria y puedes lanzar conjuros desde su espacio si está a 60 pies o menos; el vínculo se mantiene manualmente.'},
 gift_of_the_depths:{minLevel:5,name:'Don de las profundidades',summary:'Respiras bajo el agua, ganas velocidad de nado igual a tu velocidad y puedes lanzar Respirar bajo el agua una vez por descanso largo.'},
 investment_of_the_chain_master:{minLevel:5,name:'Investidura del Señor de la Cadena',summary:'El familiar obtiene velocidad de vuelo o nado 40 pies; puede atacar con tu acción adicional, usar tu CD de salvación y recibir resistencia con tu reacción.'},
 master_of_myriad_forms:{minLevel:5,name:'Señor de las múltiples formas',summary:'Puedes lanzar Alterar el propio aspecto sin gastar ranura.'},
 one_with_shadows:{minLevel:5,name:'Uno con las sombras',summary:'En luz tenue u oscuridad puedes lanzar Invisibilidad sobre ti sin gastar ranura.'},
 thirsting_blade:{minLevel:5,name:'Hoja sedienta',summary:'Al usar la acción de Atacar con tu arma del pacto equipada, puedes hacer dos ataques en lugar de uno.'},
 whispers_of_the_grave:{minLevel:7,name:'Susurros de la tumba',summary:'Puedes lanzar Hablar con los muertos sin gastar ranura. El diálogo con el cadáver se resuelve con el director de juego.'},
 gift_of_the_protectors:{minLevel:9,name:'Don de los protectores',summary:'Requiere Pacto del Tomo. Inscribes nombres en el Libro de las Sombras; una vez por descanso largo, una criatura inscrita que caería a 0 PG queda a 1 PG (se resuelve manualmente).'},
 lifedrinker:{minLevel:9,name:'Bebedor de vida',summary:'Requiere Pacto de la Hoja. Una vez por turno, un impacto con el arma del pacto inflige 1d6 extra de daño necrótico, psíquico o radiante; puedes gastar un dado de golpe para recuperarte (gestión manual).'},
 visions_of_distant_realms:{minLevel:9,name:'Visiones de reinos distantes',summary:'Puedes lanzar Ojo arcano a voluntad, sin gastar ranura ni componentes materiales.'},
 devouring_blade:{minLevel:12,name:'Hoja devoradora',summary:'Requiere Hoja sedienta; al usar la acción de Atacar con tu arma del pacto equipada, realizas tres ataques en lugar de dos.'}
} as const;
export type WarlockInvocationId=keyof typeof WARLOCK_INVOCATIONS;
export const WARLOCK_INVOCATION_PREREQUISITES:Partial<Record<WarlockInvocationId,WarlockInvocationId>>={
 eldritch_smite:'pact_of_blade',thirsting_blade:'pact_of_blade',investment_of_the_chain_master:'pact_of_chain',
 gift_of_the_protectors:'pact_of_tome',lifedrinker:'pact_of_blade',devouring_blade:'thirsting_blade'
};
export const WARLOCK_LEVEL_ONE_INVOCATIONS=(Object.keys(WARLOCK_INVOCATIONS) as WarlockInvocationId[]).filter(id=>WARLOCK_INVOCATIONS[id].minLevel===1);
export const WARLOCK_LEVEL_TWO_INVOCATIONS=(Object.keys(WARLOCK_INVOCATIONS) as WarlockInvocationId[]).filter(id=>WARLOCK_INVOCATIONS[id].minLevel<=2);
export const WARLOCK_LEVEL_FIVE_INVOCATIONS=(Object.keys(WARLOCK_INVOCATIONS) as WarlockInvocationId[]).filter(id=>WARLOCK_INVOCATIONS[id].minLevel<=5);
export const WARLOCK_LEVEL_SEVEN_INVOCATIONS=(Object.keys(WARLOCK_INVOCATIONS) as WarlockInvocationId[]).filter(id=>WARLOCK_INVOCATIONS[id].minLevel<=7);
export const WARLOCK_LEVEL_NINE_INVOCATIONS=(Object.keys(WARLOCK_INVOCATIONS) as WarlockInvocationId[]).filter(id=>WARLOCK_INVOCATIONS[id].minLevel<=9);
export const WARLOCK_LEVEL_TWELVE_INVOCATIONS=(Object.keys(WARLOCK_INVOCATIONS) as WarlockInvocationId[]).filter(id=>WARLOCK_INVOCATIONS[id].minLevel<=12);
export const WARLOCK_FAMILIARS={
 imp:'Diablillo',pseudodragon:'Pseudodragón',quasit:'Quasit',skeleton:'Esqueleto',
 slaad_tadpole:'Renacuajo slaad',sphinx_of_wonder:'Esfinge maravillosa',
 sprite:'Duende',venomous_snake:'Serpiente venenosa',
 bat:'Murciélago',cat:'Gato',crab:'Cangrejo',frog:'Rana',hawk:'Halcón',
 lizard:'Lagarto',octopus:'Pulpo',owl:'Búho',poisonous_snake:'Serpiente',
 fish:'Pez',rat:'Rata',raven:'Cuervo',sea_horse:'Caballito de mar',
 spider:'Araña',weasel:'Comadreja'
} as const;
export type FamiliarForm=keyof typeof WARLOCK_FAMILIARS;
const SIMPLE_WEAPONS=new Set<WeaponId>(['club','dagger','greatclub','handaxe','javelin','light_hammer','mace','quarterstaff','sickle','spear','dart','light_crossbow','shortbow','sling']);

/** Historial de elecciones y efectos del nivel 2, para un descenso 3→2 reversible. */
export type WarlockLevelTwoHistory=Readonly<{
 invocations:readonly WarlockInvocationId[];cantripIds:readonly string[];preparedIds:readonly string[];
 lessonsFeat?:'alert'|'tough';pactWeaponId?:WeaponId;
 tomeCantripIds?:readonly string[];tomeRitualIds?:readonly string[];
 mageArmorActive:boolean;tomePresent:boolean;familiarForm:FamiliarForm|null;familiarName:string;
}>;
/** Restauración de las elecciones de nivel 3 tras descender de nivel 4. */
export type WarlockLevelThreeHistory=WarlockLevelTwoHistory;
/** Elecciones de nivel 4, antes de obtener las invocaciones y conjuros del nivel 5. */
export type WarlockLevelFourHistory=WarlockLevelTwoHistory;
/** Elecciones de nivel 5 para restaurar exactamente una bajada 6→5. */
export type WarlockLevelFiveHistory=WarlockLevelTwoHistory&Readonly<{
 familiarInvestmentMovement?:'fly'|'swim';giftOfDepthsUsed?:boolean;
}>;
export type WarlockLevelSixHistory=WarlockLevelFiveHistory&Readonly<{darkOnesOwnLuckUsed?:number}>;
/** Estado previo al nivel 8, reversible sin descartar los vínculos del pacto. */
export type WarlockLevelSevenHistory=WarlockLevelSixHistory;
/** Elecciones en nivel 8, antes de la séptima invocación y Contactar con el patrón. */
export type WarlockLevelEightHistory=WarlockLevelSevenHistory;
/** Elecciones del nivel 9 previas al cuarto truco y a Resistencia infernal. */
export type WarlockLevelNineHistory=WarlockLevelEightHistory;
/** Configuración exacta del nivel 10 antes de adquirir el Arcanum. */
export type WarlockLevelTenHistory=WarlockLevelNineHistory&Readonly<{fiendishResilienceType?:WarlockFiendDamageType|null;fiendishResiliencePending?:boolean}>;
/** Elecciones exactas del nivel 11 para una bajada 12→11 reversible. */
export type WarlockLevelElevenHistory=WarlockLevelTenHistory&Readonly<{mysticArcanum6Id:typeof WARLOCK_SIXTH_LEVEL_IDS[number]}>;
export const WARLOCK_FIEND_DAMAGE_TYPES={acid:'Ácido',bludgeoning:'Contundente',cold:'Frío',fire:'Fuego',lightning:'Relámpago',necrotic:'Necrótico',piercing:'Perforante',poison:'Veneno',psychic:'Psíquico',radiant:'Radiante',slashing:'Cortante',thunder:'Trueno'} as const;
export type WarlockFiendDamageType=keyof typeof WARLOCK_FIEND_DAMAGE_TYPES;
export type GuidedWarlockInput=Readonly<{
 classId:'warlock';level:1|2|3|4|5|6|7|8|9|10|11|12;name:string;profile?:CharacterProfile;
 background:BackgroundId;species:SpeciesId;assignedAbilities:AbilityScores;
 abilityGenerationMethod?:AbilityGenerationMethod;
 companions?:readonly CompanionSheet[];
 increaseMode:'two_plus_one'|'three_ones';plusTwoAbility:Ability;plusOneAbility:Ability;
 warlockSkills:readonly WarlockSkill[];humanSkill?:Skill;humanFeat?:'alert'|'tough';
 humanSize?:'small'|'medium';elfLineage?:ElfLineage;
 equipmentChoice:WarlockEquipmentChoice;backgroundEquipment?:BackgroundEquipmentChoice;
 inventoryActions?:readonly InventoryAction[];
 cantripIds:readonly string[];preparedIds:readonly string[];
 invocations:readonly WarlockInvocationId[];
 /** Dado de golpe del nivel 2: 5 es el promedio reglamentario; 1..8 si se tira. */
 level2HitDieRoll?:number;
 /** Dado de golpe del nivel 3: 5 de media, o resultado manual de 1d8. */
 level3HitDieRoll?:number;
 /** Media 5 o 1d8; no vuelve a tirarse al bajar y subir. */
 level4HitDieRoll?:number;
 /** Dote Mejora de característica, compartida con Guerrero y Mago. */
 level4Improvement?:FighterAbilityImprovement;
 /** Primera subclase disponible: Patrón Infernal, desde nivel 3. */
 subclassId?:'fiend';
 level3History?:WarlockLevelTwoHistory;
 level4History?:WarlockLevelThreeHistory;
 /** Dado de golpe de nivel 5, promedio 5 o una tirada de 1d8. */
 level5HitDieRoll?:number;
 level5History?:WarlockLevelFourHistory;
 /** Dado de golpe de nivel 6, promedio 5 o una tirada de 1d8. */
 level6HitDieRoll?:number;
 level6History?:WarlockLevelFiveHistory;
 /** Media de PG 5 o resultado de 1d8, conservado durante el descenso. */
 level7HitDieRoll?:number;
 level7History?:WarlockLevelSixHistory;
 /** Promedio 5 o resultado de 1d8 para los PG del nivel 8. */
 level8HitDieRoll?:number;
 /** Segunda Mejora de característica de Brujo; se aplica sobre los valores de nivel 7. */
 level8Improvement?:FighterAbilityImprovement;
 level8History?:WarlockLevelSevenHistory;
 /** Promedio 5 o resultado de 1d8 para los PG del nivel 9. */
 level9HitDieRoll?:number;
 level9History?:WarlockLevelEightHistory;
 /** Promedio 5 o tirada 1d8 del nivel 10. */
 level10HitDieRoll?:number;
 level10History?:WarlockLevelNineHistory;
 /** Nivel 11: primer Arcanum místico, siempre un conjuro de nivel 6 del Brujo. */
 mysticArcanum6Id?:typeof WARLOCK_SIXTH_LEVEL_IDS[number];
 /** Dado de golpe 1d8, 5 de promedio, del nivel 11. */
 level11HitDieRoll?:number;
 level11History?:WarlockLevelTenHistory;
 /** Nivel 12: tercera Mejora de característica y dado d8 elegido. */
 level12Improvement?:FighterAbilityImprovement;
 level12HitDieRoll?:number;
 level12History?:WarlockLevelElevenHistory;
 /** Dote de origen escogida mediante Lecciones de los Primeros (subconjunto implementado). */
 lessonsFeat?:'alert'|'tough';
 pactWeaponId?:WeaponId;
 tomeCantripIds?:readonly string[];
 tomeRitualIds?:readonly string[];
}>;
export type WarlockOneState=Readonly<{
 hitPointsCurrent:number;temporaryHitPoints:number;heroicInspiration:boolean;
 pactSlotSpent:boolean;
 secondPactSlotSpent?:boolean;
 /** Tercera ranura de Magia de Pacto, desde el nivel 11. */
 thirdPactSlotSpent?:boolean;
 magicalCunningUsed?:boolean;
 mageArmorActive:boolean;
 tomePresent:boolean;
 familiarForm:FamiliarForm|null;
 familiarName:string;
 /** Solo para Investidura del Señor de la Cadena, a partir de nivel 5. */
 familiarInvestmentMovement?:'fly'|'swim';
 /** Uso gratuito de Respirar bajo el agua concedido por Don de las profundidades. */
 giftOfDepthsUsed?:boolean;
 /** Usos consumidos de Suerte del Oscuro, recargados únicamente en descanso largo. */
 darkOnesOwnLuckUsed?:number;
 /** Contactar con el patrón: lanzamiento gratuito de un conjuro una vez por descanso largo. */
 contactPatronUsed?:boolean;
 /** Tipo de daño resistente hasta sustituirlo en otro descanso; Fuerza está excluido. */
 fiendishResilienceType?:WarlockFiendDamageType|null;
 /** Un descanso permite elegir o reemplazar la resistencia. */
 fiendishResiliencePending?:boolean;
 /** El Arcanum se lanza gratuitamente una vez por descanso largo. */
 mysticArcanum6Used?:boolean;
 manualDeathMarks?:Readonly<{successes:readonly [boolean,boolean,boolean];failures:readonly [boolean,boolean,boolean]}>;
}>;
export type CalculatedWarlockOne=Readonly<{
 level:1|2|3|4|5|6|7|8|9|10|11|12;name:string;abilityScores:AbilityScores;
 abilityModifiers:ReturnType<typeof abilityModifiers>;
 proficiencyBonus:2|3|4;skillBonuses:ReturnType<typeof calculateSkillBonuses>;
 savingThrowBonuses:ReturnType<typeof calculateSavingThrows>;
 skillProficiencies:readonly Skill[];
 maximumHitPoints:number;armorClass:number;armorDescription:string;initiative:number;
 speedFeet:number;size:'small'|'medium';spellAttackBonus:number;spellSaveDC:number;
 inventory:InventoryState;invocations:readonly WarlockInvocationId[];
}>;
const validSkill=(value:unknown):value is Skill=>typeof value==='string'&&(SKILLS as readonly string[]).includes(value);
const uniqueChoices=(list:readonly string[],allowed:readonly string[],count:number,label:string)=>{
 if(!Array.isArray(list)||list.length!==count||new Set(list).size!==count||list.some(id=>typeof id!=='string'||!allowed.includes(id)))throw new RangeError(label+': elige '+count+' opciones distintas del catálogo');
};
export function warlockInputForPreview(input:GuidedWarlockInput):GuidedWarlockInput{
 return input.name.trim()?input:{...input,name:'Brujo provisional'};
}
export function calculateWarlockOne(input:GuidedWarlockInput,state?:Pick<WarlockOneState,'mageArmorActive'>):CalculatedWarlockOne{
 if(!input||input.classId!=='warlock'||![1,2,3,4,5,6,7,8,9,10,11,12].includes(input.level))throw new RangeError('Solo se admite Brujo de niveles 1 a 12');
 if(typeof input.name!=='string'||!input.name.trim()||input.name.length>120)throw new RangeError('Introduce el nombre del Brujo');
 const bg=BACKGROUNDS[input.background];
 if(!bg||!Object.hasOwn(SPECIES_NAMES,input.species))throw new RangeError('Origen no disponible');
 const assigned=validateGeneratedAbilities(input.assignedAbilities,input.abilityGenerationMethod??'standard_array');
 if(input.companions!==undefined)validateCompanionSheets(input.companions);
 let scores={...assigned};const permitted=bg.abilities as readonly Ability[];
 if(input.increaseMode==='two_plus_one'){
  if(!permitted.includes(input.plusTwoAbility)||!permitted.includes(input.plusOneAbility)||input.plusOneAbility===input.plusTwoAbility)throw new RangeError('Dos características de trasfondo diferentes requeridas');
  scores[input.plusTwoAbility]+=2;scores[input.plusOneAbility]+=1;
 }else if(input.increaseMode==='three_ones'){
  for(const a of permitted)scores[a]+=1;
 }else throw new RangeError('Mejora de trasfondo desconocida');
 if(ABILITIES.some(a=>scores[a]>20))throw new RangeError('Las mejoras no pueden superar 20');
 if(input.level<4&&(input.level4Improvement!==undefined||input.level4HitDieRoll!==undefined||input.level4History!==undefined))throw new RangeError('Mejora e historial de nivel 4 antes de desbloquearlos');
 if(input.level>=4){
  scores=applyFighterAbilityImprovement(scores,input.level4Improvement!,4);
  if(input.level4HitDieRoll!==undefined&&(!Number.isInteger(input.level4HitDieRoll)||input.level4HitDieRoll<1||input.level4HitDieRoll>8))throw new RangeError('El dado de golpe del nivel 4 debe valer de 1 a 8');
 }
 if(input.level<5&&(input.level5HitDieRoll!==undefined||input.level5History!==undefined))throw new RangeError('Historial y dado de nivel 5 no disponibles todavía');
 if(input.level>=5&&input.level5HitDieRoll!==undefined&&(!Number.isInteger(input.level5HitDieRoll)||input.level5HitDieRoll<1||input.level5HitDieRoll>8))throw new RangeError('El dado de golpe del nivel 5 debe valer de 1 a 8');
 if(input.level<6&&(input.level6HitDieRoll!==undefined||input.level6History!==undefined))throw new RangeError('Historial y dado de nivel 6 no disponibles todavía');
 if(input.level>=6&&input.level6HitDieRoll!==undefined&&(!Number.isInteger(input.level6HitDieRoll)||input.level6HitDieRoll<1||input.level6HitDieRoll>8))throw new RangeError('El dado de golpe del nivel 6 debe valer de 1 a 8');
 if(input.level<7&&(input.level7HitDieRoll!==undefined||input.level7History!==undefined))throw new RangeError('Historial y dado de nivel 7 no disponibles todavía');
 if(input.level>=7&&input.level7HitDieRoll!==undefined&&(!Number.isInteger(input.level7HitDieRoll)||input.level7HitDieRoll<1||input.level7HitDieRoll>8))throw new RangeError('El dado de golpe del nivel 7 debe valer de 1 a 8');
 if(input.level<8&&(input.level8HitDieRoll!==undefined||input.level8Improvement!==undefined||input.level8History!==undefined))throw new RangeError('Mejora e historial del nivel 8 antes de desbloquearlos');
 if(input.level>=8){
  scores=applyFighterAbilityImprovement(scores,input.level8Improvement!,8);
  if(input.level8HitDieRoll!==undefined&&(!Number.isInteger(input.level8HitDieRoll)||input.level8HitDieRoll<1||input.level8HitDieRoll>8))throw new RangeError('El dado de golpe del nivel 8 debe valer de 1 a 8');
 }
 if(input.level<9&&(input.level9HitDieRoll!==undefined||input.level9History!==undefined))throw new RangeError('Historial y dado del nivel 9 antes de desbloquearlos');
 if(input.level>=9&&input.level9HitDieRoll!==undefined&&(!Number.isInteger(input.level9HitDieRoll)||input.level9HitDieRoll<1||input.level9HitDieRoll>8))throw new RangeError('El dado de golpe del nivel 9 debe valer de 1 a 8');
 if(input.level<10&&(input.level10HitDieRoll!==undefined||input.level10History!==undefined))throw new RangeError('Historial y dado del nivel 10 antes de desbloquearlos');
 if(input.level>=10&&input.level10HitDieRoll!==undefined&&(!Number.isInteger(input.level10HitDieRoll)||input.level10HitDieRoll<1||input.level10HitDieRoll>8))throw new RangeError('El dado de golpe del nivel 10 debe valer de 1 a 8');
 if(input.level<11&&(input.level11HitDieRoll!==undefined||input.level11History!==undefined||input.mysticArcanum6Id!==undefined))throw new RangeError('Arcanum y nivel 11 no disponibles todavía');
 if(input.level>=11&&(!input.mysticArcanum6Id||!(WARLOCK_SIXTH_LEVEL_IDS as readonly string[]).includes(input.mysticArcanum6Id)))throw new RangeError('El Arcanum místico debe ser un conjuro de nivel 6 del Brujo');
 if(input.level>=11&&input.level11HitDieRoll!==undefined&&(!Number.isInteger(input.level11HitDieRoll)||input.level11HitDieRoll<1||input.level11HitDieRoll>8))throw new RangeError('El dado de golpe del nivel 11 debe valer de 1 a 8');
 if(input.level<12&&(input.level12Improvement!==undefined||input.level12HitDieRoll!==undefined||input.level12History!==undefined))throw new RangeError('Mejora, dado e historial de nivel 12 antes de desbloquearlos');
 if(input.level>=12){
  scores=applyFighterAbilityImprovement(scores,input.level12Improvement!,12);
  if(input.level12HitDieRoll!==undefined&&(!Number.isInteger(input.level12HitDieRoll)||input.level12HitDieRoll<1||input.level12HitDieRoll>8))throw new RangeError('El dado de golpe del nivel 12 debe valer de 1 a 8');
 }
 if(!Array.isArray(input.warlockSkills)||input.warlockSkills.length!==2||new Set(input.warlockSkills).size!==2||
  input.warlockSkills.some(s=>!WARLOCK_SKILL_OPTIONS.includes(s)||(bg.skills as readonly string[]).includes(s)))
  throw new RangeError('Elige dos competencias distintas de Brujo no concedidas por el trasfondo');
 if(input.species==='human'){
  if(!validSkill(input.humanSkill)||[...bg.skills,...input.warlockSkills].includes(input.humanSkill as never)||!['alert','tough'].includes(input.humanFeat??'')||input.humanFeat===bg.feat)
   throw new RangeError('El humano necesita una competencia adicional no repetida y una dote de origen distinta');
  if(input.humanSize!==undefined&&!['small','medium'].includes(input.humanSize))throw new RangeError('Tamaño humano no válido');
 }else if(input.humanSkill!==undefined||input.humanFeat!==undefined||input.humanSize!==undefined)throw new RangeError('Opciones humanas en otra especie');
 if(input.species==='elf'){
  if(!['drow','high_elf','wood_elf'].includes(input.elfLineage??''))throw new RangeError('Selecciona linaje del elfo');
 }else if(input.elfLineage!==undefined)throw new RangeError('El linaje élfico no corresponde a esa especie');
 uniqueChoices(input.cantripIds,WARLOCK_LEVEL_ONE_CANTRIPS.map(s=>s.id),input.level>=10?4:input.level>=4?3:2,'Trucos de Brujo');
 uniqueChoices(input.preparedIds,(input.level>=9?WARLOCK_SPELLS_THROUGH_LEVEL_FIVE:input.level>=7?WARLOCK_SPELLS_THROUGH_LEVEL_FOUR:input.level>=5?WARLOCK_SPELLS_THROUGH_LEVEL_THREE:input.level>=3?WARLOCK_SPELLS_THROUGH_LEVEL_TWO:WARLOCK_LEVEL_ONE_SPELLS).map(s=>s.id),input.level===1?2:input.level===2?3:input.level===3?4:input.level===4?5:input.level===5?6:input.level===6?7:input.level===7?8:input.level===8?9:input.level>=11?11:10,'Conjuros preparados de Brujo');
 if(input.level>=9&&input.preparedIds.includes('contact_other_plane'))throw new RangeError('Contactar con otro plano ya está preparado automáticamente por Contactar con el patrón');
 uniqueChoices(input.invocations,Object.keys(WARLOCK_INVOCATIONS),input.level===1?1:input.level>=12?8:input.level>=9?7:input.level>=7?6:input.level>=5?5:3,'Invocaciones sobrenaturales');
 if(input.invocations.some(id=>WARLOCK_INVOCATIONS[id].minLevel>input.level))throw new RangeError('Invocación no disponible para este nivel');
 if(input.invocations.some(id=>WARLOCK_INVOCATION_PREREQUISITES[id]&&!input.invocations.includes(WARLOCK_INVOCATION_PREREQUISITES[id]!)))throw new RangeError('Una invocación requiere mantener su Pacto o la invocación previa necesaria');
 if(input.level===1&&input.level2HitDieRoll!==undefined)throw new RangeError('Dado de nivel 2 no disponible aún');
 if(input.level>=2&&input.level2HitDieRoll!==undefined&&(!Number.isInteger(input.level2HitDieRoll)||input.level2HitDieRoll<1||input.level2HitDieRoll>8))throw new RangeError('El dado adicional del Brujo debe valer de 1 a 8');
 if(input.level<3&&(input.level3HitDieRoll!==undefined||input.subclassId!==undefined||input.level3History!==undefined))throw new RangeError('El Patrón Infernal y el historial de nivel 3 no están disponibles antes del nivel 3');
 if(input.level>=3){
  if(input.subclassId!=='fiend')throw new RangeError('Selecciona el Patrón Infernal al alcanzar el nivel 3');
  const patronSpellIds:readonly string[]=input.level>=7?WARLOCK_FIEND_ALWAYS_PREPARED_IDS:input.level>=5?WARLOCK_FIEND_THROUGH_LEVEL_FIVE_IDS:WARLOCK_FIEND_LEVEL_THREE_IDS;
  if(input.preparedIds.some(id=>patronSpellIds.includes(id)))throw new RangeError('Los conjuros gratuitos del Patrón Infernal no ocupan preparaciones ordinarias');
  if(input.level3HitDieRoll!==undefined&&(!Number.isInteger(input.level3HitDieRoll)||input.level3HitDieRoll<1||input.level3HitDieRoll>8))throw new RangeError('El dado de golpe de nivel 3 debe valer de 1 a 8');
  const history=input.level3History;
  if(!history||typeof history!=='object'||Array.isArray(history)||Object.keys(history).some(k=>!['invocations','cantripIds','preparedIds','lessonsFeat','pactWeaponId','tomeCantripIds','tomeRitualIds','mageArmorActive','tomePresent','familiarForm','familiarName'].includes(k))||
   typeof history.mageArmorActive!=='boolean'||typeof history.tomePresent!=='boolean'||typeof history.familiarName!=='string'||(history.familiarForm!==null&&!(typeof history.familiarForm==='string'&&Object.hasOwn(WARLOCK_FAMILIARS,history.familiarForm))))throw new RangeError('Historial de nivel 2 no válido');
  calculateWarlockOne({...input,level:2,subclassId:undefined,level3HitDieRoll:undefined,level3History:undefined,
   level4HitDieRoll:undefined,level4Improvement:undefined,level4History:undefined,
   level5HitDieRoll:undefined,level5History:undefined,
   level6HitDieRoll:undefined,level6History:undefined,
   level7HitDieRoll:undefined,level7History:undefined,
   level8HitDieRoll:undefined,level8Improvement:undefined,level8History:undefined,level9HitDieRoll:undefined,level9History:undefined,level10HitDieRoll:undefined,level10History:undefined,level11HitDieRoll:undefined,level11History:undefined,mysticArcanum6Id:undefined,level12HitDieRoll:undefined,level12Improvement:undefined,level12History:undefined,
   invocations:history.invocations,cantripIds:history.cantripIds,preparedIds:history.preparedIds,
   lessonsFeat:history.lessonsFeat,pactWeaponId:history.pactWeaponId,tomeCantripIds:history.tomeCantripIds,tomeRitualIds:history.tomeRitualIds});
 }
 if(input.level===4){
  const history=input.level4History;
  if(!history||typeof history!=='object'||Array.isArray(history)||Object.keys(history).some(k=>!['invocations','cantripIds','preparedIds','lessonsFeat','pactWeaponId','tomeCantripIds','tomeRitualIds','mageArmorActive','tomePresent','familiarForm','familiarName'].includes(k))||
   typeof history.mageArmorActive!=='boolean'||typeof history.tomePresent!=='boolean'||typeof history.familiarName!=='string'||(history.familiarForm!==null&&!(typeof history.familiarForm==='string'&&Object.hasOwn(WARLOCK_FAMILIARS,history.familiarForm))))throw new RangeError('Historial de nivel 3 no válido');
  calculateWarlockOne({...input,level:3,level4HitDieRoll:undefined,level4Improvement:undefined,level4History:undefined,level9HitDieRoll:undefined,level9History:undefined,level10HitDieRoll:undefined,level10History:undefined,level11HitDieRoll:undefined,level11History:undefined,mysticArcanum6Id:undefined,level12HitDieRoll:undefined,level12Improvement:undefined,level12History:undefined,
   invocations:history.invocations,cantripIds:history.cantripIds,preparedIds:history.preparedIds,
   lessonsFeat:history.lessonsFeat,pactWeaponId:history.pactWeaponId,tomeCantripIds:history.tomeCantripIds,tomeRitualIds:history.tomeRitualIds});
 }
 if(input.level>=5){
  const history=input.level5History;
  if(!history||typeof history!=='object'||Array.isArray(history)||Object.keys(history).some(k=>!['invocations','cantripIds','preparedIds','lessonsFeat','pactWeaponId','tomeCantripIds','tomeRitualIds','mageArmorActive','tomePresent','familiarForm','familiarName'].includes(k))||
   typeof history.mageArmorActive!=='boolean'||typeof history.tomePresent!=='boolean'||typeof history.familiarName!=='string'||(history.familiarForm!==null&&!(typeof history.familiarForm==='string'&&Object.hasOwn(WARLOCK_FAMILIARS,history.familiarForm))))throw new RangeError('Historial de nivel 4 no válido');
  calculateWarlockOne({...input,level:4,level5HitDieRoll:undefined,level5History:undefined,level6HitDieRoll:undefined,level6History:undefined,level7HitDieRoll:undefined,level7History:undefined,level8HitDieRoll:undefined,level8Improvement:undefined,level8History:undefined,level9HitDieRoll:undefined,level9History:undefined,level10HitDieRoll:undefined,level10History:undefined,level11HitDieRoll:undefined,level11History:undefined,mysticArcanum6Id:undefined,level12HitDieRoll:undefined,level12Improvement:undefined,level12History:undefined,
   invocations:history.invocations,cantripIds:history.cantripIds,preparedIds:history.preparedIds,
   lessonsFeat:history.lessonsFeat,pactWeaponId:history.pactWeaponId,tomeCantripIds:history.tomeCantripIds,tomeRitualIds:history.tomeRitualIds});
 }
 if(input.level>=6){
  const history=input.level6History;
  if(!history||typeof history!=='object'||Array.isArray(history)||Object.keys(history).some(k=>!['invocations','cantripIds','preparedIds','lessonsFeat','pactWeaponId','tomeCantripIds','tomeRitualIds','mageArmorActive','tomePresent','familiarForm','familiarName','familiarInvestmentMovement','giftOfDepthsUsed'].includes(k))||
   (history.familiarInvestmentMovement!==undefined&&(!['fly','swim'].includes(history.familiarInvestmentMovement)||!history.invocations?.includes('investment_of_the_chain_master')))||
   (history.giftOfDepthsUsed!==undefined&&(typeof history.giftOfDepthsUsed!=='boolean'||!history.invocations?.includes('gift_of_the_depths')))||
   typeof history.mageArmorActive!=='boolean'||typeof history.tomePresent!=='boolean'||typeof history.familiarName!=='string'||(history.familiarForm!==null&&!(typeof history.familiarForm==='string'&&Object.hasOwn(WARLOCK_FAMILIARS,history.familiarForm))))throw new RangeError('Historial de nivel 5 no válido');
  calculateWarlockOne({...input,level:5,level6HitDieRoll:undefined,level6History:undefined,level7HitDieRoll:undefined,level7History:undefined,level8HitDieRoll:undefined,level8Improvement:undefined,level8History:undefined,level9HitDieRoll:undefined,level9History:undefined,level10HitDieRoll:undefined,level10History:undefined,level11HitDieRoll:undefined,level11History:undefined,mysticArcanum6Id:undefined,level12HitDieRoll:undefined,level12Improvement:undefined,level12History:undefined,
   invocations:history.invocations,cantripIds:history.cantripIds,preparedIds:history.preparedIds,
   lessonsFeat:history.lessonsFeat,pactWeaponId:history.pactWeaponId,tomeCantripIds:history.tomeCantripIds,tomeRitualIds:history.tomeRitualIds});
 }
 if(input.level>=7){
  const history=input.level7History;
  if(!history||typeof history!=='object'||Array.isArray(history)||Object.keys(history).some(k=>!['invocations','cantripIds','preparedIds','lessonsFeat','pactWeaponId','tomeCantripIds','tomeRitualIds','mageArmorActive','tomePresent','familiarForm','familiarName','familiarInvestmentMovement','giftOfDepthsUsed','darkOnesOwnLuckUsed'].includes(k))||
   (history.familiarInvestmentMovement!==undefined&&(!['fly','swim'].includes(history.familiarInvestmentMovement)||!history.invocations?.includes('investment_of_the_chain_master')))||
   (history.giftOfDepthsUsed!==undefined&&(typeof history.giftOfDepthsUsed!=='boolean'||!history.invocations?.includes('gift_of_the_depths')))||
   (history.darkOnesOwnLuckUsed!==undefined&&(!Number.isInteger(history.darkOnesOwnLuckUsed)||history.darkOnesOwnLuckUsed<0))||
   typeof history.mageArmorActive!=='boolean'||typeof history.tomePresent!=='boolean'||typeof history.familiarName!=='string'||(history.familiarForm!==null&&!(typeof history.familiarForm==='string'&&Object.hasOwn(WARLOCK_FAMILIARS,history.familiarForm))))throw new RangeError('Historial de nivel 6 no válido');
  calculateWarlockOne({...input,level:6,level7HitDieRoll:undefined,level7History:undefined,level8HitDieRoll:undefined,level8Improvement:undefined,level8History:undefined,level9HitDieRoll:undefined,level9History:undefined,level10HitDieRoll:undefined,level10History:undefined,level11HitDieRoll:undefined,level11History:undefined,mysticArcanum6Id:undefined,level12HitDieRoll:undefined,level12Improvement:undefined,level12History:undefined,
   invocations:history.invocations,cantripIds:history.cantripIds,preparedIds:history.preparedIds,
   lessonsFeat:history.lessonsFeat,pactWeaponId:history.pactWeaponId,tomeCantripIds:history.tomeCantripIds,tomeRitualIds:history.tomeRitualIds});
 }
 if(input.level>=8){
  const history=input.level8History;
  if(!history||typeof history!=='object'||Array.isArray(history)||Object.keys(history).some(k=>!['invocations','cantripIds','preparedIds','lessonsFeat','pactWeaponId','tomeCantripIds','tomeRitualIds','mageArmorActive','tomePresent','familiarForm','familiarName','familiarInvestmentMovement','giftOfDepthsUsed','darkOnesOwnLuckUsed'].includes(k))||
   (history.familiarInvestmentMovement!==undefined&&(!['fly','swim'].includes(history.familiarInvestmentMovement)||!history.invocations?.includes('investment_of_the_chain_master')))||
   (history.giftOfDepthsUsed!==undefined&&(typeof history.giftOfDepthsUsed!=='boolean'||!history.invocations?.includes('gift_of_the_depths')))||
   (history.darkOnesOwnLuckUsed!==undefined&&(!Number.isInteger(history.darkOnesOwnLuckUsed)||history.darkOnesOwnLuckUsed<0))||
   typeof history.mageArmorActive!=='boolean'||typeof history.tomePresent!=='boolean'||typeof history.familiarName!=='string'||(history.familiarForm!==null&&!(typeof history.familiarForm==='string'&&Object.hasOwn(WARLOCK_FAMILIARS,history.familiarForm))))throw new RangeError('Historial de nivel 7 no válido');
  calculateWarlockOne({...input,level:7,level8HitDieRoll:undefined,level8Improvement:undefined,level8History:undefined,level9HitDieRoll:undefined,level9History:undefined,level10HitDieRoll:undefined,level10History:undefined,level11HitDieRoll:undefined,level11History:undefined,mysticArcanum6Id:undefined,level12HitDieRoll:undefined,level12Improvement:undefined,level12History:undefined,
   invocations:history.invocations,cantripIds:history.cantripIds,preparedIds:history.preparedIds,
   lessonsFeat:history.lessonsFeat,pactWeaponId:history.pactWeaponId,tomeCantripIds:history.tomeCantripIds,tomeRitualIds:history.tomeRitualIds});
 }
 if(input.level>=9){
  const history=input.level9History;
  if(!history||typeof history!=='object'||Array.isArray(history)||Object.keys(history).some(k=>!['invocations','cantripIds','preparedIds','lessonsFeat','pactWeaponId','tomeCantripIds','tomeRitualIds','mageArmorActive','tomePresent','familiarForm','familiarName','familiarInvestmentMovement','giftOfDepthsUsed','darkOnesOwnLuckUsed'].includes(k))||
   typeof history.mageArmorActive!=='boolean'||typeof history.tomePresent!=='boolean'||typeof history.familiarName!=='string'||
   (history.darkOnesOwnLuckUsed!==undefined&&(!Number.isInteger(history.darkOnesOwnLuckUsed)||history.darkOnesOwnLuckUsed<0)))throw new RangeError('Historial de nivel 8 no válido');
  calculateWarlockOne({...input,level:8,level9HitDieRoll:undefined,level9History:undefined,level10HitDieRoll:undefined,level10History:undefined,level11HitDieRoll:undefined,level11History:undefined,mysticArcanum6Id:undefined,level12HitDieRoll:undefined,level12Improvement:undefined,level12History:undefined,
   invocations:history.invocations,cantripIds:history.cantripIds,preparedIds:history.preparedIds,
   lessonsFeat:history.lessonsFeat,pactWeaponId:history.pactWeaponId,tomeCantripIds:history.tomeCantripIds,tomeRitualIds:history.tomeRitualIds});
 }
 if(input.level>=10){
  const history=input.level10History;
  if(!history||typeof history!=='object'||Array.isArray(history)||Object.keys(history).some(k=>!['invocations','cantripIds','preparedIds','lessonsFeat','pactWeaponId','tomeCantripIds','tomeRitualIds','mageArmorActive','tomePresent','familiarForm','familiarName','familiarInvestmentMovement','giftOfDepthsUsed','darkOnesOwnLuckUsed'].includes(k))||
   typeof history.mageArmorActive!=='boolean'||typeof history.tomePresent!=='boolean'||typeof history.familiarName!=='string'||
   (history.darkOnesOwnLuckUsed!==undefined&&(!Number.isInteger(history.darkOnesOwnLuckUsed)||history.darkOnesOwnLuckUsed<0)))throw new RangeError('Historial de nivel 9 no válido');
  calculateWarlockOne({...input,level:9,level10HitDieRoll:undefined,level10History:undefined,level11HitDieRoll:undefined,level11History:undefined,mysticArcanum6Id:undefined,level12HitDieRoll:undefined,level12Improvement:undefined,level12History:undefined,
   invocations:history.invocations,cantripIds:history.cantripIds,preparedIds:history.preparedIds,
   lessonsFeat:history.lessonsFeat,pactWeaponId:history.pactWeaponId,tomeCantripIds:history.tomeCantripIds,tomeRitualIds:history.tomeRitualIds});
 }
 if(input.level>=11){
  const history=input.level11History;
  if(!history||typeof history!=='object'||Array.isArray(history)||Object.keys(history).some(k=>!['invocations','cantripIds','preparedIds','lessonsFeat','pactWeaponId','tomeCantripIds','tomeRitualIds','mageArmorActive','tomePresent','familiarForm','familiarName','familiarInvestmentMovement','giftOfDepthsUsed','darkOnesOwnLuckUsed','fiendishResilienceType','fiendishResiliencePending'].includes(k))||
   typeof history.mageArmorActive!=='boolean'||typeof history.tomePresent!=='boolean'||typeof history.familiarName!=='string'||
   (history.fiendishResilienceType!==undefined&&history.fiendishResilienceType!==null&&!Object.hasOwn(WARLOCK_FIEND_DAMAGE_TYPES,history.fiendishResilienceType))||
   (history.fiendishResiliencePending!==undefined&&typeof history.fiendishResiliencePending!=='boolean'))throw new RangeError('Historial de nivel 10 no válido');
  calculateWarlockOne({...input,level:10,level11HitDieRoll:undefined,level11History:undefined,mysticArcanum6Id:undefined,level12HitDieRoll:undefined,level12Improvement:undefined,level12History:undefined,
   invocations:history.invocations,cantripIds:history.cantripIds,preparedIds:history.preparedIds,
   lessonsFeat:history.lessonsFeat,pactWeaponId:history.pactWeaponId,tomeCantripIds:history.tomeCantripIds,tomeRitualIds:history.tomeRitualIds});
 }
 if(input.level===12){
  const history=input.level12History;
  const permittedHistory=['invocations','cantripIds','preparedIds','lessonsFeat','pactWeaponId','tomeCantripIds','tomeRitualIds','mageArmorActive','tomePresent','familiarForm','familiarName','familiarInvestmentMovement','giftOfDepthsUsed','darkOnesOwnLuckUsed','fiendishResilienceType','fiendishResiliencePending','mysticArcanum6Id'];
  if(!history||typeof history!=='object'||Array.isArray(history)||Object.keys(history).some(k=>!permittedHistory.includes(k))||
   typeof history.mageArmorActive!=='boolean'||typeof history.tomePresent!=='boolean'||typeof history.familiarName!=='string'||
   (history.familiarForm!==null&&!(typeof history.familiarForm==='string'&&Object.hasOwn(WARLOCK_FAMILIARS,history.familiarForm)))||
   !(WARLOCK_SIXTH_LEVEL_IDS as readonly string[]).includes(history.mysticArcanum6Id)||
   (history.fiendishResilienceType!==undefined&&history.fiendishResilienceType!==null&&!Object.hasOwn(WARLOCK_FIEND_DAMAGE_TYPES,history.fiendishResilienceType))||
   (history.fiendishResiliencePending!==undefined&&typeof history.fiendishResiliencePending!=='boolean'))throw new RangeError('Historial de nivel 11 no válido');
  calculateWarlockOne({...input,level:11,level12HitDieRoll:undefined,level12Improvement:undefined,level12History:undefined,
   invocations:history.invocations,cantripIds:history.cantripIds,preparedIds:history.preparedIds,mysticArcanum6Id:history.mysticArcanum6Id,
   lessonsFeat:history.lessonsFeat,pactWeaponId:history.pactWeaponId,tomeCantripIds:history.tomeCantripIds,tomeRitualIds:history.tomeRitualIds});
 }
 if(input.invocations.includes('lessons_of_the_first_ones')){
  if(!input.lessonsFeat||!['alert','tough'].includes(input.lessonsFeat)||input.lessonsFeat===bg.feat||input.lessonsFeat===input.humanFeat)
   throw new RangeError('Lecciones de los Primeros necesita una dote de origen válida y no repetida (Alerta o Duro)');
 }else if(input.lessonsFeat!==undefined)throw new RangeError('Dote de Lecciones sin invocación correspondiente');
 const pactBlade=input.invocations.includes('pact_of_blade');
 const pactTome=input.invocations.includes('pact_of_tome');
 if(!pactBlade&&input.pactWeaponId!==undefined)throw new RangeError('Arma de pacto sin invocación de Hoja');
 if(pactBlade&&input.pactWeaponId!==undefined&&
  (!Object.hasOwn(WEAPONS,input.pactWeaponId)||WEAPON_STATS[input.pactWeaponId].kind!=='melee'))throw new RangeError('El arma de pacto debe ser cuerpo a cuerpo');
 if(!pactTome&&(input.tomeCantripIds!==undefined||input.tomeRitualIds!==undefined))throw new RangeError('Elecciones del Tomo sin su invocación');
 if(pactTome){
  uniqueChoices(input.tomeCantripIds??[],TOME_CANTRIP_OPTIONS.map(s=>s.id),3,'Trucos del Tomo');
  uniqueChoices(input.tomeRitualIds??[],TOME_RITUAL_OPTIONS.map(s=>s.id),2,'Rituales del Tomo');
  if(input.tomeCantripIds!.some(id=>input.cantripIds.includes(id))||input.tomeRitualIds!.some(id=>input.preparedIds.includes(id)))throw new RangeError('El Tomo debe conceder conjuros no preparados ya');
 }
 const inventory=warlockInventory(input);
 const trained=[...new Set<Skill>([...bg.skills as readonly Skill[],...input.warlockSkills,...(input.species==='human'?[input.humanSkill!]:[])])];
 const mods=abilityModifiers(scores);
 const armor=equippedArmor(inventory);
 const mageArmor=Boolean(state?.mageArmorActive)&&input.invocations.includes('armor_of_shadows')&&armor===null;
 const ac=calculateArmorClass({strengthScore:scores.strength,dexterityScore:scores.dexterity,armor,
  shieldEquipped:inventory.equipped.shield,shieldTrained:false,
  ...(mageArmor?{alternateFormula:{id:'warlock-mage-armor',base:13,addDexterity:true,dexterityCap:null}}:{})});
 const hp=8+mods.constitution+(input.level>=2?Math.max(1,(input.level2HitDieRoll??5)+mods.constitution):0)+
  (input.level>=3?Math.max(1,(input.level3HitDieRoll??5)+mods.constitution):0)+
  (input.level>=4?Math.max(1,(input.level4HitDieRoll??5)+mods.constitution):0)+
  (input.level>=5?Math.max(1,(input.level5HitDieRoll??5)+mods.constitution):0)+
  (input.level>=6?Math.max(1,(input.level6HitDieRoll??5)+mods.constitution):0)+
  (input.level>=7?Math.max(1,(input.level7HitDieRoll??5)+mods.constitution):0)+
  (input.level>=8?Math.max(1,(input.level8HitDieRoll??5)+mods.constitution):0)+
  (input.level>=9?Math.max(1,(input.level9HitDieRoll??5)+mods.constitution):0)+
  (input.level>=10?Math.max(1,(input.level10HitDieRoll??5)+mods.constitution):0)+
  (input.level>=11?Math.max(1,(input.level11HitDieRoll??5)+mods.constitution):0)+
  (input.level>=12?Math.max(1,(input.level12HitDieRoll??5)+mods.constitution):0)+
  (input.species==='dwarf'?input.level:0)+(input.humanFeat==='tough'||input.lessonsFeat==='tough'?2*input.level:0);
 const proficiency=input.level>=9?4:input.level>=5?3:2;
 return {
  level:input.level,name:input.name.trim(),abilityScores:scores,abilityModifiers:mods,proficiencyBonus:proficiency,
  skillBonuses:calculateSkillBonuses(scores,input.level,{skills:trained}),skillProficiencies:trained,
  savingThrowBonuses:calculateSavingThrows(scores,input.level,{savingThrows:['wisdom','charisma']}),
  maximumHitPoints:hp,armorClass:ac.value,armorDescription:mageArmor?'Armadura de mago activa (13 + DES)':armor?'Armadura equipada':'Sin armadura (10 + DES)',
  initiative:mods.dexterity+((bg.feat==='alert'||input.humanFeat==='alert'||input.lessonsFeat==='alert')?proficiency:0),
  speedFeet:input.species==='elf'&&input.elfLineage==='wood_elf'?35:30,
  size:input.species==='halfling'||input.species==='human'&&input.humanSize==='small'?'small':'medium',
  spellAttackBonus:mods.charisma+proficiency,spellSaveDC:8+mods.charisma+proficiency,inventory,invocations:input.invocations
 };
}
/** Solo aplica Carisma si el arma seleccionada como pacto está equipada y la invocación existe. */
export function warlockWeaponProfile(id:WeaponId,inventory:InventoryState,scores:AbilityScores,proficiency:number,
 invocations:readonly WarlockInvocationId[],pactWeaponId?:WeaponId,useCharisma=true){
 if(!inventory.equipped.weapons.includes(id))throw new RangeError('El arma no está equipada');
 const stats=WEAPON_STATS[id];const mods=abilityModifiers(scores);
 const pactActive=invocations.includes('pact_of_blade')&&id===pactWeaponId&&stats.kind==='melee';
 const ordinaryAbility=stats.kind==='ranged'||stats.finesse&&mods.dexterity>mods.strength?'dexterity':'strength';
 const ability=pactActive&&useCharisma?'charisma':ordinaryAbility;
 const trained=pactActive||SIMPLE_WEAPONS.has(id);
 return {weaponId:id,pactActive,ability,trained,attackBonus:mods[ability]+(trained?proficiency:0),damageBonus:mods[ability],damageDice:stats.dice,fixedDamage:stats.fixedDamage??0};
}
/** Número de ataques de la acción Atacar con un arma; nunca beneficia a otras armas. */
export function warlockPactWeaponAttackCount(pactActive:boolean,invocations:readonly WarlockInvocationId[]):1|2|3{
 if(!pactActive||!invocations.includes('thirsting_blade'))return 1;
 return invocations.includes('devouring_blade')?3:2;
}
export function initialWarlockOneState(input:GuidedWarlockInput):WarlockOneState{
 const sheet=calculateWarlockOne(input);
 return {hitPointsCurrent:sheet.maximumHitPoints,temporaryHitPoints:0,heroicInspiration:input.species==='human',
  pactSlotSpent:false,...(input.level>=2?{secondPactSlotSpent:false,magicalCunningUsed:false}:{}),
  mageArmorActive:false,tomePresent:false,familiarForm:null,familiarName:'',...(input.level>=6?{darkOnesOwnLuckUsed:0}:{}),...(input.level>=9?{contactPatronUsed:false}:{}),...(input.level>=10?{fiendishResilienceType:null,fiendishResiliencePending:false}:{}),...(input.level>=11?{thirdPactSlotSpent:false,mysticArcanum6Used:false}:{})};
}
/** Magia de Pacto: 1 ranura al nivel 1; 2 ranuras en 2–10, 3 en 11. */
export function warlockPactSlots(state:WarlockOneState,level:GuidedWarlockInput['level']):readonly boolean[]{
 return level===1?[state.pactSlotSpent]:level>=11?[state.pactSlotSpent,state.secondPactSlotSpent??false,state.thirdPactSlotSpent??false]:[state.pactSlotSpent,state.secondPactSlotSpent??false];
}
export function toggleWarlockPactSlot(state:WarlockOneState,level:GuidedWarlockInput['level'],index:number):WarlockOneState{
 if(!Number.isInteger(index)||index<0||index>=(level===1?1:level>=11?3:2))throw new RangeError('Ranura de pacto inexistente');
 return index===0?{...state,pactSlotSpent:!state.pactSlotSpent}:index===1?{...state,secondPactSlotSpent:!state.secondPactSlotSpent}:{...state,thirdPactSlotSpent:!state.thirdPactSlotSpent};
}
/** Astucia mágica: recupera hasta la mitad de las ranuras máximas redondeada arriba
 * (1 ranura en niveles 2–10, 2 ranuras desde 11), una vez por descanso largo.
 */
export function warlockMagicalCunning(state:WarlockOneState,level:GuidedWarlockInput['level']):WarlockOneState{
 if(level<2)throw new RangeError('Astucia mágica se desbloquea en nivel 2');
 if(state.magicalCunningUsed)throw new RangeError('Astucia mágica ya usada; necesitas un descanso largo');
 const indices=warlockPactSlots(state,level).flatMap((spent,index)=>spent?[index]:[]).slice(0,Math.ceil(warlockPactSlots(state,level).length/2));
 if(indices.length===0)throw new RangeError('No tienes ninguna ranura de pacto gastada');
 return {...state,magicalCunningUsed:true,...(indices.includes(0)?{pactSlotSpent:false}:{}),...(indices.includes(1)?{secondPactSlotSpent:false}:{}),...(indices.includes(2)?{thirdPactSlotSpent:false}:{})};
}
/** Activación explícita del primer Arcanum, sin gastar ranuras de Pacto. */
export function spendWarlockMysticArcanum6(input:GuidedWarlockInput,state:WarlockOneState):WarlockOneState{
 if(input.level<11||!input.mysticArcanum6Id)throw new RangeError('Arcanum místico no disponible');
 if(state.mysticArcanum6Used)throw new RangeError('Arcanum místico agotado hasta un descanso largo');
 return {...state,mysticArcanum6Used:true};
}
/** Solo se invoca después de que el jugador confirme el desencadenante. */
export function warlockDarkOnesBlessing(input:GuidedWarlockInput,state:WarlockOneState):WarlockOneState{
 if(input.level<3||input.subclassId!=='fiend')throw new RangeError('Bendición del Oscuro requiere Patrón Infernal de nivel 3');
 const amount=Math.max(1,calculateWarlockOne(input,state).abilityModifiers.charisma+input.level);
 return {...state,temporaryHitPoints:Math.max(state.temporaryHitPoints,amount)};
}
export function warlockDarkOnesOwnLuckMaximum(input:GuidedWarlockInput):number{
 if(input.level<6||input.subclassId!=='fiend')return 0;
 return Math.max(1,calculateWarlockOne(input).abilityModifiers.charisma);
}
/** El jugador activa este recurso tras ver el d20 y antes de resolver sus efectos. */
export function spendWarlockDarkOnesOwnLuck(input:GuidedWarlockInput,state:WarlockOneState):WarlockOneState{
 const maximum=warlockDarkOnesOwnLuckMaximum(input);
 if(maximum===0)throw new RangeError('Suerte del Oscuro no está disponible antes de nivel 6');
 const used=state.darkOnesOwnLuckUsed??0;
 if(used>=maximum)throw new RangeError('Suerte del Oscuro agotada hasta el descanso largo');
 return {...state,darkOnesOwnLuckUsed:used+1};
}
/** Contacto con el patrón: la conversación y el éxito de la salvación se resuelven en mesa. */
export function spendWarlockContactPatron(input:GuidedWarlockInput,state:WarlockOneState):WarlockOneState{
 if(input.level<9)throw new RangeError('Contactar con el patrón se desbloquea al nivel 9');
 if(state.contactPatronUsed)throw new RangeError('Ya has usado Contactar con el patrón sin ranura: descansa largo');
 return {...state,contactPatronUsed:true};
}
/** La resistencia no cambia sin finalizar descanso. El usuario decide cuándo termina y qué tipo escoger. */
export function chooseWarlockFiendishResilience(input:GuidedWarlockInput,state:WarlockOneState,damageType:WarlockFiendDamageType):WarlockOneState{
 if(input.level<10||input.subclassId!=='fiend')throw new RangeError('Resistencia infernal se desbloquea a nivel 10 del Patrón Infernal');
 if(!state.fiendishResiliencePending)throw new RangeError('Debes completar un descanso corto o largo antes de elegir resistencia');
 if(!Object.hasOwn(WARLOCK_FIEND_DAMAGE_TYPES,damageType))throw new RangeError('Tipo de daño no válido; Fuerza no está permitido');
 return {...state,fiendishResilienceType:damageType,fiendishResiliencePending:false};
}
/** Las ranuras se recuperan tras un descanso corto, pero no Astucia mágica. */
export function warlockShortRest(state:WarlockOneState):WarlockOneState{
 return {...state,pactSlotSpent:false,...(state.secondPactSlotSpent!==undefined?{secondPactSlotSpent:false}:{}),...(state.thirdPactSlotSpent!==undefined?{thirdPactSlotSpent:false}:{}),...(state.fiendishResiliencePending!==undefined?{fiendishResiliencePending:true}:{})};
}
/** El descanso largo no invoca familiares ni libros por sí solo. */
export function warlockLongRest(state:WarlockOneState,maximumHitPoints:number,isHuman:boolean):WarlockOneState{
 if(!Number.isInteger(maximumHitPoints)||maximumHitPoints<1)throw new RangeError('Máximo de PG inválido');
 return {...state,pactSlotSpent:false,...(state.secondPactSlotSpent!==undefined?{secondPactSlotSpent:false}:{}),...(state.thirdPactSlotSpent!==undefined?{thirdPactSlotSpent:false}:{}),
  ...(state.magicalCunningUsed!==undefined?{magicalCunningUsed:false}:{}),hitPointsCurrent:maximumHitPoints,temporaryHitPoints:0,
  mageArmorActive:false,...(state.giftOfDepthsUsed!==undefined?{giftOfDepthsUsed:false}:{}),
  ...(state.darkOnesOwnLuckUsed!==undefined?{darkOnesOwnLuckUsed:0}:{}),
  ...(state.contactPatronUsed!==undefined?{contactPatronUsed:false}:{}),...(state.fiendishResiliencePending!==undefined?{fiendishResiliencePending:true}:{}),...(state.mysticArcanum6Used!==undefined?{mysticArcanum6Used:false}:{}),...(isHuman?{heroicInspiration:true}:{})};
}
export function validateWarlockOneState(raw:unknown,input:GuidedWarlockInput,sheet:CalculatedWarlockOne):WarlockOneState{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new RangeError('Estado del Brujo inválido');
 const state=raw as Record<string,unknown>;
 if(Object.keys(state).some(k=>!['hitPointsCurrent','temporaryHitPoints','heroicInspiration','pactSlotSpent','secondPactSlotSpent','thirdPactSlotSpent','magicalCunningUsed','mageArmorActive','tomePresent','familiarForm','familiarName','familiarInvestmentMovement','giftOfDepthsUsed','darkOnesOwnLuckUsed','contactPatronUsed','fiendishResilienceType','fiendishResiliencePending','mysticArcanum6Used','manualDeathMarks'].includes(k)))throw new RangeError('Estado del Brujo con campos desconocidos');
 if(!Number.isInteger(state.hitPointsCurrent)||(state.hitPointsCurrent as number)<0||(state.hitPointsCurrent as number)>sheet.maximumHitPoints||
  !Number.isInteger(state.temporaryHitPoints)||(state.temporaryHitPoints as number)<0||(state.temporaryHitPoints as number)>10000)throw new RangeError('Puntos de golpe del Brujo inválidos');
 for(const k of ['heroicInspiration','pactSlotSpent','mageArmorActive','tomePresent']){
  if(typeof state[k]!=='boolean')throw new RangeError('Estado booleano inválido: '+k);
 }
 if(input.level===1&&(state.secondPactSlotSpent!==undefined||state.magicalCunningUsed!==undefined))throw new RangeError('Recursos de nivel 2 no disponibles');
 if(input.level>=2&&(state.secondPactSlotSpent!==undefined&&typeof state.secondPactSlotSpent!=='boolean'||state.magicalCunningUsed!==undefined&&typeof state.magicalCunningUsed!=='boolean'))throw new RangeError('Recursos de nivel 2 inválidos');
 if(input.level<11&&(state.thirdPactSlotSpent!==undefined||state.mysticArcanum6Used!==undefined))throw new RangeError('Ranura tercera y Arcanum no disponibles antes del nivel 11');
 if(input.level>=11&&((state.thirdPactSlotSpent!==undefined&&typeof state.thirdPactSlotSpent!=='boolean')||(state.mysticArcanum6Used!==undefined&&typeof state.mysticArcanum6Used!=='boolean')))throw new RangeError('Estado de tercera ranura o Arcanum inválido');
 if(state.mageArmorActive&&!input.invocations.includes('armor_of_shadows'))throw new RangeError('Armadura de sombras no disponible');
 if(state.tomePresent&&!input.invocations.includes('pact_of_tome'))throw new RangeError('Tomo no disponible');
 if(state.familiarForm!==null&&(!input.invocations.includes('pact_of_chain')||typeof state.familiarForm!=='string'||!Object.hasOwn(WARLOCK_FAMILIARS,state.familiarForm)))throw new RangeError('Familiar no disponible');
 if(typeof state.familiarName!=='string'||state.familiarName.length>120)throw new RangeError('Nombre del familiar inválido');
 if(!input.invocations.includes('pact_of_chain')&&state.familiarName)throw new RangeError('Nombre de familiar sin pacto');
 if(state.familiarInvestmentMovement!==undefined&&(input.level<5||!input.invocations.includes('investment_of_the_chain_master')||!['fly','swim'].includes(state.familiarInvestmentMovement as string)))throw new RangeError('Movimiento de familiar investido no válido');
 if(state.giftOfDepthsUsed!==undefined&&(input.level<5||!input.invocations.includes('gift_of_the_depths')||typeof state.giftOfDepthsUsed!=='boolean'))throw new RangeError('Uso de Don de las profundidades no válido');
 if(state.darkOnesOwnLuckUsed!==undefined&&(input.level<6||!Number.isInteger(state.darkOnesOwnLuckUsed)||(state.darkOnesOwnLuckUsed as number)<0||(state.darkOnesOwnLuckUsed as number)>Math.max(1,sheet.abilityModifiers.charisma)))throw new RangeError('Usos de Suerte del Oscuro inválidos');
 if(state.contactPatronUsed!==undefined&&(input.level<9||typeof state.contactPatronUsed!=='boolean'))throw new RangeError('Uso de Contactar con el patrón inválido');
 if(input.level<10&&(state.fiendishResilienceType!==undefined||state.fiendishResiliencePending!==undefined))throw new RangeError('Resistencia infernal antes del nivel 10');
 if(input.level>=10&&((state.fiendishResilienceType!==undefined&&state.fiendishResilienceType!==null&&!(typeof state.fiendishResilienceType==='string'&&Object.hasOwn(WARLOCK_FIEND_DAMAGE_TYPES,state.fiendishResilienceType)))||(state.fiendishResiliencePending!==undefined&&typeof state.fiendishResiliencePending!=='boolean')))throw new RangeError('Tipo o elección de Resistencia infernal inválido');
 if(state.manualDeathMarks!==undefined){
  const marks=state.manualDeathMarks as WarlockOneState['manualDeathMarks'];
  if(!marks||!['successes','failures'].every(kind=>Array.isArray(marks[kind as 'successes'|'failures'])&&marks[kind as 'successes'|'failures'].length===3&&marks[kind as 'successes'|'failures'].every(mark=>typeof mark==='boolean')))
   throw new RangeError('Marcadores de salvación de muerte del Brujo inválidos');
 }
 return {hitPointsCurrent:state.hitPointsCurrent as number,temporaryHitPoints:state.temporaryHitPoints as number,
  heroicInspiration:state.heroicInspiration as boolean,pactSlotSpent:state.pactSlotSpent as boolean,
  ...(input.level>=2?{secondPactSlotSpent:state.secondPactSlotSpent===true,magicalCunningUsed:state.magicalCunningUsed===true}:{}),
  ...(input.level>=11?{thirdPactSlotSpent:state.thirdPactSlotSpent===true,mysticArcanum6Used:state.mysticArcanum6Used===true}:{}),
  mageArmorActive:state.mageArmorActive as boolean,tomePresent:state.tomePresent as boolean,
  familiarForm:state.familiarForm as FamiliarForm|null,familiarName:state.familiarName as string,
  ...(state.familiarInvestmentMovement!==undefined?{familiarInvestmentMovement:state.familiarInvestmentMovement as 'fly'|'swim'}:{}),
  ...(state.giftOfDepthsUsed!==undefined?{giftOfDepthsUsed:state.giftOfDepthsUsed as boolean}:{}),
  ...(input.level>=6?{darkOnesOwnLuckUsed:(state.darkOnesOwnLuckUsed??0) as number}:{}),
  ...(input.level>=9?{contactPatronUsed:(state.contactPatronUsed??false) as boolean}:{}),
  ...(input.level>=10?{fiendishResilienceType:(state.fiendishResilienceType??null) as WarlockFiendDamageType|null,fiendishResiliencePending:(state.fiendishResiliencePending??false) as boolean}:{}),
  ...(state.manualDeathMarks!==undefined?{manualDeathMarks:state.manualDeathMarks as NonNullable<WarlockOneState['manualDeathMarks']>}:{})};
}
export type WarlockCharacterSnapshot=Readonly<{
 schemaVersion:4;ruleset:'dnd-2024';input:GuidedWarlockInput;warlockState:WarlockOneState;
}>;
export function validateWarlockCharacterSnapshot(raw:unknown):WarlockCharacterSnapshot{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new RangeError('Guardado de Brujo inválido');
 const value=raw as Record<string,unknown>;
 if(value.schemaVersion!==4||value.ruleset!=='dnd-2024'||Object.keys(value).some(k=>!['schemaVersion','ruleset','input','warlockState'].includes(k)))throw new RangeError('Versión o estructura del Brujo no compatible');
const allowed=['companions','abilityGenerationMethod','classId','level','name','profile','background','species','assignedAbilities','increaseMode','plusTwoAbility','plusOneAbility','warlockSkills','humanSkill','humanFeat','humanSize','elfLineage','equipmentChoice','backgroundEquipment','inventoryActions','cantripIds','preparedIds','invocations','pactWeaponId','tomeCantripIds','tomeRitualIds','level2HitDieRoll','level3HitDieRoll','level4HitDieRoll','level4Improvement','level4History','level5HitDieRoll','level5History','level6HitDieRoll','level6History','level7HitDieRoll','level7History','level8HitDieRoll','level8Improvement','level8History','level9HitDieRoll','level9History','level10HitDieRoll','level10History','mysticArcanum6Id','level11HitDieRoll','level11History','level12Improvement','level12HitDieRoll','level12History','subclassId','level3History','lessonsFeat'];
 if(!value.input||typeof value.input!=='object'||Array.isArray(value.input)||Object.keys(value.input as Record<string,unknown>).some(k=>!allowed.includes(k)))throw new RangeError('Elecciones de Brujo con campos desconocidos');
 let input:GuidedWarlockInput;
 try{const json=JSON.stringify(value.input);if(json.length>120000)throw new Error();input=JSON.parse(json) as GuidedWarlockInput;}catch{throw new RangeError('Elecciones de Brujo demasiado grandes');}
 if(input.profile!==undefined)input={...input,profile:validateCharacterProfile(input.profile)};
 const sheet=calculateWarlockOne(input);
 const state=validateWarlockOneState(value.warlockState,input,sheet);
 return {schemaVersion:4,ruleset:'dnd-2024',input,warlockState:state};
}
export function makeWarlockCharacterSnapshot(input:GuidedWarlockInput,state?:WarlockOneState):WarlockCharacterSnapshot{
 return validateWarlockCharacterSnapshot({schemaVersion:4,ruleset:'dnd-2024',input:{...input,profile:validateCharacterProfile(input.profile??EMPTY_CHARACTER_PROFILE)},warlockState:state??initialWarlockOneState(input)});
}
