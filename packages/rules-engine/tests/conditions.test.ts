import {describe,it,expect} from 'vitest';
import {
  CONDITION_NAMES,conditionCapabilities,conditionKinds,evaluateConditionRoll,
  initialConditionLedger,validateConditionLedger,longRestConditionUpdate,
} from '../src/conditions';
import {
  initialCombatState,validateCombatState,addCharacterCondition,
  removeCharacterCondition,changeExhaustion,advanceCombatRound,
} from '../src/combat';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';
import {calculateWeaponAttack} from '../src/attacks';
import {initialAdventureState,applyAdventureAction,validateAdventureState} from '../src/adventure';
import {makeCharacterSnapshot,validateCharacterSnapshot} from '../src/persistence';
const input=():GuidedFighterInput=>({
  name:'Aldric',level:2,background:'soldier',species:'human',
  assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
  increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
  fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'tough',humanSize:'medium',
  armor:'studded_leather',shield:false,
  martial:{fightingStyle:'archery',weaponMasteries:['longbow','scimitar','shortsword'],startingPackage:'b'},
  backgroundEquipment:{startingPackage:'a',gamingSet:'dice_set'},
});
const roll=(s:ReturnType<typeof initialConditionLedger>,kind:Parameters<typeof evaluateConditionRoll>[1])=>evaluateConditionRoll(s,kind);
const withKind=(kind:keyof typeof CONDITION_NAMES)=>({instances:[{id:1,kind,source:'Test',remainingRounds:null}],exhaustion:0});

describe('Paso 17 · condiciones 2024 y persistencia',()=>{
  it('inicia sin condiciones y preserva estructura exacta antigua',()=>{
    expect(initialCombatState()).toEqual({round:1,nextId:1,attacks:[],effects:[]});
    const old=validateCombatState(initialCombatState());
    expect(old.conditions).toBeUndefined();
    expect(conditionKinds(old.conditions??initialConditionLedger()).size).toBe(0);
  });
  it('envenenado da desventaja a ataques y pruebas de característica pero no salvaciones',()=>{
    const s=withKind('poisoned');
    expect(roll(s,{kind:'attack'}).mode).toBe('disadvantage');
    expect(roll(s,{kind:'ability_check'}).mode).toBe('disadvantage');
    expect(roll(s,{kind:'saving_throw',ability:'dexterity'}).mode).toBe('normal');
  });
  it('derribado da desventaja al atacar; recibir ataque depende de distancia',()=>{
    const s=withKind('prone');
    expect(roll(s,{kind:'attack'}).mode).toBe('disadvantage');
    expect(roll(s,{kind:'incoming_attack',attackerDistanceFeet:5}).mode).toBe('advantage');
    expect(roll(s,{kind:'incoming_attack',attackerDistanceFeet:10}).mode).toBe('disadvantage');
    expect(conditionCapabilities(s).speedZero).toBe(false);
  });
  it('asustado solo afecta a ataques y habilidades con fuente visible',()=>{
    const s=withKind('frightened');
    expect(roll(s,{kind:'attack',fearSourceVisible:true}).mode).toBe('disadvantage');
    expect(roll(s,{kind:'attack',fearSourceVisible:false}).mode).toBe('normal');
    expect(roll(s,{kind:'ability_check',fearSourceVisible:true}).mode).toBe('disadvantage');
    expect(conditionCapabilities(s).canApproachFearSource).toBe(false);
  });
  it('agarrado solo penaliza ataques contra otro objetivo; velocidad cero',()=>{
    const s=withKind('grappled');
    expect(roll(s,{kind:'attack',targetIsGrappler:true}).mode).toBe('normal');
    expect(roll(s,{kind:'attack',targetIsGrappler:false}).mode).toBe('disadvantage');
    expect(conditionCapabilities(s).speedZero).toBe(true);
  });
  it('cegado o ensordecido hacen fallar automáticamente pruebas que dependen del sentido',()=>{
    expect(roll(withKind('blinded'),{kind:'ability_check',sense:'sight'}).automaticFailure).toBe(true);
    expect(roll(withKind('blinded'),{kind:'ability_check',sense:'hearing'}).automaticFailure).toBe(false);
    expect(roll(withKind('deafened'),{kind:'ability_check',sense:'hearing'}).automaticFailure).toBe(true);
  });
  it('paralizado y aturdido implican incapacitación; paralizado fuerza críticos cerca',()=>{
    const s=withKind('paralyzed');
    expect(conditionCapabilities(s).canTakeAction).toBe(false);
    expect(roll(s,{kind:'saving_throw',ability:'strength'}).automaticFailure).toBe(true);
    expect(roll(s,{kind:'saving_throw',ability:'dexterity'}).automaticFailure).toBe(true);
    expect(roll(s,{kind:'saving_throw',ability:'wisdom'}).automaticFailure).toBe(false);
    expect(roll(s,{kind:'incoming_attack',attackerDistanceFeet:5}).automaticCriticalIfHit).toBe(true);
    expect(roll(s,{kind:'incoming_attack',attackerDistanceFeet:10}).automaticCriticalIfHit).toBe(false);
    expect(conditionCapabilities(withKind('stunned')).speedZero).toBe(false);
    expect(conditionCapabilities(withKind('stunned')).canTakeAction).toBe(false);
  });
  it('inconsciente implica incapacitación, velocidad cero y crítico cerca',()=>{
    const s=withKind('unconscious');
    expect(conditionCapabilities(s).canConcentrate).toBe(false);
    expect(conditionCapabilities(s).speedZero).toBe(true);
    expect(roll(s,{kind:'incoming_attack',attackerDistanceFeet:5}).automaticCriticalIfHit).toBe(true);
    // Inconsciente también implica Derribado, que penaliza a atacantes lejanos.
    expect(roll(s,{kind:'incoming_attack',attackerDistanceFeet:15}).mode).toBe('normal');
    expect(conditionKinds(s).has('prone')).toBe(true);
  });
  it('invisible concede ventaja solo si la otra criatura no puede verlo',()=>{
    const s=withKind('invisible');
    expect(roll(s,{kind:'attack',otherCreatureCanSeeInvisible:false}).mode).toBe('advantage');
    expect(roll(s,{kind:'attack',otherCreatureCanSeeInvisible:true}).mode).toBe('normal');
    expect(roll(s,{kind:'incoming_attack',otherCreatureCanSeeInvisible:false}).mode).toBe('disadvantage');
  });
  it('apresado penaliza salvación de Destreza, no Constitución',()=>{
    const s=withKind('restrained');
    expect(roll(s,{kind:'saving_throw',ability:'dexterity'}).mode).toBe('disadvantage');
    expect(roll(s,{kind:'saving_throw',ability:'constitution'}).mode).toBe('normal');
  });
  it('hechizado impide atacar solo a quien te hechizó',()=>{
    const s=withKind('charmed');
    expect(roll(s,{kind:'attack',targetIsCharmer:true}).actionForbidden).toBe(true);
    expect(roll(s,{kind:'attack',targetIsCharmer:false}).actionForbidden).toBe(false);
  });
  it('varias fuentes de la misma condición no aumentan la desventaja',()=>{
    let s=addCharacterCondition(initialCombatState(),'poisoned','Hechizo',2);
    s=addCharacterCondition(s,'poisoned','Veneno',null);
    expect(s.conditions!.instances).toHaveLength(2);
    expect(roll(s.conditions!,{kind:'attack'}).disadvantages).toEqual(['Envenenado']);
    s=advanceCombatRound(advanceCombatRound(s));
    expect(s.conditions!.instances).toHaveLength(1);
    expect(s.conditions!.instances[0].source).toBe('Veneno');
    s=removeCharacterCondition(s,s.conditions!.instances[0].id);
    expect(s.conditions!.instances).toHaveLength(0);
  });
  it('agotar la duración mantiene el historial de ataques y efectos manuales',()=>{
    const a=addCharacterCondition(initialCombatState(),'prone','Derribo',1);
    const b=advanceCombatRound(a);
    expect(b.conditions?.instances).toHaveLength(0);
    expect(b.round).toBe(2);
    expect(a.conditions?.instances).toHaveLength(1);
  });
  it('al terminar Inconsciente se conserva Derribado, incluso si vence la duración',()=>{
    const s=addCharacterCondition(initialCombatState(),'unconscious','Magia',1);
    const after=advanceCombatRound(s);
    expect(after.conditions?.instances.map(c=>c.kind)).toEqual(['prone']);
    expect(after.conditions?.instances[0].source).toBe('Tras terminar Inconsciente');
    const fresh=addCharacterCondition(initialCombatState(),'unconscious','Daño',null);
    const removed=removeCharacterCondition(fresh,fresh.conditions!.instances[0].id);
    expect(removed.conditions?.instances[0].kind).toBe('prone');
  });
  it('agotamiento modifica d20 y velocidad; descanso largo resta uno',()=>{
    let s=changeExhaustion(initialCombatState(),2);
    expect(roll(s.conditions!,{kind:'attack'}).d20Penalty).toBe(-4);
    expect(conditionCapabilities(s.conditions!).speedPenaltyFeet).toBe(10);
    expect(longRestConditionUpdate(s.conditions!).exhaustion).toBe(1);
    expect(()=>changeExhaustion(s,5)).toThrow();
    s=changeExhaustion(s,4);
    expect(conditionCapabilities(s.conditions!).deadByExhaustion).toBe(true);
  });
  it('fuentes de ventaja y desventaja se cancelan sin importar el número',()=>{
    let s=addCharacterCondition(initialCombatState(),'invisible','Ocultación',null);
    s=addCharacterCondition(s,'poisoned','Toxina',null);
    s=addCharacterCondition(s,'prone','Caída',null);
    const result=roll(s.conditions!,{kind:'attack',otherCreatureCanSeeInvisible:false});
    expect(result.mode).toBe('normal');
    expect(result.disadvantages).toHaveLength(2);
    expect(result.advantages).toHaveLength(1);
  });
  it('no permite datos adulterados, tipos desconocidos ni campos ocultos',()=>{
    const s=addCharacterCondition(initialCombatState(),'poisoned','Toxina',2);
    expect(()=>validateCombatState({...s,conditions:{instances:[{...s.conditions!.instances[0],kind:'broken'}],exhaustion:0}})).toThrow();
    expect(()=>validateCombatState({...s,conditions:{instances:[{...s.conditions!.instances[0],extra:true}],exhaustion:0}})).toThrow();
    expect(()=>validateConditionLedger({instances:[],exhaustion:7})).toThrow();
    expect(()=>addCharacterCondition(initialCombatState(),'poisoned',' ',1)).toThrow();
    expect(()=>addCharacterCondition(initialCombatState(),'poisoned','Fuente',0)).toThrow();
    expect(()=>validateCombatState({...s,conditions:{...s.conditions,extra:'hack'}})).toThrow();
  });
  it('las condiciones se conservan al guardar y cargar PostgreSQL JSON v2',()=>{
    const s=calculateGuidedFighter(input()).sheet;
    const base=initialAdventureState(s);
    const combat=changeExhaustion(addCharacterCondition(base.combat,'restrained','Magia',4),1);
    const snapshot=makeCharacterSnapshot(input(),{...base,combat});
    const restored=validateCharacterSnapshot(JSON.parse(JSON.stringify(snapshot)));
    expect(restored.adventure.combat.conditions?.exhaustion).toBe(1);
    expect(restored.adventure.combat.conditions?.instances[0].kind).toBe('restrained');
    expect(restored.schemaVersion).toBe(2);
    // Una lectura v2 antigua sin condiciones continúa siendo válida.
    const old=validateCharacterSnapshot({schemaVersion:2,ruleset:'dnd-2024',input:input(),adventure:base});
    expect(old.adventure.combat.conditions).toBeUndefined();
  });
  it('descansar reduce 1 agotamiento sin eliminar condiciones persistentes',()=>{
    const sheet=calculateGuidedFighter(input()).sheet;
    const base=initialAdventureState(sheet);
    const combat=changeExhaustion(addCharacterCondition(base.combat,'poisoned','Veneno persistente',null),2);
    const result=applyAdventureAction({...base,combat},{type:'long_rest'},sheet);
    expect(result.state.combat.conditions?.exhaustion).toBe(1);
    expect(result.state.combat.conditions?.instances[0].kind).toBe('poisoned');
    expect(validateAdventureState(result.state,sheet).combat.conditions?.exhaustion).toBe(1);
  });
  it('el perfil de arma combina ventaja y desventaja, aplica agotamiento',()=>{
    const s=calculateGuidedFighter(input()).sheet;
    const p=calculateWeaponAttack(s,'longbow','archery',input().martial!.weaponMasteries,{
      advantage:true,conditionDisadvantage:true,conditionD20Penalty:-4,
    });
    expect(p.mode).toBe('normal');
    expect(p.attackBonus).toBe(s.abilityModifiers.dexterity+s.proficiencyBonus+2-4);
    const other=calculateWeaponAttack(s,'longbow','archery',input().martial!.weaponMasteries,{conditionAdvantage:true});
    expect(other.mode).toBe('advantage');
    expect(()=>calculateWeaponAttack(s,'longbow','archery',input().martial!.weaponMasteries,{conditionD20Penalty:-3})).toThrow();
  });
});
