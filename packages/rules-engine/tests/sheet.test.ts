import { describe, expect, it } from 'vitest';
import { calculateFighterSheet, type FighterCharacterInput } from '../src/sheet';
import { initialFighterState, spendFighterResource } from '../src/resources';

const base = (): FighterCharacterInput => ({
  id:'fighter-demo', name:'Aldric', ruleset:'dnd-2024', fighterLevel:1,
  baseAbilities:{strength:16,dexterity:14,constitution:14,intelligence:10,wisdom:12,charisma:8},
  baseProficiencies:{skills:['athletics','perception'],savingThrows:['strength','constitution']},
  hpMethod:'fixed', equipment:{armor:'chain_mail',shieldEquipped:true,shieldTrained:true},
});
const effect = (ability:'strength'|'constitution',amount:number) => ({
  effectId:`raise-${ability}`,sourceRevisionId:'example:v1',when:{type:'always'},
  type:'ability_increase',params:{ability,amount,cap:20},
});
const bonus = (target:string,value:number) => ({
  type:'numeric_modifier',effectId:`bonus-${target}`,sourceRevisionId:'example:v1',target,
  when:{type:'always'},operation:'add',value,group:'example',stacking:'sum',priority:0,
});
const roll = (target:string,mode:'advantage'|'disadvantage') => ({
  type:'roll_mode',effectId:`roll-${target}`,sourceRevisionId:'example:v1',target,
  when:{type:'always'},mode,
});

describe('Hoja Guerrero D&D 2024 (paso 06)',()=>{
  it('01 nivel 1: PG, CA, competencia y recursos',()=>{
    const s=calculateFighterSheet(base());
    expect(s.maximumHitPoints).toBe(12); expect(s.armorClass).toBe(18);
    expect(s.proficiencyBonus).toBe(2); expect(s.resources.second_wind).toEqual({current:2,maximum:2});
    expect(s.resources.action_surge).toBeUndefined();
  });
  it('02 calcula habilidad y salvación desde las competencias',()=>{
    const s=calculateFighterSheet(base());
    expect(s.skillBonuses.athletics).toBe(5); expect(s.skillBonuses.perception).toBe(3);
    expect(s.savingThrowBonuses.strength).toBe(5); expect(s.savingThrowBonuses.dexterity).toBe(2);
  });
  it('03 iniciativa sale de Destreza',()=>expect(calculateFighterSheet(base()).initiative).toBe(2));
  it('04 nivel 2 desbloquea Acción súbita y Mente táctica',()=>{
    const s=calculateFighterSheet({...base(),fighterLevel:2});
    expect(s.maximumHitPoints).toBe(20); expect(s.resources.action_surge?.current).toBe(1);
    expect(s.features).toContain('tactical_mind');
  });
  it('05 nivel 3 campeón: PG y rasgos',()=>{
    const s=calculateFighterSheet({...base(),fighterLevel:3,subclass:'champion'});
    expect(s.maximumHitPoints).toBe(28); expect(s.features).toContain('champion_improved_critical');
    expect(s.initiativeRollMode).toBe('advantage'); expect(s.skillRollModes.athletics).toBe('advantage');
  });
  it('06 armadura con penalización impone desventaja en Sigilo',()=>{
    expect(calculateFighterSheet(base()).skillRollModes.stealth).toBe('disadvantage');
  });
  it('07 ventaja externa y penalización de armadura se cancelan',()=>{
    const s=calculateFighterSheet({...base(), modifiers:[roll('skills.stealth','advantage')]});
    expect(s.skillRollModes.stealth).toBe('normal');
  });
  it('08 aumento de Fuerza se refleja en Atletismo y salvación',()=>{
    const s=calculateFighterSheet({...base(),effects:[effect('strength',2)]});
    expect(s.abilityScores.strength).toBe(18); expect(s.skillBonuses.athletics).toBe(6);
    expect(s.savingThrowBonuses.strength).toBe(6);
  });
  it('09 Constitución cambia los PG máximos sin estado persistido',()=>{
    const s=calculateFighterSheet({...base(),effects:[effect('constitution',2)]});
    expect(s.maximumHitPoints).toBe(13);
  });
  it('10 modificadores de iniciativa, habilidades y CA se aplican',()=>{
    const s=calculateFighterSheet({...base(),modifiers:[bonus('initiative',2),bonus('skills.athletics',1),bonus('armor_class',1)]});
    expect(s.initiative).toBe(4); expect(s.skillBonuses.athletics).toBe(6); expect(s.armorClass).toBe(19);
  });
  it('11 el estado guardado conserva PG y usos gastados',()=>{
    const spent=spendFighterResource(initialFighterState(2,20),'second_wind');
    const state={...spent,hitPoints:{current:9,maximum:20}};
    const input={...base(),fighterLevel:2 as const,state};
    const a=calculateFighterSheet(input), b=calculateFighterSheet(input);
    expect(a.currentHitPoints).toBe(9); expect(a.resources.second_wind?.current).toBe(1);
    expect(b.currentHitPoints).toBe(9); expect(b.resources.second_wind?.current).toBe(1);
    expect(state.hitPoints.current).toBe(9); expect(state.resources.second_wind?.current).toBe(1);
  });
  it('12 detecta cambios de PG máximos que requieren migración explícita',()=>{
    const state=initialFighterState(1,12);
    expect(()=>calculateFighterSheet({...base(),state,effects:[effect('constitution',2)]})).toThrow(/transición explícita/);
  });
  it('13 detecta diferencia entre nivel de clase y estado',()=>{
    expect(()=>calculateFighterSheet({...base(),fighterLevel:2,state:initialFighterState(1,12)})).toThrow();
  });
  it('14 rechaza subclase antes del nivel 3 y su ausencia al nivel 3',()=>{
    expect(()=>calculateFighterSheet({...base(),subclass:'champion'})).toThrow();
    expect(()=>calculateFighterSheet({...base(),fighterLevel:3})).toThrow();
  });
  it('15 rechaza edición distinta de 2024',()=>{
    expect(()=>calculateFighterSheet({...base(),ruleset:'dnd-2014' as 'dnd-2024'})).toThrow();
  });
  it('16 rechaza efectos no reconocidos sin ejecutarlos',()=>{
    expect(()=>calculateFighterSheet({...base(),effects:[{type:'execute_js',code:'evil()'}]})).toThrow();
  });
  it('17 arma desnuda y escudo generan CA consistente',()=>{
    const s=calculateFighterSheet({...base(),equipment:{shieldEquipped:false}});
    expect(s.armorClass).toBe(12); expect(s.skillRollModes.stealth).toBe('normal');
  });
  it('18 las entradas no se modifican al calcular',()=>{
    const input=base(); const snapshot=JSON.stringify(input);
    calculateFighterSheet(input);expect(JSON.stringify(input)).toBe(snapshot);
  });
});
