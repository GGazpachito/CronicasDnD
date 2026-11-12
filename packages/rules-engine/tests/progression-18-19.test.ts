import {describe,it,expect} from 'vitest';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';
import {applyEpicBoon,EPIC_BOONS} from '../src/epic-boons';
import {adjacentFighterLevel} from '../src/progression';
import {initialAdventureState,applyAdventureAction,updateAdventureCombat,advanceAdventureLevel} from '../src/adventure';
import {startCharacterTurn,endCharacterTurn,recordWeaponAttack,useEpicSpeedDisengage,addCharacterCondition} from '../src/combat';
import {calculateWeaponAttack,resolveWeaponAttack,preparePeerlessAimDamage} from '../src/attacks';
import {makeCharacterSnapshot,validateCharacterSnapshot} from '../src/persistence';
import {prepareFighterLevelUp} from '../src/level-up';

const base:GuidedFighterInput={
  name:'Campeón',level:17,background:'soldier',species:'human',
  assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
  increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
  fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'tough',humanSize:'medium',
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
const at19=(id:'combat_prowess'|'fortitude'|'speed'='combat_prowess',ability:GuidedFighterInput['plusOneAbility']='strength'):GuidedFighterInput=>({...at18(),level:19,epicBoon:{id,ability}});
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
    expect(()=>calc({...base,epicBoon:{id:'speed',ability:'strength'}})).toThrow();
    expect(()=>calc({...at18(),epicBoon:{id:'fortitude',ability:'strength'}})).toThrow();
    expect(()=>calc({...at19(),epicBoon:{id:'invalid' as 'speed',ability:'strength'}})).toThrow();
  });
  it('beneficio épico aumenta una característica en +1 y no admite puntuación 31',()=>{
    expect(sheet(at19()).abilityScores.strength).toBe(sheet(at18()).abilityScores.strength+1);
    expect(()=>applyEpicBoon({...sheet(at18()).abilityScores,strength:30},{id:'combat_prowess',ability:'strength'})).toThrow();
    expect(Object.keys(EPIC_BOONS)).toHaveLength(3);
  });
  it('Fortaleza otorga 40 PG máximos además del +1 a característica',()=>{
    const s=sheet(at19('fortitude','wisdom'));const at19WithoutFlat=sheet(at19('speed','wisdom'));
    expect(s.maximumHitPoints-at19WithoutFlat.maximumHitPoints).toBe(40);
    expect(s.features).toContain('epic_boon_fortitude');
  });
  it('Velocidad incrementa 30 pies sin modificar la CA ni los PG',()=>{
    const s=calc(at19('speed','wisdom'));const f=calc(at19('combat_prowess','wisdom'));
    expect(s.origin.speedFeet).toBe(f.origin.speedFeet+30);
    expect(s.sheet.maximumHitPoints).toBe(f.sheet.maximumHitPoints);
    expect(s.sheet.armorClass).toBe(f.sheet.armorClass);
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
  it('Fortaleza permite curación adicional una vez hasta siguiente turno, persistida',()=>{
    const s=sheet(at19('fortitude'));let state=damage(at19('fortitude'),25);
    state=applyAdventureAction(state,{type:'heal',amount:5,fortitudeBonus:true},s).state;
    expect(state.combat.fortitudeHealUsed).toBe(true);
    expect(state.fighter.hitPoints.current).toBe(s.maximumHitPoints-25+5+s.abilityModifiers.constitution);
    expect(()=>applyAdventureAction(state,{type:'heal',amount:1,fortitudeBonus:true},s)).toThrow();
    const saved=validateCharacterSnapshot(JSON.parse(JSON.stringify(makeCharacterSnapshot(at19('fortitude'),state))));
    expect(saved.adventure.combat.fortitudeHealUsed).toBe(true);
    state=updateAdventureCombat(state,startCharacterTurn(state.combat,true),s);
    expect(state.combat.fortitudeHealUsed).toBe(false);
  });
  it('Fortaleza no consume su uso al curar sin bonificación',()=>{
    const s=sheet(at19('fortitude'));let state=damage(at19('fortitude'),15);
    state=applyAdventureAction(state,{type:'heal',amount:1},s).state;
    expect(state.combat.fortitudeHealUsed).toBeUndefined();
  });
  it('Fortaleza no puede activarse si no se recuperan PG',()=>{
    const s=sheet(at19('fortitude'));
    expect(()=>applyAdventureAction(initialAdventureState(s),{type:'heal',amount:5,fortitudeBonus:true},s)).toThrow();
  });
  it('Fortaleza funciona al utilizar Segundo aliento y dados de golpe',()=>{
    const s=sheet(at19('fortitude'));
    const state=damage(at19('fortitude'),50);
    const windy=applyAdventureAction(state,{type:'second_wind',d10:1,fortitudeBonus:true},s).state;
    expect(windy.combat.fortitudeHealUsed).toBe(true);
    const rest=applyAdventureAction(state,{type:'short_rest',hitDieRolls:[1],fortitudeBonus:true},s).state;
    expect(rest.combat.fortitudeHealUsed).toBe(true);
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
    for(const next of [at18(),at19('speed','charisma')]){
      const advanced=prepareFighterLevelUp(input,state,next);
      state=advanced.snapshot.adventure;
      const saved=validateCharacterSnapshot(JSON.parse(JSON.stringify(advanced.snapshot)));
      expect(saved.input.level).toBe(next.level);
      expect(saved.adventure.fighter.fighterLevel).toBe(next.level);
      expect(saved.adventure.fighter.hitPoints.maximum-saved.adventure.fighter.hitPoints.current).toBe(10);
      input=next;before=sheet(input);
    }
    expect(input.epicBoon?.id).toBe('speed');expect(before.level).toBe(19);
  });
});

describe('Guardado y validación defensiva de beneficios épicos',()=>{
  it('el incremento de puntuación del beneficio épico no exige aumentar Fuerza',()=>{
    const s=sheet(at19('speed','charisma'));
    expect(s.abilityScores.charisma).toBe(sheet(at18()).abilityScores.charisma+1);
  });
  it('el motor rechaza banderas de curación mal formadas',()=>{
    const s=sheet(at19('fortitude'));
    const state=damage(at19('fortitude'),20);
    expect(()=>applyAdventureAction(state,{type:'heal',amount:5,fortitudeBonus:'sí' as unknown as boolean},s)).toThrow();
  });
  it('una dote distinta de Fortaleza no puede activar sus PG adicionales',()=>{
    const s=sheet(at19('speed'));
    const state=damage(at19('speed'),20);
    expect(()=>applyAdventureAction(state,{type:'heal',amount:5,fortitudeBonus:true},s)).toThrow();
  });
  it('Fortaleza rechaza usar el bono dos veces aunque se combine con Segundo aliento',()=>{
    const s=sheet(at19('fortitude'));
    let state=damage(at19('fortitude'),40);
    state=applyAdventureAction(state,{type:'second_wind',d10:1,fortitudeBonus:true},s).state;
    expect(()=>applyAdventureAction(state,{type:'heal',amount:1,fortitudeBonus:true},s)).toThrow();
  });
});

describe('Beneficio épico Velocidad',()=>{
  it('Destrabarse consume una acción adicional y elimina varias fuentes de Agarrado',()=>{
    const s=sheet(at19('speed'));const state=initialAdventureState(s);
    let combat=addCharacterCondition(state.combat,'grappled','Orco 1',null);
    combat=addCharacterCondition(combat,'grappled','Orco 2',null);
    combat=startCharacterTurn(combat,true);
    combat=useEpicSpeedDisengage(combat);
    expect(combat.turn?.bonusUsed).toBe(true);
    expect(combat.conditions?.instances.some(c=>c.kind==='grappled')).toBe(false);
    expect(()=>useEpicSpeedDisengage(combat)).toThrow();
  });
});
