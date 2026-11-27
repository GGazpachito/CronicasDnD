import {describe,it,expect} from 'vitest';
import {calculateGuidedFighter, type GuidedFighterInput} from '../src/guided';
import {applyAdventureAction,initialAdventureState,validateAdventureState} from '../src/adventure';
import {makeCharacterSnapshot,validateCharacterSnapshot} from '../src/persistence';

const base=():GuidedFighterInput=>({
  name:'Aldric',level:2,background:'soldier',species:'human',
  assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
  increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
  fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'alert',humanSize:'medium',
  armor:null,shield:false,
});
const sheet=()=>calculateGuidedFighter(base()).sheet;
const start=()=>initialAdventureState(sheet());
const run=(s:ReturnType<typeof start>,a:Parameters<typeof applyAdventureAction>[1])=>applyAdventureAction(s,a,sheet()).state;

describe('Estado de partida v2, D&D 2024',()=>{
  it('crea estado inicial con recursos y dados completos',()=>{
    const s=start();expect(s.fighter.hitPoints.current).toBe(sheet().maximumHitPoints);
    expect(s.spentHitDice).toBe(0);expect(s.fighter.resources.action_surge?.current).toBe(1);
  });
  it('el daño usa PG temporales antes que PG normales',()=>{
    const s=run(run(start(),{type:'temporary_hp',amount:7}),{type:'damage',amount:9});
    expect(s.temporaryHitPoints).toBe(0);expect(s.fighter.hitPoints.current).toBe(sheet().maximumHitPoints-2);
  });
  it('los PG temporales nuevos no se suman si son inferiores',()=>{
    const s=run(run(start(),{type:'temporary_hp',amount:9}),{type:'temporary_hp',amount:4});
    expect(s.temporaryHitPoints).toBe(9);
  });
  it('la curación no excede el maximo y no restaura PG temporales',()=>{
    const damaged=run(run(start(),{type:'temporary_hp',amount:3}),{type:'damage',amount:8});
    const healed=run(damaged,{type:'heal',amount:100});
    expect(healed.fighter.hitPoints.current).toBe(sheet().maximumHitPoints);
    expect(healed.temporaryHitPoints).toBe(0);
  });
  it('Segundo aliento gasta un uso y aplica d10 + nivel con tope de PG',()=>{
    const s=run(run(start(),{type:'damage',amount:12}),{type:'second_wind',d10:4});
    expect(s.fighter.resources.second_wind?.current).toBe(1);
    expect(s.fighter.hitPoints.current).toBe(sheet().maximumHitPoints-6);
  });
  it('no permite gastar mas usos de los disponibles',()=>{
    const spent=run(run(start(),{type:'action_surge'}),{type:'second_wind',d10:1});
    expect(()=>run(spent,{type:'action_surge'})).toThrow();
  });
  it('Mente tactica fallida no consume un uso',()=>{
    const s=start(),r=applyAdventureAction(s,{type:'tactical_mind',originalTotal:10,difficultyClass:20,d10:3},sheet());
    expect(r.state.fighter.resources.second_wind?.current).toBe(2);
    expect(r.description).toContain('no se gasta');
  });
  it('Mente tactica exitosa consume un uso',()=>{
    const r=applyAdventureAction(start(),{type:'tactical_mind',originalTotal:14,difficultyClass:15,d10:3},sheet());
    expect(r.state.fighter.resources.second_wind?.current).toBe(1);
  });
  it('descanso corto recupera exactamente un Segundo aliento y Acción súbita',()=>{
    const s=run(run(run(start(),{type:'second_wind',d10:2}),{type:'second_wind',d10:2}),{type:'action_surge'});
    const rest=run(s,{type:'short_rest',hitDieRolls:[]});
    expect(rest.fighter.resources.second_wind?.current).toBe(1);
    expect(rest.fighter.resources.action_surge?.current).toBe(1);
  });
  it('descanso corto gasta dados d10 y suma Con con minimo 1 por dado',()=>{
    const s=run(start(),{type:'damage',amount:15});
    const r=run(s,{type:'short_rest',hitDieRolls:[2,8]});
    expect(r.spentHitDice).toBe(2);
    expect(r.fighter.hitPoints.current).toBe(Math.min(sheet().maximumHitPoints,s.fighter.hitPoints.current+2+sheet().abilityModifiers.constitution+8+sheet().abilityModifiers.constitution));
  });
  it('no permite gastar dados adicionales o dado fuera de 1-10',()=>{
    expect(()=>run(start(),{type:'short_rest',hitDieRolls:[1,2,3]})).toThrow();
    expect(()=>run(start(),{type:'short_rest',hitDieRolls:[11]})).toThrow();
  });
  it('descanso largo devuelve PG y dados, recupera recursos y elimina PG temporales',()=>{
    let s=run(start(),{type:'temporary_hp',amount:7});s=run(s,{type:'damage',amount:15});
    s=run(s,{type:'action_surge'});s=run(s,{type:'short_rest',hitDieRolls:[3]});
    const r=run(s,{type:'long_rest'});
    expect(r.fighter.hitPoints.current).toBe(sheet().maximumHitPoints);
    expect(r.spentHitDice).toBe(0);expect(r.temporaryHitPoints).toBe(0);
    expect(r.fighter.resources.second_wind?.current).toBe(2);
    expect(r.fighter.resources.action_surge?.current).toBe(1);
  });
  it('a 0 PG no permite descansar y el nuevo daño añade fallos de muerte',()=>{
    const s=run(start(),{type:'damage',amount:sheet().maximumHitPoints});
    expect(()=>run(s,{type:'short_rest',hitDieRolls:[]})).toThrow();
    expect(()=>run(s,{type:'long_rest'})).toThrow();
    expect(run(s,{type:'damage',amount:1}).survival?.death.failures).toBe(1);
    expect(run(s,{type:'heal',amount:1}).fighter.hitPoints.current).toBe(1);
  });
  it('el estado original no se muta al aplicar acciones',()=>{
    const s=start(),copy=JSON.stringify(s);run(s,{type:'damage',amount:1});expect(JSON.stringify(s)).toBe(copy);
  });
  it('rechaza estado falsificado, exceso de dados y PG invalidos',()=>{
    const s=start();
    expect(()=>validateAdventureState({...s,spentHitDice:4},sheet())).toThrow();
    expect(()=>validateAdventureState({...s,temporaryHitPoints:-3},sheet())).toThrow();
    expect(()=>validateAdventureState({...s,fighter:{...s.fighter,hitPoints:{current:9999,maximum:sheet().maximumHitPoints}}},sheet())).toThrow();
    expect(()=>validateAdventureState({...s,unknown:1},sheet())).toThrow();
  });
  it('guardado v2 conserva el estado gastado y se puede restaurar',()=>{
    const s=run(run(start(),{type:'damage',amount:4}),{type:'action_surge'});
    const saved=makeCharacterSnapshot(base(),s);
    const loaded=validateCharacterSnapshot(JSON.parse(JSON.stringify(saved)));
    expect(loaded.adventure.fighter.hitPoints.current).toBe(sheet().maximumHitPoints-4);
    expect(loaded.adventure.fighter.resources.action_surge?.current).toBe(0);
    expect(loaded.schemaVersion).toBe(2);
  });
  it('guardados anteriores v1 se leen y convierten a v2 con estado inicial',()=>{
    const loaded=validateCharacterSnapshot({schemaVersion:1,ruleset:'dnd-2024',input:base()});
    expect(loaded.schemaVersion).toBe(2);
    expect(loaded.adventure.fighter.hitPoints.current).toBe(sheet().maximumHitPoints);
  });
  it('rechaza guardar una partida desincronizada tras cambio de nivel',()=>{
    const s=start(),nextSheet=calculateGuidedFighter({...base(),level:3}).sheet;
    expect(()=>validateAdventureState(s,nextSheet)).toThrow();
    expect(()=>makeCharacterSnapshot({...base(),level:3},s)).toThrow();
  });
});
