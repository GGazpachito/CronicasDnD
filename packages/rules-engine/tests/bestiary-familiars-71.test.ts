import {describe,expect,it} from 'vitest';
import {BESTIARY_ENTRIES,BESTIARY_SOURCE,familiarSheetFromBestiary,findBestiaryCreature} from '../src/bestiary';
import {validateCompanionSheets} from '../src/companions';
import {WARLOCK_FAMILIARS,type FamiliarForm} from '../src/warlock';

describe('Actualización 71: catálogo de criaturas y familiares del Pacto de la Cadena',()=>{
 it('ofrece exactamente una entrada válida por cada forma de familiar ya guardable, y permite ampliar el catálogo',()=>{
  const forms=Object.keys(WARLOCK_FAMILIARS).sort();
  expect(BESTIARY_ENTRIES.filter(c=>forms.includes(c.id)).map(c=>c.id).sort()).toEqual(forms);
  expect(new Set(BESTIARY_ENTRIES.map(c=>c.sheet.id)).size).toBe(BESTIARY_ENTRIES.length);
  expect(validateCompanionSheets(BESTIARY_ENTRIES.map(entry=>entry.sheet).slice(0,20))).toHaveLength(20);
  for(const entry of BESTIARY_ENTRIES){
   expect(validateCompanionSheets([entry.sheet])).toHaveLength(1);
   expect(entry.source).toBe(BESTIARY_SOURCE);
   expect(entry.sheet.armorClass).toBeGreaterThan(0);
   expect(entry.sheet.hitPointsMaximum).toBeGreaterThan(0);
   expect(entry.sheet.speed.length).toBeGreaterThan(0);
  }
 });
 it('incluye las siete formas especiales SRD y fichas diferenciadas',()=>{
  const special=BESTIARY_ENTRIES.filter(c=>c.category==='familiar_especial');
  expect(special.map(c=>c.id).sort()).toEqual(['imp','pseudodragon','quasit','skeleton','sphinx_of_wonder','sprite','venomous_snake'].sort());
  expect(findBestiaryCreature('imp')?.sheet.hitPointsMaximum).toBe(21);
  expect(findBestiaryCreature('pseudodragon')?.sheet.armorClass).toBe(14);
  expect(findBestiaryCreature('sphinx_of_wonder')?.sheet.hitPointsMaximum).toBe(24);
  expect(findBestiaryCreature('skeleton')?.sheet.attacks).toHaveLength(2);
  expect(findBestiaryCreature('sea_horse')?.sheet.attacks).toHaveLength(0);
 });
 it('genera una ficha de familiar separada, sin alterar la plantilla del Bestiario',()=>{
  const base=findBestiaryCreature('imp')!;
  const familiar=familiarSheetFromBestiary('imp','  Chispa  ');
  expect(familiar.name).toBe('Chispa');
  expect(familiar.id).toBe('familiar:imp');
  expect(familiar.armorClass).toBe(base.sheet.armorClass);
  expect(familiar.attacks).not.toBe(base.sheet.attacks);
  expect(familiar.abilities).not.toBe(base.sheet.abilities);
  expect(base.sheet.name).toBe('Diablillo');
  expect(familiarSheetFromBestiary('cat').name).toBe('Gato');
  expect(()=>familiarSheetFromBestiary('inventado' as FamiliarForm)).toThrow(/desconocida/);
  expect(findBestiaryCreature('__inexistente__')).toBeUndefined();
 });
 it('mantiene la compatibilidad con formas antiguas sin inventar estadísticas',()=>{
  expect(findBestiaryCreature('fish')?.sheet.name).toContain('piraña');
  expect(findBestiaryCreature('poisonous_snake')?.sheet.armorClass).toBe(findBestiaryCreature('venomous_snake')?.sheet.armorClass);
  expect(findBestiaryCreature('poisonous_snake')?.sheet.notes).toContain('heredado');
 });
});
