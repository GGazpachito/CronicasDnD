import {describe,it,expect} from 'vitest';
import {calculateGuidedFighter, type GuidedFighterInput} from '../src/guided';
const base=():GuidedFighterInput=>({
 name:'Aldric',level:1,background:'soldier',species:'human',
 assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
 increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
 fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'alert',humanSize:'medium',armor:'chain_mail',shield:true
});
describe('Creación guiada PHB 2024 (paso 08)',()=>{
 it('aplica trasfondo y competencia Guerrero y humana',()=>{const r=calculateGuidedFighter(base());expect(r.sheet.abilityScores.strength).toBe(17);expect(r.sheet.abilityScores.constitution).toBe(14);expect(r.sheet.skillBonuses.investigation).toBe(2);expect(r.sheet.skillBonuses.perception).toBe(3)});
 it('el humano con Alerta conserva los PG normales de Guerrero',()=>{expect(calculateGuidedFighter(base()).sheet.maximumHitPoints).toBe(12);expect(calculateGuidedFighter({...base(),level:3}).sheet.maximumHitPoints).toBe(28)});
 it('Enano concede 1 PG por nivel',()=>{const r=calculateGuidedFighter({...base(),species:'dwarf'});expect(r.sheet.maximumHitPoints).toBe(13);expect(calculateGuidedFighter({...base(),species:'dwarf',level:3}).sheet.maximumHitPoints).toBe(31)});
 it('Criminal aplica iniciativa Alerta',()=>{const b=base();const r=calculateGuidedFighter({...b,background:'criminal',plusTwoAbility:'dexterity',plusOneAbility:'constitution',fighterSkills:['perception','survival'],humanFeat:'savage_attacker'});expect(r.sheet.initiative).toBe(5)});
 it('Elfo de los bosques tiene 35 pies y Sentidos agudos',()=>{const b=base();const r=calculateGuidedFighter({...b,species:'elf',elfLineage:'wood_elf',elfSenseSkill:'insight',elfSpellAbility:'wisdom'});expect(r.origin.speedFeet).toBe(35);expect(r.sheet.skillBonuses.insight).toBe(3)});
 it('tres incrementos +1 solo entre las tres del trasfondo',()=>{const r=calculateGuidedFighter({...base(),increaseMode:'three_ones'});expect(r.sheet.abilityScores.strength).toBe(16);expect(r.sheet.abilityScores.dexterity).toBe(15);expect(r.sheet.abilityScores.constitution).toBe(14)});
 it('no permite repetir valores de la matriz estándar',()=>{expect(()=>calculateGuidedFighter({...base(),assignedAbilities:{...base().assignedAbilities,strength:14}})).toThrow(/matriz estándar/)});
 it('no permite mejorar una habilidad fuera de las tres del trasfondo',()=>{expect(()=>calculateGuidedFighter({...base(),plusTwoAbility:'wisdom'})).toThrow()});
 it('no permite aplicar +2 y +1 a la misma característica',()=>{expect(()=>calculateGuidedFighter({...base(),plusOneAbility:'strength'})).toThrow()});
 it('no permite duplicar competencia de trasfondo',()=>{expect(()=>calculateGuidedFighter({...base(),fighterSkills:['athletics','perception']})).toThrow()});
 it('no permite repetir competencias del Guerrero',()=>{expect(()=>calculateGuidedFighter({...base(),fighterSkills:['perception','perception']})).toThrow()});
 it('no permite duplicar la dote Alerta',()=>{const b=base();expect(()=>calculateGuidedFighter({...b,background:'criminal',plusTwoAbility:'dexterity',plusOneAbility:'constitution',humanFeat:'alert'})).toThrow()});
 it('requiere elección humana de habilidad y tamaño',()=>{expect(()=>calculateGuidedFighter({...base(),humanSkill:'athletics'})).toThrow();expect(()=>calculateGuidedFighter({...base(),humanSize:undefined})).toThrow()});
 it('requiere linaje élfico',()=>{expect(()=>calculateGuidedFighter({...base(),species:'elf'})).toThrow()});
 it('separación explícita de efectos pendientes',()=>{expect(calculateGuidedFighter(base()).pendingAutomation.length).toBeGreaterThan(0)});
 it('no modifica su entrada',()=>{const b=base();const frozen=JSON.stringify(b);calculateGuidedFighter(b);expect(JSON.stringify(b)).toBe(frozen)});
});
