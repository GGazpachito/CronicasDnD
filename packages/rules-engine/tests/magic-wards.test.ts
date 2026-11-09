import {describe,it,expect} from 'vitest';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';
import {initialAdventureState} from '../src/adventure';
import {makeCharacterSnapshot,validateCharacterSnapshot} from '../src/persistence';
import {previewIncomingAttack,receiveIncomingAttack,type IncomingAttackInput} from '../src/incoming';
import {collectDamageDefenses,resolveDamageDefense} from '../src/damage-defenses';
import {applyMagicWardAction,collectMagicWardDefenses,validateMagicWards} from '../src/magic-wards';

function character(species:'human'|'dwarf'='human'):GuidedFighterInput{return {
  name:'Guerrero de pruebas',level:3,background:'soldier',species,
  assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
  increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
  fighterSkills:['perception','survival'],
  ...(species==='human'?{humanSkill:'investigation' as const,humanFeat:'tough' as const,humanSize:'medium' as const}:{}),
  armor:'studded_leather',shield:false,
  martial:{fightingStyle:'archery',weaponMasteries:['longbow','scimitar','shortsword'],startingPackage:'b'},
  backgroundEquipment:{startingPackage:'a',gamingSet:'dice_set'}
};}
function incoming(damageType:'fire'|'force'|'poison'='fire',rolledDamage=9):IncomingAttackInput{
  return {attacker:'Mago enemigo',attackBonus:20,firstD20:15,attackerDistanceFeet:30,damageType,rolledDamage,mitigation:'normal'};
}
function setup(species:'human'|'dwarf'='human'){
  const input=character(species),sheet=calculateGuidedFighter(input).sheet;
  return {input,sheet,state:initialAdventureState(sheet)};
}
const gain=(id:'ring_resistance'|'brooch_shielding'|'periapt_proof_poison',damageType?:'fire'|'poison')=>
  ({type:'grant' as const,itemId:id,...(damageType?{damageType}:{})});

describe('Paso 21: catálogo de defensas mágicas SRD 5.2.1',()=>{
  it('los guardados anteriores reciben un registro mágico vacío al cargar',()=>{
    const {input,sheet,state}=setup();
    const legacyState={...state,magicWards:undefined};
    const saved=makeCharacterSnapshot(input,legacyState);
    expect(saved.adventure.magicWards).toEqual([]);
    expect(sheet.maximumHitPoints).toBeGreaterThan(0);
  });
  it('el anillo necesita un tipo de daño válido y empieza sin llevarse puesto',()=>{
    const wards=applyMagicWardAction([],gain('ring_resistance','fire'));
    expect(wards[0].worn).toBe(false);
    expect(collectMagicWardDefenses(wards)).toHaveLength(0);
    expect(()=>applyMagicWardAction([],gain('ring_resistance'))).toThrow();
    expect(()=>applyMagicWardAction([], {type:'grant',itemId:'ring_resistance',damageType:'slashing' as 'fire'})).toThrow();
  });
  it('el anillo puesto confiere resistencia sin vinculación en reglas 2024',()=>{
    const worn=applyMagicWardAction(applyMagicWardAction([],gain('ring_resistance','fire')),{type:'wear',instanceId:'ward-1',worn:true});
    expect(worn[0].attuned).toBe(false);
    expect(resolveDamageDefense('fire',collectDamageDefenses({magicWards:worn})).mitigation).toBe('resistance');
    expect(resolveDamageDefense('cold',collectDamageDefenses({magicWards:worn})).mitigation).toBe('normal');
  });
  it('la aplicación de ataques recibidos obtiene las defensas del estado sin parámetros mágicos externos',()=>{
    const {sheet,state}=setup();
    const worn=applyMagicWardAction(applyMagicWardAction([],gain('ring_resistance','fire')),{type:'wear',instanceId:'ward-1',worn:true});
    const upgraded={...state,magicWards:worn};
    const p=previewIncomingAttack(upgraded,sheet,incoming('fire'));
    expect(p.finalDamage).toBe(4);
    expect(p.damageParts[0].sources.some(x=>x.includes('Anillo'))).toBe(true);
    expect(previewIncomingAttack(upgraded,sheet,incoming('poison')).finalDamage).toBe(9);
  });
  it('un anillo sin poner no activa la resistencia',()=>{
    const {sheet,state}=setup();
    const wards=applyMagicWardAction([],gain('ring_resistance','fire'));
    expect(previewIncomingAttack({...state,magicWards:wards},sheet,incoming('fire')).finalDamage).toBe(9);
  });
  it('el Broche de protección exige llevarlo puesto y vincularlo',()=>{
    const raw=applyMagicWardAction([],gain('brooch_shielding'));
    const worn=applyMagicWardAction(raw,{type:'wear',instanceId:'ward-1',worn:true});
    expect(collectMagicWardDefenses(worn)).toHaveLength(0);
    const ready=applyMagicWardAction(worn,{type:'attune',instanceId:'ward-1',attuned:true});
    expect(resolveDamageDefense('force',collectMagicWardDefenses(ready)).mitigation).toBe('resistance');
    const unlinked=applyMagicWardAction(ready,{type:'attune',instanceId:'ward-1',attuned:false});
    expect(collectMagicWardDefenses(unlinked)).toHaveLength(0);
  });
  it('el amuleto concede inmunidad al daño de veneno, sin declarar inmunidad genérica a otros daños',()=>{
    let wards=applyMagicWardAction([],gain('periapt_proof_poison'));
    wards=applyMagicWardAction(wards,{type:'attune',instanceId:'ward-1',attuned:true});
    wards=applyMagicWardAction(wards,{type:'wear',instanceId:'ward-1',worn:true});
    expect(resolveDamageDefense('poison',collectMagicWardDefenses(wards)).mitigation).toBe('immunity');
    expect(resolveDamageDefense('fire',collectMagicWardDefenses(wards)).mitigation).toBe('normal');
  });
  it('el daño mixto aplica cada defensa y registra solo una instancia de daño',()=>{
    const {sheet,state}=setup();
    let wards=applyMagicWardAction([],gain('ring_resistance','fire'));
    wards=applyMagicWardAction(wards,{type:'wear',instanceId:'ward-1',worn:true});
    wards=applyMagicWardAction(wards,gain('periapt_proof_poison'));
    wards=applyMagicWardAction(wards,{type:'wear',instanceId:'ward-2',worn:true});
    wards=applyMagicWardAction(wards,{type:'attune',instanceId:'ward-2',attuned:true});
    const combat=receiveIncomingAttack({...state,magicWards:wards},sheet,{...incoming('fire'),additionalDamage:[{damageType:'poison',rolledDamage:8}]});
    expect(combat.preview.damageParts.map(x=>x.effectiveDamage)).toEqual([4,0]);
    expect(combat.state.combat.receivedAttacks).toHaveLength(1);
  });
  it('la resistencia de un anillo no se duplica con la del enano',()=>{
    const {sheet,state}=setup('dwarf');
    let wards=applyMagicWardAction([],gain('ring_resistance','poison'));
    wards=applyMagicWardAction(wards,{type:'wear',instanceId:'ward-1',worn:true});
    const p=previewIncomingAttack({...state,magicWards:wards},sheet,incoming('poison'),{species:'dwarf'});
    expect(p.finalDamage).toBe(4);
  });
  it('la inmunidad del amuleto prevalece sobre la vulnerabilidad manual',()=>{
    const {sheet,state}=setup();
    let wards=applyMagicWardAction([],gain('periapt_proof_poison'));
    wards=applyMagicWardAction(wards,{type:'wear',instanceId:'ward-1',worn:true});
    wards=applyMagicWardAction(wards,{type:'attune',instanceId:'ward-1',attuned:true});
    expect(previewIncomingAttack({...state,magicWards:wards},sheet,{...incoming('poison'),mitigation:'vulnerability'}).finalDamage).toBe(0);
  });
  it('se puede retirar un objeto y desaparece su defensa',()=>{
    let wards=applyMagicWardAction([],gain('ring_resistance','fire'));
    wards=applyMagicWardAction(wards,{type:'wear',instanceId:'ward-1',worn:true});
    expect(collectMagicWardDefenses(wards)).toHaveLength(1);
    wards=applyMagicWardAction(wards,{type:'remove',instanceId:'ward-1'});
    expect(collectMagicWardDefenses(wards)).toHaveLength(0);
  });
  it('desvincular un objeto no lo elimina del inventario mágico',()=>{
    let wards=applyMagicWardAction([],gain('brooch_shielding'));
    wards=applyMagicWardAction(wards,{type:'attune',instanceId:'ward-1',attuned:true});
    wards=applyMagicWardAction(wards,{type:'attune',instanceId:'ward-1',attuned:false});
    expect(wards).toHaveLength(1);
    expect(wards[0].attuned).toBe(false);
  });
  it('no permite vincular dos ejemplares del mismo tipo de objeto',()=>{
    let wards=applyMagicWardAction([],gain('brooch_shielding'));
    wards=applyMagicWardAction(wards,gain('brooch_shielding'));
    wards=applyMagicWardAction(wards,{type:'attune',instanceId:'ward-1',attuned:true});
    expect(()=>applyMagicWardAction(wards,{type:'attune',instanceId:'ward-2',attuned:true})).toThrow();
  });
  it('anillos no consumen ranuras de vinculación y no se pueden marcar vinculados',()=>{
    const wards=applyMagicWardAction([],gain('ring_resistance','fire'));
    expect(()=>applyMagicWardAction(wards,{type:'attune',instanceId:'ward-1',attuned:true})).toThrow();
  });
  it('rechaza registros manipulados y campos no reconocidos',()=>{
    expect(()=>validateMagicWards([{instanceId:'ward-1',itemId:'brooch_shielding',worn:true,attuned:false,evil:true}])).toThrow();
    expect(()=>validateMagicWards([{instanceId:'ward-1',itemId:'ring_resistance',damageType:'bludgeoning',worn:true,attuned:false}])).toThrow();
    expect(()=>validateMagicWards([{instanceId:'ward-1',itemId:'brooch_shielding',worn:1,attuned:false}])).toThrow();
    expect(()=>validateMagicWards(Array(13).fill({instanceId:'ward-1',itemId:'brooch_shielding',worn:false,attuned:false}))).toThrow();
  });
  it('guardar y recuperar conserva el objeto, su tipo, vestimenta y vinculación',()=>{
    const {input,sheet,state}=setup();
    let wards=applyMagicWardAction([],gain('ring_resistance','fire'));
    wards=applyMagicWardAction(wards,{type:'wear',instanceId:'ward-1',worn:true});
    const serialized=JSON.parse(JSON.stringify(makeCharacterSnapshot(input,{...state,magicWards:wards})));
    const revived=validateCharacterSnapshot(serialized);
    expect(revived.adventure.magicWards).toEqual(wards);
    expect(previewIncomingAttack(revived.adventure,sheet,incoming('fire')).finalDamage).toBe(4);
    expect(revived.schemaVersion).toBe(2);
  });
  it('una acción posterior de daño conserva los objetos mágicos activos',()=>{
    const {sheet,state}=setup();
    let wards=applyMagicWardAction([],gain('ring_resistance','fire'));
    wards=applyMagicWardAction(wards,{type:'wear',instanceId:'ward-1',worn:true});
    const result=receiveIncomingAttack({...state,magicWards:wards},sheet,incoming('fire'));
    expect(result.state.magicWards).toEqual(wards);
    expect(previewIncomingAttack(result.state,sheet,incoming('fire')).finalDamage).toBe(4);
  });
  it('el cálculo de vista previa nunca altera el estado ni el objeto',()=>{
    const {sheet,state}=setup();
    let wards=applyMagicWardAction([],gain('ring_resistance','fire'));
    wards=applyMagicWardAction(wards,{type:'wear',instanceId:'ward-1',worn:true});
    const s={...state,magicWards:wards};const before=JSON.stringify(s);
    previewIncomingAttack(s,sheet,incoming('fire'));
    expect(JSON.stringify(s)).toBe(before);
  });
  it('un registro mágico corrupto se rechaza al validar un personaje guardado',()=>{
    const {input,state}=setup();
    const value=makeCharacterSnapshot(input,state);
    expect(()=>validateCharacterSnapshot({...value,adventure:{...value.adventure,magicWards:[{itemId:'fake'}]}})).toThrow();
  });
});
