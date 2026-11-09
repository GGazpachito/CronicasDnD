import {describe,it,expect} from 'vitest';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';
import {calculateWeaponAttack,resolveWeaponAttack,calculateOwnedWeaponAttack,type WeaponAttackProfile} from '../src/attacks';
import {initialCombatState,recordWeaponAttack,clearMasteryEffect,advanceCombatRound,validateCombatState} from '../src/combat';
import {evaluateWeaponMastery,hasVexAdvantage,validateMasteryContext,validateMasteryPendingEffect,type MasteryContext} from '../src/mastery-effects';
import {applyInventoryAction,type InventoryState} from '../src/inventory';
import {makeCharacterSnapshot,validateCharacterSnapshot} from '../src/persistence';
import {initialAdventureState} from '../src/adventure';
import type {WeaponId} from '../src/martial';

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
const context=(targetName='Goblin A',extras:Partial<MasteryContext>={}):MasteryContext=>({targetName,dealtDamage:true,targetSize:'medium',targetIsCreature:true,...extras});
const profile=(id:WeaponId):WeaponAttackProfile=>calculateWeaponAttack(sheet(),id,'defense',[id,...(['greatsword','flail','javelin','dagger'] as WeaponId[]).filter(x=>x!==id).slice(0,2)]);
const hit=(p:WeaponAttackProfile)=>resolveWeaponAttack(p,{firstD20:18,targetAC:12,...(p.damageDice?{damageRolls:Array(p.damageDice.count).fill(4)}:{})});
const miss=(p:WeaponAttackProfile)=>resolveWeaponAttack(p,{firstD20:2,targetAC:40});
const inventory=()=>calculateGuidedFighter(input()).inventory!;
const owns=(id:WeaponId):InventoryState=>{
  const inv=inventory();return inv.items.some(x=>x.id===id&&x.quantity>0)?inv:applyInventoryAction(inv,{type:'add',itemId:id,quantity:1});
};

describe('Paso 25: reglas de las ocho maestrías de armas',()=>{
  it('arma sin maestría elegida no produce eventos',()=>{
    const p=calculateWeaponAttack(sheet(),'greatsword','defense',['flail','javelin','dagger']);
    expect(evaluateWeaponMastery(p,hit(p),context()).pending).toBeNull();
  });
  it('Rozar al fallar calcula daño del modificador y no daño del arma',()=>{
    const p=profile('greatsword');const r=miss(p);
    expect(evaluateWeaponMastery(p,r,context()).message).toContain('3');
    expect(r.grazeDamage).toBe(3);
    expect(evaluateWeaponMastery(p,hit(p),context()).pending).toBeNull();
  });
  it('Mella diferencia ataque adicional y no crea estado persistente',()=>{
    const p=calculateWeaponAttack(sheet(),'dagger','defense',['dagger','flail','javelin'],{lightExtraAttack:true,otherWeaponHeld:true});
    expect(evaluateWeaponMastery(p,hit(p),context()).message).toContain('acción Atacar');
    expect(evaluateWeaponMastery(p,hit(p),context()).pending).toBeNull();
    expect(evaluateWeaponMastery(profile('dagger'),hit(profile('dagger')),context()).message).toContain('Ligera');
  });
  it('Tajo describe segundo objetivo y restricción por turno, sin inventar ataques',()=>{
    const p=profile('greataxe');const e=evaluateWeaponMastery(p,hit(p),context());
    expect(e.message).toContain('SEGUNDA');expect(e.message).toContain('una vez por turno');expect(e.pending).toBeNull();
  });
  it('Empujar anula tamaños Enorme/Gargantuesco y no presupone tamaño desconocido',()=>{
    const p=profile('warhammer');
    expect(evaluateWeaponMastery(p,hit(p),context('Ogro',{targetSize:'huge'})).pending).toBeNull();
    expect(evaluateWeaponMastery(p,hit(p),context('Ogro',{targetSize:'unknown'})).pending).toBeNull();
    expect(evaluateWeaponMastery(p,hit(p),context('Goblin',{targetSize:'small'})).pending?.mastery).toBe('Push');
  });
  it('Debilitar ocurre con impacto y se asocia a objetivo',()=>{
    const p=profile('flail');
    expect(evaluateWeaponMastery(p,hit(p),context()).pending?.mastery).toBe('Sap');
    expect(evaluateWeaponMastery(p,miss(p),context()).pending).toBeNull();
  });
  it('Ralentizar exige daño realmente infligido y no solo impacto',()=>{
    const p=profile('javelin');
    expect(evaluateWeaponMastery(p,hit(p),context('Goblin',{dealtDamage:true})).pending?.mastery).toBe('Slow');
    expect(evaluateWeaponMastery(p,hit(p),context('Goblin',{dealtDamage:false})).pending).toBeNull();
    expect(evaluateWeaponMastery(p,miss(p),context()).pending).toBeNull();
  });
  it('Derribar anota salvación de Constitución, no presume que el objetivo falló',()=>{
    const p=profile('maul');const e=evaluateWeaponMastery(p,hit(p),context());
    expect(e.pending?.mastery).toBe('Topple');expect(e.message).toContain(`CD ${p.masterySaveDC}`);expect(e.message).toContain('Si falla');
  });
  it('Hostigar exige impacto y daño efectivo y asigna la ventaja solo al mismo objetivo',()=>{
    const p=profile('shortsword');
    expect(evaluateWeaponMastery(p,hit(p),context()).pending?.mastery).toBe('Vex');
    expect(evaluateWeaponMastery(p,hit(p),context('Goblin',{dealtDamage:false})).pending).toBeNull();
    expect(evaluateWeaponMastery(p,miss(p),context()).pending).toBeNull();
  });
  it('no crea estados de maestría contra objetos inanimados',()=>{
    for(const id of ['greatsword','flail','javelin','shortsword','maul','warhammer','greataxe'] as WeaponId[]){
      const p=profile(id);
      expect(evaluateWeaponMastery(p,hit(p),context('Puerta',{targetIsCreature:false})).pending).toBeNull();
    }
  });
  it('sin CA del objetivo no inventa impactos ni efectos',()=>{
    const p=profile('shortsword');const r=resolveWeaponAttack(p,{firstD20:13,damageRolls:[4]});
    expect(r.hit).toBeNull();expect(evaluateWeaponMastery(p,r,context()).pending).toBeNull();
  });
  it('sin nombre de objetivo da explicación pero no registra recordatorio',()=>{
    const p=profile('shortsword');expect(evaluateWeaponMastery(p,hit(p),context('')).pending).toBeNull();
  });
  it('en Vex un crítico natural sí permite crear seguimiento si hizo daño',()=>{
    const p=profile('shortsword');const r=resolveWeaponAttack(p,{firstD20:20,targetAC:100,damageRolls:[2,2]});
    expect(r.hit).toBe(true);expect(evaluateWeaponMastery(p,r,context()).pending?.mastery).toBe('Vex');
  });
});

describe('Paso 25: registro, objetivos, persistencia y seguridad',()=>{
  it('Hostigar confirmado crea un estado y registra la fuente',()=>{
    const p=profile('shortsword');const s=recordWeaponAttack(initialCombatState(),owns('shortsword'),p,hit(p),context()).combat;
    expect(s.attacks[0].targetName).toBe('Goblin A');expect(s.attacks[0].masteryNote).toContain('Hostigar');
    expect(s.masteryEffects?.[0].mastery).toBe('Vex');expect(s.masteryEffects?.[0].sourceAttackId).toBe(1);
    expect(s.masteryEffects?.[0].id).toBe(2);expect(s.nextId).toBe(3);
    expect(hasVexAdvantage(s.masteryEffects,'gObLiN A')).toBe(true);
    expect(hasVexAdvantage(s.masteryEffects,'Goblin B')).toBe(false);
  });
  it('Hostigar cambia a ventaja y se consume al atacar al mismo objetivo aunque falle',()=>{
    const p=profile('shortsword');const s=recordWeaponAttack(initialCombatState(),owns('shortsword'),p,hit(p),context()).combat;
    const q=calculateWeaponAttack(sheet(),'greatsword','defense',['greatsword','flail','javelin'],{conditionAdvantage:hasVexAdvantage(s.masteryEffects,'Goblin A')});
    expect(q.mode).toBe('advantage');
    const fail=resolveWeaponAttack(q,{firstD20:2,secondD20:3,targetAC:40});
    const next=recordWeaponAttack(s,owns('greatsword'),q,fail,context()).combat;
    expect(hasVexAdvantage(next.masteryEffects,'Goblin A')).toBe(false);
  });
  it('Hostigar no se consume cuando el siguiente ataque va contra otra criatura',()=>{
    const p=profile('shortsword');const s=recordWeaponAttack(initialCombatState(),owns('shortsword'),p,hit(p),context()).combat;
    const other=profile('greatsword');const next=recordWeaponAttack(s,owns('greatsword'),other,hit(other),context('Ogro')).combat;
    expect(hasVexAdvantage(next.masteryEffects,'Goblin A')).toBe(true);
  });
  it('Hostigar obtenido otra vez en el mismo ataque sustituye al consumido',()=>{
    const p=profile('shortsword');const s=recordWeaponAttack(initialCombatState(),owns('shortsword'),p,hit(p),context()).combat;
    const next=recordWeaponAttack(s,owns('shortsword'),p,hit(p),context()).combat;
    expect(next.masteryEffects).toHaveLength(1);expect(next.masteryEffects?.[0].id).toBe(4);
  });
  it('el jugador puede marcar manualmente un efecto como resuelto o caducado',()=>{
    const p=profile('flail');const s=recordWeaponAttack(initialCombatState(),owns('flail'),p,hit(p),context()).combat;
    const cleared=clearMasteryEffect(s,s.masteryEffects![0].id);
    expect(cleared.masteryEffects).toHaveLength(0);
    expect(()=>clearMasteryEffect(cleared,2)).toThrow();
    expect(s.masteryEffects).toHaveLength(1);
  });
  it('Debilitar y Ralentizar no se acumulan dos veces en el mismo objetivo',()=>{
    for(const id of ['flail','javelin'] as const){
      const p=profile(id);const one=recordWeaponAttack(initialCombatState(),owns(id),p,hit(p),context()).combat;
      const two=recordWeaponAttack(one,owns(id),p,hit(p),context()).combat;
      expect(two.masteryEffects).toHaveLength(1);
    }
  });
  it('sin contexto conserva el comportamiento anterior y los IDs del historial',()=>{
    const p=profile('greatsword');const s=recordWeaponAttack(initialCombatState(),owns('greatsword'),p,hit(p)).combat;
    expect(s.nextId).toBe(2);expect(s.masteryEffects).toBeUndefined();expect(s.attacks[0].targetName).toBeUndefined();
  });
  it('los guardados anteriores sin masteryEffects siguen validándose',()=>{
    const old=initialCombatState();expect(validateCombatState(old)).toEqual(old);
    const snap=makeCharacterSnapshot(input(),initialAdventureState(sheet()));
    expect(validateCharacterSnapshot(snap).adventure.combat.masteryEffects).toBeUndefined();
  });
  it('el historial con efectos sobrevive al guardado y a la carga',()=>{
    const base=initialAdventureState(sheet());const p=profile('flail');
    const combat=recordWeaponAttack(base.combat,owns('flail'),p,hit(p),context()).combat;
    const saved=makeCharacterSnapshot(input(),{...base,combat});
    const loaded=validateCharacterSnapshot(JSON.parse(JSON.stringify(saved)));
    expect(loaded.adventure.combat.masteryEffects?.[0].target).toBe('Goblin A');
    expect(loaded.adventure.combat.attacks[0].masteryNote).toContain('Debilitar');
  });
  it('avanzar ronda conserva recordatorios hasta resolver el turno correspondiente',()=>{
    const p=profile('shortsword');const s=recordWeaponAttack(initialCombatState(),owns('shortsword'),p,hit(p),context()).combat;
    const later=advanceCombatRound(s);
    expect(later.round).toBe(2);expect(later.masteryEffects?.[0].target).toBe('Goblin A');
  });
  it('rechaza objetivos con caracteres de control, tamaño inválido y daño no booleano',()=>{
    expect(()=>validateMasteryContext({...context(),targetName:'G\n1'})).toThrow();
    expect(()=>validateMasteryContext({...context(),targetSize:'colossal'})).toThrow();
    expect(()=>validateMasteryContext({...context(),dealtDamage:1})).toThrow();
    expect(()=>validateMasteryContext({...context(),extra:true})).toThrow();
  });
  it('rechaza efectos inyectados de procedencia, tipo o IDs falsos',()=>{
    const p=profile('shortsword');const s=recordWeaponAttack(initialCombatState(),owns('shortsword'),p,hit(p),context()).combat;
    for(const bad of [{...s.masteryEffects![0],mastery:'Fireball'},{...s.masteryEffects![0],sourceAttackId:2},{...s.masteryEffects![0],target:'<invalid>\n'}]){
      expect(()=>validateMasteryPendingEffect(bad)).toThrow();
    }
    expect(()=>validateCombatState({...s,masteryEffects:[{...s.masteryEffects![0],id:1}]})).toThrow();
  });
  it('no modifica el inventario ni la munición al calcular maestrías',()=>{
    const inv=owns('shortbow');const before=JSON.stringify(inv);
    const p=profile('shortbow');const evaluation=evaluateWeaponMastery(p,hit(p),context());
    expect(evaluation.pending?.mastery).toBe('Vex');expect(JSON.stringify(inv)).toBe(before);
  });
  it('la identidad del objetivo no es sensible a mayúsculas ni espacios externos',()=>{
    const p=profile('shortsword');const s=recordWeaponAttack(initialCombatState(),owns('shortsword'),p,hit(p),context('  Goblin A  ')).combat;
    expect(s.masteryEffects?.[0].target).toBe('Goblin A');
    expect(hasVexAdvantage(s.masteryEffects,' goblin a ')).toBe(true);
  });
});
