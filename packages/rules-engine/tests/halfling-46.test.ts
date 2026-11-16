import {describe,it,expect} from 'vitest';
import {calculateGuidedFighter,SPECIES_NAMES,type GuidedFighterInput} from '../src/guided';
import {collectCharacterTraits} from '../src/traits';
import {collectDamageDefenses} from '../src/damage-defenses';
import {makeCharacterSnapshot,validateCharacterSnapshot} from '../src/persistence';

const makeInput=():GuidedFighterInput=>({
  name:'Brina',level:1,background:'soldier',species:'halfling',
  assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
  increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
  fighterSkills:['perception','survival'],armor:'chain_mail',shield:true,
});

describe('Actualización 46 · especie Mediano (PHB 2024, p. 193)',()=>{
  it('registra un Mediano Pequeño con 30 pies de velocidad',()=>{
    const result=calculateGuidedFighter(makeInput());
    expect(SPECIES_NAMES.halfling).toBe('Mediano');
    expect(result.origin.species).toBe('halfling');
    expect(result.origin.size).toBe('small');
    expect(result.origin.speedFeet).toBe(30);
  });
  it('mantiene las competencias y PG normales de Guerrero sin conceder beneficios de Humano o Enano',()=>{
    const result=calculateGuidedFighter(makeInput());
    expect(result.sheet.maximumHitPoints).toBe(12);
    expect(result.sheet.skillBonuses.perception).toBe(3);
    expect(result.origin.additionalFeat).toBeUndefined();
    expect(result.origin.luckPointsMaximum).toBeUndefined();
    expect(result.spells).toHaveLength(0);
  });
  it('presenta exactamente cuatro rasgos de especie con explicaciones',()=>{
    const input=makeInput(),result=calculateGuidedFighter(input);
    const traits=collectCharacterTraits(input,result).traits.filter(t=>t.group==='species');
    expect(traits.map(t=>t.id)).toEqual([
      'species:halfling_brave','species:halfling_nimbleness',
      'species:halfling_luck','species:halfling_naturally_stealthy',
    ]);
    expect(traits.every(t=>t.source==='Mediano'&&t.automation==='manual'&&t.explanation&&t.details.length)).toBe(true);
    expect(new Set(traits.map(t=>t.id)).size).toBe(traits.length);
  });
  it('Suerte se explica como repetición opcional de un 1, no como puntos de la dote Afortunado',()=>{
    const input=makeInput(),result=calculateGuidedFighter(input);
    const luck=collectCharacterTraits(input,result).traits.find(t=>t.id==='species:halfling_luck');
    expect(luck?.explanation).toMatch(/sacas un 1/);
    expect(luck?.explanation).toMatch(/debes usar el resultado nuevo/);
    expect(result.pendingAutomation.some(item=>item.includes('Suerte'))).toBe(true);
  });
  it('no aplica ventaja global en todas las salvaciones por Valentía',()=>{
    const result=calculateGuidedFighter(makeInput());
    expect(Object.values(result.sheet.savingThrowRollModes).every(mode=>mode==='normal')).toBe(true);
    expect(result.pendingAutomation.some(item=>item.includes('Valentía'))).toBe(true);
  });
  it('no concede resistencia a veneno del Enano ni impide su defensa ante ataques',()=>{
    expect(collectDamageDefenses({species:'halfling'})).toEqual([]);
    expect(collectDamageDefenses({species:'dwarf'}).some(defense=>defense.damageType==='poison')).toBe(true);
  });
  it('mantiene los datos al guardar y recuperar un personaje v2',()=>{
    const snapshot=makeCharacterSnapshot(makeInput());
    const restored=validateCharacterSnapshot(JSON.parse(JSON.stringify(snapshot)));
    expect(restored.input.species).toBe('halfling');
    expect(restored.schemaVersion).toBe(2);
    expect(calculateGuidedFighter(restored.input).origin.size).toBe('small');
  });
  it('los personajes antiguos y sus etiquetas conservan el resultado esperado',()=>{
    expect(SPECIES_NAMES.human).toBe('Humano');
    expect(SPECIES_NAMES.dwarf).toBe('Enano');
    expect(SPECIES_NAMES.elf).toBe('Elfo');
    const dwarf=calculateGuidedFighter({...makeInput(),species:'dwarf'});
    expect(dwarf.sheet.maximumHitPoints).toBe(13);
  });
  it('rechaza especies ajenas al catálogo y no muta los datos de entrada',()=>{
    const input=makeInput();
    const before=JSON.stringify(input);
    calculateGuidedFighter(input);
    expect(JSON.stringify(input)).toBe(before);
    expect(()=>calculateGuidedFighter({...input,species:'unknown' as GuidedFighterInput['species']})).toThrow(/Especie no disponible/);
  });
});
