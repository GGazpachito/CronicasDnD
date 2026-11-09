import {describe,it,expect} from 'vitest';
import {initialTurnTracker,validateTurnTracker,startTurnTracker,endTurnTracker,spendTurnSlot,moveOnTurn,grantActionSurgeSlot,spendAttackOnTurn} from '../src/turns';
import {initialCombatState,validateCombatState,startCharacterTurn,endCharacterTurn,advanceCombatRound,spendCombatSlot,moveCombatCharacter,recordWeaponAttack,grantCombatActionSurge} from '../src/combat';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';
import {calculateWeaponAttack,resolveWeaponAttack,type WeaponAttackProfile} from '../src/attacks';
import {applyInventoryAction,type InventoryState} from '../src/inventory';
import {initialAdventureState,applyAdventureAction} from '../src/adventure';
import {makeCharacterSnapshot,validateCharacterSnapshot} from '../src/persistence';
import type {WeaponId} from '../src/martial';
import type {MasteryContext} from '../src/mastery-effects';

const input=():GuidedFighterInput=>({
  name:'Alba',level:3,background:'soldier',species:'human',
  assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
  increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
  fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'tough',humanSize:'medium',
  armor:'chain_mail',shield:false,
  martial:{fightingStyle:'defense',weaponMasteries:['greatsword','flail','javelin'],startingPackage:'a'},
  backgroundEquipment:{startingPackage:'a',gamingSet:'dice_set'},
});
const sheet=()=>calculateGuidedFighter(input()).sheet;
const ctx=(targetName='Goblin 1'):MasteryContext=>({targetName,targetSize:'small',targetIsCreature:true,dealtDamage:true});
const weapon=(id:WeaponId,extra=false):WeaponAttackProfile=>calculateWeaponAttack(sheet(),id,'defense',[id,...(['shortsword','dagger','greataxe','flail','javelin','greatsword'] as WeaponId[]).filter(x=>x!==id).slice(0,2)],
  extra?{lightExtraAttack:true,otherWeaponHeld:true}:{});
const inv=(id:WeaponId):InventoryState=>{
  const i=calculateGuidedFighter(input()).inventory!;
  return i.items.some(x=>x.id===id&&x.quantity>0)?i:applyInventoryAction(i,{type:'add',itemId:id,quantity:1});
};
const hit=(p:WeaponAttackProfile)=>resolveWeaponAttack(p,{firstD20:18,targetAC:10,...(p.damageDice?{damageRolls:Array(p.damageDice.count).fill(4)}:{})});
const miss=(p:WeaponAttackProfile)=>resolveWeaponAttack(p,{firstD20:2,targetAC:40});

describe('Paso 26: turno propio y espacios de acción',()=>{
  it('los guardados antiguos no requieren campo de turno',()=>{
    expect(validateCombatState(initialCombatState())).toEqual(initialCombatState());
  });
  it('al crear el seguimiento no se inventa un turno activo',()=>{
    expect(initialTurnTracker().number).toBe(0);expect(initialTurnTracker().active).toBe(false);
  });
  it('iniciar, terminar y volver a iniciar incrementa turnos sin avanzar ronda',()=>{
    let s=startCharacterTurn(initialCombatState());expect(s.turn?.number).toBe(1);expect(s.round).toBe(1);
    expect(()=>startCharacterTurn(s)).toThrow();s=endCharacterTurn(s);expect(s.turn?.active).toBe(false);
    expect(()=>endCharacterTurn(s)).toThrow();s=startCharacterTurn(s);expect(s.turn?.number).toBe(2);expect(s.round).toBe(1);
  });
  it('solo hay una acción y una adicional por turno',()=>{
    let s=startTurnTracker(initialTurnTracker());s=spendTurnSlot(s,'action');s=spendTurnSlot(s,'bonus');
    expect(s.actionsUsed).toBe(1);expect(s.bonusUsed).toBe(true);
    expect(()=>spendTurnSlot(s,'action')).toThrow();expect(()=>spendTurnSlot(s,'bonus')).toThrow();
  });
  it('la reacción se permite fuera del turno y se repone AL COMENZAR el siguiente',()=>{
    let s=startTurnTracker(initialTurnTracker());s=spendTurnSlot(s,'reaction');s=endTurnTracker(s);
    expect(s.reactionUsed).toBe(true);expect(()=>spendTurnSlot(s,'reaction')).toThrow();
    s=startTurnTracker(s);expect(s.reactionUsed).toBe(false);expect(s.actionsUsed).toBe(0);
  });
  it('no se puede reaccionar antes del primer turno gestionado',()=>expect(()=>spendTurnSlot(initialTurnTracker(),'reaction')).toThrow());
  it('Correr gasta acción y aumenta el movimiento, no crea velocidad si es cero',()=>{
    let s=startTurnTracker(initialTurnTracker());s=moveOnTurn(s,20,30);
    expect(()=>moveOnTurn(s,11,30)).toThrow();s=spendTurnSlot(s,'dash');
    s=moveOnTurn(s,40,30);expect(s.movementUsedFeet).toBe(60);
    expect(()=>moveOnTurn(s,1,30)).toThrow();
    expect(()=>moveOnTurn(startTurnTracker(initialTurnTracker()),5,0)).toThrow();
  });
  it('movimiento solo en turno, sin negativos, fracciones ni exceso',()=>{
    const zero=initialTurnTracker();expect(()=>moveOnTurn(zero,5,30)).toThrow();
    const s=startTurnTracker(zero);
    for(const f of [0,-1,1.5,1001])expect(()=>moveOnTurn(s,f,30)).toThrow();
    expect(()=>moveOnTurn(s,5,-1)).toThrow();
  });
  it('Acción súbita añade exactamente una acción adicional en el turno',()=>{
    let s=startTurnTracker(initialTurnTracker());s=spendTurnSlot(s,'action');s=grantActionSurgeSlot(s);
    expect(s.actionLimit).toBe(2);s=spendTurnSlot(s,'action');expect(s.actionsUsed).toBe(2);
    expect(()=>grantActionSurgeSlot(s)).toThrow();expect(()=>spendTurnSlot(s,'action')).toThrow();
  });
  it('el nuevo turno restaura movimiento y una acción aunque se hubiera usado Acción súbita',()=>{
    let s=grantActionSurgeSlot(startTurnTracker(initialTurnTracker()));s=spendTurnSlot(s,'dash');s=moveOnTurn(s,30,30);
    s=startTurnTracker(endTurnTracker(s));expect(s.dashes).toBe(0);expect(s.actionLimit).toBe(1);
    expect(s.movementUsedFeet).toBe(0);expect(s.actionsUsed).toBe(0);
  });
  it('el tracker rechaza campos ajenos y estados contradictorios',()=>{
    const s=startTurnTracker(initialTurnTracker());
    expect(()=>validateTurnTracker({...s,extra:1})).toThrow();
    expect(()=>validateTurnTracker({...s,actionsUsed:3})).toThrow();
    expect(()=>validateTurnTracker({...s,attackActionUsed:true})).toThrow();
    expect(()=>validateTurnTracker({...s,cleaveReadyWeapon:'greataxe'})).toThrow();
  });
  it('no permite avanzar ronda mientras el turno está activo',()=>{
    let s=startCharacterTurn(initialCombatState());expect(()=>advanceCombatRound(s)).toThrow();
    s=advanceCombatRound(endCharacterTurn(s));expect(s.round).toBe(2);
  });
  it('la interfaz puede gastar acciones genéricas y movimiento sobre el estado persistente',()=>{
    let s=startCharacterTurn(initialCombatState());s=spendCombatSlot(s,'dash');s=moveCombatCharacter(s,50,30);
    expect(s.turn?.movementUsedFeet).toBe(50);expect(s.turn?.actionsUsed).toBe(1);
  });
});

describe('Paso 26: interacción entre ataques, Mella, Tajo y efectos temporizados',()=>{
  it('una acción Atacar se registra una vez; el segundo ataque normal queda bloqueado',()=>{
    const p=weapon('greatsword');let c=startCharacterTurn(initialCombatState());
    c=recordWeaponAttack(c,inv('greatsword'),p,hit(p),ctx(),'attack_action').combat;
    expect(c.turn?.attackActionUsed).toBe(true);expect(c.turn?.actionsUsed).toBe(1);
    expect(()=>recordWeaponAttack(c,inv('greatsword'),p,hit(p),ctx(),'attack_action')).toThrow();
  });
  it('Mella requiere ataque Ligera previo y no gasta acción adicional',()=>{
    const dagger=weapon('dagger',true),short=weapon('shortsword');let c=startCharacterTurn(initialCombatState());
    expect(()=>recordWeaponAttack(c,inv('dagger'),dagger,hit(dagger),ctx(),'light_nick')).toThrow();
    c=recordWeaponAttack(c,inv('shortsword'),short,hit(short),ctx(),'attack_action').combat;
    c=recordWeaponAttack(c,inv('dagger'),dagger,hit(dagger),ctx(),'light_nick').combat;
    expect(c.turn?.lightExtraUsed).toBe(true);expect(c.turn?.bonusUsed).toBe(false);
    expect(()=>recordWeaponAttack(c,inv('dagger'),dagger,hit(dagger),ctx(),'light_nick')).toThrow();
    expect(()=>recordWeaponAttack(c,inv('dagger'),dagger,hit(dagger),ctx(),'light_bonus')).toThrow();
  });
  it('el ataque Ligera ordinario usa la acción adicional y comparte límite con Mella',()=>{
    const dagger=weapon('dagger',true),short=weapon('shortsword');let c=startCharacterTurn(initialCombatState());
    c=recordWeaponAttack(c,inv('shortsword'),short,hit(short),ctx(),'attack_action').combat;
    c=recordWeaponAttack(c,inv('dagger'),dagger,hit(dagger),ctx(),'light_bonus').combat;
    expect(c.turn?.bonusUsed).toBe(true);expect(c.turn?.lightExtraUsed).toBe(true);
    expect(()=>recordWeaponAttack(c,inv('dagger'),dagger,hit(dagger),ctx(),'light_nick')).toThrow();
  });
  it('Mella exige que la segunda arma tenga esa maestría elegida',()=>{
    const short=weapon('shortsword',true),first=weapon('dagger');let c=startCharacterTurn(initialCombatState());
    c=recordWeaponAttack(c,inv('dagger'),first,hit(first),ctx(),'attack_action').combat;
    expect(()=>recordWeaponAttack(c,inv('shortsword'),short,hit(short),ctx(),'light_nick')).toThrow();
  });
  it('Tajo requiere impacto inicial, mismo arma y segunda criatura diferente',()=>{
    const axe=weapon('greataxe');let c=startCharacterTurn(initialCombatState());
    c=recordWeaponAttack(c,inv('greataxe'),axe,hit(axe),ctx('Goblin 1'),'attack_action').combat;
    expect(c.turn?.cleaveReadyWeapon).toBe('greataxe');
    expect(()=>recordWeaponAttack(c,inv('greataxe'),axe,hit(axe),ctx('Goblin 1'),'cleave_extra')).toThrow();
    c=recordWeaponAttack(c,inv('greataxe'),axe,hit(axe),ctx('Goblin 2'),'cleave_extra').combat;
    expect(c.turn?.cleaveExtraUsed).toBe(true);
    expect(()=>recordWeaponAttack(c,inv('greataxe'),axe,hit(axe),ctx('Goblin 3'),'cleave_extra')).toThrow();
  });
  it('Tajo adicional no suma Fuerza positiva al daño, conserva el daño de los dados',()=>{
    const p=weapon('greataxe');let c=startCharacterTurn(initialCombatState());
    c=recordWeaponAttack(c,inv('greataxe'),p,hit(p),ctx('Orco A'),'attack_action').combat;
    const extra=recordWeaponAttack(c,inv('greataxe'),p,hit(p),ctx('Orco B'),'cleave_extra').combat;
    expect(extra.attacks[1].damageTotal).toBe(hit(p).damageTotal!-Math.max(0,p.abilityModifier));
    expect(extra.attacks[0].damageTotal).toBe(hit(p).damageTotal);
  });
  it('Tajo no se prepara tras fallar y no permite utilizar otra arma',()=>{
    const axe=weapon('greataxe'),great=weapon('greatsword');let c=startCharacterTurn(initialCombatState());
    c=recordWeaponAttack(c,inv('greataxe'),axe,miss(axe),ctx(),'attack_action').combat;
    expect(c.turn?.cleaveReadyWeapon).toBeNull();
    expect(()=>recordWeaponAttack(c,inv('greataxe'),axe,hit(axe),ctx('Goblin 2'),'cleave_extra')).toThrow();
    expect(()=>recordWeaponAttack(c,inv('greatsword'),great,hit(great),ctx('Goblin 2'),'cleave_extra')).toThrow();
  });
  it('las reacciones se pueden registrar fuera del turno sin gastar acciones',()=>{
    const p=weapon('greatsword');let c=endCharacterTurn(startCharacterTurn(initialCombatState()));
    c=recordWeaponAttack(c,inv('greatsword'),p,hit(p),ctx(),'reaction').combat;
    expect(c.turn?.reactionUsed).toBe(true);expect(c.turn?.actionsUsed).toBe(0);
    expect(()=>recordWeaponAttack(c,inv('greatsword'),p,hit(p),ctx(),'reaction')).toThrow();
  });
  it('los ataques antiguos sin seguimiento permanecen válidos',()=>{
    const p=weapon('greatsword');const c=recordWeaponAttack(initialCombatState(),inv('greatsword'),p,hit(p),ctx()).combat;
    expect(c.turn).toBeUndefined();expect(c.attacks).toHaveLength(1);
  });
  it('la ejecución con contador requiere iniciar seguimiento',()=>{
    const p=weapon('greatsword');expect(()=>recordWeaponAttack(initialCombatState(),inv('greatsword'),p,hit(p),ctx(),'attack_action')).toThrow();
  });
  it('Debilitar expira al comenzar mi siguiente turno, no al terminar el actual',()=>{
    const p=weapon('flail');let c=startCharacterTurn(initialCombatState());
    c=recordWeaponAttack(c,inv('flail'),p,hit(p),ctx(),'attack_action').combat;
    expect(c.masteryEffects?.[0].mastery).toBe('Sap');expect(c.masteryEffects?.[0].sourceTurn).toBe(1);
    c=endCharacterTurn(c);expect(c.masteryEffects).toHaveLength(1);
    c=startCharacterTurn(c);expect(c.masteryEffects).toHaveLength(0);
  });
  it('Ralentizar expira al comienzo del siguiente turno propio',()=>{
    const p=weapon('javelin');let c=startCharacterTurn(initialCombatState());
    c=recordWeaponAttack(c,inv('javelin'),p,hit(p),ctx(),'attack_action').combat;
    expect(c.masteryEffects?.[0].mastery).toBe('Slow');
    c=startCharacterTurn(endCharacterTurn(c));expect(c.masteryEffects).toHaveLength(0);
  });
  it('Hostigar persiste durante el siguiente turno y vence al terminarlo',()=>{
    const p=weapon('shortsword');let c=startCharacterTurn(initialCombatState());
    c=recordWeaponAttack(c,inv('shortsword'),p,hit(p),ctx(),'attack_action').combat;
    expect(c.masteryEffects?.[0].mastery).toBe('Vex');c=endCharacterTurn(c);
    expect(c.masteryEffects).toHaveLength(1);c=startCharacterTurn(c);expect(c.masteryEffects).toHaveLength(1);
    c=endCharacterTurn(c);expect(c.masteryEffects).toHaveLength(0);
  });
  it('efectos antiguos sin fecha de turno requieren resolución manual',()=>{
    const p=weapon('shortsword');let c=recordWeaponAttack(initialCombatState(),inv('shortsword'),p,hit(p),ctx()).combat;
    c=endCharacterTurn(startCharacterTurn(c));c=endCharacterTurn(startCharacterTurn(c));
    expect(c.masteryEffects).toHaveLength(1);expect(c.masteryEffects?.[0].sourceTurn).toBeUndefined();
  });
  it('guarda y recarga turnos y maestrías sin cambiar esquema ni afectar el personaje',()=>{
    const sheetValue=sheet();const ad=initialAdventureState(sheetValue);
    const c=recordWeaponAttack(startCharacterTurn(ad.combat),inv('shortsword'),weapon('shortsword'),hit(weapon('shortsword')),ctx(),'attack_action').combat;
    const snap=makeCharacterSnapshot(input(),{...ad,combat:c});
    const loaded=validateCharacterSnapshot(JSON.parse(JSON.stringify(snap)));
    expect(loaded.schemaVersion).toBe(2);expect(loaded.adventure.combat.turn?.actionLimit).toBe(1);
    expect(loaded.adventure.combat.masteryEffects?.[0].sourceTurn).toBe(1);
  });
  it('rechaza registro con un turno inyectado incoherente',()=>{
    const t=startCharacterTurn(initialCombatState());
    expect(()=>validateCombatState({...t,turn:{...t.turn,number:0,active:true}})).toThrow();
  });
  it('Segundo aliento ocupa la acción adicional durante el turno activo',()=>{
    const ad=initialAdventureState(sheet());
    const state={...ad,combat:startCharacterTurn(ad.combat)};
    const result=applyAdventureAction(state,{type:'second_wind',d10:5},sheet()).state;
    expect(result.combat.turn?.bonusUsed).toBe(true);
    expect(()=>applyAdventureAction(result,{type:'second_wind',d10:5},sheet())).toThrow();
  });
  it('Acción súbita gasta recurso y habilita la segunda acción del turno',()=>{
    const ad=initialAdventureState(sheet());const state={...ad,combat:spendCombatSlot(startCharacterTurn(ad.combat),'action')};
    const result=applyAdventureAction(state,{type:'action_surge'},sheet()).state;
    expect(result.combat.turn?.actionLimit).toBe(2);expect(result.fighter.resources.action_surge?.current).toBe(0);
    const after=spendCombatSlot(result.combat,'action');expect(after.turn?.actionsUsed).toBe(2);
  });
  it('Acción súbita no se puede aplicar dos veces en un mismo turno',()=>{
    const c=grantCombatActionSurge(startCharacterTurn(initialCombatState()));
    expect(()=>grantCombatActionSurge(c)).toThrow();
  });
});
