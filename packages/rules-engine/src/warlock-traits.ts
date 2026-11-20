/** Proyección de Brujo para la MISMA hoja de rasgos que usan Guerrero y Mago. */
import {BACKGROUNDS,SPECIES_NAMES} from './guided';
import {ORIGIN_FEATS} from './origin-feats';
import {ORIGIN_FEAT_EXPLANATIONS,SPECIES_TRAIT_EXPLANATIONS} from './rules-explanations';
import {WARLOCK_INVOCATIONS,type GuidedWarlockInput,type CalculatedWarlockOne} from './warlock';
import type {CharacterTrait,TraitCollection} from './traits';

export function collectWarlockTraits(input:GuidedWarlockInput,sheet:CalculatedWarlockOne):TraitCollection{
 const traits:CharacterTrait[]=[];
 function add(trait:CharacterTrait){traits.push(trait);}
 add({id:'warlock:pact_magic',title:'Magia de Pacto',group:'class',source:'Brujo',level:1,
  summary:`${input.level>=4?'Tres':'Dos'} trucos, ${input.level===1?'dos':input.level===2?'tres':input.level===3?'cuatro':input.level===4?'cinco':input.level===5?'seis':input.level===6?'siete':'ocho'} conjuros preparados ordinarios y ${input.level===1?'una':'dos'} ranuras de nivel ${input.level>=7?4:input.level>=5?3:input.level>=3?2:1} recargables tras descansar.`,
  explanation:'Las ranuras se marcan manualmente en Hechizos; los conjuros no se lanzan automáticamente.',automation:'calculated',
  details:[`CD de salvación ${sheet.spellSaveDC}. Ataque mágico ${sheet.spellAttackBonus>=0?'+':''}${sheet.spellAttackBonus}.`,
   'El Brujo recupera todas sus ranuras de Magia de Pacto al terminar un descanso corto o largo.']});
 if(input.level>=2)add({id:'warlock:magical_cunning',title:'Astucia mágica',group:'class',source:'Brujo',level:2,
  summary:'Tras un rito de un minuto, recuperas una ranura de pacto gastada; una vez por descanso largo.',
  explanation:'La recuperación se ejecuta solo cuando el jugador confirma el rito desde Principal, Rasgos o Hechizos.',automation:'partial',details:['En nivel 2 recupera una de las dos ranuras, si está gastada.','Un descanso corto no restablece el uso de Astucia mágica.']});
 if(input.level>=3&&input.subclassId==='fiend'){
  add({id:'warlock:fiend_patron',title:'Patrón Infernal',group:'class',source:'Patrón Infernal',level:3,
   summary:`Subclase que concede Bendición del Oscuro y ${input.level>=7?'ocho':input.level>=5?'seis':'cuatro'} conjuros siempre preparados.`,
   explanation:`Los conjuros del patrón no consumen ninguna de las ${input.level>=7?'ocho':input.level>=6?'siete':input.level>=5?'seis':input.level>=4?'cinco':'cuatro'} elecciones ordinarias de Magia de Pacto.`,automation:'calculated',
   details:['Manos ardientes (nivel 1)','Orden imperiosa (nivel 1)','Rayo abrasador (nivel 2)','Sugestión (nivel 2)',...(input.level>=5?['Bola de fuego (nivel 3)','Nube apestosa (nivel 3)']:[]),...(input.level>=7?['Escudo de fuego (nivel 4)','Muro de fuego (nivel 4)']:[])]});
  add({id:'warlock:dark_ones_blessing',title:'Bendición del Oscuro',group:'class',source:'Patrón Infernal',level:3,
   summary:`Al reducir a un enemigo a 0 PG, o al hacerlo otra criatura a 10 pies de ti, puedes recibir ${Math.max(1,sheet.abilityModifiers.charisma+input.level)} PG temporales.`,
   explanation:'La condición la confirma el jugador. Solo se aplica si decides pulsar el botón del rasgo; los PG temporales no se acumulan.',automation:'partial',
   details:['PG temporales = máximo entre 1 y tu modificador de Carisma + nivel de Brujo.','Se conserva la cantidad mayor entre los PG temporales anteriores y los nuevos; no se suman.']});
  if(input.level>=6)add({id:'warlock:dark_ones_own_luck',title:'Suerte del Oscuro',group:'class',source:'Patrón Infernal',level:6,
   summary:'Después de ver un d20 de prueba de característica o salvación, puedes sumar 1d10 antes de resolver sus efectos.',
   explanation:'Pulsa la tirada opcional cuando decidas usar este rasgo. Cada activación consume un uso; los recuperas únicamente tras un descanso largo.',automation:'partial',
   details:['Usos por descanso largo: modificador de Carisma (mínimo uno).','Nunca más de una vez en una misma tirada; no se aplica a ataques ni tiradas de daño.']});
 }
 if(input.level>=4&&input.level4Improvement){
  const choice=input.level4Improvement;
  const names:Record<string,string>={strength:'Fuerza',dexterity:'Destreza',constitution:'Constitución',intelligence:'Inteligencia',wisdom:'Sabiduría',charisma:'Carisma'};
  add({id:'warlock:ability_score_improvement_4',title:'Mejora de característica',group:'feats',source:'Brujo · nivel 4',level:4,
   summary:choice.mode==='plus_two'?`+2 a ${names[choice.first]}`:`+1 a ${names[choice.first]} y +1 a ${names[choice.second??choice.first]}`,
   explanation:'La mejora aplica automáticamente a las características, sus modificadores, tiradas, CD y PG cuando corresponda.',automation:'calculated',details:['Dote Mejora de característica; otras dotes de nivel 4 se incorporarán en fases posteriores.']});
 }
 for(const invocation of input.invocations){
  const info=WARLOCK_INVOCATIONS[invocation];
  add({id:`warlock:invocation:${invocation}`,title:info.name,group:'class',source:'Invocación sobrenatural',level:info.minLevel,
   summary:info.summary,explanation:'Las invocaciones se eligen en creación o en la ventana de subida de nivel.',
   automation:['pact_of_blade','armor_of_shadows','agonizing_blast','eldritch_spear','thirsting_blade','gift_of_the_depths'].includes(invocation)?'calculated':'partial',details:[
    invocation==='pact_of_blade'?'Los beneficios se aplican al arma vinculada solo cuando esté equipada.':
    invocation==='pact_of_chain'?'El familiar se gestiona en la pestaña Compañeros.':
    invocation==='pact_of_tome'?'Los conjuros adicionales aparecen en Hechizos mientras lleves el Libro de las Sombras.':
    invocation==='armor_of_shadows'?'La CA alternativa se aplica cuando activas el efecto y no llevas armadura.':
    invocation==='eldritch_mind'?'La ventaja se aplica solo a salvaciones para mantener la concentración.':
    invocation==='thirsting_blade'?'Se habilitan dos ataques independientes solo con el arma de pacto equipada.':
    invocation==='eldritch_smite'?`Al gastar una ranura de nivel ${input.level>=7?4:3} con un impacto del arma del pacto, añade ${input.level>=7?5:4}d8 de fuerza; marca el gasto de ranura manualmente.`:
    invocation==='investment_of_the_chain_master'?'En Compañeros se elige velocidad de vuelo o nado 40 pies; tu CD de conjuro sustituye la de sus salvaciones.':
    invocation==='gift_of_the_depths'?'La velocidad de nado pasa a ser igual a la velocidad normal; Respirar bajo el agua es una vez por descanso largo.':
    invocation==='agonizing_blast'||invocation==='eldritch_spear'?'Se muestra el efecto al tirar Descarga sobrenatural.':'La activación y los efectos narrativos los resuelve el jugador.',
   ]});
 }
 const origin=SPECIES_NAMES[input.species];
 const species:Record<string,readonly [string,string,string][]>= {
  human:[['resourceful','Ingenioso','Inspiración heroica después de un descanso largo'],['skillful','Hábil','Una habilidad adicional'],['versatile','Versátil','Una dote de origen adicional']],
  dwarf:[['dwarven_toughness','Tenacidad enana','PG máximos adicionales'],['darkvision','Visión en la oscuridad','Visión sin luz'],['dwarven_resilience','Resistencia enana','Protección frente al veneno'],['stonecunning','Conocimiento de la piedra','Percepción especial sobre roca']],
  elf:[['darkvision','Visión en la oscuridad','Visión sin luz'],['fey_ancestry','Ascendencia feérica','Defensa frente al encanto'],['keen_senses','Sentidos agudos','Habilidad sensorial'],['trance','Trance','Reposo élfico'],['lineage','Linaje élfico','Magia y rasgos de linaje']],
  halfling:[['halfling_brave','Valentía','Defensa frente al miedo'],['halfling_nimbleness','Agilidad de mediano','Movimiento a través de espacios ocupados'],['halfling_luck','Suerte','Repetir un 1 natural'],['halfling_naturally_stealthy','Sigilo natural','Ocultación tras criaturas grandes']]
 };
 for(const [id,title,summary] of species[input.species]??[]){
  add({id:`species:${id}`,title,group:'species',source:origin,summary,
   explanation:SPECIES_TRAIT_EXPLANATIONS[id]??summary,
   automation:id==='dwarven_toughness'||id==='skillful'?'calculated':'manual',details:id==='lineage'?[`Linaje: ${input.elfLineage??'sin elegir'}`]:[]});
 }
 function feat(id:string,source:string){
  const title=ORIGIN_FEATS[id as keyof typeof ORIGIN_FEATS]??id;
  add({id:`feat:${source}:${id}`,title,group:'feats',source,summary:`Dote de origen: ${title}`,
   explanation:ORIGIN_FEAT_EXPLANATIONS[id]??'Su uso corresponde al jugador.',
   automation:id==='tough'||id==='alert'?'calculated':'manual',details:[]});
 }
 feat(BACKGROUNDS[input.background].feat,`Trasfondo: ${BACKGROUNDS[input.background].name}`);
 if(input.species==='human'&&input.humanFeat)feat(input.humanFeat,'Humano');
 if(input.lessonsFeat)feat(input.lessonsFeat,'Lecciones de los Primeros');
 return {traits,pendingAutomation:['La activación de invocaciones, rasgos y usos de conjuros sigue bajo control del jugador.',...(input.level<3?['El Patrón Infernal comienza en nivel 3; no concede rasgos antes.']:[])]};
}
