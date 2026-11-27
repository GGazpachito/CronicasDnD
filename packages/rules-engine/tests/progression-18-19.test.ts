import {describe,it,expect} from 'vitest';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';
import {applyEpicBoon,EPIC_BOONS} from '../src/epic-boons';
import {adjacentFighterLevel} from '../src/progression';
import {initialAdventureState,applyAdventureAction,updateAdventureCombat} from '../src/adventure';
import {startCharacterTurn,endCharacterTurn,recordWeaponAttack} from '../src/combat';
import {calculateWeaponAttack,resolveWeaponAttack,preparePeerlessAimDamage} from '../src/attacks';
import {validateCharacterSnapshot} from '../src/persistence';
import {prepareFighterLevelUp} from '../src/level-up';

const base:GuidedFighterInput={
  name:'Campeón',level:17,background:'soldier',species:'human',
  assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
  increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
  fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'alert',humanSize:'medium',
  armor:'chain_mail',shield:false,
  level4Improvement:{mode:'plus_two',first:'strength'},
  level6Improvement:{mode:'plus_two',first:'constitution'},
  level8Improvement:{mode:'plus_two',first:'wisdom'},
  level12Improvement:{mode:'plus_two',first:'wisdom'},
  level14Improvement:{mode:'plus_two',first:'charisma'},
  level16Improvement:{mode:'plus_two',first:'intelligence'},
  martial:{fightingStyle:'defense',additionalFightingStyle:'archery',weaponMasteries:['greatsword','flail','javelin','shortsword','longbow','warhammer'],startingPackage:'a'},
  backgroundEquipment:{startingPackage:'a',gamingSet:'dice_set'},
};
const at18=():GuidedFighterInput=>({...base,level:18});
const at19=(ability:GuidedFighterInput['plusOneAbility']='strength'):GuidedFighterInput=>({...at18(),level:19,epicBoon:{id:'combat_prowess',ability}});
const calc=(input:GuidedFighterInput)=>calculateGuidedFighter(input);
const sheet=(input:GuidedFighterInput)=>calc(input).sheet;
const damage=(input:GuidedFighterInput,amount:number)=>applyAdventureAction(initialAdventureState(sheet(input)),{type:'damage',amount},sheet(input)).state;

describe('Actualización 34: Superviviente y beneficio épico',()=>{
  it('las flechas admiten 17→18→19 y continúan hasta 20',()=>{
    expect(adjacentFighterLevel(17,1)).toBe(18);expect(adjacentFighterLevel(18,1)).toBe(19);
    expect(adjacentFighterLevel(19,1)).toBe(20);
    expect(adjacentFighterLevel(20,1)).toBeNull();expect(adjacentFighterLevel(19,-1)).toBe(18);
  });
  it('a nivel 18 se obtiene Superviviente una sola vez',()=>{
    const s=sheet(at18());expect(s.features).toContain('champion_survivor');
    expect(s.features).toHaveLength(new Set(s.features).size);
    expect(sheet(base).features.includes('champion_survivor')).toBe(false);
  });
  it('nivel 19 exige una elección épica explícita y prohíbe elecciones anticipadas',()=>{
    expect(()=>calc({...at18(),level:19})).toThrow();
    expect(()=>calc({...base,epicBoon:{id:'combat_prowess',ability:'strength'}})).toThrow();
    expect(()=>calc({...at18(),epicBoon:{id:'combat_prowess',ability:'strength'}})).toThrow();
    expect(()=>calc({...at19(),epicBoon:{id:'invalid' as never,ability:'strength'}})).toThrow();
  });
  it('beneficio épico aumenta una característica en +1 y no admite puntuación 31',()=>{
    expect(sheet(at19()).abilityScores.strength).toBe(sheet(at18()).abilityScores.strength+1);
    expect(()=>applyEpicBoon({...sheet(at18()).abilityScores,strength:30},{id:'combat_prowess',ability:'strength'})).toThrow();
    expect(Object.keys(EPIC_BOONS)).toHaveLength(1);
  });
  it('el programa base rechaza Fortaleza y Velocidad como dotes épicas',()=>{
    for(const id of ['fortitude','speed']){
      expect(()=>calc({...at19(),epicBoon:{id:id as never,ability:'wisdom'}})).toThrow();
    }
  });
  it('Superviviente cura al inicio del turno estando maltrecho y consciente',()=>{
    const s=sheet(at18());let state=damage(at18(),Math.ceil(s.maximumHitPoints/2)+1);
    const before=state.fighter.hitPoints.current;
    state=updateAdventureCombat(state,startCharacterTurn(state.combat,true),s);
    expect(state.fighter.hitPoints.current).toBe(Math.min(s.maximumHitPoints,before+5+s.abilityModifiers.constitution));
    expect(state.combat.heroicInspiration).toBe(true);
  });
  it('Superviviente no cura por encima de la mitad de PG ni fuera de un inicio de turno',()=>{
    const s=sheet(at18());let state=damage(at18(),3);const before=state.fighter.hitPoints.current;
    state=updateAdventureCombat(state,startCharacterTurn(state.combat,true),s);
    expect(state.fighter.hitPoints.current).toBe(before);
    state=updateAdventureCombat(state,endCharacterTurn(state.combat),s);
    expect(state.fighter.hitPoints.current).toBe(before);
  });
  it('Superviviente no cura a 0 PG',()=>{
    const s=sheet(at18());let state=damage(at18(),s.maximumHitPoints);
    state=updateAdventureCombat(state,startCharacterTurn(state.combat,true),s);
    expect(state.fighter.hitPoints.current).toBe(0);
  });
  it('Superviviente selecciona el mayor de dos d20 y trata 18–20 como 20 natural',()=>{
    const s=sheet(at18());let state=damage(at18(),s.maximumHitPoints);
    state=applyAdventureAction(state,{type:'death_save',d20:1,secondD20:18},s).state;
    expect(state.fighter.hitPoints.current).toBe(1);
    expect(state.survival?.death.failures).toBe(0);
  });
  it('la ventaja de Superviviente se aplica antes del agotamiento, que no cancela el efecto natural 18',()=>{
    const s=sheet(at18());let state=damage(at18(),s.maximumHitPoints);
    state={...state,combat:{...state.combat,conditions:{instances:[],exhaustion:2}}};
    state=applyAdventureAction(state,{type:'death_save',d20:18,secondD20:2},s).state;
    expect(state.fighter.hitPoints.current).toBe(1);
  });
  it('la salvación de muerte de nivel 18 requiere ambos dados y niveles inferiores los rechazan',()=>{
    const s=sheet(at18());const state=damage(at18(),s.maximumHitPoints);
    expect(()=>applyAdventureAction(state,{type:'death_save',d20:13},s)).toThrow();
    const old=sheet(base);const before=damage(base,old.maximumHitPoints);
    expect(()=>applyAdventureAction(before,{type:'death_save',d20:13,secondD20:15},old)).toThrow();
  });
  it('la curación normal funciona sin beneficios de Fortaleza',()=>{
    const s=sheet(at19());let state=damage(at19(),15);
    state=applyAdventureAction(state,{type:'heal',amount:1},s).state;
    expect(state.combat.fortitudeHealUsed).toBeUndefined();
  });
  it('rechaza bonificaciones de Fortaleza en curación, Segundo aliento y descansos',()=>{
    const s=sheet(at19());const state=damage(at19(),25);
    expect(()=>applyAdventureAction(state,{type:'heal',amount:5,fortitudeBonus:true} as never,s)).toThrow();
    expect(()=>applyAdventureAction(state,{type:'second_wind',d10:1,fortitudeBonus:true} as never,s)).toThrow();
    expect(()=>applyAdventureAction(state,{type:'short_rest',hitDieRolls:[1],fortitudeBonus:true} as never,s)).toThrow();
  });
  it('el fallo convertido en impacto utiliza los dados reales y no activa Rozar',()=>{
    const input=at19();const s=sheet(input);
    const profile=calculateWeaponAttack(s,'greatsword',['defense','archery'],input.martial!.weaponMasteries);
    const miss=resolveWeaponAttack(profile,{firstD20:2,targetAC:99,damageRolls:[3,4]});
    const prepared=preparePeerlessAimDamage(profile,miss,[3,4]);
    expect(prepared.hit).toBe(false);expect(prepared.damageTotal).toBe(7+profile.damageModifier);
    expect(prepared.grazeDamage).toBeNull();
    expect(()=>preparePeerlessAimDamage(profile,miss,[3])).toThrow();
  });
  it('Pericia en combate se gasta al confirmar, deja impacto en historial y no puede repetirse',()=>{
    const input=at19();const output=calc(input);const s=output.sheet;
    const profile=calculateWeaponAttack(s,'greatsword',['defense','archery'],input.martial!.weaponMasteries);
    const miss=resolveWeaponAttack(profile,{firstD20:2,targetAC:99,damageRolls:[3,4]});
    const prepared=preparePeerlessAimDamage(profile,miss,[3,4]);
    const context={targetName:'Goblin',targetSize:'small' as const,targetIsCreature:true,dealtDamage:true};
    const r=recordWeaponAttack(initialAdventureState(s).combat,output.inventory!,profile,prepared,context,'untracked',19,true,true);
    expect(r.combat.attacks[0].hit).toBe(true);expect(r.combat.attacks[0].damageTotal).toBe(prepared.damageTotal);
    expect(r.combat.attacks[0].peerlessAimApplied).toBe(true);
    expect(r.combat.peerlessAimUsed).toBe(true);
    expect(()=>recordWeaponAttack(r.combat,output.inventory!,profile,prepared,context,'untracked',19,true,true)).toThrow();
    expect(()=>recordWeaponAttack(initialAdventureState(s).combat,output.inventory!,profile,prepared,context,'untracked',19,true,false)).toThrow();
  });
  it('Pericia en combate se recupera al comenzar el turno siguiente',()=>{
    const s=sheet(at19());const old=initialAdventureState(s);
    const marked={...old.combat,peerlessAimUsed:true};
    expect(startCharacterTurn(marked,true).peerlessAimUsed).toBe(false);
  });
  it('progresión 17→18→19 preserva PG perdidos y guarda el beneficio escogido',()=>{
    let input=base;let before=sheet(input);let state=damage(base,10);
    for(const next of [at18(),at19('charisma')]){
      const advanced=prepareFighterLevelUp(input,state,next);
      state=advanced.snapshot.adventure;
      const saved=validateCharacterSnapshot(JSON.parse(JSON.stringify(advanced.snapshot)));
      expect(saved.input.level).toBe(next.level);
      expect(saved.adventure.fighter.fighterLevel).toBe(next.level);
      expect(saved.adventure.fighter.hitPoints.maximum-saved.adventure.fighter.hitPoints.current).toBe(10);
      input=next;before=sheet(input);
    }
    expect(input.epicBoon?.id).toBe('combat_prowess');expect(before.level).toBe(19);
  });
});

describe('Guardado y validación defensiva de beneficios épicos',()=>{
  it('el incremento de puntuación del beneficio épico no exige aumentar Fuerza',()=>{
    const s=sheet(at19('charisma'));
    expect(s.abilityScores.charisma).toBe(sheet(at18()).abilityScores.charisma+1);
  });
  it('el motor rechaza banderas de curación mal formadas',()=>{
    const s=sheet(at19());const state=damage(at19(),20);
    expect(()=>applyAdventureAction(state,{type:'heal',amount:5,fortitudeBonus:'sí'} as never,s)).toThrow();
  });
  it('un personaje de Pericia en combate no gana movimiento ni PG por dotes excluidas',()=>{
    const s=calc(at19('wisdom'));
    expect(s.origin.speedFeet).toBe(calc(at18()).origin.speedFeet);
    expect(s.sheet.maximumHitPoints).toBe(calc(at19('strength')).sheet.maximumHitPoints);
  });
});
