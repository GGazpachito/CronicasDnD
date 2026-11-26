/** Proyección de Brujo para la MISMA hoja de rasgos que usan Guerrero y Mago. */
import {BACKGROUNDS,SPECIES_NAMES} from './guided';
import {ORIGIN_FEATS} from './origin-feats';
import {ORIGIN_FEAT_EXPLANATIONS,SPECIES_TRAIT_EXPLANATIONS} from './rules-explanations';
import {WARLOCK_INVOCATIONS,type GuidedWarlockInput,type CalculatedWarlockOne} from './warlock';
import {warlockSpellRule} from './warlock-spells';
import type {CharacterTrait,TraitCollection} from './traits';

export function collectWarlockTraits(input:GuidedWarlockInput,sheet:CalculatedWarlockOne):TraitCollection{
 const traits:CharacterTrait[]=[];
 function add(trait:CharacterTrait){traits.push(trait);}
 add({id:'warlock:pact_magic',title:'Magia de Pacto',group:'class',source:'Brujo',level:1,
  summary:`${input.level>=10?'Cuatro':input.level>=4?'Tres':'Dos'} trucos, ${input.level>=13?'doce':input.level>=11?'once':input.level===1?'dos':input.level===2?'tres':input.level===3?'cuatro':input.level===4?'cinco':input.level===5?'seis':input.level===6?'siete':input.level===7?'ocho':input.level===8?'nueve':'diez'} conjuros preparados ordinarios y ${input.level===1?'una':input.level>=11?'tres':'dos'} ranuras de nivel ${input.level>=9?5:input.level>=7?4:input.level>=5?3:input.level>=3?2:1} recargables tras descansar.`,
  explanation:'Las ranuras se marcan manualmente en Hechizos; los conjuros no se lanzan automáticamente.',automation:'calculated',
  details:[`CD de salvación ${sheet.spellSaveDC}. Ataque mágico ${sheet.spellAttackBonus>=0?'+':''}${sheet.spellAttackBonus}.`,
   'El Brujo recupera todas sus ranuras de Magia de Pacto al terminar un descanso corto o largo.']});
 if(input.level>=2)add({id:'warlock:magical_cunning',title:'Astucia mágica',group:'class',source:'Brujo',level:2,
  summary:`Tras un rito de un minuto, recuperas hasta ${input.level>=11?'dos ranuras':'una ranura'} de Pacto gastadas; una vez por descanso largo.`,
  explanation:'La recuperación se ejecuta solo cuando el jugador confirma el rito desde Principal, Rasgos o Hechizos.',automation:'partial',details:[input.level>=11?'Con tres ranuras máximas, recupera hasta dos gastadas.':'Con dos ranuras máximas, recupera hasta una gastada.','Un descanso corto no restablece el uso de Astucia mágica.']});
 if(input.level>=9)add({id:'warlock:contact_patron',title:'Contactar con el patrón',group:'class',source:'Brujo',level:9,
  summary:'Contactar con otro plano está siempre preparado y puedes lanzarlo sin gastar ranura una vez por descanso largo para comunicarte con tu patrón.',
  explanation:'Cuando lo usas con este rasgo, superas automáticamente su salvación de Inteligencia. La comunicación y las respuestas siguen en manos del jugador y del director de juego.',automation:'partial',
  details:['El conjuro no ocupa ninguna de tus elecciones ordinarias.','El lanzamiento gratuito se recupera solo con descanso largo.']});
 if(input.level>=11&&input.mysticArcanum6Id)add({id:'warlock:mystic_arcanum_6',title:'Arcanum místico · nivel 6',group:'class',source:'Brujo',level:11,
  summary:'Conjuro de nivel 6 elegido como secreto del patrón. Puedes lanzarlo una vez sin gastar ranura de Pacto y recuperas el uso tras descanso largo.',
  explanation:'Es independiente de los once preparados ordinarios y de las tres ranuras de Pacto de nivel 5. El jugador confirma manualmente el uso y resuelve el lanzamiento en mesa.',automation:'partial',
  details:[`Conjuro seleccionado: ${warlockSpellRule(input.mysticArcanum6Id)?.name??input.mysticArcanum6Id}.`,'No se prepara como conjuro ordinario ni se lanza con ranuras de nivel 5.']});
 if(input.level>=13&&input.mysticArcanum7Id)add({id:'warlock:mystic_arcanum_7',title:'Arcanum místico · nivel 7',group:'class',source:'Brujo',level:13,
  summary:'Elige un segundo secreto del patrón de nivel 7. Puedes lanzarlo una vez por descanso largo sin gastar ranura de Pacto.',
  explanation:'Su uso es independiente del Arcanum de nivel 6, de los doce conjuros preparados ordinarios y de las tres ranuras de Pacto.',automation:'partial',
  details:[`Conjuro seleccionado: ${warlockSpellRule(input.mysticArcanum7Id)?.name??input.mysticArcanum7Id}.`,'Lanzamiento y recuperación tras descanso largo marcados manualmente.']});
 if(input.level>=3&&input.subclassId==='fiend'){
  add({id:'warlock:fiend_patron',title:'Patrón Infernal',group:'class',source:'Patrón Infernal',level:3,
   summary:`Subclase que concede Bendición del Oscuro y ${input.level>=7?'ocho':input.level>=5?'seis':'cuatro'} conjuros siempre preparados.`,
   explanation:`Los conjuros del patrón no consumen ninguna de las ${input.level>=13?'doce':input.level>=11?'once':input.level>=9?'diez':input.level>=8?'nueve':input.level>=7?'ocho':input.level>=6?'siete':input.level>=5?'seis':input.level>=4?'cinco':'cuatro'} elecciones ordinarias de Magia de Pacto.`,automation:'calculated',
   details:['Manos ardientes (nivel 1)','Orden imperiosa (nivel 1)','Rayo abrasador (nivel 2)','Sugestión (nivel 2)',...(input.level>=5?['Bola de fuego (nivel 3)','Nube apestosa (nivel 3)']:[]),...(input.level>=7?['Escudo de fuego (nivel 4)','Muro de fuego (nivel 4)']:[])]});
  add({id:'warlock:dark_ones_blessing',title:'Bendición del Oscuro',group:'class',source:'Patrón Infernal',level:3,
   summary:`Al reducir a un enemigo a 0 PG, o al hacerlo otra criatura a 10 pies de ti, puedes recibir ${Math.max(1,sheet.abilityModifiers.charisma+input.level)} PG temporales.`,
   explanation:'La condición la confirma el jugador. Solo se aplica si decides pulsar el botón del rasgo; los PG temporales no se acumulan.',automation:'partial',
   details:['PG temporales = máximo entre 1 y tu modificador de Carisma + nivel de Brujo.','Se conserva la cantidad mayor entre los PG temporales anteriores y los nuevos; no se suman.']});
  if(input.level>=6)add({id:'warlock:dark_ones_own_luck',title:'Suerte del Oscuro',group:'class',source:'Patrón Infernal',level:6,
   summary:'Después de ver un d20 de prueba de característica o salvación, puedes sumar 1d10 antes de resolver sus efectos.',
   explanation:'Pulsa la tirada opcional cuando decidas usar este rasgo. Cada activación consume un uso; los recuperas únicamente tras un descanso largo.',automation:'partial',
   details:['Usos por descanso largo: modificador de Carisma (mínimo uno).','Nunca más de una vez en una misma tirada; no se aplica a ataques ni tiradas de daño.']});
  if(input.level>=10)add({id:'warlock:fiendish_resilience',title:'Resistencia infernal',group:'class',source:'Patrón Infernal',level:10,
   summary:'Tras terminar un descanso corto o largo, elige un tipo de daño distinto de fuerza: obtienes resistencia a ese daño hasta que elijas otro.',
   explanation:'La hoja ofrece un selector después del descanso. El jugador decide el tipo; no se reduce automáticamente el daño recibido ni se elige una resistencia sin descanso.',automation:'partial',
   details:['La resistencia queda activa hasta que la sustituyas en otro descanso corto o largo.','No se puede elegir daño de fuerza.']});
 }
 if(input.level>=4&&input.level4Improvement){
  const choice=input.level4Improvement;
  const names:Record<string,string>={strength:'Fuerza',dexterity:'Destreza',constitution:'Constitución',intelligence:'Inteligencia',wisdom:'Sabiduría',charisma:'Carisma'};
  add({id:'warlock:ability_score_improvement_4',title:'Mejora de característica',group:'feats',source:'Brujo · nivel 4',level:4,
   summary:choice.mode==='plus_two'?`+2 a ${names[choice.first]}`:`+1 a ${names[choice.first]} y +1 a ${names[choice.second??choice.first]}`,
   explanation:'La mejora aplica automáticamente a las características, sus modificadores, tiradas, CD y PG cuando corresponda.',automation:'calculated',details:['Dote Mejora de característica; otras dotes de nivel 4 se incorporarán en fases posteriores.']});
 }
 if(input.level>=8&&input.level8Improvement){
  const choice=input.level8Improvement;
  const names:Record<string,string>={strength:'Fuerza',dexterity:'Destreza',constitution:'Constitución',intelligence:'Inteligencia',wisdom:'Sabiduría',charisma:'Carisma'};
  add({id:'warlock:ability_score_improvement_8',title:'Mejora de característica',group:'feats',source:'Brujo · nivel 8',level:8,
   summary:choice.mode==='plus_two'?`+2 a ${names[choice.first]}`:`+1 a ${names[choice.first]} y +1 a ${names[choice.second??choice.first]}`,
   explanation:'Esta segunda mejora se acumula con la de nivel 4; la hoja recalcula modificadores, habilidades, CD y puntos de golpe automáticamente.',automation:'calculated',details:['Dote Mejora de característica; otras dotes de nivel 8 se incorporarán en fases posteriores.']});
 }
 if(input.level>=12&&input.level12Improvement){
  const choice=input.level12Improvement;
  const names:Record<string,string>={strength:'Fuerza',dexterity:'Destreza',constitution:'Constitución',intelligence:'Inteligencia',wisdom:'Sabiduría',charisma:'Carisma'};
  add({id:'warlock:ability_score_improvement_12',title:'Mejora de característica',group:'feats',source:'Brujo · nivel 12',level:12,
   summary:choice.mode==='plus_two'?`+2 a ${names[choice.first]}`:`+1 a ${names[choice.first]} y +1 a ${names[choice.second??choice.first]}`,
   explanation:'Tercera mejora acumulada con las de niveles 4 y 8. Los modificadores, conjuros, ataques y PG se recalculan con las características finales.',automation:'calculated',details:['Máximo 20. Otras dotes generales podrán añadirse en futuras fases.']});
 }
 for(const invocation of input.invocations){
  const info=WARLOCK_INVOCATIONS[invocation];
  add({id:`warlock:invocation:${invocation}`,title:info.name,group:'class',source:'Invocación sobrenatural',level:info.minLevel,
   summary:info.summary,explanation:'Las invocaciones se eligen en creación o en la ventana de subida de nivel.',
   automation:['pact_of_blade','armor_of_shadows','agonizing_blast','eldritch_spear','thirsting_blade','devouring_blade','gift_of_the_depths'].includes(invocation)?'calculated':'partial',details:[
    invocation==='pact_of_blade'?'Los beneficios se aplican al arma vinculada solo cuando esté equipada.':
    invocation==='pact_of_chain'?'El familiar se gestiona en la pestaña Compañeros.':
    invocation==='pact_of_tome'?'Los conjuros adicionales aparecen en Hechizos mientras lleves el Libro de las Sombras.':
    invocation==='armor_of_shadows'?'La CA alternativa se aplica cuando activas el efecto y no llevas armadura.':
    invocation==='eldritch_mind'?'La ventaja se aplica solo a salvaciones para mantener la concentración.':
    invocation==='thirsting_blade'?'Se habilitan dos ataques independientes solo con el arma de pacto equipada.':
    invocation==='devouring_blade'?'Requiere Hoja sedienta; el botón de ataque realiza tres tiradas independientes solo con el arma del pacto equipada.':
    invocation==='eldritch_smite'?`Al gastar una ranura de nivel ${input.level>=9?5:input.level>=7?4:3} con un impacto del arma del pacto, añade ${input.level>=9?6:input.level>=7?5:4}d8 de fuerza; marca el gasto de ranura manualmente.`:
    invocation==='lifedrinker'?'Solo con el arma de pacto equipada: puedes tirar 1d6 adicional una vez por turno. El tipo de daño y cualquier gasto de dado de golpe son decisiones manuales.':
    invocation==='gift_of_the_protectors'?'Requiere el Libro de las Sombras; las inscripciones y la reacción a 0 PG se gestionan en mesa.':
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
