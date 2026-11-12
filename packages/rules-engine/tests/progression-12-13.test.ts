import {describe,it,expect} from 'vitest';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';
import {applyFighterLevel12Improvement,adjacentFighterLevel} from '../src/progression';
import {fighterResourceMaximum,initialFighterState,spendFighterResource,finishFighterRest} from '../src/resources';
import {applyAdventureAction,initialAdventureState,validateAdventureState,advanceAdventureLevel,resourceDisplay} from '../src/adventure';
import {prepareFighterLevelUp} from '../src/level-up';
import {makeCharacterSnapshot,validateCharacterSnapshot} from '../src/persistence';
import {calculateWeaponAttack,resolveWeaponAttack} from '../src/attacks';
import {recordWeaponAttack,hasStudiedAdvantage,clearStudiedAttack,initialCombatState,validateCombatState,startCharacterTurn,endCharacterTurn} from '../src/combat';
import {applyInventoryAction} from '../src/inventory';
import type {MasteryContext} from '../src/mastery-effects';

const base:GuidedFighterInput={
  name:'Aldric',level:11,background:'soldier',species:'human',
  assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
  increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
  fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'tough',humanSize:'medium',
  armor:'chain_mail',shield:false,
  level4Improvement:{mode:'plus_two',first:'strength'},
  level6Improvement:{mode:'plus_two',first:'constitution'},
  level8Improvement:{mode:'plus_two',first:'wisdom'},
  martial:{fightingStyle:'defense',additionalFightingStyle:'archery',
    weaponMasteries:['greatsword','flail','javelin','shortsword','longbow'],startingPackage:'a'},
  backgroundEquipment:{startingPackage:'a',gamingSet:'dice_set'}
};
const at12=():GuidedFighterInput=>({...base,level:12,level12Improvement:{mode:'plus_two',first:'wisdom'}});
const at13=():GuidedFighterInput=>({...at12(),level:13});
const context=(targetName='Goblin A',targetIsCreature=true):MasteryContext=>({targetName,targetIsCreature,targetSize:'small',dealtDamage:false});
const setup=(level:11|12|13=13)=>{
 const input=level===11?base:level===12?at12():at13();
 const output=calculateGuidedFighter(input);
 const profile=calculateWeaponAttack(output.sheet,'greatsword',['defense','archery'],input.martial!.weaponMasteries);
 const inventory=output.inventory!;
 const miss=resolveWeaponAttack(profile,{firstD20:2,targetAC:30});
 const hit=resolveWeaponAttack(profile,{firstD20:17,targetAC:10,damageRolls:[4,5]});
 return {input,output,profile,inventory,miss,hit};
};

describe('Actualización 31 · Guerrero 12 y 13',()=>{
 it('el selector avanza de 11 a 13 sin saltos',()=>{
   expect(adjacentFighterLevel(11,1)).toBe(12);
   expect(adjacentFighterLevel(12,1)).toBe(13);
   expect(adjacentFighterLevel(13,1)).toBe(14);
   expect(adjacentFighterLevel(13,-1)).toBe(12);
 });
 it('nivel 12 exige una nueva mejora independiente y no permite adelantarla',()=>{
   expect(()=>calculateGuidedFighter({...at12(),level12Improvement:undefined})).toThrow();
   expect(()=>calculateGuidedFighter({...base,level12Improvement:at12().level12Improvement})).toThrow();
   expect(calculateGuidedFighter(at12()).sheet.features).toContain('ability_score_improvement_level_12');
 });
 it('nivel 12 conserva las mejoras previas y aplica +2 a una característica',()=>{
   const s=calculateGuidedFighter(at12()).sheet;
   expect(s.abilityScores.strength).toBe(19);
   expect(s.abilityScores.constitution).toBe(16);
   expect(s.abilityScores.wisdom).toBe(16);
   expect(s.proficiencyBonus).toBe(4);
 });
 it('nivel 12 permite +1/+1, pero prohíbe repetir la característica',()=>{
   const sheet=calculateGuidedFighter({...at12(),level12Improvement:{mode:'two_ones',first:'wisdom',second:'dexterity'}}).sheet;
   expect(sheet.abilityScores.wisdom).toBe(15);
   expect(sheet.abilityScores.dexterity).toBe(15);
   expect(()=>calculateGuidedFighter({...at12(),level12Improvement:{mode:'two_ones',first:'wisdom',second:'wisdom'}})).toThrow();
 });
 it('mejoras no superan 20 y no aceptan elecciones inválidas',()=>{
   expect(()=>applyFighterLevel12Improvement({strength:19,dexterity:14,constitution:14,intelligence:10,wisdom:12,charisma:8},{mode:'plus_two',first:'strength'})).toThrow();
   expect(()=>calculateGuidedFighter({...at12(),level12Improvement:{mode:'plus_two',first:'strength'}})).toThrow();
 });
 it('una mejora de Constitución a nivel 12 incrementa PG retroactivamente',()=>{
   const old=calculateGuidedFighter(at12()).sheet;
   const newer=calculateGuidedFighter({...at12(),level12Improvement:{mode:'plus_two',first:'constitution'}}).sheet;
   expect(newer.maximumHitPoints-old.maximumHitPoints).toBe(12);
 });
 it('Guerrero 13 aumenta competencia a +5 y desbloquea Ataques estudiados',()=>{
   const s=calculateGuidedFighter(at13()).sheet;
   expect(s.proficiencyBonus).toBe(5);
   expect(s.features).toContain('studied_attacks');
   expect(s.resources.indomitable?.maximum).toBe(2);
 });
 it('cada rasgo aparece una sola vez en niveles 11, 12 y 13',()=>{
   for(const level of [11,12,13] as const){
     const features=setup(level).output.sheet.features;
     expect(new Set(features).size).toBe(features.length);
     expect(features.filter(x=>x==='studied_attacks')).toHaveLength(level===13?1:0);
   }
 });
 it('Indomable pasa de 1 uso en 12 a 2 en 13',()=>{
   expect(fighterResourceMaximum(12,'indomitable')).toBe(1);
   expect(fighterResourceMaximum(13,'indomitable')).toBe(2);
   expect(initialFighterState(13,110).resources.indomitable?.current).toBe(2);
 });
 it('la subida añade un uso de Indomable sin restaurar el previamente gastado',()=>{
   const old=setup(12).output.sheet,newer=setup(13).output.sheet;
   let adventure=initialAdventureState(old);
   adventure={...adventure,fighter:spendFighterResource(adventure.fighter,'indomitable')};
   const advanced=advanceAdventureLevel(adventure,old,newer);
   expect(advanced.fighter.resources.indomitable?.current).toBe(1);
   expect(resourceDisplay(advanced,newer).indomitable?.maximum).toBe(2);
 });
 it('dos usos de Indomable se gastan y tercero queda bloqueado',()=>{
   const sheet=setup().output.sheet;
   let a=initialAdventureState(sheet);
   for(let i=0;i<2;i++)a=applyAdventureAction(a,{type:'indomitable',originalTotal:2,difficultyClass:20,d20:9,ability:'wisdom'},sheet).state;
   expect(a.fighter.resources.indomitable?.current).toBe(0);
   expect(()=>applyAdventureAction(a,{type:'indomitable',originalTotal:2,difficultyClass:20,d20:9,ability:'wisdom'},sheet)).toThrow();
 });
 it('solo descanso largo repone ambos usos de Indomable',()=>{
   const a=spendFighterResource(initialFighterState(13,100),'indomitable');
   expect(finishFighterRest(a,'short_rest').resources.indomitable?.current).toBe(1);
   expect(finishFighterRest(a,'long_rest').resources.indomitable?.current).toBe(2);
 });
 it('se puede subir de 11 a 12 y de 12 a 13 conservando la sesión',()=>{
   const old=setup(11),middle=setup(12),last=setup(13);
   const damaged=applyAdventureAction(initialAdventureState(old.output.sheet),{type:'damage',amount:6},old.output.sheet).state;
   const a=prepareFighterLevelUp(old.input,damaged,middle.input).snapshot;
   const b=prepareFighterLevelUp(a.input,a.adventure,last.input).snapshot;
   expect(b.input.level).toBe(13);
   expect(b.adventure.fighter.hitPoints.current).toBe(last.output.sheet.maximumHitPoints-6);
   expect(validateAdventureState(b.adventure,last.output.sheet).fighter.fighterLevel).toBe(13);
 });
 it('un fallo contra criatura nominada crea Ataques estudiados solo en nivel 13',()=>{
   const l=setup();const r=recordWeaponAttack(initialCombatState(),l.inventory,l.profile,l.miss,context(),'untracked',13).combat;
   expect(r.studiedAttacks).toHaveLength(1);
   expect(hasStudiedAdvantage(r.studiedAttacks,'goblin a')).toBe(true);
   expect(hasStudiedAdvantage(r.studiedAttacks,'Goblin B')).toBe(false);
   const l12=setup(12);
   expect(recordWeaponAttack(initialCombatState(),l12.inventory,l12.profile,l12.miss,context(),'untracked',12).combat.studiedAttacks).toBeUndefined();
 });
 it('un fallo sin CA, sin criatura o sin nombre no concede ventaja',()=>{
   const l=setup();
   const unknown=resolveWeaponAttack(l.profile,{firstD20:11});
   for(const [roll,ctx] of [[unknown,context()],[l.miss,context('Puerta',false)],[l.miss,context('')]] as const){
     const c=recordWeaponAttack(initialCombatState(),l.inventory,l.profile,roll,ctx,'untracked',13).combat;
     expect(c.studiedAttacks).toHaveLength(0);
   }
 });
 it('la próxima tirada contra el mismo objetivo consume el efecto, sea impacto o fallo',()=>{
   const l=setup();const first=recordWeaponAttack(initialCombatState(),l.inventory,l.profile,l.miss,context(),'untracked',13).combat;
   const other=recordWeaponAttack(first,l.inventory,l.profile,l.hit,context('Goblin B'),'untracked',13).combat;
   expect(hasStudiedAdvantage(other.studiedAttacks,'Goblin A')).toBe(true);
   const second=recordWeaponAttack(other,l.inventory,l.profile,l.hit,context('Goblin A'),'untracked',13).combat;
   expect(second.studiedAttacks).toHaveLength(0);
 });
 it('si el siguiente ataque vuelve a fallar, renueva la ventaja, sin duplicarla',()=>{
   const l=setup();const first=recordWeaponAttack(initialCombatState(),l.inventory,l.profile,l.miss,context(),'untracked',13).combat;
   const second=recordWeaponAttack(first,l.inventory,l.profile,l.miss,context('goblin a'),'untracked',13).combat;
   expect(second.studiedAttacks).toHaveLength(1);
   expect(second.studiedAttacks?.[0].sourceAttackId).toBe(second.attacks[1].id);
 });
 it('si se confirma con gestor de turnos, caduca al final del siguiente turno',()=>{
   const l=setup();const turn1=startCharacterTurn(initialCombatState());
   const first=recordWeaponAttack(turn1,l.inventory,l.profile,l.miss,context(),'untracked',13).combat;
   expect(first.studiedAttacks?.[0].sourceTurn).toBe(1);
   const end1=endCharacterTurn(first);
   expect(end1.studiedAttacks).toHaveLength(1);
   const start2=startCharacterTurn(end1);
   expect(start2.studiedAttacks).toHaveLength(1);
   const end2=endCharacterTurn(start2);
   expect(end2.studiedAttacks).toHaveLength(0);
 });
 it('un estado pendiente se puede retirar manualmente',()=>{
   const l=setup();const first=recordWeaponAttack(initialCombatState(),l.inventory,l.profile,l.miss,context(),'untracked',13).combat;
   expect(clearStudiedAttack(first,first.studiedAttacks![0].id).studiedAttacks).toHaveLength(0);
   expect(()=>clearStudiedAttack(first,9999)).toThrow();
 });
 it('Ataques estudiados se guarda y se recupera sin migración SQL',()=>{
   const l=setup();const combat=recordWeaponAttack(initialCombatState(),l.inventory,l.profile,l.miss,context(),'untracked',13).combat;
   const adv={...initialAdventureState(l.output.sheet),combat};
   const snap=validateCharacterSnapshot(JSON.parse(JSON.stringify(makeCharacterSnapshot(l.input,adv))));
   expect(snap.input.level).toBe(13);
   expect(hasStudiedAdvantage(snap.adventure.combat.studiedAttacks,'Goblin A')).toBe(true);
   expect(snap.adventure.fighter.resources.indomitable?.current).toBe(2);
 });
 it('valida ids duplicados, origen imposible y nombres vacíos',()=>{
   const l=setup();const combat=recordWeaponAttack(initialCombatState(),l.inventory,l.profile,l.miss,context(),'untracked',13).combat;
   expect(validateCombatState(combat).studiedAttacks).toHaveLength(1);
   expect(()=>validateCombatState({...combat,studiedAttacks:[combat.studiedAttacks![0],combat.studiedAttacks![0]]})).toThrow();
   expect(()=>validateCombatState({...combat,studiedAttacks:[{...combat.studiedAttacks![0],sourceAttackId:999}]})).toThrow();
   expect(()=>validateCombatState({...combat,studiedAttacks:[{...combat.studiedAttacks![0],target:''}]})).toThrow();
 });
});
