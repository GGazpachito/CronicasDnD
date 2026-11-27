import {describe,it,expect} from 'vitest';
import {BACKGROUND_PACKAGES,GAMING_SETS,validateBackgroundEquipment,combineStartingInventory} from '../src/background-equipment';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';

const base=():GuidedFighterInput=>({
  name:'Aldric',level:1,background:'soldier',species:'human',
  assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
  increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
  fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'alert',humanSize:'medium',
  armor:'chain_mail',shield:false,
  martial:{fightingStyle:'defense',weaponMasteries:['greatsword','flail','javelin'],startingPackage:'a'},
  backgroundEquipment:{startingPackage:'a',gamingSet:'dice_set'},
});

describe('Paso 11: inventario inicial por clase y trasfondo',()=>{
  it('todos los trasfondos contemplan A y B, con B de 50 po',()=>{
    for(const b of Object.values(BACKGROUND_PACKAGES)) {expect(b.a.gold).toBeGreaterThan(0);expect(b.b.gold).toBe(50);expect(b.b.items).toHaveLength(0)}
  });
  it('Soldado A suma 14 po del trasfondo y 4 po de clase',()=>{
    const r=calculateGuidedFighter(base());expect(r.startingInventory?.totalGold).toBe(18);
    expect(r.startingInventory?.classGold).toBe(4);expect(r.startingInventory?.backgroundGold).toBe(14);
  });
  it('Soldado B suma 50 po y no concede objetos del trasfondo',()=>{
    const v=base();const r=calculateGuidedFighter({...v,backgroundEquipment:{startingPackage:'b',gamingSet:'dice_set'}});
    expect(r.startingInventory?.totalGold).toBe(54);
    expect(r.startingInventory?.items.every(it=>it.sources.every(s=>s.from==='class'))).toBe(true);
    expect(r.origin.tools).toContain(GAMING_SETS.dice_set);
  });
  it('Soldado A contiene un juego de azar del tipo elegido',()=>{
    const v=base();const r=calculateGuidedFighter({...v,backgroundEquipment:{startingPackage:'a',gamingSet:'dragonchess_set'}});
    expect(r.startingInventory?.items.find(i=>i.id==='dragonchess_set')?.quantity).toBe(1);
    expect(r.origin.tools).toContain(GAMING_SETS.dragonchess_set);
  });
  it('juego de azar elegido con la opción B solo concede competencia',()=>{
    const v=base();const r=calculateGuidedFighter({...v,backgroundEquipment:{startingPackage:'b',gamingSet:'playing_card_set'}});
    expect(r.startingInventory?.items.some(i=>i.id==='playing_card_set')).toBe(false);
    expect(r.origin.tools).toContain(GAMING_SETS.playing_card_set);
  });
  it('Acólito A concede 8 po y diez hojas de pergamino',()=>{
    const v=base();const r=calculateGuidedFighter({...v,background:'acolyte',plusTwoAbility:'wisdom',plusOneAbility:'charisma',backgroundMagicInitiate:{list:'cleric',spellcastingAbility:'wisdom',cantrips:['guidance','sacred_flame'],level1Spell:'bless'},backgroundEquipment:{startingPackage:'a'}});
    expect(r.startingInventory?.totalGold).toBe(12);
    expect(r.startingInventory?.items.find(i=>i.id==='parchment')?.quantity).toBe(10);
  });
  it('Erudito A concede ocho hojas de pergamino y un bastón',()=>{
    const v=base();const r=calculateGuidedFighter({...v,background:'sage',plusTwoAbility:'intelligence',plusOneAbility:'wisdom',backgroundMagicInitiate:{list:'wizard',spellcastingAbility:'intelligence',cantrips:['fire_bolt','mage_hand'],level1Spell:'magic_missile'},backgroundEquipment:{startingPackage:'a'}});
    expect(r.startingInventory?.items.find(i=>i.id==='parchment')?.quantity).toBe(8);
    expect(r.startingInventory?.items.find(i=>i.id==='quarterstaff')?.quantity).toBe(1);
  });
  it('Criminal A concede dos dagas y dos bolsas',()=>{
    const v=base();const r=calculateGuidedFighter({...v,background:'criminal',plusTwoAbility:'dexterity',plusOneAbility:'constitution',humanFeat:'savage_attacker',backgroundEquipment:{startingPackage:'a'}});
    expect(r.startingInventory?.totalGold).toBe(20);
    expect(r.startingInventory?.items.find(i=>i.id==='dagger')?.quantity).toBe(2);
    expect(r.startingInventory?.items.find(i=>i.id==='pouch')?.quantity).toBe(2);
  });
  it('clase B y Soldado A agregan 20+20 flechas con dos procedencias',()=>{
    const v=base();const r=calculateGuidedFighter({...v,armor:'studded_leather',martial:{...v.martial!,startingPackage:'b'}});
    const arrows=r.startingInventory?.items.find(it=>it.id==='arrow');
    expect(arrows?.quantity).toBe(40);expect(arrows?.sources).toEqual([{from:'class',quantity:20},{from:'background',quantity:20}]);
    expect(r.startingInventory?.totalGold).toBe(25);
  });
  it('clase C y trasfondo B: 205 po y sin objetos',()=>{
    const v=base();const r=calculateGuidedFighter({...v,armor:null,martial:{...v.martial!,startingPackage:'c'},backgroundEquipment:{startingPackage:'b',gamingSet:'dice_set'}});
    expect(r.startingInventory?.totalGold).toBe(205);expect(r.startingInventory?.items).toHaveLength(0);
  });
  it('rechaza paquete inexistente',()=>{
    expect(()=>validateBackgroundEquipment('soldier',{startingPackage:'c',gamingSet:'dice_set'})).toThrow(/Paquete/);
  });
  it('rechaza juegos de azar inválidos o ausentes para Soldado',()=>{
    expect(()=>validateBackgroundEquipment('soldier',{startingPackage:'a'})).toThrow(/juego/);
    expect(()=>validateBackgroundEquipment('soldier',{startingPackage:'b',gamingSet:'chess'})).toThrow(/juego/);
  });
  it('rechaza juego de azar en otros trasfondos',()=>{
    expect(()=>validateBackgroundEquipment('criminal',{startingPackage:'a',gamingSet:'dice_set'})).toThrow(/no permite/);
  });
  it('rechaza campos no reconocidos en el equipo',()=>{
    expect(()=>validateBackgroundEquipment('criminal',{startingPackage:'a',gold:999999})).toThrow(/Propiedad/);
  });
  it('no permite duplicar el juego de azar por la dote Competente',()=>{
    const v=base();expect(()=>calculateGuidedFighter({...v,humanFeat:'skilled',humanFeatDetails:{skilledProficiencies:['tool:dice_set','skill:medicine','skill:deception']}})).toThrow(/duplicar/);
  });
  it('mantiene compatibilidad con personajes antiguos sin opción de trasfondo',()=>{
    const v=base();const {backgroundEquipment:unused,...old}=v;
    expect(calculateGuidedFighter(old).startingInventory).toBeUndefined();
    expect(calculateGuidedFighter(old).martial?.gold).toBe(4);
  });
  it('no muta las entradas ni el catálogo al calcular',()=>{
    const v=base();const original=JSON.stringify(v);const def=JSON.stringify(BACKGROUND_PACKAGES);
    calculateGuidedFighter(v);expect(JSON.stringify(v)).toBe(original);expect(JSON.stringify(BACKGROUND_PACKAGES)).toBe(def);
  });
  it('la función de inventario puede usarse sin paquete de clase',()=>{
    const bg=validateBackgroundEquipment('acolyte',{startingPackage:'a'});
    const merged=combineStartingInventory(undefined,bg);
    expect(merged.totalGold).toBe(8);expect(merged.classGold).toBe(0);
  });
});
