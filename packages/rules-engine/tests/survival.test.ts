import {describe,it,expect} from 'vitest';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';
import {initialAdventureState,applyAdventureAction,updateAdventureCombat,validateAdventureState,type AdventureAction,type AdventureState} from '../src/adventure';
import {concentrationDC,initialSurvivalState,validateSurvivalState,advanceSurvivalRound} from '../src/survival';
import {makeCharacterSnapshot,validateCharacterSnapshot} from '../src/persistence';
import {addCharacterCondition,advanceCombatRound,removeCharacterCondition} from '../src/combat';
const input=():GuidedFighterInput=>({
  name:'Aldric',level:2,background:'soldier',species:'human',
  assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
  increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
  fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'tough',humanSize:'medium',
  armor:null,shield:false,
});
const sheet=()=>calculateGuidedFighter(input()).sheet;
const start=()=>initialAdventureState(sheet());
const run=(s:AdventureState,a:AdventureAction)=>applyAdventureAction(s,a,sheet()).state;
const down=()=>run(start(),{type:'damage',amount:sheet().maximumHitPoints});

describe('Paso 18: muerte, estabilidad y concentración (PHB 2024)',()=>{
  it('crea contadores de muerte vacíos y sin concentración',()=>{
    expect(start().survival).toEqual(initialSurvivalState());
  });
  it('al llegar a cero inicia agonía sin matar automáticamente',()=>{
    const s=down();expect(s.fighter.hitPoints.current).toBe(0);
    expect(s.survival!.death).toEqual({successes:0,failures:0,stable:false,dead:false});
  });
  it('10 es éxito, 9 es fallo; las salvaciones no son pruebas de Constitución',()=>{
    const s=run(run(down(),{type:'death_save',d20:10}),{type:'death_save',d20:9});
    expect(s.survival!.death.successes).toBe(1);expect(s.survival!.death.failures).toBe(1);
  });
  it('agotamiento penaliza salvaciones de muerte sin anular un 20 natural',()=>{
    const one=down();
    const source=addCharacterCondition(one.combat,'poisoned','Toxina',null);
    const penalized={...source,conditions:{...source.conditions!,exhaustion:1}};
    const s=run({...one,combat:penalized},{type:'death_save',d20:10});
    expect(s.survival!.death.failures).toBe(1);
    const rescued=run({...one,combat:penalized},{type:'death_save',d20:20});
    expect(rescued.fighter.hitPoints.current).toBe(1);
  });
  it('1 natural cuenta como dos fallos y el tercero causa muerte',()=>{
    const a=run(down(),{type:'death_save',d20:1});
    expect(a.survival!.death.failures).toBe(2);
    const b=run(a,{type:'death_save',d20:5});
    expect(b.survival!.death.dead).toBe(true);expect(b.survival!.death.failures).toBe(0);
    expect(()=>run(b,{type:'heal',amount:1})).toThrow();
    expect(()=>run(b,{type:'death_save',d20:20})).toThrow();
  });
  it('20 natural recupera 1 PG y reinicia los contadores',()=>{
    const s=run(run(down(),{type:'death_save',d20:5}),{type:'death_save',d20:20});
    expect(s.fighter.hitPoints.current).toBe(1);
    expect(s.survival!.death).toEqual(initialSurvivalState().death);
  });
  it('tres éxitos estabilizan; no se puede volver a tirar a estable',()=>{
    const s=run(run(run(down(),{type:'death_save',d20:15}),{type:'death_save',d20:19}),{type:'death_save',d20:10});
    expect(s.survival!.death.stable).toBe(true);expect(s.fighter.hitPoints.current).toBe(0);
    expect(()=>run(s,{type:'death_save',d20:11})).toThrow();
  });
  it('Medicina CD 10 estabiliza; un fallo no borra los fallos acumulados',()=>{
    const s=run(down(),{type:'death_save',d20:8});
    expect(run(s,{type:'stabilize',medicineTotal:9}).survival!.death.failures).toBe(1);
    const stable=run(s,{type:'stabilize',medicineTotal:10});
    expect(stable.survival!.death.stable).toBe(true);expect(stable.survival!.death.failures).toBe(0);
  });
  it('estabilizado recupera 1 PG tras 1d4 horas transcurridas',()=>{
    const s=run(down(),{type:'stabilize',medicineTotal:12});
    expect(()=>run(s,{type:'recover_stable',d4:3,hoursElapsed:2})).toThrow();
    const r=run(s,{type:'recover_stable',d4:3,hoursElapsed:3});
    expect(r.fighter.hitPoints.current).toBe(1);expect(r.survival!.death.stable).toBe(false);
  });
  it('daño a 0 PG añade un fallo; crítico añade dos',()=>{
    const s=run(down(),{type:'damage',amount:1});
    expect(s.survival!.death.failures).toBe(1);
    const death=run(s,{type:'damage',amount:2,critical:true});
    expect(death.survival!.death.dead).toBe(true);
  });
  it('daño a 0 PG cancela estabilidad y daño >= PG max mata',()=>{
    const stable=run(down(),{type:'stabilize',medicineTotal:10});
    const hit=run(stable,{type:'damage',amount:1});
    expect(hit.survival!.death.stable).toBe(false);expect(hit.survival!.death.failures).toBe(1);
    expect(run(down(),{type:'damage',amount:sheet().maximumHitPoints}).survival!.death.dead).toBe(true);
  });
  it('daño masivo al caer a 0 PG causa muerte instantánea por sobrante',()=>{
    const s=run(start(),{type:'damage',amount:2*sheet().maximumHitPoints});
    expect(s.survival!.death.dead).toBe(true);
    const a=run(start(),{type:'damage',amount:sheet().maximumHitPoints+1});
    expect(a.survival!.death.dead).toBe(false);
  });
  it('curar desde 0 restaura contadores, no puede exceder PG max',()=>{
    const s=run(run(down(),{type:'death_save',d20:2}),{type:'heal',amount:100});
    expect(s.fighter.hitPoints.current).toBe(sheet().maximumHitPoints);
    expect(s.survival!.death).toEqual(initialSurvivalState().death);
  });
  it('PG temporales no devuelven la consciencia a 0 PG',()=>{
    const s=run(down(),{type:'temporary_hp',amount:5});
    expect(s.fighter.hitPoints.current).toBe(0);expect(s.temporaryHitPoints).toBe(5);
  });
  it('solo una concentración activa; otra sustituye la anterior',()=>{
    const s=run(run(start(),{type:'start_concentration',name:'Bendición',rounds:10}),{type:'start_concentration',name:'Alterar el propio aspecto',rounds:600});
    expect(s.survival!.concentration?.name).toBe('Alterar el propio aspecto');
  });
  it('CD concentración min 10, mitad redondeada abajo, tope 30',()=>{
    expect(concentrationDC(1)).toBe(10);expect(concentrationDC(21)).toBe(10);
    expect(concentrationDC(35)).toBe(17);expect(concentrationDC(200)).toBe(30);
  });
  it('el daño registra cada salvación de concentración sin resolverla',()=>{
    let s=run(run(start(),{type:'temporary_hp',amount:100}),{type:'start_concentration',name:'Rasgo mágico',rounds:12});
    s=run(s,{type:'damage',amount:3});s=run(s,{type:'damage',amount:25});
    expect(s.survival!.concentration?.pendingDCs).toEqual([10,12]);
    expect(()=>run(s,{type:'start_concentration',name:'Otro',rounds:2})).toThrow();
  });
  it('supera la primera concentración y mantiene la segunda pendiente',()=>{
    let s=run(run(start(),{type:'temporary_hp',amount:100}),{type:'start_concentration',name:'Hechizo',rounds:null});
    s=run(s,{type:'damage',amount:3});s=run(s,{type:'damage',amount:21});
    const roll=Math.max(1,10-sheet().savingThrowBonuses.constitution);
    s=run(s,{type:'concentration_save',d20:roll});
    expect(s.survival!.concentration?.pendingDCs).toEqual([10]);
  });
  it('fallar concentración la finaliza y borra el resto de salvaciones pendientes',()=>{
    let s=run(run(start(),{type:'temporary_hp',amount:100}),{type:'start_concentration',name:'Hechizo',rounds:null});
    s=run(s,{type:'damage',amount:21});s=run(s,{type:'damage',amount:21});
    s=run(s,{type:'concentration_save',d20:1,extraBonus:-20});
    expect(s.survival!.concentration).toBeNull();
  });
  it('a 0 PG cesa concentración, ya sea por daño o por curación posterior',()=>{
    const started=run(start(),{type:'start_concentration',name:'Conjuro',rounds:null});
    const atZero=run(started,{type:'damage',amount:sheet().maximumHitPoints});
    expect(atZero.survival!.concentration).toBeNull();
    const back=run(atZero,{type:'heal',amount:1});
    expect(back.survival!.concentration).toBeNull();
  });
  it('añadir Incapacitado rompe concentración y no la restaura al terminar la condición',()=>{
    const source=run(start(),{type:'start_concentration',name:'Conjuro',rounds:8});
    const blocked=addCharacterCondition(source.combat,'stunned','Aturdimiento',2);
    const change=updateAdventureCombat(source,blocked,sheet());
    expect(change.survival!.concentration).toBeNull();
    const removed=removeCharacterCondition(blocked,blocked.conditions!.instances[0].id);
    expect(updateAdventureCombat(change,removed,sheet()).survival!.concentration).toBeNull();
  });
  it('avanzar ronda reduce concentración y expira en la última',()=>{
    let s=run(start(),{type:'start_concentration',name:'Hechizo',rounds:2});
    s=updateAdventureCombat(s,advanceCombatRound(s.combat),sheet());
    expect(s.survival!.concentration?.remainingRounds).toBe(1);
    s=updateAdventureCombat(s,advanceCombatRound(s.combat),sheet());
    expect(s.survival!.concentration).toBeNull();
    expect(advanceSurvivalRound(initialSurvivalState()).concentration).toBeNull();
  });
  it('rechaza estructuras adulteradas o concentración con 0 PG',()=>{
    const s=start();
    expect(()=>validateSurvivalState({...s.survival,extra:true},s.fighter.hitPoints.current)).toThrow();
    expect(()=>validateAdventureState({...s,survival:{death:{successes:3,failures:0,stable:false,dead:false},concentration:null}},sheet())).toThrow();
    expect(()=>validateAdventureState({...down(),survival:{death:initialSurvivalState().death,concentration:{name:'Test',remainingRounds:2,pendingDCs:[]}}},sheet())).toThrow();
  });
  it('lee guardados v2 previos sin supervivencia, sin migrar PostgreSQL',()=>{
    const old=start();
    const {survival:ignored,...prior}=old;
    expect(ignored).toBeDefined();
    const snapshot=validateCharacterSnapshot({schemaVersion:2,ruleset:'dnd-2024',input:input(),adventure:prior});
    expect(snapshot.adventure.survival).toEqual(initialSurvivalState());
  });
  it('al serializar persisten fallos y concentración sin alterar inventario',()=>{
    let s=run(down(),{type:'death_save',d20:8});
    const snapshot=makeCharacterSnapshot(input(),s);
    const restored=validateCharacterSnapshot(JSON.parse(JSON.stringify(snapshot)));
    expect(restored.adventure.survival!.death.failures).toBe(1);
    s=run(start(),{type:'start_concentration',name:'Concentración',rounds:4});
    const roundtrip=validateCharacterSnapshot(JSON.parse(JSON.stringify(makeCharacterSnapshot(input(),s))));
    expect(roundtrip.adventure.survival?.concentration?.name).toBe('Concentración');
    expect(roundtrip.adventure.fighter.resources).toEqual(start().fighter.resources);
  });
  it('acciones no mutan entradas',()=>{
    const s=start();const copy=JSON.stringify(s);
    run(s,{type:'damage',amount:4});expect(JSON.stringify(s)).toBe(copy);
  });
});
