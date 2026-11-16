/** Vista de rasgos común: contenido del Mago sin duplicar la interfaz de Rasgos.
 * Los rasgos de Guerrero usan collectCharacterTraits y los del Mago esta proyección.
 */
import {SPECIES_NAMES,BACKGROUNDS} from './guided';
import {ORIGIN_FEATS} from './origin-feats';
import {ORIGIN_FEAT_EXPLANATIONS,SPECIES_TRAIT_EXPLANATIONS} from './rules-explanations';
import {WIZARD_FEATURES,EVOKER_FEATURES} from './wizard';
import type {CharacterTrait,TraitCollection} from './traits';
import type {GuidedWizardInput,WizardLevelOneView} from './wizard-creation';
export function collectWizardTraits(input:GuidedWizardInput,view:WizardLevelOneView):TraitCollection{
  const traits:CharacterTrait[]=[];
  function add(id:string,title:string,source:string,group:CharacterTrait['group'],summary:string,explanation:string,automation:CharacterTrait['automation']='manual',details:readonly string[]=[]){
    traits.push({id,title,source,group,summary,explanation,automation,details});
  }
  for(const feature of WIZARD_FEATURES.filter(feature=>feature.level<=input.level)){
    add(`wizard:${feature.id}`,feature.title,'Mago','class',feature.description,feature.description,
      feature.id==='spellcasting'?'calculated':'partial',feature.id==='spellcasting'?[`CD de salvación: ${view.spellSaveDC}. Ataque mágico: ${view.spellAttackBonus>=0?'+':''}${view.spellAttackBonus}.`]:[]);
  }
  if(input.level>=2&&input.scholarSkill){
    const names:Record<string,string>={arcana:'Arcanos',history:'Historia',investigation:'Investigación',medicine:'Medicina',nature:'Naturaleza',religion:'Religión'};
    add('wizard:scholar_expertise',`Pericia: ${names[input.scholarSkill]}`,'Mago','class',
      `Doblas la competencia en ${names[input.scholarSkill]}.`,
      'El rasgo Erudito permite elegir una habilidad académica en la que ya seas competente y duplicar el bonificador de competencia para sus pruebas.','calculated',
      [`Bonificador actual: ${view.skillBonuses[input.scholarSkill]>=0?'+':''}${view.skillBonuses[input.scholarSkill]}.`]);
  }
  if(input.level>=3&&input.subclass==='evoker'){
    for(const feature of EVOKER_FEATURES.filter(f=>f.level<=input.level)){
      add(`evoker:${feature.id}`,feature.title,'Evocación','subclass',feature.description,feature.description,
        feature.id==='evocation_savant'?'calculated':'manual',
        feature.id==='evocation_savant'?[`Conjuros gratuitos: ${[...(input.evokerBonusSpellIds??[]),...(input.evokerLevelThreeSpellId?[input.evokerLevelThreeSpellId]:[])].join(', ')}.`]:[]);
    }
  }
  const origin=SPECIES_NAMES[input.species];
  const speciesTraits:Record<string,readonly [string,string,string][]>={
    human:[['resourceful','Ingenioso','Inspiración heroica tras un descanso largo'],['skillful','Hábil','Competencia adicional'],['versatile','Versátil','Dote de origen adicional']],
    dwarf:[['dwarven_toughness','Tenacidad enana','Puntos de golpe adicionales'],['darkvision','Visión en la oscuridad','Ver en la oscuridad'],['dwarven_resilience','Resistencia enana','Protección frente al veneno'],['stonecunning','Conocimiento de la piedra','Sentido especial de la piedra']],
    elf:[['darkvision','Visión en la oscuridad','Ver en la oscuridad'],['fey_ancestry','Ascendencia feérica','Defensa frente al encanto'],['keen_senses','Sentidos agudos','Competencia sensorial'],['trance','Trance','Descanso élfico'],['lineage','Linaje élfico','Capacidades y magia propias del linaje']],
    halfling:[['halfling_brave','Valentía','Defensa contra el miedo'],['halfling_nimbleness','Agilidad de mediano','Movimiento entre criaturas más grandes'],['halfling_luck','Suerte','Repetir un 1 natural en pruebas de d20'],['halfling_naturally_stealthy','Sigilo natural','Esconderse detrás de criaturas grandes']],
  };
  for(const [id,title,summary] of speciesTraits[input.species]??[]){
    const extra=id==='lineage'?`Linaje: ${input.elfLineage??'no definido'}.`:id==='skillful'?`Competencia: ${input.humanSkill??'no definida'}.`:'';
    add(`species:${id}`,title,origin,'species',summary,SPECIES_TRAIT_EXPLANATIONS[id]??summary,
      ['dwarven_toughness','skillful'].includes(id)?'calculated':'manual',extra?[extra]:[]);
  }
  function feat(id:string,from:string){
    const title=ORIGIN_FEATS[id as keyof typeof ORIGIN_FEATS]??id.replaceAll('_',' ');
    add(`feat:${from}:${id}`,title,from,'feats',`Dote de origen: ${title}`,
      ORIGIN_FEAT_EXPLANATIONS[id]??'Consulta al director de juego para aplicar esta dote.',id==='tough'||id==='alert'?'calculated':'manual');
  }
  feat(BACKGROUNDS[input.background].feat,`Trasfondo: ${BACKGROUNDS[input.background].name}`);
  if(input.species==='human'&&input.humanFeat)feat(input.humanFeat,'Humano');
  return {traits,pendingAutomation:['Los rasgos activos de especie y dote requieren decisión manual.','La automatización completa de conjuros se implementará en fases posteriores.']};
}
