import {describe,it,expect} from 'vitest';
import {SPELL_LISTS,validateMagicInitiate,grantsFromMagicInitiate,elfLineageSpells} from '../src/origin-magic';
import {ORIGIN_FEATS,validateHumanOriginFeat} from '../src/origin-feats';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';

const base=():GuidedFighterInput=>({
 name:'Aldric',level:1,background:'soldier',species:'human',
 assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
 increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
 fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'alert',humanSize:'medium',
 armor:'chain_mail',shield:false,martial:{fightingStyle:'defense',weaponMasteries:['greatsword','flail','javelin'],startingPackage:'a'}
});
const druid=()=>({list:'druid' as const,spellcastingAbility:'wisdom' as const,cantrips:['druidcraft','guidance'],level1Spell:'goodberry'});
const cleric=()=>({list:'cleric' as const,spellcastingAbility:'wisdom' as const,cantrips:['guidance','sacred_flame'],level1Spell:'bless'});
const wizard=()=>({list:'wizard' as const,spellcastingAbility:'intelligence' as const,cantrips:['fire_bolt','mage_hand'],level1Spell:'magic_missile'});

describe('Paso 10: selección de conjuros de origen',()=>{
 it('las listas contienen nombres de trucos y conjuros de nivel 1',()=>{
   expect(SPELL_LISTS.cleric.cantrips).toContain('guidance');
   expect(SPELL_LISTS.druid.level1).toContain('goodberry');
   expect(SPELL_LISTS.wizard.level1).toContain('magic_missile');
 });
 it('acepta dos trucos diferentes y un conjuro de nivel 1 de la lista',()=>{
   expect(validateMagicInitiate(druid()).level1Spell).toBe('goodberry');
 });
 it('rechaza trucos idénticos',()=>{
   expect(()=>validateMagicInitiate({...druid(),cantrips:['guidance','guidance']})).toThrow(/distintos/);
 });
 it('rechaza conjuros ajenos a la lista',()=>{
   expect(()=>validateMagicInitiate({...cleric(),level1Spell:'magic_missile'})).toThrow(/nivel 1/);
 });
 it('rechaza trucos de otra lista',()=>{
   expect(()=>validateMagicInitiate({...wizard(),cantrips:['fire_bolt','druidcraft']})).toThrow(/trucos/);
 });
 it('rechaza características de conjuro no válidas',()=>{
   expect(()=>validateMagicInitiate({...wizard(),spellcastingAbility:'strength' as never})).toThrow(/Característica/);
 });
 it('impide elegir otra lista cuando la dote fija la lista del trasfondo',()=>{
   expect(()=>validateMagicInitiate(druid(),'wizard')).toThrow(/no coincide/);
 });
 it('el conjuro de nivel 1 tiene un uso gratuito por descanso largo, pero no el truco',()=>{
   const grants=grantsFromMagicInitiate(validateMagicInitiate(cleric()),'background');
   expect(grants.map(g=>g.level)).toEqual([0,0,1]);
   expect(grants[0].freeCastPerLongRest).toBe(false);
   expect(grants[2].freeCastPerLongRest).toBe(true);
 });
 it('Elfo drow obtiene truco desde nivel 1 y Faerie Fire a nivel 3',()=>{
   expect(elfLineageSpells('drow',1,'charisma').map(s=>s.id)).toEqual(['dancing_lights']);
   expect(elfLineageSpells('drow',3,'charisma').map(s=>s.id)).toEqual(['dancing_lights','faerie_fire']);
 });
 it('Alto elfo obtiene Detect Magic y el de los bosques Longstrider a nivel 3',()=>{
   expect(elfLineageSpells('high_elf',3,'intelligence')[1].id).toBe('detect_magic');
   expect(elfLineageSpells('wood_elf',3,'wisdom')[1].id).toBe('longstrider');
 });
 it('el inventario base tiene las cuatro dotes de origen del SRD',()=>expect(Object.keys(ORIGIN_FEATS)).toHaveLength(4));
 it('Acólito registra sus tres conjuros con lista de Clérigo',()=>{
   const x=base();const r=calculateGuidedFighter({...x,background:'acolyte',plusTwoAbility:'intelligence',plusOneAbility:'wisdom',backgroundMagicInitiate:cleric()});
   expect(r.spells.map(s=>s.id)).toEqual(['guidance','sacred_flame','bless']);
   expect(r.spells.every(s=>s.source==='background')).toBe(true);
 });
 it('Erudito registra los conjuros de Mago',()=>{
   const x=base();const r=calculateGuidedFighter({...x,background:'sage',plusTwoAbility:'intelligence',plusOneAbility:'constitution',backgroundMagicInitiate:wizard()});
   expect(r.spells[2].id).toBe('magic_missile');
 });
 it('rechaza que Acólito elija trucos de Mago',()=>{
   const x=base();expect(()=>calculateGuidedFighter({...x,background:'acolyte',plusTwoAbility:'intelligence',plusOneAbility:'wisdom',backgroundMagicInitiate:wizard()})).toThrow();
 });
 it('Humano con Iniciado en la Magia obtiene tres conjuros de origen',()=>{
   const x=base();const r=calculateGuidedFighter({...x,humanFeat:'magic_initiate',humanFeatDetails:{magicInitiate:druid()}});
   expect(r.spells).toHaveLength(3); expect(r.spells[0].source).toBe('human_feat');
 });
 it('Acólito humano puede repetir Iniciado con una lista distinta',()=>{
   const x=base();const r=calculateGuidedFighter({...x,background:'acolyte',plusTwoAbility:'intelligence',plusOneAbility:'wisdom',backgroundMagicInitiate:cleric(),humanFeat:'magic_initiate',humanFeatDetails:{magicInitiate:druid()}});
   expect(r.spells).toHaveLength(6);
 });
 it('Acólito humano no puede repetir la misma lista en Iniciado en la Magia',()=>{
   const x=base();expect(()=>calculateGuidedFighter({...x,background:'acolyte',plusTwoAbility:'intelligence',plusOneAbility:'wisdom',backgroundMagicInitiate:cleric(),humanFeat:'magic_initiate',humanFeatDetails:{magicInitiate:cleric()}})).toThrow(/lista diferente|otra lista/);
 });
 it('Humano Competente concede habilidades no duplicadas',()=>{
   const x=base();const r=calculateGuidedFighter({...x,humanFeat:'skilled',humanFeatDetails:{skilledProficiencies:['skill:medicine','skill:deception','tool:disguise_kit']}});
   expect(r.sheet.skillBonuses.medicine).toBe(3);
   expect(r.origin.tools).toContain('Kit de disfraz');
 });
 it('Humano Competente rechaza habilidades que ya conoce',()=>{
   const x=base();expect(()=>calculateGuidedFighter({...x,humanFeat:'skilled',humanFeatDetails:{skilledProficiencies:['skill:perception','skill:medicine','skill:deception']}})).toThrow(/duplicar/);
 });
 it('el núcleo rechaza las dotes comerciales Artesano, Músico y Afortunado',()=>{
   for(const excluded of ['crafter','musician','lucky']){
     expect(()=>validateHumanOriginFeat(excluded,undefined,1)).toThrow(/desconocida/);
     expect(()=>calculateGuidedFighter({...base(),humanFeat:excluded as never})).toThrow();
   }
 });
 it('Elfo del bosque en nivel 3 registra dos conjuros sin inventar slots',()=>{
   const x=base();const r=calculateGuidedFighter({...x,species:'elf',level:3,elfLineage:'wood_elf',elfSenseSkill:'insight',elfSpellAbility:'wisdom'});
   expect(r.spells.map(s=>s.id)).toEqual(['druidcraft','longstrider']);
   expect(r.spells[1].freeCastPerLongRest).toBe(true);
 });
 it('mantiene intacta la entrada',()=>{
   const x=base();const v={...x,humanFeat:'magic_initiate' as const,humanFeatDetails:{magicInitiate:druid()}};
   const before=JSON.stringify(v);calculateGuidedFighter(v);
   expect(JSON.stringify(v)).toBe(before);
 });
});
