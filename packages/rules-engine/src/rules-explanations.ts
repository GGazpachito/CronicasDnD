/** Actualización 44.1. Resúmenes originales y breves de reglas, compartidos por
 * el asistente y Rasgos. Referencias: PHB 2024 pp. 91-92, 96, 200-202, 209-211 y 214.
 * Contenido informativo: NO modifica el cálculo ni ejecuta efectos activos.
 */
import type {FightingStyleId,MasteryId} from './martial';
import type {EpicBoonId} from './epic-boons';

export const FIGHTER_FEATURE_EXPLANATIONS:Readonly<Record<string,string>>={
  fighting_style:'Eliges una especialidad de combate que concede un beneficio concreto, por ejemplo a la defensa, el tiro con arco o la lucha con dos armas. Consulta el estilo elegido más abajo.',
  second_wind:'Como acción adicional, recuperas 1d10 + tu nivel de Guerrero en puntos de golpe. Recuperas un uso tras un descanso corto y todos los usos tras uno largo.',
  weapon_mastery:'Puedes usar la propiedad de maestría de las armas seleccionadas. Cada propiedad produce un efecto distinto al atacar; puedes cambiar una elección al completar un descanso largo.',
  action_surge:'En tu turno puedes realizar una acción adicional, excepto la acción Magia. Se recupera con un descanso corto o largo.',
  tactical_mind:'Si fallas una prueba de característica, puedes tirar 1d10 y añadirlo al resultado gastando Segundo aliento. Si aun así fallas, conservas ese uso.',
  ability_score_improvement:'Puedes aumentar una característica en 2 puntos o dos características distintas en 1 punto cada una, sin superar 20. El asistente solo ofrece esta dote general por ahora.',
  extra_attack:'Cuando realizas la acción Atacar en tu turno, puedes hacer dos ataques en lugar de uno.',
  tactical_shift:'Cuando activas Segundo aliento como acción adicional, puedes moverte hasta la mitad de tu velocidad sin provocar ataques de oportunidad.',
  indomitable:'Tras fallar una tirada de salvación, puedes repetirla y sumar tu nivel de Guerrero al resultado nuevo. Debes utilizar la nueva tirada; recuperas los usos al descansar largo.',
  tactical_master:'Al atacar con un arma cuya maestría conoces, puedes usar Empujar (Push), Debilitar (Sap) o Ralentizar (Slow) en lugar de su propiedad habitual para ese ataque.',
  two_extra_attacks:'Al realizar la acción Atacar, haces tres ataques en total. Sustituye la versión anterior de Ataque adicional, no se suma a ella.',
  studied_attacks:'Si fallas un ataque contra una criatura, tienes ventaja en el siguiente ataque contra esa misma criatura antes de que termine tu próximo turno.',
  weapon_mastery_sixth:'Conoces la maestría de seis armas distintas en total; la nueva selección amplía las que ya tenías.',
  action_surge_two_uses:'Puedes utilizar Acción súbita dos veces entre descansos cortos o largos, pero como máximo una vez por turno.',
  indomitable_three_uses:'Dispones de tres usos de Indomable entre descansos largos; cada uso permite repetir una salvación fallida con el bono de nivel de Guerrero.',
  epic_boon:'Seleccionas una dote épica entre las disponibles en el proyecto. Cada una concede una mejora de característica y una capacidad adicional.',
  three_extra_attacks:'Al realizar la acción Atacar, haces cuatro ataques en total. No se acumula con los aumentos anteriores.',
  champion_improved_critical:'Tus ataques con armas y golpes sin armas consiguen un crítico con un 19 o un 20 natural en el d20.',
  champion_remarkable_athlete:'Tienes ventaja en iniciativa y en pruebas de Fuerza (Atletismo). Tras conseguir un crítico, puedes moverte hasta la mitad de tu velocidad sin provocar ataques de oportunidad.',
  champion_additional_fighting_style:'Obtienes un segundo estilo de combate, distinto del primero; ambos beneficios se mantienen.',
  champion_heroic_warrior:'Durante el combate, al comenzar tu turno sin Inspiración heroica puedes obtenerla. No necesitas gastarla al activarse este rasgo.',
  champion_superior_critical:'Tus ataques con armas y golpes sin armas consiguen un crítico con un 18, 19 o 20 natural en el d20.',
  champion_survivor:'Tienes ventaja en salvaciones de muerte y un 18–20 en el d20 cuenta como un 20. Al comenzar tu turno con al menos 1 PG y la mitad o menos de tus PG máximos, recuperas 5 + tu modificador de Constitución.',
};

export function explainFighterFeature(id:string):string|undefined{
  if(id.startsWith('ability_score_improvement_level_'))return FIGHTER_FEATURE_EXPLANATIONS.ability_score_improvement;
  return FIGHTER_FEATURE_EXPLANATIONS[id];
}

export const FIGHTING_STYLE_EXPLANATIONS:Readonly<Record<FightingStyleId,string>>={
  archery:'Obtienes +2 a las tiradas de ataque que realizas con armas a distancia.',
  blind_fighting:'Tienes visión ciega en un radio de 10 pies, útil para detectar criaturas sin depender de la vista normal.',
  defense:'Mientras llevas armadura ligera, media o pesada, obtienes +1 a la clase de armadura.',
  dueling:'Al usar un arma cuerpo a cuerpo en una mano y ninguna otra arma, obtienes +2 al daño con esa arma.',
  great_weapon_fighting:'Con un arma cuerpo a cuerpo a dos manos que tenga la propiedad A dos manos o Versátil, los resultados de 1 o 2 de sus dados de daño cuentan como 3.',
  interception:'Como reacción, reduces en 1d10 + competencia el daño que un ataque causa a otra criatura cercana, si llevas escudo o arma apropiada.',
  protection:'Como reacción, al proteger con tu escudo a una criatura cercana impones desventaja a los ataques del agresor contra ella mientras se mantengan las condiciones.',
  thrown_weapon_fighting:'Al impactar con un ataque a distancia usando un arma Arrojadiza, sumas +2 al daño.',
  two_weapon_fighting:'Puedes sumar el modificador de característica al daño del ataque adicional concedido por la propiedad Ligera si no lo estabas sumando.',
  unarmed_fighting:'Los golpes sin armas infligen 1d6 de daño, o 1d8 si no llevas armas ni escudo. También puedes dañar a una criatura a la que tengas agarrada al inicio de tu turno.',
};

export const MASTERY_EXPLANATIONS:Readonly<Record<MasteryId,string>>={
  Cleave:'Al impactar cuerpo a cuerpo puedes atacar a una segunda criatura cercana al objetivo; el daño del segundo impacto normalmente no añade tu modificador de característica.',
  Graze:'Si fallas el ataque, causas daño igual al modificador de característica utilizado para atacar, del mismo tipo que el arma.',
  Nick:'El ataque adicional de la propiedad Ligera puede hacerse como parte de la acción Atacar, en vez de gastar tu acción adicional (una vez por turno).',
  Push:'Al impactar puedes empujar al objetivo hasta 10 pies en línea recta si su tamaño es Grande o menor.',
  Sap:'Al impactar impones desventaja en el siguiente ataque del objetivo antes del inicio de tu próximo turno.',
  Slow:'Al impactar y causar daño reduces en 10 pies la velocidad del objetivo hasta el comienzo de tu siguiente turno; no se acumula por múltiples impactos.',
  Topple:'Al impactar, el objetivo debe superar una salvación de Constitución o queda derribado. La CD es 8 + modificador del ataque + competencia.',
  Vex:'Al impactar y causar daño obtienes ventaja en tu siguiente ataque contra ese objetivo antes del final de tu próximo turno.',
};

export const EPIC_BOON_EXPLANATIONS:Readonly<Record<EpicBoonId,string>>={
  combat_prowess:'Aumentas una característica en 1 (máximo 30). Cuando fallas una tirada de ataque puedes convertirla en un impacto; vuelves a disponer de este beneficio al comienzo de tu próximo turno.',
  fortitude:'Aumentas una característica en 1 (máximo 30) y tus PG máximos en 40. Al recuperar PG puedes sumar también tu modificador de Constitución, una vez por turno.',
  speed:'Aumentas una característica en 1 (máximo 30) y tu velocidad en 30 pies. Puedes usar Destrabarse como acción adicional y terminar el estado Agarrado.',
};

export const ORIGIN_FEAT_EXPLANATIONS:Readonly<Record<string,string>>={
  alert:'Sumas competencia a la iniciativa. Justo después de tirar iniciativa puedes intercambiar tu resultado con el de un aliado voluntario elegible.',
  crafter:'Obtienes competencia con tres herramientas de artesano, descuentos del 20 % al comprar objetos no mágicos y la posibilidad de fabricar equipo sencillo tras un descanso largo.',
  healer:'Usando un botiquín puedes permitir que una criatura gaste un dado de golpe para curarse y añadir tu competencia. Además, puedes repetir un 1 en dados de curación aplicables.',
  lucky:'Tienes tantos puntos de suerte como tu bonificador de competencia; los recuperas tras un descanso largo. Puedes gastarlos para obtener ventaja en tus pruebas de d20 o imponer desventaja a un ataque contra ti.',
  magic_initiate:'Aprendes dos trucos y preparas un conjuro de nivel 1 de la lista elegida. El conjuro se puede lanzar una vez sin espacio por descanso largo, además de con espacios disponibles.',
  magic_initiate_cleric:'Aprendes dos trucos y preparas un conjuro de nivel 1 de Clérigo. Puedes lanzarlo una vez sin espacio por descanso largo, además de usar los espacios que tengas.',
  magic_initiate_wizard:'Aprendes dos trucos y preparas un conjuro de nivel 1 de Mago. Puedes lanzarlo una vez sin espacio por descanso largo, además de usar los espacios que tengas.',
  musician:'Obtienes competencia con tres instrumentos y puedes conceder Inspiración heroica a varios aliados al terminar un descanso tocando un instrumento.',
  savage_attacker:'Una vez por turno, al impactar con un arma, puedes tirar dos veces sus dados de daño y escoger cuál de los dos resultados usar.',
  skilled:'Obtienes tres competencias a elegir entre habilidades y herramientas. Se aplican a las tiradas correspondientes.',
  tavern_brawler:'Mejoras los golpes sin armas, puedes repetir sus dados de daño si sacas 1, dominas armas improvisadas y puedes empujar una vez por turno al golpear sin armas.',
  tough:'Tus PG máximos aumentan en 2 por cada nivel de personaje, incluidos los niveles que ganes después.',
};

export const SPECIES_TRAIT_EXPLANATIONS:Readonly<Record<string,string>>={
  resourceful:'Al completar un descanso largo obtienes Inspiración heroica.',
  skillful:'Obtienes competencia en una habilidad a tu elección.',
  versatile:'Eliges una dote de origen adicional a nivel 1.',
  dwarven_toughness:'Aumentas tu máximo de PG en 1 por nivel de personaje.',
  darkvision:'Puedes ver en la oscuridad dentro del alcance que concede tu especie. Sin luz distingues tonos de gris, no colores.',
  dwarven_resilience:'Tienes resistencia al daño de veneno y ventaja en salvaciones para evitar o terminar el estado Envenenado.',
  stonecunning:'Puedes adquirir sentido de vibraciones durante un tiempo limitado sobre superficies de piedra; depende de la activación del rasgo.',
  fey_ancestry:'Tienes ventaja en salvaciones para evitar o terminar el estado Hechizado.',
  trance:'Tu descanso especial de elfo sustituye el sueño normal por una meditación de cuatro horas.',
  keen_senses:'Obtienes competencia en Perspicacia, Percepción o Supervivencia, según la elección de creación.',
  lineage:'Tu linaje élfico concede rasgos específicos y conjuros nuevos al alcanzar los niveles indicados.',
  halfling_brave:'Tienes ventaja en las salvaciones para evitar o terminar el estado Asustado. Este beneficio solo se aplica en esa situación.',
  halfling_nimbleness:'Puedes pasar por el espacio de una criatura de tamaño mayor que el tuyo, pero no acabar allí tu movimiento.',
  halfling_luck:'Cuando sacas un 1 en el d20 de una prueba de d20, puedes repetir ese dado. Si lo haces, debes usar el resultado nuevo.',
  halfling_naturally_stealthy:'Puedes usar Esconderse si te oculta únicamente una criatura que sea al menos un tamaño mayor que tú.',
};
