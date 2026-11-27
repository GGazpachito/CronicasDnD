import {describe,it,expect} from 'vitest';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';
import {calculateWeaponAttack,resolveWeaponAttack} from '../src/attacks';
import {addTrackedEffect,advanceCombatRound,initialCombatState,recordWeaponAttack,removeTrackedEffect,validateCombatState} from '../src/combat';
import {applyInventoryAction} from '../src/inventory';
import {initialAdventureState,validateAdventureState} from '../src/adventure';
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
const fixture=()=>{
  const result=calculateGuidedFighter(input());
  if(!result.inventory)throw Error('Falta inventario');
  const profile=calculateWeaponAttack(result.sheet,'longbow','archery',input().martial!.weaponMasteries);
  const resolution=resolveWeaponAttack(profile,{firstD20:12,targetAC:14,damageRolls:[4]});
  return {sheet:result.sheet,inventory:result.inventory,profile,resolution};
};
const quantity=(items:readonly {id:string;quantity:number}[],id:string)=>items.find(x=>x.id===id)?.quantity??0;

describe('Paso 16 · registro de combate e inventario',()=>{
  it('comienza sin ataques ni efectos',()=>{
    expect(initialCombatState()).toEqual({round:1,nextId:1,attacks:[],effects:[]});
  });
  it('confirma un disparo y descuenta exactamente una flecha',()=>{
    const f=fixture();expect(quantity(f.inventory.items,'arrow')).toBe(40);
    const result=recordWeaponAttack(initialCombatState(),f.inventory,f.profile,f.resolution);
    expect(result.inventoryAction).toEqual({type:'remove',itemId:'arrow',quantity:1});
    expect(result.combat.attacks[0].weaponId).toBe('longbow');
    expect(result.combat.attacks[0].attackTotal).toBe(f.resolution.attackTotal);
    const remaining=applyInventoryAction(f.inventory,result.inventoryAction!);
    expect(quantity(remaining.items,'arrow')).toBe(39);
    expect(quantity(f.inventory.items,'arrow')).toBe(40);
  });
  it('un fallo tambien consume municion',()=>{
    const f=fixture();const miss=resolveWeaponAttack(f.profile,{firstD20:2,targetAC:25});
    const result=recordWeaponAttack(initialCombatState(),f.inventory,f.profile,miss);
    expect(result.combat.attacks[0].hit).toBe(false);
    expect(result.inventoryAction?.type).toBe('remove');
  });
  it('sin flechas no se registra el ataque y el estado original queda intacto',()=>{
    const f=fixture();const empty=applyInventoryAction(f.inventory,{type:'remove',itemId:'arrow',quantity:40});
    const state=initialCombatState();const before=JSON.stringify(state);
    expect(()=>recordWeaponAttack(state,empty,f.profile,f.resolution)).toThrow();
    expect(JSON.stringify(state)).toBe(before);
  });
  it('un arma cuerpo a cuerpo no gasta municion',()=>{
    const f=fixture();const profile=calculateWeaponAttack(f.sheet,'scimitar','archery',input().martial!.weaponMasteries);
    const resolution=resolveWeaponAttack(profile,{firstD20:16,targetAC:14,damageRolls:[3]});
    const result=recordWeaponAttack(initialCombatState(),f.inventory,profile,resolution);
    expect(result.inventoryAction).toBeNull();
    expect(result.combat.attacks[0].ammunitionSpent).toBeNull();
  });
  it('el catalogo permite registrar ballestas y virotes como botin',()=>{
    const f=fixture();let inv=applyInventoryAction(f.inventory,{type:'add',itemId:'light_crossbow',quantity:1});
    inv=applyInventoryAction(inv,{type:'add',itemId:'bolt',quantity:4});
    const profile=calculateWeaponAttack(f.sheet,'light_crossbow','archery',input().martial!.weaponMasteries);
    const resolution=resolveWeaponAttack(profile,{firstD20:15,targetAC:13,damageRolls:[6]});
    const result=recordWeaponAttack(initialCombatState(),inv,profile,resolution);
    expect(result.inventoryAction).toEqual({type:'remove',itemId:'bolt',quantity:1});
  });
  it('sin poseer el arma no permite registrar un disparo',()=>{
    const f=fixture();const profile=calculateWeaponAttack(f.sheet,'pistol','archery',input().martial!.weaponMasteries);
    const resolution=resolveWeaponAttack(profile,{firstD20:12,targetAC:14,damageRolls:[4]});
    expect(()=>recordWeaponAttack(initialCombatState(),f.inventory,profile,resolution)).toThrow();
  });
  it('un efecto temporal se agota al avanzar suficientes rondas',()=>{
    const s=addTrackedEffect(initialCombatState(),'Efecto temporal',2,'control manual');
    expect(s.effects[0].remainingRounds).toBe(2);
    const next=advanceCombatRound(s);expect(next.round).toBe(2);expect(next.effects[0].remainingRounds).toBe(1);
    const expired=advanceCombatRound(next);expect(expired.effects).toEqual([]);
    expect(s.effects[0].remainingRounds).toBe(2);
  });
  it('un efecto indefinido sigue activo hasta su retirada',()=>{
    const s=addTrackedEffect(initialCombatState(),'Nota persistente',null);
    const next=advanceCombatRound(s);
    expect(next.effects[0].remainingRounds).toBeNull();
    expect(removeTrackedEffect(next,s.effects[0].id).effects).toHaveLength(0);
  });
  it('no permite efectos con texto excesivo o duracion invalida',()=>{
    expect(()=>addTrackedEffect(initialCombatState(),'  ',2)).toThrow();
    expect(()=>addTrackedEffect(initialCombatState(),'A',0)).toThrow();
    expect(()=>addTrackedEffect(initialCombatState(),'A',101)).toThrow();
    expect(()=>addTrackedEffect(initialCombatState(),'x'.repeat(70),2)).toThrow();
  });
  it('mantiene IDs unicos aunque se borren los efectos',()=>{
    const s=addTrackedEffect(initialCombatState(),'A',1);
    const next=addTrackedEffect(removeTrackedEffect(s,1),'B',2);
    expect(next.effects[0].id).toBe(2);
  });
  it('rechaza una entrada adulterada durante carga',()=>{
    const f=fixture();const s=recordWeaponAttack(initialCombatState(),f.inventory,f.profile,f.resolution).combat;
    expect(()=>validateCombatState({...s,attacks:[{...s.attacks[0],weaponId:'invalid'}]})).toThrow();
    expect(()=>validateCombatState({...s,effects:[{id:1,name:'X',remainingRounds:-3,notes:''}]})).toThrow();
    expect(()=>validateCombatState({...s,extra:true})).toThrow();
  });
  it('los guardados v2 antiguos sin combate se abren con historial vacío',()=>{
    const f=fixture();const old=initialAdventureState(f.sheet);
    const {combat:_ignored,...legacy}=old;
    const restored=validateAdventureState(legacy,f.sheet);
    expect(restored.combat.attacks).toEqual([]);
    const saved=validateCharacterSnapshot({schemaVersion:2,ruleset:'dnd-2024',input:input(),adventure:legacy});
    expect(saved.adventure.combat.round).toBe(1);
    expect(saved.schemaVersion).toBe(2);
  });
  it('el historial se conserva tras guardar y volver a cargar el personaje',()=>{
    const f=fixture(),s=initialAdventureState(f.sheet);
    const rec=recordWeaponAttack(s.combat,f.inventory,f.profile,f.resolution);
    const nextInput:GuidedFighterInput={...input(),inventoryActions:[rec.inventoryAction!]};
    const saved=makeCharacterSnapshot(nextInput,{...s,combat:rec.combat});
    const restored=validateCharacterSnapshot(JSON.parse(JSON.stringify(saved)));
    expect(restored.adventure.combat.attacks).toHaveLength(1);
    expect(restored.adventure.combat.attacks[0].ammunitionSpent).toBe('arrow');
    expect(restored.input.inventoryActions).toHaveLength(1);
    expect(calculateGuidedFighter(restored.input).inventory?.items.find(x=>x.id==='arrow')?.quantity).toBe(39);
  });
  it('un ataque no altera PG ni recursos del Guerrero',()=>{
    const f=fixture(),s=initialAdventureState(f.sheet);
    const rec=recordWeaponAttack(s.combat,f.inventory,f.profile,f.resolution);
    const updated={...s,combat:rec.combat};
    expect(updated.fighter).toEqual(s.fighter);
    expect(updated.temporaryHitPoints).toBe(s.temporaryHitPoints);
  });
});
