import {describe,it,expect} from 'vitest';
import {ORIGIN_FEATS,validateHumanOriginFeat} from '../src/origin-feats';
import {FIGHTING_STYLES} from '../src/martial';
import {EPIC_BOONS} from '../src/epic-boons';
import {WIZARD_EPIC_BOONS} from '../src/wizard-epic-boons';
import {WIZARD_SPELL_RULES,wizardSpellRule} from '../src/wizard-spell-details';
import {SPELL_LISTS} from '../src/origin-magic';
import {
 WARLOCK_CANTRIP_IDS,WARLOCK_FIRST_LEVEL_IDS,WARLOCK_SECOND_LEVEL_IDS,WARLOCK_THIRD_LEVEL_IDS,
 WARLOCK_FOURTH_LEVEL_IDS,WARLOCK_FIFTH_LEVEL_IDS,WARLOCK_SIXTH_LEVEL_IDS,WARLOCK_SEVENTH_LEVEL_IDS,
 warlockSpellRule
} from '../src/warlock-spells';
import {WARLOCK_FAMILIARS} from '../src/warlock';
import {BESTIARY_ENTRIES,findBestiaryCreature} from '../src/bestiary';
import {ACTIVE_BASE_CONTENT_PACK_IDS,BASE_CONTENT_PACK,validateContentPackManifest} from '../src/content-packs';

const unavailableSpells=[
 'blade_ward','friends','mind_sliver','thunderclap','toll_the_dead','witch_bolt','arcane_vigor',
 'cloud_of_daggers','crown_of_madness','phantasmal_force','telepathy','circle_of_power',
 'jallarzis_storm_of_radiance','steel_wind_strike','synaptic_static','yolandes_regal_presence',
 'summon_aberration','summon_construct','summon_elemental','arcane_gate','summon_fiend',
 'tashas_bubbling_cauldron','feign_death','summon_fey','summon_undead','armor_of_agathys',
 'arms_of_hadar','hunger_of_hadar'
];

describe('Paso 84: límites del programa base SRD 5.2.1',()=>{
 it('publica exclusivamente los cuatro talentos de origen y cuatro estilos SRD',()=>{
  expect(Object.keys(ORIGIN_FEATS).sort()).toEqual(['alert','magic_initiate','savage_attacker','skilled'].sort());
  expect(Object.keys(FIGHTING_STYLES).sort()).toEqual(['archery','defense','great_weapon_fighting','two_weapon_fighting'].sort());
  expect(()=>validateHumanOriginFeat('tough',undefined,5)).toThrow(/desconocida/);
 });
 it('ofrece solo los beneficios épicos presentes en el SRD',()=>{
  expect(Object.keys(EPIC_BOONS)).toEqual(['combat_prowess']);
  expect(Object.keys(WIZARD_EPIC_BOONS).sort()).toEqual(['combat_prowess','spell_recall','truesight'].sort());
 });
 it('los 217 conjuros del Mago son únicos, completos y no incluyen entradas excluidas',()=>{
  expect(WIZARD_SPELL_RULES).toHaveLength(217);
  expect(new Set(WIZARD_SPELL_RULES.map(s=>s.id)).size).toBe(217);
  expect(WIZARD_SPELL_RULES.every(s=>s.description&&s.name)).toBe(true);
  for(const id of unavailableSpells)expect(wizardSpellRule(id)).toBeUndefined();
 });
 it('las listas de Brujo y de Iniciado en la Magia restringen sus elecciones',()=>{
  const lengths=[7,12,10,11,5,7,4,4];
  const lists=[WARLOCK_CANTRIP_IDS,WARLOCK_FIRST_LEVEL_IDS,WARLOCK_SECOND_LEVEL_IDS,
   WARLOCK_THIRD_LEVEL_IDS,WARLOCK_FOURTH_LEVEL_IDS,WARLOCK_FIFTH_LEVEL_IDS,
   WARLOCK_SIXTH_LEVEL_IDS,WARLOCK_SEVENTH_LEVEL_IDS];
  expect(lists.map(ids=>ids.length)).toEqual(lengths);
  for(const ids of lists)for(const id of ids)expect(warlockSpellRule(id)).toBeDefined();
  for(const id of unavailableSpells)expect(warlockSpellRule(id)).toBeUndefined();
  expect(SPELL_LISTS.cleric.cantrips).toHaveLength(7);
  expect(SPELL_LISTS.druid.cantrips).toHaveLength(11);
  expect(SPELL_LISTS.wizard.cantrips).toHaveLength(15);
  expect(SPELL_LISTS.wizard.level1).toHaveLength(30);
 });
 it('mantiene siete formas especiales de familiar, sin renacuajo slaad',()=>{
  const special=Object.keys(WARLOCK_FAMILIARS).filter(id=>BESTIARY_ENTRIES.some(c=>c.id===id&&c.category==='familiar_especial'));
  expect(special.sort()).toEqual(['imp','pseudodragon','quasit','skeleton','sphinx_of_wonder','sprite','venomous_snake'].sort());
  expect(findBestiaryCreature('slaad_tadpole')).toBeUndefined();
  expect(BESTIARY_ENTRIES.every(c=>c.source==='https://www.dndbeyond.com/srd')).toBe(true);
 });
 it('declara un único paquete base y valida manifiestos futuros sin activar contenido de terceros',()=>{
  expect(ACTIVE_BASE_CONTENT_PACK_IDS).toEqual(['srd-5.2.1']);
  expect(validateContentPackManifest(BASE_CONTENT_PACK)).toEqual(BASE_CONTENT_PACK);
  expect(()=>validateContentPackManifest({...BASE_CONTENT_PACK,dependencies:['srd-5.2.1']})).toThrow();
 });
});
