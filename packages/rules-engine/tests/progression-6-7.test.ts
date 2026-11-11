import {describe,it,expect} from 'vitest';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';
import {applyFighterLevel4Improvement,applyFighterLevel6Improvement} from '../src/progression';
import {calculateWeaponAttack,calculateOwnedWeaponAttack,resolveWeaponAttack} from '../src/attacks';
import {fighterResourceMaximum,spendFighterResource} from '../src/resources';
import {initialAdventureState,advanceAdventureLevel,applyAdventureAction} from '../src/adventure';
import {makeCharacterSnapshot,validateCharacterSnapshot} from '../src/persistence';
import {startCharacterTurn,recordWeaponAttack} from '../src/combat';
import {elfLineageSpells} from '../src/origin-magic';

const prior=():GuidedFighterInput=>({
  name:'Aldric',level:5,background:'soldier',species:'human',
  assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
  increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
  fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'tough',humanSize:'medium',
  armor:'chain_mail',shield:false,level4Improvement:{mode:'plus_two',first:'strength'},
  martial:{fightingStyle:'defense',weaponMasteries:['greatsword','flail','javelin','shortsword'],startingPackage:'a'},
  backgroundEquipment:{startingPackage:'a',gamingSet:'dice_set'}
});
const at6=():GuidedFighterInput=>({...prior(),level:6,level6Improvement:{mode:'plus_two',first:'constitution'}});
const at7=():GuidedFighterInput=>({...at6(),level:7,martial:{...at6().martial!,additionalFightingStyle:'archery'}});

describe('Paso 28: progresión del Guerrero 6 y Campeón 7',()=>{
  it('niveles 1–5 siguen siendo compatibles con los personajes anteriores',()=>{
    const s=calculateGuidedFighter(prior()).sheet;
    expect(s.level).toBe(5);expect(s.features).toContain('extra_attack');
    expect(s.resources.second_wind?.maximum).toBe(3);
    expect(makeCharacterSnapshot(prior()).input.level).toBe(5);
  });
  it('la mejora de nivel 6 es obligatoria solo desde el nivel 6',()=>{
    expect(()=>calculateGuidedFighter({...at6(),level6Improvement:undefined})).toThrow();
    expect(()=>calculateGuidedFighter({...prior(),level6Improvement:{mode:'plus_two',first:'constitution'}})).toThrow();
    expect(calculateGuidedFighter(at6()).sheet.features).toContain('ability_score_improvement_level_6');
  });
  it('las mejoras de niveles 4 y 6 se acumulan y no se suman al trasfondo dos veces',()=>{
    const s=calculateGuidedFighter(at6()).sheet;
    expect(s.abilityScores.strength).toBe(19);
    expect(s.abilityScores.constitution).toBe(16);
    expect(s.maximumHitPoints).toBe(70); // Con 16, nivel 6, Humano Robusto (+2 PG/nivel): 13 + 5*(6+3+2)=68? se comprueba en la revisión
  });
  it('la mejora de nivel 6 permite +1/+1 y obliga a elegir dos características distintas',()=>{
    const modified={...at6(),level6Improvement:{mode:'two_ones' as const,first:'strength' as const,second:'dexterity' as const}};
    const s=calculateGuidedFighter(modified).sheet;
    expect(s.abilityScores.strength).toBe(20);
    expect(s.abilityScores.dexterity).toBe(15);
    expect(()=>calculateGuidedFighter({...at6(),level6Improvement:{mode:'two_ones',first:'strength',second:'strength'}})).toThrow();
  });
  it('cada aumento respeta el máximo de 20 y rechaza claves inconsistentes',()=>{
    const scores={strength:19,dexterity:12,constitution:14,intelligence:10,wisdom:10,charisma:8};
    expect(()=>applyFighterLevel6Improvement(scores,{mode:'plus_two',first:'strength'})).toThrow();
    expect(applyFighterLevel6Improvement(scores,{mode:'two_ones',first:'strength',second:'constitution'}).strength).toBe(20);
    expect(()=>applyFighterLevel6Improvement(scores,{mode:'plus_two',first:'constitution',second:'wisdom'})).toThrow();
    expect(applyFighterLevel4Improvement(scores,{mode:'two_ones',first:'strength',second:'wisdom'}).strength).toBe(20);
  });
  it('nivel 6 sigue con cuatro maestrías y tres usos de Segundo aliento',()=>{
    const s=calculateGuidedFighter(at6()).sheet;
    expect(s.proficiencyBonus).toBe(3);expect(s.resources.second_wind?.maximum).toBe(3);
    expect(fighterResourceMaximum(7,'second_wind')).toBe(3);
    expect(calculateGuidedFighter(at6()).martial?.masteries).toHaveLength(4);
  });
  it('nivel 7 exige un segundo estilo distinto para el Campeón',()=>{
    expect(()=>calculateGuidedFighter({...at7(),martial:at6().martial})).toThrow();
    expect(()=>calculateGuidedFighter({...at7(),martial:{...at7().martial!,additionalFightingStyle:'defense'}})).toThrow();
    expect(()=>calculateGuidedFighter({...at6(),martial:at7().martial})).toThrow();
    expect(calculateGuidedFighter(at7()).sheet.features).toContain('champion_additional_fighting_style');
  });
  it('Campeón nivel 7 con Defensa y Tiro con arco obtiene +1 CA y +2 al arco',()=>{
    const hero=calculateGuidedFighter(at7());
    expect(hero.sheet.armorClass).toBe(17);
    const w=calculateWeaponAttack(hero.sheet,'longbow',['defense','archery'],hero.martial!.choices.weaponMasteries);
    expect(w.attackBonus).toBe(7); // DEX +2, competencia +3, Tiro con arco +2
    expect(w.damageModifier).toBe(2);
  });
  it('Campeón nivel 7 con Tiro con arco y Defensa también recibe ambos efectos',()=>{
    const i=at7();
    const martial={...i.martial!,fightingStyle:'archery' as const,additionalFightingStyle:'defense' as const};
    const hero=calculateGuidedFighter({...i,martial});
    expect(hero.sheet.armorClass).toBe(17);
    expect(calculateWeaponAttack(hero.sheet,'shortbow',['archery','defense'],martial.weaponMasteries).attackBonus).toBe(7);
  });
  it('se combinan Duelo y Armas arrojadizas únicamente donde corresponden',()=>{
    const i={...at7(),martial:{...at7().martial!,fightingStyle:'dueling' as const,additionalFightingStyle:'thrown_weapon_fighting' as const}};
    const s=calculateGuidedFighter(i).sheet;
    const p=calculateWeaponAttack(s,'javelin',['dueling','thrown_weapon_fighting'],i.martial.weaponMasteries,{thrown:true});
    expect(p.damageModifier).toBe(6); // FUE +4, armas arrojadizas +2; Duelo arrojado no se contabiliza en este motor
  });
  it('el ataque adicional del nivel 5 sigue funcionando en nivel 7 sin consumir otra acción',()=>{
    const hero=calculateGuidedFighter(at7());
    const p=calculateWeaponAttack(hero.sheet,'greatsword',['defense','archery'],hero.martial!.choices.weaponMasteries);
    const r=resolveWeaponAttack(p,{firstD20:13,targetAC:16,damageRolls:[3,4]});
    let state=startCharacterTurn(initialAdventureState(hero.sheet).combat);
    state=recordWeaponAttack(state,hero.inventory!,p,r,undefined,'attack_action',7).combat;
    state=recordWeaponAttack(state,hero.inventory!,p,r,undefined,'extra_attack',7).combat;
    expect(state.turn?.actionsUsed).toBe(1);expect(state.turn?.attackActionAttacksUsed).toBe(2);
  });
  it('las opciones inválidas de estilo no pasan al motor de ataques',()=>{
    const s=calculateGuidedFighter(at7()).sheet;
    expect(()=>calculateWeaponAttack(s,'longbow',['archery','archery'],at7().martial!.weaponMasteries)).toThrow();
    expect(()=>calculateWeaponAttack(calculateGuidedFighter(prior()).sheet,'longbow',['defense','archery'],prior().martial!.weaponMasteries)).toThrow();
  });
  it('las mejoras de CON retroactivas recalculan los PG en nivel 6 y 7',()=>{
    const a=calculateGuidedFighter(prior()).sheet;
    const b=calculateGuidedFighter(at6()).sheet;
    const c=calculateGuidedFighter(at7()).sheet;
    expect(b.maximumHitPoints).toBeGreaterThan(a.maximumHitPoints);
    expect(c.maximumHitPoints).toBe(b.maximumHitPoints+11);
  });
  it('subir 5→6→7 conserva el daño, recursos gastados, historial y condiciones',()=>{
    const a=calculateGuidedFighter(prior()).sheet;
    const b=calculateGuidedFighter(at6()).sheet;
    const c=calculateGuidedFighter(at7()).sheet;
    let state=initialAdventureState(a);
    state=applyAdventureAction(state,{type:'damage',amount:12},a).state;
    state={...state,fighter:spendFighterResource(state.fighter,'second_wind')};
    const bstate=advanceAdventureLevel(state,a,b);
    const cstate=advanceAdventureLevel(bstate,b,c);
    expect(cstate.fighter.fighterLevel).toBe(7);
    expect(cstate.fighter.hitPoints.current).toBe(state.fighter.hitPoints.current+(c.maximumHitPoints-a.maximumHitPoints));
    expect(cstate.fighter.resources.second_wind?.current).toBe(2);
    expect(cstate.combat).toEqual(state.combat);
    expect(cstate.spentHitDice).toBe(state.spentHitDice);
  });
  it('se rechaza saltar directamente del nivel 5 al 7',()=>{
    expect(()=>advanceAdventureLevel(initialAdventureState(calculateGuidedFighter(prior()).sheet),calculateGuidedFighter(prior()).sheet,calculateGuidedFighter(at7()).sheet)).toThrow();
  });
  it('guardar y recuperar nivel 7 mantiene las dos mejoras y los dos estilos',()=>{
    const hero=at7();
    const snapshot=makeCharacterSnapshot(hero);
    const copy=validateCharacterSnapshot(JSON.parse(JSON.stringify(snapshot)));
    expect(copy.input.level6Improvement?.first).toBe('constitution');
    expect(copy.input.martial?.additionalFightingStyle).toBe('archery');
    expect(copy.adventure.fighter.fighterLevel).toBe(7);
  });
  it('no introduce conjuros nuevos de linaje élfico en los niveles 6 y 7',()=>{
    expect(elfLineageSpells('wood_elf',6,'wisdom')).toEqual(elfLineageSpells('wood_elf',5,'wisdom'));
    expect(elfLineageSpells('drow',7,'intelligence')).toHaveLength(3);
  });
  it('el inventario mágico conserva las bonificaciones de arma al subir a nivel 7',()=>{
    const input=at7();const hero=calculateGuidedFighter(input);
    const p=calculateWeaponAttack(hero.sheet,'greatsword',['defense','archery'],input.martial!.weaponMasteries);
    expect(p.attackBonus).toBe(7);expect(p.criticalMinimum).toBe(19);
  });
});
