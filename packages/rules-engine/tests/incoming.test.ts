import {describe,it,expect} from 'vitest';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';
import {initialAdventureState,applyAdventureAction,type AdventureState} from '../src/adventure';
import {previewIncomingAttack,receiveIncomingAttack,type IncomingAttackInput} from '../src/incoming';
import {addCharacterCondition,validateCombatState,initialCombatState} from '../src/combat';
import {makeCharacterSnapshot,validateCharacterSnapshot} from '../src/persistence';

const input=():GuidedFighterInput=>({
  name:'Aldric',level:2,background:'soldier',species:'human',
  assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
  increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
  fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'alert',humanSize:'medium',
  armor:'studded_leather',shield:false,
  martial:{fightingStyle:'archery',weaponMasteries:['longbow','scimitar','shortsword'],startingPackage:'b'},
  backgroundEquipment:{startingPackage:'a',gamingSet:'dice_set'},
});
const sheet=()=>calculateGuidedFighter(input()).sheet;
const start=()=>initialAdventureState(sheet());
const request=(patch:Partial<IncomingAttackInput>={}):IncomingAttackInput=>({
  attacker:'Hobgoblin',attackBonus:6,firstD20:15,attackerDistanceFeet:5,
  armorClassAdjustment:0,damageType:'slashing',rolledDamage:9,mitigation:'normal',...patch
});
const preview=(state:AdventureState,patch:Partial<IncomingAttackInput>={})=>previewIncomingAttack(state,sheet(),request(patch));
const receive=(state:AdventureState,patch:Partial<IncomingAttackInput>={})=>receiveIncomingAttack(state,sheet(),request(patch));

describe('Paso 19: ataques recibidos y daños (PHB 2024)',()=>{
  it('impacta contra CA y usa el motor de PG existente',()=>{
    const state=start(),result=receive(state);
    expect(result.preview.hit).toBe(true);
    expect(result.state.fighter.hitPoints.current).toBe(state.fighter.hitPoints.current-9);
    expect(result.state.combat.receivedAttacks?.[0].effectiveDamage).toBe(9);
  });
  it('un fallo se registra pero no modifica PG, concentración ni recursos',()=>{
    const state=start(),result=receive(state,{attackBonus:0,firstD20:2});
    expect(result.preview.hit).toBe(false);
    expect(result.state.fighter).toEqual(state.fighter);
    expect(result.state.combat.receivedAttacks).toHaveLength(1);
    expect(result.state.combat.receivedAttacks?.[0].effectiveDamage).toBe(0);
  });
  it('un 1 natural siempre falla y un 20 siempre acierta, sea cual sea la CA',()=>{
    expect(preview(start(),{firstD20:1,attackBonus:100}).hit).toBe(false);
    expect(preview(start(),{firstD20:20,attackBonus:-100,rolledDamage:13}).critical).toBe(true);
  });
  it('un crítico no duplica automáticamente el daño, que ya se introduce tirado',()=>{
    const res=preview(start(),{firstD20:20,rolledDamage:13});
    expect(res.critical).toBe(true);expect(res.finalDamage).toBe(13);
  });
  it('aplica resistencia redondeando abajo y vulnerabilidad después',()=>{
    expect(preview(start(),{rolledDamage:9,mitigation:'resistance'}).finalDamage).toBe(4);
    expect(preview(start(),{rolledDamage:9,mitigation:'vulnerability'}).finalDamage).toBe(18);
    expect(preview(start(),{rolledDamage:9,mitigation:'both'}).finalDamage).toBe(8);
  });
  it('aplica ajustes de daño antes de resistencia y vulnerabilidad',()=>{
    expect(preview(start(),{rolledDamage:9,damageAdjustment:-2,mitigation:'both'}).finalDamage).toBe(6);
    expect(preview(start(),{rolledDamage:2,damageAdjustment:-5}).finalDamage).toBe(0);
  });
  it('inmunidad impide daño, así como resistencia sobre 1 punto (redondeo)',()=>{
    const s=start();
    expect(receive(s,{mitigation:'immunity'}).state.fighter.hitPoints.current).toBe(s.fighter.hitPoints.current);
    expect(receive(s,{rolledDamage:1,mitigation:'resistance'}).state.fighter.hitPoints.current).toBe(s.fighter.hitPoints.current);
  });
  it('consume primero PG temporales y no pierde más PG que los disponibles',()=>{
    const s=applyAdventureAction(start(),{type:'temporary_hp',amount:5},sheet()).state;
    const r=receive(s,{rolledDamage:8});
    expect(r.state.temporaryHitPoints).toBe(0);
    expect(r.state.fighter.hitPoints.current).toBe(s.fighter.hitPoints.current-3);
  });
  it('a 0 PG las condiciones Inconsciente y Derribado se aplican sin registro manual',()=>{
    const down=applyAdventureAction(start(),{type:'damage',amount:sheet().maximumHitPoints},sheet()).state;
    const near=preview(down,{firstD20:10,secondD20:12});
    expect(near.mode).toBe('advantage');expect(near.hit).toBe(true);expect(near.critical).toBe(true);
    const far=preview(down,{firstD20:15,attackerDistanceFeet:30});
    expect(far.mode).toBe('normal');expect(far.critical).toBe(false);
  });
  it('daño a 0 PG causa dos fallos de muerte cuando el ataque es crítico',()=>{
    const down=applyAdventureAction(start(),{type:'damage',amount:sheet().maximumHitPoints},sheet()).state;
    const r=receive(down,{firstD20:11,secondD20:15,rolledDamage:3});
    expect(r.preview.critical).toBe(true);
    expect(r.state.survival?.death.failures).toBe(2);
  });
  it('inmunidad o daño cero a 0 PG no genera fallos de muerte',()=>{
    const down=applyAdventureAction(start(),{type:'damage',amount:sheet().maximumHitPoints},sheet()).state;
    const r=receive(down,{firstD20:11,secondD20:15,rolledDamage:2,mitigation:'immunity'});
    expect(r.state.survival?.death.failures).toBe(0);
  });
  it('Paralizado causa críticos a corta distancia; lejos solo ventaja',()=>{
    const s=start(),combat=addCharacterCondition(s.combat,'paralyzed','Prueba',null),paralyzed={...s,combat};
    expect(preview(paralyzed,{firstD20:12,secondD20:16}).critical).toBe(true);
    expect(preview(paralyzed,{firstD20:12,secondD20:16,attackerDistanceFeet:20}).critical).toBe(false);
  });
  it('Derribado da ventaja al atacante cercano y desventaja al lejano',()=>{
    const s=start(),combat=addCharacterCondition(s.combat,'prone','Prueba',null),prone={...s,combat};
    expect(preview(prone,{secondD20:17}).mode).toBe('advantage');
    expect(preview(prone,{attackerDistanceFeet:20,secondD20:17}).mode).toBe('disadvantage');
  });
  it('ventaja y desventaja externas se cancelan; selecciona la tirada apropiada',()=>{
    expect(preview(start(),{situationalAdvantage:true,secondD20:18,firstD20:4}).selectedD20).toBe(18);
    expect(preview(start(),{situationalDisadvantage:true,secondD20:18,firstD20:4}).selectedD20).toBe(4);
    expect(preview(start(),{situationalAdvantage:true,situationalDisadvantage:true,firstD20:9}).mode).toBe('normal');
  });
  it('ajuste de CA solo se aplica a la tirada concreta, sin cambiar la hoja',()=>{
    const original=sheet().armorClass;
    expect(preview(start(),{armorClassAdjustment:5}).targetArmorClass).toBe(original+5);
    expect(sheet().armorClass).toBe(original);
  });
  it('Invisibilidad del defensor depende de que el atacante pueda verle',()=>{
    const s=start(),combat=addCharacterCondition(s.combat,'invisible','Prueba',null),hidden={...s,combat};
    expect(preview(hidden,{attackerCanSeeInvisible:false,secondD20:17}).mode).toBe('disadvantage');
    expect(preview(hidden,{attackerCanSeeInvisible:true}).mode).toBe('normal');
  });
  it('un daño efectivo provoca una salvación de concentración pendiente',()=>{
    const concentrating=applyAdventureAction(start(),{type:'start_concentration',name:'Bendición',rounds:10},sheet()).state;
    const r=receive(concentrating,{rolledDamage:24,mitigation:'resistance'});
    expect(r.state.survival?.concentration?.pendingDCs).toEqual([10]);
    expect(r.state.fighter.hitPoints.current).toBeGreaterThan(0);
  });
  it('caer a cero rompe la concentración y dispara las reglas de supervivencia',()=>{
    const concentrating=applyAdventureAction(start(),{type:'start_concentration',name:'Bendición',rounds:10},sheet()).state;
    const r=receive(concentrating,{rolledDamage:sheet().maximumHitPoints});
    expect(r.state.fighter.hitPoints.current).toBe(0);
    expect(r.state.survival?.concentration).toBeNull();
  });
  it('permite trece tipos de daño y registra el tipo correcto',()=>{
    const r=receive(start(),{damageType:'necrotic'});
    expect(r.state.combat.receivedAttacks?.[0].damageType).toBe('necrotic');
  });
  it('registrar y guardar conserva daño e historial al cargar el snapshot v2',()=>{
    const r=receive(start());
    const json=JSON.parse(JSON.stringify(makeCharacterSnapshot(input(),r.state)));
    const restored=validateCharacterSnapshot(json);
    expect(restored.adventure.combat.receivedAttacks?.[0].attacker).toBe('Hobgoblin');
    expect(restored.adventure.fighter.hitPoints.current).toBe(r.state.fighter.hitPoints.current);
  });
  it('guardados previos mantienen el estado sin receivedAttacks y sin migración',()=>{
    const c=validateCombatState(initialCombatState());
    expect(c.receivedAttacks).toBeUndefined();
    const restored=validateCharacterSnapshot(makeCharacterSnapshot(input(),start()));
    expect(restored.adventure.combat.receivedAttacks).toBeUndefined();
  });
  it('rechaza historial adulterado y no reutiliza IDs existentes',()=>{
    const r=receive(start());
    expect(()=>validateCombatState({...r.state.combat,receivedAttacks:[{...r.state.combat.receivedAttacks![0],id:99}]})).toThrow();
    expect(()=>validateCombatState({...r.state.combat,receivedAttacks:[r.state.combat.receivedAttacks![0],r.state.combat.receivedAttacks![0]]})).toThrow();
    expect(()=>validateCombatState({...r.state.combat,receivedAttacks:[{...r.state.combat.receivedAttacks![0],effectiveDamage:9,hit:false}]})).toThrow();
  });
  it('rechaza dados o modos inválidos y no modifica entrada si la confirmación falla',()=>{
    const s=start(),before=JSON.stringify(s);
    expect(()=>preview(s,{firstD20:0})).toThrow();
    expect(()=>preview(s,{situationalAdvantage:true})).toThrow();
    expect(()=>preview(s,{secondD20:5})).toThrow();
    expect(()=>preview(s,{mitigation:'invalid' as IncomingAttackInput['mitigation']})).toThrow();
    expect(JSON.stringify(s)).toBe(before);
  });
  it('las vistas previas no gastan PG ni crean eventos',()=>{
    const s=start(),before=JSON.stringify(s);
    preview(s);
    expect(JSON.stringify(s)).toBe(before);
  });
});
