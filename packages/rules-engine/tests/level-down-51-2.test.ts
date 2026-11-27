import {describe,it,expect} from 'vitest';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';
import {buildFighterLevelUpCandidate,type FighterLevelUpChoices} from '../src/level-up-wizard';
import {previewFighterLevelDown,previewWizardLevelDown} from '../src/level-down';
import {initialAdventureState,applyAdventureAction,setManualDeathSaveMark} from '../src/adventure';
import {spendFighterResource} from '../src/resources';
import {validateCharacterSnapshot} from '../src/persistence';
import {EMPTY_CHARACTER_PROFILE} from '../src/character-profile';
import {initialWizardOneState,validateWizardCharacterSnapshot,WIZARD_LEVEL_ONE_DEFAULTS,type GuidedWizardInput} from '../src/wizard-creation';
import {prepareWizardLevelUp} from '../src/wizard-level-up';
import {toggleWizardSlotMark,wizardSlotMarks} from '../src/wizard-slot-marks';

const fighter:GuidedFighterInput={name:'Aldric',level:1,background:'soldier',species:'human',
 assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
 increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
 fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'alert',humanSize:'medium',
 armor:'chain_mail',shield:false,
 martial:{fightingStyle:'defense',weaponMasteries:['greatsword','flail','javelin'],startingPackage:'a'},
 backgroundEquipment:{startingPackage:'a',gamingSet:'dice_set'},inventoryActions:[],profile:EMPTY_CHARACTER_PROFILE};
const increases={4:{mode:'plus_two',first:'strength'},6:{mode:'plus_two',first:'constitution'},8:{mode:'plus_two',first:'wisdom'},12:{mode:'plus_two',first:'wisdom'},14:{mode:'plus_two',first:'charisma'},16:{mode:'plus_two',first:'intelligence'}} as const;
function choices(level:number):FighterLevelUpChoices{return {
 ...(level in increases?{improvement:increases[level as keyof typeof increases]}:{}),
 ...(level===4?{newMastery:'shortsword' as const}:{}),...(level===10?{newMastery:'longbow' as const}:{}),
 ...(level===16?{newMastery:'warhammer' as const}:{}),...(level===7?{additionalFightingStyle:'archery' as const}:{}),
 ...(level===19?{epicBoon:{id:'combat_prowess' as const,ability:'charisma' as const}}:{})};}
function atLevel(target:number):GuidedFighterInput{let input=fighter;for(let i=2;i<=target;i++)input=buildFighterLevelUpCandidate(input,choices(i));return input;}

const wizard:GuidedWizardInput={classId:'wizard',level:1,name:'Neris',species:'dwarf',background:'sage',
 assignedAbilities:{strength:8,dexterity:13,constitution:14,intelligence:15,wisdom:12,charisma:10},
 increaseMode:'two_plus_one',plusTwoAbility:'intelligence',plusOneAbility:'constitution',
 wizardSkills:['insight','investigation'],equipmentChoice:'equipment',
 cantripIds:[...WIZARD_LEVEL_ONE_DEFAULTS.cantrips],spellbookIds:[...WIZARD_LEVEL_ONE_DEFAULTS.spellbook],preparedIds:[...WIZARD_LEVEL_ONE_DEFAULTS.prepared]};
function wizardAt3(){
 const two=prepareWizardLevelUp(wizard,initialWizardOneState(wizard),{newSpellIds:['alarm','shield'],preparedIds:[...wizard.preparedIds,'shield'],scholarSkill:'arcana'});
 const three=prepareWizardLevelUp(two.input,two.state,{newSpellIds:['misty_step','web'],preparedIds:[...two.input.preparedIds,'web'],evokerBonusSpellIds:['darkness','scorching_ray']});
 return {two,three};
}

describe('Actualización 51.2: retroceso de nivel con confirmación y conservación de datos',()=>{
 it('no permite bajar desde nivel 1 en ninguna clase',()=>{
  expect(()=>previewFighterLevelDown(fighter,null)).toThrow();
  expect(()=>previewWizardLevelDown(wizard,initialWizardOneState(wizard))).toThrow();
 });
 it('recorre los 19 retrocesos de Guerrero, eliminando decisiones y rasgos del nivel perdido',()=>{
  for(let level=2;level<=20;level++){
   const before=atLevel(level),oldSnapshot=initialAdventureState(calculateGuidedFighter(before).sheet);
   const preview=previewFighterLevelDown(before,oldSnapshot);
   expect(preview.toLevel).toBe(level-1);
   expect(preview.snapshot.input.level).toBe(level-1);
   expect(preview.snapshot.adventure.fighter.fighterLevel).toBe(level-1);
   expect(validateCharacterSnapshot(JSON.parse(JSON.stringify(preview.snapshot))).input.level).toBe(level-1);
   expect(preview.lost.length).toBeGreaterThan(0);
  }
 });
 it('Guerrero al bajar de 4 a 3 retira mejora y cuarta maestría',()=>{
  const result=previewFighterLevelDown(atLevel(4),null);
  expect(result.snapshot.input.level4Improvement).toBe(undefined);
  expect(result.snapshot.input.martial?.weaponMasteries).toHaveLength(3);
 });
 it('Guerrero al bajar de 7 a 6 retira segundo estilo y conserva el primero',()=>{
  const result=previewFighterLevelDown(atLevel(7),null);
  expect(result.snapshot.input.martial?.additionalFightingStyle).toBe(undefined);
  expect(result.snapshot.input.martial?.fightingStyle).toBe('defense');
 });
 it('Guerrero al bajar de 19 a 18 retira beneficio épico y conserva inventario',()=>{
  const current=atLevel(19),result=previewFighterLevelDown(current,null);
  expect(result.snapshot.input.epicBoon).toBe(undefined);
  expect(result.snapshot.input.inventoryActions).toEqual(current.inventoryActions);
 });
 it('Guerrero conserva daño y recursos gastados, y recorta solo lo incompatible',()=>{
  const current=atLevel(10),sheet=calculateGuidedFighter(current).sheet;
  let game=applyAdventureAction(initialAdventureState(sheet),{type:'damage',amount:13},sheet).state;
  game={...game,fighter:spendFighterResource(game.fighter,'action_surge')};
  game=setManualDeathSaveMark(game,sheet,'successes',0,true);
  const result=previewFighterLevelDown(current,game);
  const after=calculateGuidedFighter(result.snapshot.input).sheet;
  expect(after.maximumHitPoints-result.snapshot.adventure.fighter.hitPoints.current).toBe(13);
  expect(result.snapshot.adventure.fighter.resources.action_surge?.current).toBe(0);
  expect(result.snapshot.adventure.manualDeathMarks?.successes[0]).toBe(true);
  expect(result.snapshot.adventure.combat.round).toBe(game.combat.round);
 });
 it('Guerrero en nivel 2 pierde Acción súbita al volver a nivel 1',()=>{
  const result=previewFighterLevelDown(atLevel(2),null);
  expect(result.snapshot.adventure.fighter.resources.action_surge).toBe(undefined);
  expect(result.lost.some(item=>item.title.includes('Acción súbita'))).toBe(true);
 });
 it('la vista previa de Guerrero no modifica su input ni su partida originales',()=>{
  const input=atLevel(9),state=initialAdventureState(calculateGuidedFighter(input).sheet);
  const old=JSON.stringify({input,state});previewFighterLevelDown(input,state);
  expect(JSON.stringify({input,state})).toBe(old);
 });
 it('Mago 3 a 2 pierde Evocación, sus conjuros y las ranuras de nivel 2',()=>{
  const {three}=wizardAt3();const result=previewWizardLevelDown(three.input,three.state);
  expect(result.snapshot.input.level).toBe(2);
  expect(result.snapshot.input.subclass).toBe(undefined);
  expect(result.snapshot.input.evokerBonusSpellIds).toBe(undefined);
  expect(result.snapshot.input.spellbookIds).toHaveLength(8);
  expect(result.snapshot.wizardState.magic.slots.maximum.slice(0,2)).toEqual([3,0]);
  expect(result.lost.some(item=>item.title.includes('Truco potente'))).toBe(true);
  expect(validateWizardCharacterSnapshot(result.snapshot).input.level).toBe(2);
 });
 it('Mago 2 a 1 pierde Erudito y ajusta sus 4 conjuros preparados',()=>{
  const {two}=wizardAt3();const result=previewWizardLevelDown(two.input,two.state);
  expect(result.snapshot.input.level).toBe(1);
  expect(result.snapshot.input.scholarSkill).toBe(undefined);
  expect(result.snapshot.input.spellbookIds).toHaveLength(6);
  expect(result.snapshot.input.preparedIds).toHaveLength(4);
  expect(result.snapshot.wizardState.magic.slots.maximum[0]).toBe(2);
  expect(validateWizardCharacterSnapshot(result.snapshot).input.level).toBe(1);
 });
 it('Mago conserva daño, inventario, inspiración, marcadores y ranuras supervivientes',()=>{
  const {three}=wizardAt3();let state=toggleWizardSlotMark(three.state,0,1);
  state=toggleWizardSlotMark(state,0,2);
  state={...state,hitPointsCurrent:three.state.hitPointsCurrent-6,heroicInspiration:true,
   manualDeathMarks:{successes:[true,false,false] as const,failures:[false,true,false] as const}};
  const preview=previewWizardLevelDown(three.input,state);
  const saved=preview.snapshot;
  expect(saved.wizardState.magic.slots.maximum[1]).toBe(0);
  expect(wizardSlotMarks(saved.wizardState,1)).toEqual([true,false,false]);
  expect(saved.wizardState.heroicInspiration).toBe(true);
  expect(saved.wizardState.manualDeathMarks?.failures[1]).toBe(true);
  expect(saved.input.inventoryActions).toEqual(three.input.inventoryActions);
 });
 it('Mago no modifica su estado al abrir o cancelar la vista previa',()=>{
  const {three}=wizardAt3();const original=JSON.stringify(three);
  previewWizardLevelDown(three.input,three.state);
  expect(JSON.stringify(three)).toBe(original);
 });
});
