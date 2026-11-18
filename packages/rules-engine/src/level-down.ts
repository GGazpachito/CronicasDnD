/** Actualización 51.2. Retroceso de un nivel con vista previa, sin efectos secundarios.
 * Contrato común de presentación: Guerrero y Mago usan el mismo diálogo y difieren
 * únicamente en la construcción/validación de su nueva ficha y sus recursos.
 */
import {calculateGuidedFighter,type GuidedFighterInput} from './guided';
import {collectCharacterTraits} from './traits';
import {type AdventureState,initialAdventureState,validateAdventureState} from './adventure';
import {fighterResourceMaximum,type FighterResourceId} from './resources';
import {makeCharacterSnapshot,type CharacterSnapshot} from './persistence';
import {FIGHTER_LEVEL_MILESTONES,explainFighterMilestone} from './level-up-wizard';
import {calculateGuidedWizard,makeWizardCharacterSnapshot,validateWizardOneState,WIZARD_SPELL_CATALOG,WIZARD_LEVEL_ONE_CANTRIPS,type GuidedWizardInput,type WizardLevelOneState,type WizardCharacterSnapshot} from './wizard-creation';
import {wizardAllSlotMarks} from './wizard-slot-marks';
import {wizardProgression,WIZARD_FEATURES,EVOKER_FEATURES} from './wizard';
import {createSlotPool} from './spellcasting-core';
import {validateWizardSpellSelection} from './wizard-spell-library';
import {ABILITIES,type Ability} from './abilities';
import {SKILLS,type Skill} from './proficiencies';

export type LevelDownNotice=Readonly<{title:string;description:string}>;
export type LevelDownSummary=Readonly<{
 className:'Guerrero'|'Mago';fromLevel:number;toLevel:number;
 lost:readonly LevelDownNotice[];changes:readonly LevelDownNotice[];
 preserved:readonly string[];
}>;
export type FighterLevelDownPreview=LevelDownSummary & Readonly<{snapshot:CharacterSnapshot}>;
export type WizardLevelDownPreview=LevelDownSummary & Readonly<{snapshot:WizardCharacterSnapshot}>;

const signed=(n:number)=>n>0?`+${n}`:String(n);
const ABILITY_LABELS:Readonly<Record<Ability,string>>={strength:'Fuerza',dexterity:'Destreza',constitution:'Constitución',intelligence:'Inteligencia',wisdom:'Sabiduría',charisma:'Carisma'};
const SKILL_LABELS:Readonly<Record<Skill,string>>={acrobatics:'Acrobacias',animal_handling:'Trato con animales',arcana:'Arcanos',athletics:'Atletismo',deception:'Engaño',history:'Historia',insight:'Perspicacia',intimidation:'Intimidación',investigation:'Investigación',medicine:'Medicina',nature:'Naturaleza',perception:'Percepción',performance:'Interpretación',persuasion:'Persuasión',religion:'Religión',sleight_of_hand:'Juego de manos',stealth:'Sigilo',survival:'Supervivencia'};
/** Solo anuncia diferencias reales, sin llenar la ventana de valores sin cambios. */
function attributeChanges(before:Readonly<{abilityScores:Readonly<Record<Ability,number>>;skillBonuses:Readonly<Record<Skill,number>>;savingThrowBonuses:Readonly<Record<Ability,number>>;initiative:number;armorClass:number}>,
 after:typeof before):LevelDownNotice[]{
 const changes:LevelDownNotice[]=[];
 for(const ability of ABILITIES)if(before.abilityScores[ability]!==after.abilityScores[ability])changes.push({title:`${ABILITY_LABELS[ability]}`,description:`Puntuación ${before.abilityScores[ability]} → ${after.abilityScores[ability]}. Se recalculan sus modificadores y pruebas.`});
 if(before.armorClass!==after.armorClass)changes.push({title:'Clase de armadura',description:`CA ${before.armorClass} → ${after.armorClass}.`});
 if(before.initiative!==after.initiative)changes.push({title:'Iniciativa',description:`Bonificador ${signed(before.initiative)} → ${signed(after.initiative)}.`});
 const saves=ABILITIES.filter(a=>before.savingThrowBonuses[a]!==after.savingThrowBonuses[a]);
 if(saves.length)changes.push({title:'Tiradas de salvación',description:saves.map(a=>`${ABILITY_LABELS[a]} ${signed(before.savingThrowBonuses[a])} → ${signed(after.savingThrowBonuses[a])}`).join(' · ')});
 const skills=SKILLS.filter(a=>before.skillBonuses[a]!==after.skillBonuses[a]);
 if(skills.length)changes.push({title:'Habilidades',description:skills.map(a=>`${SKILL_LABELS[a]} ${signed(before.skillBonuses[a])} → ${signed(after.skillBonuses[a])}`).join(' · ')});
 return changes;
}

/** Elimina las decisiones que realmente pertenecen a niveles posteriores.
 * No modifica trasfondo, especie, perfil, inventario ni rasgos de origen.
 */
export function fighterInputAtPreviousLevel(input:GuidedFighterInput):GuidedFighterInput{
 if(!Number.isInteger(input.level)||input.level<=1||input.level>20)throw new RangeError('Guerrero: no se puede bajar del nivel 1');
 calculateGuidedFighter(input);
 const target=input.level-1;
 const {level4Improvement,level6Improvement,level8Improvement,level12Improvement,level14Improvement,level16Improvement,epicBoon,...rest}=input;
 if(!input.martial)throw new RangeError('Faltan las elecciones de combate');
 const martial={...input.martial,weaponMasteries:[...input.martial.weaponMasteries].slice(0,target>=16?6:target>=10?5:target>=4?4:3),
  ...(target>=7&&input.martial.additionalFightingStyle?{additionalFightingStyle:input.martial.additionalFightingStyle}:{})};
 if(target<7)delete (martial as {additionalFightingStyle?:unknown}).additionalFightingStyle;
 const next:GuidedFighterInput={...rest,level:target as GuidedFighterInput['level'],martial,
  ...(target>=4?{level4Improvement}:{}),
   ...(target>=8?{level8Improvement}:{}),...(target>=6?{level6Improvement}:{}),
  ...(target>=8?{level8Improvement}:{}),...(target>=12?{level12Improvement}:{}),
  ...(target>=14?{level14Improvement}:{}),...(target>=16?{level16Improvement}:{}),
  ...(target>=19?{epicBoon}:{})};
 calculateGuidedFighter(next);
 return next;
}

/** Preserva daño, usos consumidos y registro de combate. Solo recorta los valores
 * que exceden el máximo anterior y termina el turno cuando ya no es válido.
 */
export function previewFighterLevelDown(input:GuidedFighterInput,adventure:AdventureState|null):FighterLevelDownPreview{
 const before=calculateGuidedFighter(input);
 const nextInput=fighterInputAtPreviousLevel(input);
 const after=calculateGuidedFighter(nextInput);
 const old=adventure===null?initialAdventureState(before.sheet):validateAdventureState(adventure,before.sheet);
 const target=nextInput.level;
 const lossOfMaximum=before.sheet.maximumHitPoints-after.sheet.maximumHitPoints;
 const hp=Math.max(0,Math.min(after.sheet.maximumHitPoints,old.fighter.hitPoints.current-lossOfMaximum));
 const originalResources=old.fighter.resources;
 const resource=(id:FighterResourceId)=>({current:Math.min(originalResources[id]?.current??0,fighterResourceMaximum(target,id))});
 const fighter={fighterLevel:target,hitPoints:{current:hp,maximum:after.sheet.maximumHitPoints},resources:{
  second_wind:resource('second_wind'),...(target>=2?{action_surge:resource('action_surge')}:{}) ,...(target>=9?{indomitable:resource('indomitable')}:{})}};
 const allowedAttacks=target>=20?4:target>=11?3:target>=5?2:1;
 const turnInvalid=Boolean(old.combat.turn&&(old.combat.turn.attackActionAttacksUsed??(old.combat.turn.attackActionUsed?1:0))>allowedAttacks);
 const {turn:oldTurn,studiedAttacks,peerlessAimUsed,fortitudeHealUsed,...combatRest}=old.combat;
 const combat={...combatRest,
  ...(oldTurn&&!turnInvalid?{turn:oldTurn}:{}),
  ...(target>=13&&studiedAttacks?{studiedAttacks}:{}),
  ...(target>=19&&peerlessAimUsed!==undefined?{peerlessAimUsed}:{}),
  ...(target>=19&&fortitudeHealUsed!==undefined?{fortitudeHealUsed}:{})};
 const nextAdventure:AdventureState={...old,fighter,combat,spentHitDice:Math.min(old.spentHitDice,target)};
 const snapshot=makeCharacterSnapshot(nextInput,validateAdventureState(nextAdventure,after.sheet));
 const oldTraits=collectCharacterTraits(input,before).traits;
 const existing=new Set(collectCharacterTraits(nextInput,after).traits.map(t=>t.id));
 const lostTraits=oldTraits.filter(t=>!existing.has(t.id)).map(t=>({title:t.title,description:t.explanation??t.summary}));
 const milestones=(FIGHTER_LEVEL_MILESTONES[input.level]??[]).map(title=>({title,description:explainFighterMilestone(title)??'Esta mejora de nivel deja de aplicarse.'}));
 const lost=[...milestones,...lostTraits.filter(t=>!milestones.some(m=>m.title===t.title))];
 const changes:LevelDownNotice[]=[
  {title:'Puntos de golpe',description:`Máximo: ${before.sheet.maximumHitPoints} → ${after.sheet.maximumHitPoints} (${signed(-lossOfMaximum)}). Actuales: ${old.fighter.hitPoints.current} → ${hp}. Se conserva el daño en la medida posible.`},
  {title:'Competencia',description:`Bonificador ${signed(before.sheet.proficiencyBonus)} → ${signed(after.sheet.proficiencyBonus)}.`},
  {title:'Dados de golpe',description:`${input.level}d10 → ${target}d10. Dados gastados: ${old.spentHitDice} → ${snapshot.adventure.spentHitDice}.`},
  ...attributeChanges(before.sheet,after.sheet),
 ];
 for(const id of ['second_wind','action_surge','indomitable'] as const){
  const prev=originalResources[id];const next=snapshot.adventure.fighter.resources[id];
  if(prev&&(!next||fighterResourceMaximum(input.level,id)!==fighterResourceMaximum(target,id))){
   const label={second_wind:'Segundo aliento',action_surge:'Acción súbita',indomitable:'Indomable'}[id];
   changes.push({title:label,description:next?`Usos disponibles: ${prev.current} → ${next.current} (máximo ${fighterResourceMaximum(target,id)}).`:'Deja de estar disponible; se elimina su contador de usos.'});
  }
 }
 if(turnInvalid)changes.push({title:'Turno en curso',description:'Se retira el turno activo porque registraba más ataques que los permitidos en el nuevo nivel. El historial se conserva.'});
 if(input.level===13)changes.push({title:'Ataques estudiados',description:'Se retiran los objetivos pendientes de este rasgo; el historial de ataques permanece.'});
 if(input.level===19)changes.push({title:'Beneficio épico',description:'Se retira la dote épica elegida y su aumento de característica.'});
 return {className:'Guerrero',fromLevel:input.level,toLevel:target,lost,changes,
  preserved:['Identidad, trasfondo, especie, perfil y retrato','Inventario, equipamiento y monedas','Daño y recursos compatibles con los nuevos máximos','Historial de combate, condiciones y marcas manuales de muerte'],snapshot};
}

const spellName=(id:string)=>[...WIZARD_LEVEL_ONE_CANTRIPS,...WIZARD_SPELL_CATALOG].find(s=>s.id===id)?.name??id;
/** Retroceso 19→18→17→…→1, conservando las elecciones adquiridas antes
 * del nivel retirado, las ranuras válidas y el estado persistido de la partida.
 */
export function previewWizardLevelDown(input:GuidedWizardInput,state:WizardLevelOneState):WizardLevelDownPreview{
 if(input.level<=1||input.level>19)throw new RangeError('Mago: no se puede bajar del nivel 1');
 const before=calculateGuidedWizard(input);
 const valid=validateWizardOneState(state,before);
 const target=(input.level-1) as 1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18;
 const gainedSpells=input.spellbookIds.slice(-2);
 const lostBonus=input.level===3?[...(input.evokerBonusSpellIds??[])]:[];
 const lostFree5=input.level===5&&input.evokerLevelThreeSpellId?[input.evokerLevelThreeSpellId]:[];
 const lostFree7=input.level===7&&input.evokerLevelFourSpellId?[input.evokerLevelFourSpellId]:[];
  const lostFree9=input.level===9&&input.evokerLevelFiveSpellId?[input.evokerLevelFiveSpellId]:[];
 const lostFree11=input.level===11&&input.evokerLevelSixSpellId?[input.evokerLevelSixSpellId]:[];
 const lostFree13=input.level===13&&input.evokerLevelSevenSpellId?[input.evokerLevelSevenSpellId]:[];
 const lostFree15=input.level===15&&input.evokerLevelEightSpellId?[input.evokerLevelEightSpellId]:[];
 const lostFree17=input.level===17&&input.evokerLevelNineSpellId?[input.evokerLevelNineSpellId]:[];
 const lostCantrip=input.level===4||input.level===10?[input.cantripIds[input.cantripIds.length-1]]:[];
 const lostSpellIds=[...gainedSpells,...lostBonus,...lostFree5,...lostFree7,...lostFree9,...lostFree11,...lostFree13,...lostFree15,...lostFree17,...lostCantrip];
 const trimmedBook=input.spellbookIds.slice(0,-2);
 const keptExtras=[...(target>=3?input.evokerBonusSpellIds??[]:[]),...(target>=5&&input.evokerLevelThreeSpellId?[input.evokerLevelThreeSpellId]:[]),...(target>=7&&input.evokerLevelFourSpellId?[input.evokerLevelFourSpellId]:[]),...(target>=9&&input.evokerLevelFiveSpellId?[input.evokerLevelFiveSpellId]:[]),...(target>=11&&input.evokerLevelSixSpellId?[input.evokerLevelSixSpellId]:[]),...(target>=13&&input.evokerLevelSevenSpellId?[input.evokerLevelSevenSpellId]:[]),...(target>=15&&input.evokerLevelEightSpellId?[input.evokerLevelEightSpellId]:[]),...(target>=17&&input.evokerLevelNineSpellId?[input.evokerLevelNineSpellId]:[])];
 const permitted=new Set([...trimmedBook,...keptExtras]);
 const wanted=wizardProgression(target,target>=3?'evoker':undefined).preparedSpellCount;
 const filtered=input.preparedIds.filter(id=>permitted.has(id));
 const prepared=[...new Set([...filtered,...trimmedBook,...keptExtras])].slice(0,wanted);
 const {scholarSkill,subclass,evokerBonusSpellIds,evokerLevelThreeSpellId,evokerLevelFourSpellId,evokerLevelFiveSpellId,evokerLevelSixSpellId,evokerLevelSevenSpellId,evokerLevelEightSpellId,evokerLevelNineSpellId,spellMasteryIds,epicBoon,level4Improvement,level8Improvement,level12Improvement,level16Improvement,spellSelection,...other}=input;
 void epicBoon; // Al retroceder a 18 o menos se pierde el Beneficio épico.
 const selection=spellSelection===undefined?undefined:validateWizardSpellSelection({
  learnedIds:spellSelection.learnedIds.filter(id=>!lostSpellIds.includes(id)),
  preparedIds:spellSelection.preparedIds.filter(id=>!lostSpellIds.includes(id)),
 });
 const nextInput:GuidedWizardInput={...other,level:target,spellbookIds:trimmedBook,preparedIds:prepared,
  cantripIds:target<4?input.cantripIds.slice(0,3):target<10?input.cantripIds.slice(0,4):input.cantripIds,
  ...(target>=2?{scholarSkill}:{}),
  ...(target>=3?{subclass,evokerBonusSpellIds}:{}),
  ...(target>=4?{level4Improvement}:{}),
   ...(target>=8?{level8Improvement}:{}),
   ...(target>=12?{level12Improvement}:{}),
   ...(target>=16?{level16Improvement}:{}),
  ...(target>=5?{evokerLevelThreeSpellId}:{}),
  ...(target>=7?{evokerLevelFourSpellId}:{}),
   ...(target>=9?{evokerLevelFiveSpellId}:{}),
  ...(target>=11?{evokerLevelSixSpellId}:{}),
   ...(target>=13?{evokerLevelSevenSpellId}:{}),
   ...(target>=15?{evokerLevelEightSpellId}:{}),
   ...(target>=17?{evokerLevelNineSpellId}:{}),
   ...(target>=18?{spellMasteryIds}:{}),
  ...(selection?{spellSelection:selection}:{})};
 const after=calculateGuidedWizard(nextInput);
 const maximum=wizardProgression(target,target>=3?'evoker':undefined).spellSlots;
 const oldMaximum=valid.magic.slots.maximum;
 const oldMarks=wizardAllSlotMarks(valid);
 const marks:boolean[]=[];
 let offset=0;
 for(let i=0;i<9;i++){
  marks.push(...oldMarks.slice(offset,offset+maximum[i]));
  offset+=oldMaximum[i];
 }
 const remaining=maximum.map((total,i)=>{
  const start=maximum.slice(0,i).reduce((a,b)=>a+b,0);
  return total-marks.slice(start,start+total).filter(Boolean).length;
 });
 const lossOfMaximum=before.maximumHitPoints-after.maximumHitPoints;
 const hp=Math.max(0,Math.min(after.maximumHitPoints,valid.hitPointsCurrent-lossOfMaximum));
 const nextState:WizardLevelOneState={...valid,hitPointsCurrent:hp,slotMarks:marks,
  magic:{...valid.magic,slots:createSlotPool(maximum,remaining),overchannelUses:target>=14?valid.magic.overchannelUses:0}};
 const snapshot=makeWizardCharacterSnapshot(nextInput,validateWizardOneState(nextState,after));
 const lostFeatures:LevelDownNotice[]=[...WIZARD_FEATURES,...EVOKER_FEATURES].filter(f=>f.level===input.level).map(f=>({title:f.title,description:f.description}));
 if(input.level===2&&scholarSkill)lostFeatures.push({title:'Pericia de Erudito',description:`Dejas de duplicar la competencia de ${SKILL_LABELS[scholarSkill]}.`});
 const lost:LevelDownNotice[]=[...lostFeatures,...lostSpellIds.map(id=>({title:`Conjuro: ${spellName(id)}`,description:lostCantrip.includes(id)?`Pierdes el truco adicional del nivel ${input.level}.`:'Deja de estar concedido por la subida de nivel y se retira de las listas de progresión y de la selección manual.'}))];
 const changes:LevelDownNotice[]=[
  {title:'Puntos de golpe',description:`Máximo: ${before.maximumHitPoints} → ${after.maximumHitPoints}. Actuales: ${valid.hitPointsCurrent} → ${hp}. Se conserva el daño en la medida posible.`},
  {title:'Competencia',description:`Bonificador ${signed(wizardProgression(input.level,input.level>=3?'evoker':undefined).proficiencyBonus)} → ${signed(wizardProgression(target,target>=3?'evoker':undefined).proficiencyBonus)}.`},
  {title:'Dados de golpe',description:`${input.level}d6 → ${target}d6.`},
  {title:'Preparación reglamentaria',description:`${input.preparedIds.length} → ${prepared.length} preparados. Se retiran los incompatibles y se mantiene la selección anterior siempre que sea posible.`},
  ...attributeChanges(before,after),
 ];
 if(input.level===4||input.level===10)changes.push({title:'Trucos conocidos',description:`De ${input.cantripIds.length} a ${nextInput.cantripIds.length}. Se retira el truco adicional del nivel ${input.level}.`});
 if(input.level===10)changes.push({title:'Evocación Potenciada',description:'Se pierde el derecho a sumar el modificador de Inteligencia a una tirada de daño de cada conjuro de Evocación lanzado.'});
 if(input.level===11&&input.evokerLevelSixSpellId)changes.push({title:'Experto en Evocación',description:'Se retira el conjuro gratuito obtenido al desbloquear ranuras de nivel 6.'});
 if(input.level===13&&input.evokerLevelSevenSpellId)changes.push({title:'Experto en Evocación',description:'Se retira el conjuro gratuito obtenido al desbloquear ranuras de nivel 7.'});
 if(input.level===15&&input.evokerLevelEightSpellId)changes.push({title:'Experto en Evocación',description:'Se retira el conjuro gratuito obtenido al desbloquear ranuras de nivel 8.'});
 if(input.level===17&&input.evokerLevelNineSpellId)changes.push({title:'Experto en Evocación',description:'Se retira el conjuro gratuito obtenido al desbloquear ranuras de nivel 9.'});
 if(input.level===18)changes.push({title:'Maestría de conjuros',description:'Se pierden los dos conjuros siempre preparados y la posibilidad de lanzarlos gratuitamente; los conjuros siguen en el libro si se aprendieron en niveles anteriores.'});
 if(input.level===19)changes.push({title:'Beneficio épico',description:'Se retira el beneficio elegido y su +1 de característica; se recalculan los PG, la velocidad y los sentidos especiales que concedía.'});
 if(input.level===16)changes.push({title:'Mejora de característica',description:'Se deshace exclusivamente la mejora elegida en nivel 16; se recalculan características, modificadores y PG.'});
 if(input.level===14)changes.push({title:'Sobrecarga',description:`Se pierde el rasgo y se borra el contador de ${valid.magic.overchannelUses} usos desde el último descanso largo.`});
 if(input.level===9&&input.evokerLevelFiveSpellId)changes.push({title:'Experto en Evocación',description:'Se retira el conjuro gratuito obtenido al desbloquear ranuras de nivel 5.'});
  if(input.level===7&&input.evokerLevelFourSpellId)changes.push({title:'Experto en Evocación',description:'Se retira el conjuro gratuito que se obtuvo al acceder a ranuras de nivel 4.'});
 if(input.level===5&&input.evokerLevelThreeSpellId)changes.push({title:'Experto en Evocación',description:'Se retira el conjuro gratuito que se obtuvo al acceder a ranuras de nivel 3.'});
 if(before.spellAttackBonus!==after.spellAttackBonus)changes.push({title:'Ataque mágico',description:`Bonificador ${signed(before.spellAttackBonus)} → ${signed(after.spellAttackBonus)}.`});
 if(before.spellSaveDC!==after.spellSaveDC)changes.push({title:'CD de conjuros',description:`CD ${before.spellSaveDC} → ${after.spellSaveDC}.`});
 if(before.speedFeet!==after.speedFeet)changes.push({title:'Velocidad',description:`${before.speedFeet} → ${after.speedFeet} pies.`});
 if(before.truesightFeet!==after.truesightFeet)changes.push({title:'Visión verdadera',description:`Alcance ${before.truesightFeet} → ${after.truesightFeet} pies.`});
 for(let i=0;i<9;i++)if(oldMaximum[i]!==maximum[i])changes.push({title:`Ranuras de nivel ${i+1}`,description:`Total: ${oldMaximum[i]} → ${maximum[i]}; disponibles: ${valid.magic.slots.remaining[i]} → ${remaining[i]}. Los rombos que desaparecen se eliminan con su estado.`});
 return {className:'Mago',fromLevel:input.level,toLevel:target,lost,changes,
  preserved:['Nombre, perfil, retrato, trasfondo y especie','Inventario, objetos equipados y monedas','PG temporales, inspiración y marcas manuales de muerte','Estado de Recuperación arcana y ranuras que siguen existiendo','Conjuros marcados manualmente que no se obtuvieron en el nivel perdido'],snapshot};
}
