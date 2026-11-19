import {ABILITIES} from './abilities';
import {type CompanionAttack,type CompanionSheet} from './companions';
import {WARLOCK_FAMILIARS,type FamiliarForm} from './warlock';

/**
 * Catálogo central de bloques de criaturas. La ficha es una plantilla, no un
 * compañero manual ni el estado de una criatura concreta durante el combate.
 * Las entradas actuales toman los valores de Basic Rules 2024 de D&D Beyond.
 */
export const BESTIARY_SOURCE='https://www.dndbeyond.com/sources/dnd/br-2024/creature-stat-blocks';

export type BestiaryCategory='familiar_especial'|'familiar_comun'|'bestia'|'enemigo'|'otra';
export type BestiaryEntry=Readonly<{
 id:string;name:string;category:BestiaryCategory;source:string;
 sheet:CompanionSheet;
}>;

type Scores=readonly [number,number,number,number,number,number];
type Attack=readonly [name:string,bonus:number,damage:string,notes?:string];
type Extras=Readonly<{skills?:string;senses?:string;languages?:string;defenses?:string;traits?:string;actions?:string;equipment?:string;notes?:string;savingThrows?:string}>;
type CreatureSpec=Readonly<{
 category:BestiaryCategory;name:string;type:string;size:string;ac:number;hp:number;speed:string;
 scores:Scores;cr:string;attacks:readonly Attack[];extras?:Extras;
}>;

const chain='familiar_especial' as const;
const common='familiar_comun' as const;
// Datos mecánicos resumidos en español; no se reproducen los textos extensos de los libros.
const CREATURES={
 imp:{category:chain,name:'Diablillo',type:'Infernal (diablo)',size:'Diminuto',ac:13,hp:21,speed:'20 pies; vuelo 40 pies',scores:[6,17,13,11,12,14],cr:'1',attacks:[['Aguijón',5,'1d6+3 perforante + 2d6 veneno','Alcance 5 pies']],extras:{skills:'Engaño +4, Perspicacia +3, Sigilo +5',senses:'Visión en la oscuridad 120 pies; percepción pasiva 11',languages:'Común, infernal',defenses:'Resiste frío; inmune a fuego, veneno y condición envenenado',traits:'Resistencia mágica: ventaja en salvaciones frente a conjuros y efectos mágicos.',actions:'Puede volverse invisible y cambiar de apariencia (rata, cuervo o araña), conservando sus estadísticas salvo la velocidad.'}},
 pseudodragon:{category:chain,name:'Pseudodragón',type:'Dragón',size:'Diminuto',ac:14,hp:10,speed:'15 pies; vuelo 60 pies',scores:[6,15,13,10,12,10],cr:'1/4',attacks:[['Mordisco',4,'1d4+2 perforante','Puede efectuar dos mordiscos en su acción de ataque múltiple']],extras:{skills:'Percepción +5, Sigilo +4',senses:'Visión ciega 10 pies; visión en la oscuridad 60 pies; percepción pasiva 15',languages:'Entiende común y dracónico; no habla',traits:'Resistencia mágica: ventaja en salvaciones contra magia.',actions:'Aguijón: salvación de Constitución CD 12; 2d4 de veneno y posible envenenamiento e inconsciencia.'}},
 quasit:{category:chain,name:'Quasit',type:'Infernal (demonio)',size:'Diminuto',ac:13,hp:25,speed:'40 pies',scores:[5,17,10,7,10,10],cr:'1',attacks:[['Desgarro',5,'1d4+3 cortante','Envenena al objetivo hasta el comienzo del siguiente turno del quasit']],extras:{skills:'Sigilo +5',senses:'Visión en la oscuridad 120 pies; percepción pasiva 10',languages:'Abisal, común',defenses:'Resiste frío, fuego y relámpago; inmune a veneno y condición envenenado',traits:'Resistencia mágica: ventaja en salvaciones contra magia.',actions:'Puede volverse invisible, asustar una vez al día (Sabiduría CD 10) y adoptar forma de murciélago, ciempiés o sapo.'}},
 skeleton:{category:chain,name:'Esqueleto',type:'Muerto viviente',size:'Mediano',ac:14,hp:13,speed:'30 pies',scores:[10,16,15,6,8,5],cr:'1/4',attacks:[['Espada corta',5,'1d6+3 perforante','Alcance 5 pies'],['Arco corto',5,'1d6+3 perforante','Alcance 80/320 pies']],extras:{senses:'Visión en la oscuridad 60 pies; percepción pasiva 9',languages:'Entiende común y un idioma adicional; no habla',defenses:'Vulnerable a contundente; inmune a veneno, agotamiento y condición envenenado',equipment:'Espada corta, arco corto'}},
 slaad_tadpole:{category:chain,name:'Renacuajo slaad',type:'Aberración',size:'Diminuto',ac:12,hp:7,speed:'30 pies; excavar 10 pies',scores:[7,15,10,3,5,3],cr:'1/8',attacks:[['Mordisco',4,'1d6+2 perforante']],extras:{skills:'Sigilo +4',senses:'Visión en la oscuridad 60 pies; percepción pasiva 7',languages:'Entiende slaad; no habla',defenses:'Resiste ácido, frío, fuego, relámpago y trueno',traits:'Resistencia mágica: ventaja en salvaciones contra efectos mágicos.'}},
 sphinx_of_wonder:{category:chain,name:'Esfinge maravillosa',type:'Celestial',size:'Diminuto',ac:13,hp:24,speed:'20 pies; vuelo 40 pies',scores:[6,17,13,15,12,11],cr:'1',attacks:[['Desgarro',5,'1d4+3 cortante + 2d6 radiante']],extras:{skills:'Conocimiento Arcano +4, Religión +4, Sigilo +5',senses:'Visión en la oscuridad 60 pies; percepción pasiva 11',languages:'Celestial, común',defenses:'Resiste necrótico, psíquico y radiante',traits:'Resistencia mágica: ventaja en salvaciones contra magia.',actions:'Reacción «Destello de ingenio» (2/día): suma +2 a una prueba de característica o salvación de una criatura a 30 pies.'}},
 sprite:{category:chain,name:'Duende',type:'Feérico',size:'Diminuto',ac:15,hp:10,speed:'10 pies; vuelo 40 pies',scores:[3,18,10,14,13,11],cr:'1/4',attacks:[['Espada aguja',6,'1d4+4 perforante'],['Arco encantador',6,'1 perforante','Alcance 40/160 pies; puede hechizar brevemente al objetivo']],extras:{skills:'Percepción +3, Sigilo +8',senses:'Percepción pasiva 13',languages:'Común, élfico, silvano',actions:'Puede volverse invisible y percibir emociones y alineamiento mediante una salvación de Carisma CD 10.'}},
 venomous_snake:{category:chain,name:'Serpiente venenosa',type:'Bestia',size:'Diminuto',ac:12,hp:5,speed:'30 pies; nado 30 pies',scores:[2,15,11,1,10,3],cr:'1/8',attacks:[['Mordisco',4,'1d4+2 perforante + 1d6 veneno']],extras:{senses:'Visión ciega 10 pies; percepción pasiva 10'}},

 bat:{category:common,name:'Murciélago',type:'Bestia',size:'Diminuto',ac:12,hp:1,speed:'5 pies; vuelo 30 pies',scores:[2,15,8,2,12,4],cr:'0',attacks:[['Mordisco',4,'1 perforante']],extras:{senses:'Visión ciega 60 pies; percepción pasiva 11'}},
 cat:{category:common,name:'Gato',type:'Bestia',size:'Diminuto',ac:12,hp:2,speed:'40 pies; trepar 40 pies',scores:[3,15,10,3,12,7],cr:'0',attacks:[['Arañazo',4,'1 cortante']],extras:{skills:'Percepción +3, Sigilo +4',senses:'Visión en la oscuridad 60 pies; percepción pasiva 13',savingThrows:'FUE -4, DES +4, CON +0, INT -4, SAB +1, CAR -2'}},
 crab:{category:common,name:'Cangrejo',type:'Bestia',size:'Diminuto',ac:11,hp:3,speed:'20 pies; nado 20 pies',scores:[6,11,12,1,8,2],cr:'0',attacks:[['Pinza',2,'1 contundente']],extras:{skills:'Sigilo +2',senses:'Visión ciega 30 pies; percepción pasiva 9'}},
 frog:{category:common,name:'Rana',type:'Bestia',size:'Diminuto',ac:11,hp:1,speed:'20 pies; nado 20 pies',scores:[1,13,8,1,8,3],cr:'0',attacks:[['Mordisco',3,'1 perforante']],extras:{skills:'Percepción +1, Sigilo +3',senses:'Visión en la oscuridad 30 pies; percepción pasiva 11',traits:'Anfibio; puede respirar dentro y fuera del agua y dar saltos superiores a su tamaño.'}},
 hawk:{category:common,name:'Halcón',type:'Bestia',size:'Diminuto',ac:13,hp:1,speed:'10 pies; vuelo 60 pies',scores:[5,16,8,2,14,6],cr:'0',attacks:[['Garras',5,'1 cortante']],extras:{skills:'Percepción +6',senses:'Percepción pasiva 16'}},
 lizard:{category:common,name:'Lagarto',type:'Bestia',size:'Diminuto',ac:10,hp:2,speed:'20 pies; trepar 20 pies',scores:[2,11,10,1,8,3],cr:'0',attacks:[['Mordisco',2,'1 perforante']],extras:{senses:'Visión en la oscuridad 30 pies; percepción pasiva 9'}},
 octopus:{category:common,name:'Pulpo',type:'Bestia',size:'Pequeño',ac:12,hp:3,speed:'5 pies; nado 30 pies',scores:[4,15,11,3,10,4],cr:'0',attacks:[['Tentáculos',4,'1 contundente']],extras:{skills:'Percepción +2, Sigilo +6',senses:'Visión en la oscuridad 30 pies; percepción pasiva 12',traits:'Compresión: pasa por espacios muy estrechos. Respiración acuática: solo respira bajo el agua.',actions:'Reacción «Nube de tinta» (1/día): si una criatura termina su turno a 5 pies del pulpo bajo el agua, suelta tinta que dificulta la visión y se desplaza nadando.'}},
 owl:{category:common,name:'Búho',type:'Bestia',size:'Diminuto',ac:11,hp:1,speed:'5 pies; vuelo 60 pies',scores:[3,13,8,2,12,7],cr:'0',attacks:[['Garras',3,'1 cortante']],extras:{skills:'Percepción +5, Sigilo +5',senses:'Visión en la oscuridad 120 pies; percepción pasiva 15',traits:'Vuelo ágil: no provoca ataques de oportunidad cuando abandona el alcance de un enemigo tras pasar volando.'}},
 poisonous_snake:{category:common,name:'Serpiente (alias anterior)',type:'Bestia',size:'Diminuto',ac:12,hp:5,speed:'30 pies; nado 30 pies',scores:[2,15,11,1,10,3],cr:'1/8',attacks:[['Mordisco',4,'1d4+2 perforante + 1d6 veneno']],extras:{senses:'Visión ciega 10 pies; percepción pasiva 10',notes:'Identificador heredado: utiliza la ficha vigente de Serpiente venenosa (Venomous Snake, reglas 2024).'}},
 fish:{category:common,name:'Pez (piraña)',type:'Bestia',size:'Diminuto',ac:13,hp:1,speed:'5 pies; nado 40 pies',scores:[2,16,9,1,7,2],cr:'0',attacks:[['Mordisco',5,'1 perforante','Ventaja contra un objetivo que no esté a todos sus PG']],extras:{senses:'Visión en la oscuridad 60 pies; percepción pasiva 8',traits:'Respiración acuática: únicamente puede respirar bajo el agua.',notes:'La forma genérica «Pez» de datos previos usa el bloque Piraña de las reglas 2024.'}},
 rat:{category:common,name:'Rata',type:'Bestia',size:'Diminuto',ac:10,hp:1,speed:'20 pies; trepar 20 pies',scores:[2,11,9,2,10,4],cr:'0',attacks:[['Mordisco',2,'1 perforante']],extras:{skills:'Percepción +2',senses:'Visión en la oscuridad 30 pies; percepción pasiva 12'}},
 raven:{category:common,name:'Cuervo',type:'Bestia',size:'Diminuto',ac:12,hp:2,speed:'10 pies; vuelo 50 pies',scores:[2,14,10,5,13,6],cr:'0',attacks:[['Pico',4,'1 perforante']],extras:{skills:'Percepción +3',senses:'Percepción pasiva 13',traits:'Puede imitar sonidos sencillos que haya escuchado.'}},
 sea_horse:{category:common,name:'Caballito de mar',type:'Bestia',size:'Diminuto',ac:12,hp:1,speed:'5 pies; nado 20 pies',scores:[1,12,8,1,10,2],cr:'0',attacks:[],extras:{skills:'Percepción +2, Sigilo +5',senses:'Percepción pasiva 12',traits:'Respiración acuática: únicamente puede respirar bajo el agua.',actions:'Impulso de burbujas: bajo el agua puede desplazarse hasta su velocidad de nado sin provocar ataques de oportunidad.'}},
 spider:{category:common,name:'Araña',type:'Bestia',size:'Diminuto',ac:12,hp:1,speed:'20 pies; trepar 20 pies',scores:[2,14,8,1,10,2],cr:'0',attacks:[['Mordisco',4,'1 perforante + 1d4 veneno']],extras:{skills:'Sigilo +4',senses:'Visión en la oscuridad 30 pies; percepción pasiva 10',traits:'Trepa por paredes y techos, incluso invertida, sin hacer pruebas de característica.'}},
 weasel:{category:common,name:'Comadreja',type:'Bestia',size:'Diminuto',ac:13,hp:1,speed:'30 pies; trepar 30 pies',scores:[3,16,8,2,12,3],cr:'0',attacks:[['Mordisco',5,'1 perforante']],extras:{skills:'Acrobacias +5, Percepción +3, Sigilo +5',senses:'Visión en la oscuridad 60 pies; percepción pasiva 13'}},
} satisfies Record<FamiliarForm,CreatureSpec>&Record<string,CreatureSpec>;

const signed=(n:number)=>`${n>=0?'+':''}${n}`;
function buildEntry(id:string,definition:CreatureSpec):BestiaryEntry{
 const [strength,dexterity,constitution,intelligence,wisdom,charisma]=definition.scores;
 const abilities={strength,dexterity,constitution,intelligence,wisdom,charisma};
 const extras=definition.extras??{};
 const savingThrows=extras.savingThrows??ABILITIES.map((a,i)=>`${['FUE','DES','CON','INT','SAB','CAR'][i]} ${signed(Math.floor((abilities[a]-10)/2))}`).join(', ');
 const attacks:CompanionAttack[]=definition.attacks.map(([name,attackBonus,damage,notes],index)=>({id:`${id}-attack-${index}`,name,attackBonus,damage,notes:notes??''}));
 const sheet:CompanionSheet={id:`bestiary:${id}`,name:definition.name,creatureType:definition.type,size:definition.size,
  armorClass:definition.ac,hitPoints:definition.hp,hitPointsMaximum:definition.hp,speed:definition.speed,challengeRating:definition.cr,
  proficiencyBonus:2,abilities,savingThrows,skills:extras.skills??'',senses:extras.senses??'Percepción pasiva 10',
  languages:extras.languages??'Ninguno',defenses:extras.defenses??'',equipment:extras.equipment??'',attacks,
  traits:extras.traits??'',actions:extras.actions??'',notes:extras.notes??''};
 return {id,name:definition.name,category:definition.category,source:BESTIARY_SOURCE,sheet};
}

/** Una única colección consultable por la pantalla de Bestiario y cualquier clase. */
export const BESTIARY_ENTRIES:readonly BestiaryEntry[]=Object.entries(CREATURES)
 .map(([id,definition])=>buildEntry(id,definition));
const BY_ID=new Map(BESTIARY_ENTRIES.map(entry=>[entry.id,entry]));

export function findBestiaryCreature(id:string):BestiaryEntry|undefined{return BY_ID.get(id);}

/** Instancia visual sin escritura de datos: no consume el cupo de compañeros manuales. */
export function familiarSheetFromBestiary(form:FamiliarForm,name?:string):CompanionSheet{
 const entry=findBestiaryCreature(form);
 if(!entry)throw new RangeError(`Forma de familiar desconocida: ${form}`);
 const alias=name?.trim();
 return {...entry.sheet,id:`familiar:${form}`,name:alias||entry.name,
  abilities:{...entry.sheet.abilities},attacks:entry.sheet.attacks.map(attack=>({...attack}))};
}
