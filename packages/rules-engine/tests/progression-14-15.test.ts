import {describe,it,expect} from 'vitest';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';
import {adjacentFighterLevel,applyFighterLevel14Improvement} from '../src/progression';
import {calculateWeaponAttack,resolveWeaponAttack,calculateOwnedWeaponAttack} from '../src/attacks';
import {fighterResourceMaximum} from '../src/resources';
import {initialAdventureState,applyAdventureAction,validateAdventureState} from '../src/adventure';
import {prepareFighterLevelUp,prepareFighterLevelUpWithFreshSession} from '../src/level-up';
import {makeCharacterSnapshot,validateCharacterSnapshot} from '../src/persistence';

const base:GuidedFighterInput={
  name:'Campeona',level:13,background:'soldier',species:'human',
  assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
  increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
  fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'tough',humanSize:'medium',
  armor:'chain_mail',shield:false,
  level4Improvement:{mode:'plus_two',first:'strength'},
  level6Improvement:{mode:'plus_two',first:'constitution'},
  level8Improvement:{mode:'plus_two',first:'wisdom'},
  level12Improvement:{mode:'plus_two',first:'wisdom'},
  martial:{fightingStyle:'defense',additionalFightingStyle:'archery',
    weaponMasteries:['greatsword','flail','javelin','shortsword','longbow'],startingPackage:'a'},
  backgroundEquipment:{startingPackage:'a',gamingSet:'dice_set'}
};
const at14=():GuidedFighterInput=>({...base,level:14,level14Improvement:{mode:'plus_two',first:'charisma'}});
const at15=():GuidedFighterInput=>({...at14(),level:15});
const sheet=(input:GuidedFighterInput)=>calculateGuidedFighter(input).sheet;
const profile=(input:GuidedFighterInput)=>calculateWeaponAttack(sheet(input),'greatsword',['defense','archery'],input.martial!.weaponMasteries);

describe('Actualización 32 · niveles 14 y 15',()=>{
 it('el indicador avanza 13→14→15 y permite continuar hasta 17',()=>{
   expect(adjacentFighterLevel(13,1)).toBe(14);
   expect(adjacentFighterLevel(14,1)).toBe(15);
   expect(adjacentFighterLevel(15,1)).toBe(16);
   expect(adjacentFighterLevel(17,1)).toBeNull();
   expect(adjacentFighterLevel(15,-1)).toBe(14);
 });
 it('nivel 14 exige una quinta mejora y no se puede adelantar',()=>{
   expect(()=>calculateGuidedFighter({...at14(),level14Improvement:undefined})).toThrow();
   expect(()=>calculateGuidedFighter({...base,level14Improvement:at14().level14Improvement})).toThrow();
 });
 it('las mejoras de niveles 4, 6, 8, 12 y 14 se acumulan',()=>{
   const s=sheet(at14());
   expect(s.abilityScores.strength).toBe(19);
   expect(s.abilityScores.constitution).toBe(16);
   expect(s.abilityScores.wisdom).toBe(16);
   expect(s.abilityScores.charisma).toBe(10);
   expect(s.proficiencyBonus).toBe(5);
   expect(s.features).toContain('ability_score_improvement_level_14');
 });
 it('nivel 14 acepta +1/+1 distinto sin modificar las mejoras anteriores',()=>{
   const input:GuidedFighterInput={...at14(),level14Improvement:{mode:'two_ones',first:'strength',second:'dexterity'}};
   const s=sheet(input);
   expect(s.abilityScores.strength).toBe(20);
   expect(s.abilityScores.dexterity).toBe(15);
   expect(s.abilityScores.wisdom).toBe(16);
 });
 it('rechaza +1/+1 duplicado y mejoras que exceden puntuación 20',()=>{
   expect(()=>calculateGuidedFighter({...at14(),level14Improvement:{mode:'two_ones',first:'wisdom',second:'wisdom'}})).toThrow();
   expect(()=>calculateGuidedFighter({...at14(),level14Improvement:{mode:'plus_two',first:'strength'}})).toThrow();
   expect(()=>applyFighterLevel14Improvement(sheet(base).abilityScores,{mode:'plus_two',first:'strength'})).toThrow();
 });
 it('una mejora de Constitución en nivel 14 altera los PG máximos de todos los niveles',()=>{
   const normal=sheet(at14());
   const con=sheet({...at14(),level14Improvement:{mode:'plus_two',first:'constitution'}});
   expect(con.maximumHitPoints-normal.maximumHitPoints).toBe(14);
 });
 it('nivel 15 obtiene Crítico superior y conserva las demás habilidades',()=>{
   const s=sheet(at15());
   expect(s.features).toContain('champion_superior_critical');
   expect(s.features).toContain('champion_improved_critical');
   expect(s.features).toContain('studied_attacks');
   expect(s.features).toContain('two_extra_attacks');
   expect(s.features).toContain('champion_heroic_warrior');
   expect(s.proficiencyBonus).toBe(5);
 });
 it('ninguna característica de nivel 14 ni Crítico superior aparece antes de tiempo',()=>{
   expect(sheet(base).features.includes('ability_score_improvement_level_14')).toBe(false);
   expect(sheet(at14()).features.includes('champion_superior_critical')).toBe(false);
   expect(profile(at14()).criticalMinimum).toBe(19);
 });
 it('nivel 15 cambia el umbral de crítico de 19 a 18',()=>{
   expect(profile(at15()).criticalMinimum).toBe(18);
   expect(profile(at14()).criticalMinimum).toBe(19);
 });
 it('una tirada natural de 17 no es crítica y no impacta automáticamente',()=>{
   const result=resolveWeaponAttack(profile(at15()),{firstD20:17,targetAC:99,damageRolls:[2,3]});
   expect(result.critical).toBe(false);
   expect(result.hit).toBe(false);
 });
 it('una tirada natural de 18 es crítica e impacta incluso a CA elevada',()=>{
   const result=resolveWeaponAttack(profile(at15()),{firstD20:18,targetAC:99,damageRolls:[1,2,3,4]});
   expect(result.critical).toBe(true);
   expect(result.hit).toBe(true);
   expect(result.damageDiceNeeded).toBe(4);
   expect(result.damageTotal).toBe(14);
 });
 it('19 y 20 siguen siendo críticos con el Campeón de nivel 15',()=>{
   for(const natural of [19,20]){
     const result=resolveWeaponAttack(profile(at15()),{firstD20:natural,targetAC:99,damageRolls:[1,2,3,4]});
     expect(result.critical).toBe(true);
     expect(result.damageDiceNeeded).toBe(4);
   }
 });
 it('el ataque de nivel 15 mantiene el daño y la maestría normales del arma',()=>{
   const p=profile(at15());
   expect(p.mastery).toBe('Graze');
   expect(p.damageDice?.count).toBe(2);
   expect(p.damageModifier).toBe(4);
 });
 it('el arma mágica +2 obtiene Crítico superior sin duplicar la mejora fija',()=>{
   const input:GuidedFighterInput={...at15(),inventoryActions:[
     {type:'magic_grant',itemId:'weapon_enhancement',weaponId:'greatsword',enhancement:2},
     {type:'magic_wear',instanceId:'ward-1',worn:true}
   ]};
   const output=calculateGuidedFighter(input);
   const enhanced=calculateOwnedWeaponAttack(output.sheet,output.inventory!,'magic:ward-1',['defense','archery'],input.martial!.weaponMasteries);
   const plain=profile(at15());
   expect(enhanced.criticalMinimum).toBe(18);
   expect(enhanced.attackBonus).toBe(plain.attackBonus+2);
   expect(enhanced.damageModifier).toBe(plain.damageModifier+2);
   const result=resolveWeaponAttack(enhanced,{firstD20:18,targetAC:99,damageRolls:[1,2,3,4]});
   expect(result.damageDiceNeeded).toBe(4);
   expect(result.damageTotal).toBe(16);
 });
 it('niveles 14 y 15 mantienen recursos, 5 maestrías y tres ataques por acción',()=>{ 
   for(const level of [14,15]){
     const input=level===14?at14():at15();
     const s=sheet(input);
     expect(s.resources.second_wind?.maximum).toBe(4);
     expect(s.resources.indomitable?.maximum).toBe(2);
     expect(fighterResourceMaximum(level,'action_surge')).toBe(1);
     expect(s.features).toContain('two_extra_attacks');
     expect(calculateGuidedFighter(input).martial?.masteries).toHaveLength(5);
   }
 });
 it('los rasgos no tienen claves duplicadas entre niveles 13, 14 y 15',()=>{
   for(const input of [base,at14(),at15()]){
     const features=sheet(input).features;
     expect(new Set(features).size).toBe(features.length);
   }
 });
 it('la transición 13→14→15 conserva el daño sufrido y consolida el nivel',()=>{
   const startingSheet=sheet(base);
   const damaged=applyAdventureAction(initialAdventureState(startingSheet),{type:'damage',amount:7},startingSheet).state;
   const first=prepareFighterLevelUp(base,damaged,at14());
   const firstSheet=sheet(at14());
   expect(first.snapshot.input.level).toBe(14);
   expect(first.snapshot.adventure.fighter.fighterLevel).toBe(14);
   expect(first.snapshot.adventure.fighter.hitPoints.maximum-first.snapshot.adventure.fighter.hitPoints.current).toBe(7);
   const second=prepareFighterLevelUp(at14(),first.snapshot.adventure,at15());
   expect(second.snapshot.input.level).toBe(15);
   expect(second.snapshot.adventure.fighter.fighterLevel).toBe(15);
   expect(second.snapshot.adventure.fighter.hitPoints.maximum-second.snapshot.adventure.fighter.hitPoints.current).toBe(7);
   expect(validateAdventureState(second.snapshot.adventure,sheet(at15()))).toBeDefined();
 });
 it('el guardado de nivel 14 y 15 restaura la quinta mejora y el estado de combate',()=>{
   const saved14=validateCharacterSnapshot(JSON.parse(JSON.stringify(makeCharacterSnapshot(at14()))));
   expect(saved14.input.level).toBe(14);
   expect(saved14.input.level14Improvement?.first).toBe('charisma');
   const s15=sheet(at15());
   const damaged=applyAdventureAction(initialAdventureState(s15),{type:'damage',amount:11},s15).state;
   const saved15=validateCharacterSnapshot(JSON.parse(JSON.stringify(makeCharacterSnapshot(at15(),damaged))));
   expect(saved15.input.level).toBe(15);
   expect(saved15.adventure.fighter.fighterLevel).toBe(15);
   expect(saved15.adventure.fighter.hitPoints.maximum-saved15.adventure.fighter.hitPoints.current).toBe(11);
 });
 it('la recuperación de sesión excepcional admite el nivel 15 pero no saltos',()=>{
   const recovered=prepareFighterLevelUpWithFreshSession(at14(),at15());
   expect(recovered.snapshot.input.level).toBe(15);
   expect(()=>prepareFighterLevelUpWithFreshSession(base,at15())).toThrow();
 });
});
