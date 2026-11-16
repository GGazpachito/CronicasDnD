/** Actualización 40. Proyección de LECTURA de rasgos. No aplica efectos ni altera la partida.
 * Los IDs de clase/subclase proceden exclusivamente de sheet.features; especie y
 * dotes proceden del origen validado por calculateGuidedFighter.
 * Las descripciones son resúmenes originales de apoyo, no texto del manual.
 */
import { BACKGROUNDS, SPECIES_NAMES, type GuidedFighterInput, type GuidedFighterResult } from './guided';
import { FIGHTING_STYLES, WEAPONS } from './martial';
import { ORIGIN_FEATS, TOOL_NAMES, type ToolId } from './origin-feats';
import { EPIC_BOONS } from './epic-boons';
import type { Ability } from './abilities';
import {explainFighterFeature,FIGHTING_STYLE_EXPLANATIONS,MASTERY_EXPLANATIONS,EPIC_BOON_EXPLANATIONS,ORIGIN_FEAT_EXPLANATIONS,SPECIES_TRAIT_EXPLANATIONS} from './rules-explanations';

export type TraitGroup = 'class' | 'subclass' | 'species' | 'feats';
export type TraitAutomation = 'calculated' | 'partial' | 'manual';
export type CharacterTrait = Readonly<{
  id: string;
  title: string;
  group: TraitGroup;
  source: string;
  level?: number;
  summary: string;
  /** Explicación funcional para la vista y para el asistente; nunca aplica reglas. */
  explanation?: string;
  automation: TraitAutomation;
  details: readonly string[];
}>;
export type TraitCollection = Readonly<{
  traits: readonly CharacterTrait[];
  pendingAutomation: readonly string[];
}>;

type CatalogEntry = Readonly<{title:string;summary:string;automation:TraitAutomation;level:number}>;

const FIGHTER_FEATURES: Readonly<Record<string, CatalogEntry>> = {
  fighting_style:{title:'Estilo de combate',summary:'Especialización marcial elegida para el Guerrero.',automation:'partial',level:1},
  second_wind:{title:'Segundo aliento',summary:'Recurso para recuperar puntos de golpe durante la partida.',automation:'partial',level:1},
  weapon_mastery:{title:'Maestría con armas',summary:'Propiedades especiales de las armas en las que tienes maestría.',automation:'partial',level:1},
  action_surge:{title:'Acción súbita',summary:'Recurso que permite una acción adicional en el turno.',automation:'partial',level:2},
  tactical_mind:{title:'Mente táctica',summary:'Apoyo para determinadas pruebas de característica fallidas al usar Segundo aliento.',automation:'partial',level:2},
  ability_score_improvement:{title:'Mejora de característica',summary:'Mejora de puntuaciones de característica elegida al subir de nivel.',automation:'calculated',level:4},
  extra_attack:{title:'Ataque adicional',summary:'Puedes realizar dos ataques al usar la acción Atacar.',automation:'partial',level:5},
  tactical_shift:{title:'Desplazamiento táctico',summary:'Posibilidad de desplazarte al usar Segundo aliento bajo las condiciones de la regla.',automation:'manual',level:5},
  ability_score_improvement_level_6:{title:'Mejora de característica',summary:'Nueva mejora de puntuaciones de característica.',automation:'calculated',level:6},
  ability_score_improvement_level_8:{title:'Mejora de característica',summary:'Nueva mejora de puntuaciones de característica.',automation:'calculated',level:8},
  indomitable:{title:'Indomable',summary:'Repetición de ciertas tiradas de salvación fallidas, consumiendo un uso.',automation:'partial',level:9},
  tactical_master:{title:'Dominio táctico',summary:'Opciones adicionales de maestría al realizar ataques con armas.',automation:'partial',level:9},
  two_extra_attacks:{title:'Dos ataques adicionales',summary:'Tres ataques en total al realizar la acción Atacar.',automation:'partial',level:11},
  ability_score_improvement_level_12:{title:'Mejora de característica',summary:'Nueva mejora de puntuaciones de característica.',automation:'calculated',level:12},
  studied_attacks:{title:'Ataques estudiados',summary:'Ventaja en ciertas oportunidades de atacar a un objetivo después de fallarle.',automation:'partial',level:13},
  ability_score_improvement_level_14:{title:'Mejora de característica',summary:'Nueva mejora de puntuaciones de característica.',automation:'calculated',level:14},
  ability_score_improvement_level_16:{title:'Mejora de característica',summary:'Nueva mejora de puntuaciones de característica.',automation:'calculated',level:16},
  weapon_mastery_sixth:{title:'Sexta maestría',summary:'Aumenta a seis las armas elegidas para maestría.',automation:'calculated',level:16},
  action_surge_two_uses:{title:'Acción súbita mejorada',summary:'Aumenta la cantidad de usos disponibles de Acción súbita.',automation:'calculated',level:17},
  indomitable_three_uses:{title:'Indomable mejorado',summary:'El máximo de usos de Indomable llega a tres.',automation:'calculated',level:17},
  epic_boon:{title:'Acceso a beneficio épico',summary:'Obtienes una elección de beneficio épico al alcanzar este nivel.',automation:'calculated',level:19},
  three_extra_attacks:{title:'Tres ataques adicionales',summary:'Cuatro ataques en total al realizar la acción Atacar.',automation:'partial',level:20},
};

const CHAMPION_FEATURES: Readonly<Record<string, CatalogEntry>> = {
  champion_improved_critical:{title:'Crítico mejorado',summary:'Tu intervalo de golpe crítico con armas se amplía a 19–20.',automation:'calculated',level:3},
  champion_remarkable_athlete:{title:'Atleta extraordinario',summary:'Tienes ventaja en iniciativa y Atletismo; el motor aplica ambos modos de tirada.',automation:'calculated',level:3},
  champion_additional_fighting_style:{title:'Estilo de combate adicional',summary:'Eliges un segundo estilo de combate distinto del primero.',automation:'partial',level:7},
  champion_heroic_warrior:{title:'Guerrero heroico',summary:'Puedes obtener Inspiración heroica al comenzar tu turno si no la tienes.',automation:'partial',level:10},
  champion_superior_critical:{title:'Crítico superior',summary:'Tu intervalo de golpe crítico con armas se amplía a 18–20.',automation:'calculated',level:15},
  champion_survivor:{title:'Superviviente',summary:'Mejora las salvaciones de muerte y permite recuperar PG bajo condiciones concretas al empezar el turno.',automation:'partial',level:18},
};

const ABILITY_NAMES: Readonly<Record<Ability,string>>={
  strength:'Fuerza',dexterity:'Destreza',constitution:'Constitución',
  intelligence:'Inteligencia',wisdom:'Sabiduría',charisma:'Carisma',
};

const SKILL_NAMES: Readonly<Record<string,string>>={
  acrobatics:'Acrobacias',animal_handling:'Trato con animales',arcana:'Arcanos',athletics:'Atletismo',
  deception:'Engaño',history:'Historia',insight:'Perspicacia',intimidation:'Intimidación',
  investigation:'Investigación',medicine:'Medicina',nature:'Naturaleza',perception:'Percepción',
  performance:'Interpretación',persuasion:'Persuasión',religion:'Religión',
  sleight_of_hand:'Juego de manos',stealth:'Sigilo',survival:'Supervivencia',
};

function labelSkill(skill: string | undefined): string {
  return skill ? SKILL_NAMES[skill] ?? skill.replaceAll('_',' ') : 'sin elección';
}
function labelTool(tool: string):string {
  return TOOL_NAMES[tool as ToolId] ?? tool.replaceAll('_',' ');
}
function abilityImprovement(input: GuidedFighterInput, level:number):string[] {
  const byLevel: Partial<Record<number, GuidedFighterInput['level4Improvement']>> = {
    4:input.level4Improvement,6:input.level6Improvement,8:input.level8Improvement,
    12:input.level12Improvement,14:input.level14Improvement,16:input.level16Improvement,
  };
  const choice=byLevel[level];
  if(!choice) return ['Elección todavía no registrada.'];
  return [choice.mode==='plus_two'
    ? `${ABILITY_NAMES[choice.first]} +2 (incluido en la puntuación final).`
    : `${ABILITY_NAMES[choice.first]} +1 y ${ABILITY_NAMES[choice.second!]} +1 (incluidos en las puntuaciones finales).`];
}

function featureDetails(id:string,input:GuidedFighterInput,result:GuidedFighterResult):string[] {
  const sheet=result.sheet;
  const martial=result.martial;
  switch(id){
    case 'fighting_style':return martial ? [`Estilo elegido: ${FIGHTING_STYLES[martial.choices.fightingStyle]}.`, FIGHTING_STYLE_EXPLANATIONS[martial.choices.fightingStyle], 'El efecto se incorpora a los módulos correspondientes cuando están implementados; el resto se resuelve en la mesa.'] : ['Todavía no hay un estilo validado.'];
    case 'champion_additional_fighting_style':return martial?.choices.additionalFightingStyle ? [`Segundo estilo: ${FIGHTING_STYLES[martial.choices.additionalFightingStyle]}.`, FIGHTING_STYLE_EXPLANATIONS[martial.choices.additionalFightingStyle]] : ['Todavía no hay segundo estilo registrado.'];
    case 'weapon_mastery':
    case 'weapon_mastery_sixth':return martial?.choices.weaponMasteries?.length
      ? martial.choices.weaponMasteries.map(weapon=>`${WEAPONS[weapon].name} (${WEAPONS[weapon].mastery}): ${MASTERY_EXPLANATIONS[WEAPONS[weapon].mastery]}`)
      : ['No hay armas con maestría seleccionadas.'];
    case 'second_wind':
    case 'action_surge':
    case 'indomitable':return sheet.resources[id] ? [`Usos máximos registrados: ${sheet.resources[id]?.maximum}.`, 'Para gastar o recuperar usos, utiliza los controles de Principal o las herramientas existentes.'] : ['Recurso registrado en la progresión del Guerrero.'];
    case 'action_surge_two_uses':return [`Usos máximos de Acción súbita: ${sheet.resources.action_surge?.maximum ?? 0}.`];
    case 'indomitable_three_uses':return [`Usos máximos de Indomable: ${sheet.resources.indomitable?.maximum ?? 0}.`];
    case 'champion_remarkable_athlete':return [`Iniciativa: ${sheet.initiativeRollMode === 'advantage' ? 'ventaja' : sheet.initiativeRollMode}.`, `Atletismo: ${sheet.skillRollModes.athletics === 'advantage' ? 'ventaja' : sheet.skillRollModes.athletics}.`];
    case 'champion_survivor':return ['La recuperación condicional de PG y las salvaciones de muerte mejoradas dependen de la sesión; consulta el panel de partida para registrar sus resultados.'];
    case 'champion_heroic_warrior':return ['La inspiración se registra en la sesión compartida con Principal y el panel de turnos.'];
    case 'extra_attack':return ['Esta capacidad no realiza ataques automáticamente: el jugador decide cuándo utilizar la acción Atacar.'];
    case 'two_extra_attacks':return ['Este rasgo sustituye el número anterior de ataques por acción Atacar; no añade tres ataques encima de los dos anteriores.'];
    case 'three_extra_attacks':return ['Este rasgo establece cuatro ataques por acción Atacar; no se acumula con los escalones anteriores.'];
    case 'epic_boon':return input.epicBoon ? [`Elección: ${EPIC_BOONS[input.epicBoon.id]}. La ficha concreta figura en «Dotes y origen».`] : ['Todavía no hay beneficio épico elegido.'];
    default: {
      const level=FIGHTER_FEATURES[id]?.level;
      return level && [4,6,8,12,14,16].includes(level) && id.startsWith('ability_score_improvement')
        ? abilityImprovement(input,level) : [];
    }
  }
}

function classTraits(input:GuidedFighterInput,result:GuidedFighterResult):CharacterTrait[]{
  const seen=new Set<string>();
  return result.sheet.features.flatMap(id=>{
    if(seen.has(id) || id.startsWith('epic_boon_'))return [];
    seen.add(id);
    const group:TraitGroup=id.startsWith('champion_')?'subclass':'class';
    const known=group==='subclass'?CHAMPION_FEATURES[id]:FIGHTER_FEATURES[id];
    return [{
      id:`feature:${id}`,title:known?.title ?? id.replaceAll('_',' '),group,
      source:group==='subclass'?'Campeón':'Guerrero',
      ...(known?{level:known.level}:{}),
      summary:known?.summary ?? 'Rasgo registrado en la hoja; su descripción todavía no está catalogada.',
      explanation:explainFighterFeature(id),
      automation:known?.automation ?? 'manual',
      details:featureDetails(id,input,result),
    } satisfies CharacterTrait];
  }).sort((a,b)=>(a.level??100)-(b.level??100));
}

function speciesTraits(input:GuidedFighterInput,result:GuidedFighterResult):CharacterTrait[]{
  const traits:CharacterTrait[]=[];
  const add=(id:string,title:string,summary:string,automation:TraitAutomation,details:string[]=[])=>traits.push({
    id:`species:${id}`,title,group:'species',source:SPECIES_NAMES[input.species],
    summary,explanation:SPECIES_TRAIT_EXPLANATIONS[id],automation,details,
  });
  if(input.species==='human'){
    add('resourceful','Ingenioso','Puedes obtener Inspiración heroica al completar un descanso largo.','manual',['Esta concesión automática por descanso aún no está integrada.']);
    add('skillful','Hábil','Obtienes competencia en una habilidad elegida al crear el personaje.','calculated',[`Habilidad elegida: ${labelSkill(input.humanSkill)}. El bonificador ya la incorpora.`]);
    add('versatile','Versátil','Obtienes una dote de origen adicional.','calculated',[`Dote elegida: ${input.humanFeat ? ORIGIN_FEATS[input.humanFeat] : 'sin registrar'}. Se describe en «Dotes y origen».`]);
  } else if(input.species==='dwarf'){
    add('dwarven_toughness','Resistencia enana','Aumentan tus puntos de golpe máximos según el nivel.','calculated',[`Bonificación aplicada: +${result.sheet.level} PG máximos (1 por nivel).`]);
    add('darkvision','Visión en la oscuridad','Capacidad de visión especial concedida por la especie.','manual',['El uso de la visión y las condiciones de iluminación se resuelven con el director de juego.']);
    add('dwarven_resilience','Resiliencia enana','Ventaja en determinadas salvaciones relacionadas con el envenenamiento.','manual',['El motor no detecta automáticamente esta situación.']);
    add('stonecunning','Sentido de la piedra','Capacidad de percepción especial relacionada con la piedra.','manual',['Su activación y contexto se resuelven en la mesa.']);
  } else if(input.species==='halfling'){
    add('halfling_brave','Valentía','Ventaja situacional frente al estado Asustado.','manual',[
      'Ventaja al salvarte para evitar o terminar Asustado. Activa la ventaja en Principal cuando corresponda.',
    ]);
    add('halfling_nimbleness','Agilidad de mediano','Puedes atravesar el espacio de una criatura de mayor tamaño.','manual',[
      'No puedes terminar tu movimiento ocupando el mismo espacio que otra criatura.',
    ]);
    add('halfling_luck','Suerte de mediano','Puedes repetir un 1 natural en una prueba de d20.','manual',[
      'Puedes repetir el d20 que muestre un 1 y debes aceptar el nuevo resultado. La decisión y repetición aún se gestionan manualmente.',
    ]);
    add('halfling_naturally_stealthy','Sigilo natural','Puedes intentar esconderte detrás de una criatura de mayor tamaño.','manual',[
      'Permite usar la acción Esconderse cuando únicamente te oculta una criatura al menos un tamaño mayor.',
    ]);
  } else {
    add('darkvision','Visión en la oscuridad','Capacidad de visión especial concedida por la especie.','manual');
    add('fey_ancestry','Ascendencia feérica','Resistencias o ventajas situacionales ligadas al linaje feérico.','manual',['Los efectos situacionales no se aplican automáticamente.']);
    add('trance','Trance','Forma especial de descanso de los elfos.','manual',['La duración y sus consecuencias se gestionan fuera de esta pantalla.']);
    add('keen_senses','Sentidos agudos','Competencia en una habilidad de percepción o intuición elegida.','calculated',[`Habilidad elegida: ${labelSkill(input.elfSenseSkill)}. El bonificador ya incluye la competencia.`]);
    const lineage=input.elfLineage;
    const lineageName=lineage==='wood_elf'?'Elfo de los bosques':lineage==='high_elf'?'Alto elfo':'Drow';
    const lineageSpells=result.spells.filter(spell=>spell.source==='elf_lineage');
    add('lineage',lineageName,'Rasgos propios del linaje, incluidos los conjuros concedidos por nivel.','partial',[
      ...(lineage==='wood_elf'?[`Velocidad calculada: ${result.origin.speedFeet} pies.`]:[]),
      `Conjuros de linaje registrados: ${lineageSpells.length}.`,
      'El lanzamiento de conjuros y sus usos gratuitos aún no están automatizados.',
    ]);
  }
  return traits;
}

function featTrait(id:string,source:string,origin:'background'|'human_feat',result:GuidedFighterResult,input:GuidedFighterInput):CharacterTrait {
  const human=id==='magic_initiate';
  const magic=id==='magic_initiate_cleric'||id==='magic_initiate_wizard'||human;
  const title=(id==='magic_initiate_cleric'?'Iniciado en la Magia (Clérigo)':id==='magic_initiate_wizard'?'Iniciado en la Magia (Mago)':ORIGIN_FEATS[id as keyof typeof ORIGIN_FEATS]) ?? id;
  const details:string[]=[];
  let automation:TraitAutomation='manual';
  let summary='Dote de origen elegida al crear el personaje.';
  if(id==='alert'){
    automation='partial';summary='Bonificación de iniciativa y opciones situacionales de orden de turnos.';
    details.push(`Competencia +${result.sheet.proficiencyBonus} a iniciativa incorporada en el total calculado.`);
  } else if(id==='tough'){
    automation='calculated';summary='Aumenta los puntos de golpe máximos del personaje.';
    details.push(`Bonificación aplicada: +${2*result.sheet.level} PG máximos (2 por nivel).`);
  } else if(id==='skilled'){
    automation='calculated';summary='Tres competencias adicionales elegidas entre habilidades y herramientas.';
    details.push(...(input.humanFeatDetails?.skilledProficiencies??[]).map(value=>value.startsWith('skill:')?`Habilidad: ${labelSkill(value.slice(6))}.`:`Herramienta: ${labelTool(value.slice(5))}.`));
  } else if(magic){
    automation='partial';summary='Conjuros de origen registrados para consulta y uso manual.';
    const spells=result.spells.filter(spell=>spell.source===origin);
    details.push(...spells.map(spell=>`${spell.name} · ${spell.level===0?'truco':'nivel '+spell.level}.`));
    details.push('La aplicación no resuelve todavía el lanzamiento ni consume usos de estos conjuros.');
  } else if(id==='lucky'){
    automation='partial';summary='Puntos de suerte disponibles según la progresión del personaje.';
    details.push(`Máximo registrado: ${result.origin.luckPointsMaximum ?? 0}. Gastos y recuperación pendientes.`);
  } else if(id==='crafter'){
    automation='partial';summary='Competencias artesanales y beneficios de fabricación o comercio.';
    details.push(...(input.humanFeatDetails?.crafterTools??[]).map(tool=>`Herramienta: ${labelTool(tool)}.`));
    details.push('Descuentos y fabricación rápida todavía no automatizados.');
  } else if(id==='musician'){
    automation='partial';summary='Instrumentos elegidos y capacidad de conceder inspiración a aliados.';
    details.push(...(input.humanFeatDetails?.musicianInstruments??[]).map(tool=>`Instrumento: ${labelTool(tool)}.`));
    details.push('La inspiración de aliados debe registrarse manualmente.');
  } else if(id==='savage_attacker'){
    summary='Permite una elección especial de dados de daño en determinadas condiciones.';
    details.push('Su repetición de dados todavía no se resuelve automáticamente en el panel de ataques.');
  } else if(id==='healer'){
    summary='Apoyo a la curación mediante botiquines y otros beneficios de sanación.';
    details.push('La activación, el consumo y las repeticiones de dados se resuelven manualmente.');
  } else if(id==='tavern_brawler'){
    summary='Opciones especiales para combate sin armas e improvisación.';
    details.push('Los efectos específicos todavía no se automatizan.');
  }
  return {id:`feat:${origin}:${id}`,title,group:'feats',source,summary,explanation:ORIGIN_FEAT_EXPLANATIONS[id],automation,details};
}

function featTraits(input:GuidedFighterInput,result:GuidedFighterResult):CharacterTrait[]{
  const background=BACKGROUNDS[result.origin.background];
  const feats:CharacterTrait[]=[featTrait(background.feat,`Trasfondo: ${background.name}`,'background',result,input)];
  if(result.origin.additionalFeat)feats.push(featTrait(result.origin.additionalFeat,'Dote adicional humana','human_feat',result,input));
  if(input.level>=19&&input.epicBoon){
    const boon=input.epicBoon;
    const specs:Record<string,{summary:string;automation:TraitAutomation;details:string[]}>= {
      combat_prowess:{summary:'Puedes convertir un fallo de ataque elegible en un impacto, con límite por turno.',automation:'partial',details:['El uso se registra al confirmar el ataque desde el panel existente.']},
      fortitude:{summary:'Aumenta la vida máxima y puede mejorar una curación bajo condiciones concretas.',automation:'partial',details:['+40 PG máximos calculados. La mejora de curación requiere activación explícita.']},
      speed:{summary:'Aumenta la velocidad y concede una opción de desplazamiento adicional.',automation:'partial',details:[`Velocidad total calculada: ${result.origin.speedFeet} pies.`, 'La acción adicional se resuelve manualmente.']},
    };
    const spec=specs[boon.id];
    feats.push({id:`feat:epic:${boon.id}`,title:EPIC_BOONS[boon.id],group:'feats',source:'Guerrero · nivel 19',level:19,
      summary:spec.summary,explanation:EPIC_BOON_EXPLANATIONS[boon.id],automation:spec.automation,
      details:[`Mejora de ${ABILITY_NAMES[boon.ability]} +1 incluida en la puntuación final.`,...spec.details]});
  }
  return feats;
}

export function collectCharacterTraits(input:GuidedFighterInput,result:GuidedFighterResult):TraitCollection {
  return {
    traits:[...classTraits(input,result),...speciesTraits(input,result),...featTraits(input,result)],
    pendingAutomation:[...result.pendingAutomation],
  };
}
