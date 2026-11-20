/** Pasos 66–72. La lista del Brujo enlaza directamente con las fichas existentes del Mago.
 * Solo se declaran reglas nuevas para conjuros que no están en ese catálogo.
 * Fuente: PHB 2024, lista de conjuros del Brujo, niveles de conjuro 0–2 y Patrón Infernal 3.
 */
import {wizardSpellRule,type WizardSpellRule} from './wizard-spell-details';

export const WARLOCK_CANTRIP_IDS=[
 'blade_ward','chill_touch','eldritch_blast','friends','mage_hand','mind_sliver',
 'minor_illusion','poison_spray','prestidigitation','thunderclap','toll_the_dead','true_strike'
] as const;
export const WARLOCK_FIRST_LEVEL_IDS=[
 'armor_of_agathys','arms_of_hadar','bane','charm_person','comprehend_languages',
 'detect_magic','expeditious_retreat','hellish_rebuke','hex','illusory_script',
 'protection_from_evil_and_good','speak_with_animals','tashas_hideous_laughter',
 'unseen_servant','witch_bolt'
] as const;
/** Nivel 3 de personaje: acceso a los conjuros de nivel 2 de Magia de Pacto. */
export const WARLOCK_SECOND_LEVEL_IDS=[
 'cloud_of_daggers','crown_of_madness','darkness','enthrall','hold_person','invisibility',
 'mind_spike','mirror_image','misty_step','ray_of_enfeeblement','spider_climb','suggestion'
] as const;
/** Conjuros siempre preparados del Patrón Infernal al llegar a nivel de Brujo 3. */
export const WARLOCK_FIEND_LEVEL_THREE_IDS=['burning_hands','command','scorching_ray','suggestion'] as const;

/** Metadatos de conjuros exclusivos o ajenos al listado del Mago; resúmenes originales. */
export const WARLOCK_UNIQUE_SPELL_RULES:readonly WizardSpellRule[]=[
 {id:'command',name:'Orden imperiosa',level:1,school:'enchantment',description:'Das una orden breve a una criatura que veas y que pueda comprenderte. Si falla su salvación de Sabiduría, intenta cumplirla en su siguiente turno; no puede seguir órdenes directamente dañinas. El jugador y el director resuelven su interpretación.',castingTime:'Action',range:'60 feet',components:'V',duration:'Instantaneous',attack:false,rolls:[],cantripScales:false},
 {id:'enthrall',name:'Cautivar',level:2,school:'enchantment',description:'Intentas captar la atención de las criaturas que elijas dentro del alcance. Cada objetivo realiza una salvación de Sabiduría; los que fallen sufren desventaja en ciertas pruebas de Percepción para observar a otros mientras dure la concentración. El efecto se resuelve durante la partida.',castingTime:'Action',range:'60 feet',components:'V, S',duration:'Concentration, up to 1 minute',attack:false,rolls:[],cantripScales:false},
 {id:'eldritch_blast',name:'Descarga sobrenatural',level:0,school:'evocation',description:'Un rayo de fuerza contra una criatura dentro del alcance. Realiza un ataque de conjuro a distancia; al impactar causa 1d10 de fuerza. A niveles de personaje 5, 11 y 17 obtienes dos, tres y cuatro rayos independientes; cada uno tiene su propia tirada de ataque.',castingTime:'Action',range:'120 feet',components:'V, S',duration:'Instantaneous',attack:true,rolls:[{label:'Daño de un rayo',formula:'1d10',scales:false}],cantripScales:false},
 {id:'armor_of_agathys',name:'Armadura de Agathys',level:1,school:'abjuration',description:'Te protege con 5 puntos de golpe temporales. Una criatura que te impacte con un ataque cuerpo a cuerpo recibe 5 de daño de frío mientras conserves esos puntos temporales. Con ranuras superiores ambas cantidades aumentan 5 por nivel de ranura.',castingTime:'Bonus Action',range:'Self',components:'V, S, M',duration:'1 hour',attack:false,rolls:[],cantripScales:false},
 {id:'arms_of_hadar',name:'Brazos de Hadar',level:1,school:'conjuration',description:'Tendáculos golpean a criaturas a 10 pies de ti. Cada una hace una salvación de Fuerza; si falla recibe 2d6 de daño necrótico y no puede usar reacciones hasta su próximo turno. Con éxito recibe medio daño.',castingTime:'Action',range:'Self',components:'V, S',duration:'Instantaneous',attack:false,rolls:[{label:'Daño necrótico',formula:'2d6'}],cantripScales:false},
 {id:'bane',name:'Perdición',level:1,school:'enchantment',description:'Hasta tres criaturas dentro del alcance realizan salvación de Carisma. Mientras mantengas la concentración, las que fallen restan 1d4 a sus ataques y salvaciones. Selecciona objetivos y resuelve los efectos con el DM.',castingTime:'Action',range:'30 feet',components:'V, S, M',duration:'Concentration, up to 1 minute',attack:false,rolls:[{label:'Penalización',formula:'1d4'}],cantripScales:false},
 {id:'hellish_rebuke',name:'Reprensión infernal',level:1,school:'evocation',description:'Reacción al recibir daño de una criatura que veas a distancia. El objetivo realiza salvación de Destreza; recibe 2d10 de fuego si falla, o la mitad si supera. Aumenta 1d10 por nivel adicional de ranura.',castingTime:'Reaction',range:'60 feet',components:'V, S',duration:'Instantaneous',attack:false,rolls:[{label:'Daño de fuego',formula:'2d10'}],cantripScales:false},
 {id:'hex',name:'Maleficio',level:1,school:'enchantment',description:'Marca a una criatura que puedas ver. Mientras dure tu concentración, cada vez que la golpees con un ataque sufre 1d6 adicional de daño necrótico. También eliges una característica para que tenga desventaja en sus pruebas; tú decides cuándo se aplica.',castingTime:'Bonus Action',range:'90 feet',components:'V, S, M',duration:'Concentration, up to 1 hour',attack:false,rolls:[{label:'Daño necrótico por impacto',formula:'1d6'}],cantripScales:false},
 {id:'speak_with_animals',name:'Hablar con los animales',level:1,school:'divination',ritual:true,description:'Durante diez minutos puedes comprender y comunicarte verbalmente con bestias. Sus conocimientos y disposición dependen del animal; la conversación es narrativa.',castingTime:'Action or Ritual',range:'Self',components:'V, S',duration:'10 minutes',attack:false,rolls:[],cantripScales:false},
];

const uniques=new Map(WARLOCK_UNIQUE_SPELL_RULES.map(spell=>[spell.id,spell]));
export function warlockSpellRule(id:string):WizardSpellRule|undefined{
 return uniques.get(id)??wizardSpellRule(id);
}
function required(id:string):WizardSpellRule{
 const spell=warlockSpellRule(id);
 if(!spell)throw new Error('Conjuro del Brujo sin ficha: '+id);
 return spell;
}
export const WARLOCK_LEVEL_ONE_CANTRIPS:readonly WizardSpellRule[]=WARLOCK_CANTRIP_IDS.map(required);
export const WARLOCK_LEVEL_ONE_SPELLS:readonly WizardSpellRule[]=WARLOCK_FIRST_LEVEL_IDS.map(required);
export const WARLOCK_LEVEL_TWO_SPELLS:readonly WizardSpellRule[]=WARLOCK_SECOND_LEVEL_IDS.map(required);
export const WARLOCK_FIEND_LEVEL_THREE_SPELLS:readonly WizardSpellRule[]=WARLOCK_FIEND_LEVEL_THREE_IDS.map(required);
export const WARLOCK_SPELLS_THROUGH_LEVEL_TWO:readonly WizardSpellRule[]=[...WARLOCK_LEVEL_ONE_SPELLS,...WARLOCK_LEVEL_TWO_SPELLS];

/** Futuro Pacto del Tomo: los conjuros de las otras listas se añadirán al catálogo compartido. */
export const TOME_CANTRIP_OPTIONS:readonly WizardSpellRule[]=[
 'acid_splash','dancing_lights','fire_bolt','light','mending','message','ray_of_frost','shocking_grasp'
].map(required);
export const TOME_RITUAL_OPTIONS:readonly WizardSpellRule[]=[
 'alarm','comprehend_languages','detect_magic','find_familiar','identify','illusory_script',
 'tensers_floating_disk','unseen_servant','speak_with_animals'
].map(required);

/** Cada referencia compartida debe ser la misma instancia que usa el Mago. */
export function warlockSpellIsShared(id:string):boolean{return wizardSpellRule(id)!==undefined;}
