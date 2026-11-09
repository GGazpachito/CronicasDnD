import {describe,it,expect} from 'vitest';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';
import {initialAdventureState,applyAdventureAction} from '../src/adventure';
import {previewIncomingAttack,receiveIncomingAttack,type IncomingAttackInput} from '../src/incoming';
import {collectDamageDefenses,mitigateDamage,resolveDamageDefense,type DeclaredDamageDefense} from '../src/damage-defenses';
import {applyInventoryAction} from '../src/inventory';
import {makeCharacterSnapshot,validateCharacterSnapshot} from '../src/persistence';
import {validateCombatState} from '../src/combat';

const character=(species:'human'|'dwarf'|'elf'='dwarf'):GuidedFighterInput=>({
  name:'Borin',level:3,background:'soldier',species,
  assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
  increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
  fighterSkills:['perception','survival'],
  ...(species==='human'?{humanSkill:'investigation' as const,humanFeat:'tough' as const,humanSize:'medium' as const}:{}),
  ...(species==='elf'?{elfLineage:'wood_elf' as const,elfSenseSkill:'insight' as const,elfSpellAbility:'wisdom' as const}:{}),
  armor:'studded_leather',shield:false,
  martial:{fightingStyle:'archery',weaponMasteries:['longbow','scimitar','shortsword'],startingPackage:'b'},
  backgroundEquipment:{startingPackage:'a',gamingSet:'dice_set'}
});
const request=(changes:Partial<IncomingAttackInput>={}):IncomingAttackInput=>({
  attacker:'Orco',attackBonus:7,firstD20:15,attackerDistanceFeet:5,
  damageType:'poison',rolledDamage:9,mitigation:'normal',...changes
});
function start(species:'human'|'dwarf'|'elf'='dwarf'){
  const c=character(species),output=calculateGuidedFighter(c);
  return {c,output,state:initialAdventureState(output.sheet)};
}

describe('Paso 20: defensas declarativas y daño mixto (PHB 2024)',()=>{
  it('el Enano resiste daño por veneno automáticamente',()=>{
    const {output,state}=start();
    const p=previewIncomingAttack(state,output.sheet,request(),{species:'dwarf'});
    expect(p.finalDamage).toBe(4);
    expect(p.mitigation).toBe('resistance');
    expect(p.damageParts[0].sources).toContain('Resistencia enana');
  });
  it('ni Humano ni Elfo reciben esa resistencia',()=>{
    for(const species of ['human','elf'] as const){
      const {output,state}=start(species);
      expect(previewIncomingAttack(state,output.sheet,request(),{species}).finalDamage).toBe(9);
    }
  });
  it('combina veneno y fuego en un impacto, y solo reduce veneno',()=>{
    const {output,state}=start();
    const p=previewIncomingAttack(state,output.sheet,request({additionalDamage:[{damageType:'fire',rolledDamage:5}]}),{species:'dwarf'});
    expect(p.finalDamage).toBe(9);
    expect(p.damageParts.map(x=>x.effectiveDamage)).toEqual([4,5]);
    expect(p.damageParts.map(x=>x.mitigation)).toEqual(['resistance','normal']);
  });
  it('la resistencia no se multiplica con varias fuentes',()=>{
    const same:DeclaredDamageDefense={id:'rasgo-test',source:'Otra resistencia',damageType:'poison',kind:'resistance'};
    const {output,state}=start();
    const p=previewIncomingAttack(state,output.sheet,request({mitigation:'resistance'}),{species:'dwarf',grants:[same]});
    expect(p.finalDamage).toBe(4);
    expect(p.damageParts[0].sources).toHaveLength(3);
  });
  it('resistencia y vulnerabilidad se aplican en ese orden con redondeo inferior',()=>{
    const {output,state}=start();
    const p=previewIncomingAttack(state,output.sheet,request({mitigation:'vulnerability'}),{species:'dwarf'});
    expect(p.finalDamage).toBe(8);
    expect(p.mitigation).toBe('both');
    expect(mitigateDamage(9,'both')).toBe(8);
  });
  it('inmunidad gana frente a otras defensas',()=>{
    const {output,state}=start();
    const p=previewIncomingAttack(state,output.sheet,request({mitigation:'immunity'}),{species:'dwarf'});
    expect(p.finalDamage).toBe(0);
    expect(p.mitigation).toBe('immunity');
  });
  it('un efecto de equipo declarado solo funciona si se posee y está equipado',()=>{
    const {output}=start();
    const grant:DeclaredDamageDefense={id:'item-test',source:'Armadura mágica ficticia de prueba',kind:'resistance',damageType:'fire',
      requiresEquipped:{slot:'armor',itemId:'chain_mail'}};
    const inventory=output.inventory!;
    expect(collectDamageDefenses({inventory,grants:[grant]})).toHaveLength(0);
    const owned=applyInventoryAction(inventory,{type:'add',itemId:'chain_mail',quantity:1});
    expect(collectDamageDefenses({inventory:owned,grants:[grant]})).toHaveLength(0);
    const equipped=applyInventoryAction(owned,{type:'equip_armor',armor:'chain_mail'});
    expect(collectDamageDefenses({inventory:equipped,grants:[grant]})).toHaveLength(1);
    expect(resolveDamageDefense('fire',collectDamageDefenses({inventory:equipped,grants:[grant]})).mitigation).toBe('resistance');
  });
  it('no concede falsas resistencias a armaduras mundanas',()=>{
    const {output}=start('human');
    expect(collectDamageDefenses({species:'human',inventory:output.inventory})).toEqual([]);
  });
  it('aplica el daño sumado una vez y respeta los PG temporales',()=>{
    const {output,state}=start();
    const buff=applyAdventureAction(state,{type:'temporary_hp',amount:6},output.sheet).state;
    const r=receiveIncomingAttack(buff,output.sheet,request({additionalDamage:[{damageType:'fire',rolledDamage:5}]}),{species:'dwarf'});
    expect(r.preview.finalDamage).toBe(9);
    expect(r.state.temporaryHitPoints).toBe(0);
    expect(r.state.fighter.hitPoints.current).toBe(buff.fighter.hitPoints.current-3);
    expect(r.state.combat.receivedAttacks?.[0].damageParts).toHaveLength(2);
  });
  it('un ataque multicomponente genera una sola salvación de concentración',()=>{
    const {output,state}=start();
    const concentrating=applyAdventureAction(state,{type:'start_concentration',name:'Escudo de fe',rounds:10},output.sheet).state;
    const r=receiveIncomingAttack(concentrating,output.sheet,request({rolledDamage:20,additionalDamage:[{damageType:'fire',rolledDamage:10}]}),{species:'dwarf'});
    expect(r.preview.finalDamage).toBe(20);
    expect(r.state.survival?.concentration?.pendingDCs).toEqual([10]);
  });
  it('a 0 PG los componentes no duplican los fallos por un solo impacto crítico',()=>{
    const {output,state}=start();
    const down=applyAdventureAction(state,{type:'damage',amount:output.sheet.maximumHitPoints},output.sheet).state;
    const r=receiveIncomingAttack(down,output.sheet,request({firstD20:11,secondD20:15,rolledDamage:2,additionalDamage:[{damageType:'fire',rolledDamage:3}]}),{species:'dwarf'});
    expect(r.preview.critical).toBe(true);
    expect(r.state.survival?.death.failures).toBe(2);
  });
  it('historial con desglose sobrevive a guardado y carga, manteniendo guardados antiguos',()=>{
    const {c,output,state}=start();
    const old=validateCharacterSnapshot(makeCharacterSnapshot(c,state));
    expect(old.adventure.combat.receivedAttacks).toBeUndefined();
    const r=receiveIncomingAttack(state,output.sheet,request({additionalDamage:[{damageType:'fire',rolledDamage:5}]}),{species:'dwarf'});
    const snapshot=JSON.parse(JSON.stringify(makeCharacterSnapshot(c,r.state)));
    const restored=validateCharacterSnapshot(snapshot);
    expect(restored.adventure.combat.receivedAttacks?.[0].damageParts?.map(x=>x.effectiveDamage)).toEqual([4,5]);
    expect(restored.schemaVersion).toBe(2);
  });
  it('rechaza desgloses manipulados antes de guardarlos',()=>{
    const {output,state}=start();
    const r=receiveIncomingAttack(state,output.sheet,request({additionalDamage:[{damageType:'fire',rolledDamage:3}]}),{species:'dwarf'});
    const raw=r.state.combat.receivedAttacks![0];
    expect(()=>validateCombatState({...r.state.combat,receivedAttacks:[{...raw,effectiveDamage:500}]})).toThrow();
    expect(()=>validateCombatState({...r.state.combat,receivedAttacks:[{...raw,damageParts:[{...raw.damageParts![0],sources:[100]}]}]})).toThrow();
  });
  it('rechaza más de cuatro componentes y tipos inválidos',()=>{
    const {output,state}=start();
    expect(()=>previewIncomingAttack(state,output.sheet,request({additionalDamage:Array(4).fill({damageType:'fire',rolledDamage:1})}),{species:'dwarf'})).toThrow();
    expect(()=>previewIncomingAttack(state,output.sheet,request({additionalDamage:[{damageType:'hielo' as 'fire',rolledDamage:2}]}),{species:'dwarf'})).toThrow();
  });
  it('fallos y vistas previas no modifican el estado ni consumen recursos',()=>{
    const {output,state}=start(),before=JSON.stringify(state);
    const p=previewIncomingAttack(state,output.sheet,request({firstD20:2,attackBonus:0,additionalDamage:[{damageType:'fire',rolledDamage:5}]}),{species:'dwarf'});
    expect(p.finalDamage).toBe(0);
    expect(JSON.stringify(state)).toBe(before);
  });
});
