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
  summary:'Dos trucos, dos conjuros preparados y una ranura de nivel 1 recargable tras descansar.',
  explanation:'La ranura se marca manualmente en Hechizos; los conjuros no se lanzan automáticamente.',automation:'calculated',
  details:[`CD de salvación ${sheet.spellSaveDC}. Ataque mágico ${sheet.spellAttackBonus>=0?'+':''}${sheet.spellAttackBonus}.`,
   'El Brujo recupera su ranura de Magia de Pacto al terminar un descanso corto o largo.']});
 for(const invocation of input.invocations){
  const info=WARLOCK_INVOCATIONS[invocation];
  add({id:`warlock:invocation:${invocation}`,title:info.name,group:'class',source:'Invocación sobrenatural',level:1,
   summary:info.summary,explanation:'Esta invocación se elige al crear el personaje y más adelante se sustituirá mediante la subida de nivel.',
   automation:invocation==='pact_of_blade'||invocation==='armor_of_shadows'?'calculated':'partial',details:[
    invocation==='pact_of_blade'?'Los beneficios se aplican al arma vinculada solo cuando esté equipada.':
    invocation==='pact_of_chain'?'El familiar se gestiona en la pestaña Compañeros.':
    invocation==='pact_of_tome'?'Los conjuros adicionales aparecen en Hechizos mientras lleves el Libro de las Sombras.':
    invocation==='armor_of_shadows'?'La CA alternativa se aplica cuando activas el efecto y no llevas armadura.':
    'La ventaja se aplica solo a salvaciones para mantener la concentración.',
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
 return {traits,pendingAutomation:['La activación de invocaciones y los usos de conjuros siguen bajo control del jugador.','El Patrón Infernal comienza en nivel 3; no concede rasgos antes.']};
}
