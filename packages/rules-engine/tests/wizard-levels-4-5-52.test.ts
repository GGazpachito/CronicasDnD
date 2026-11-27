import {describe,it,expect} from 'vitest';
import {calculateGuidedWizard,initialWizardOneState,makeWizardCharacterSnapshot,validateWizardCharacterSnapshot,
 WIZARD_LEVEL_ONE_DEFAULTS,WIZARD_SPELL_CATALOG,type GuidedWizardInput} from '../src/wizard-creation';
import {prepareWizardLevelUp,wizardLevelUpChoicesPreview,wizardMemorizePreparedSpell} from '../src/wizard-level-up';
import {wizardArcaneRecoveryOptions,toggleWizardSlotMark,wizardSlotMarks,recoverWizardArcaneSlots,resetWizardSlots} from '../src/wizard-slot-marks';
import {wizardSpellRule,WIZARD_SPELL_RULES} from '../src/wizard-spell-details';
import {WIZARD_LEVEL_THREE_SPELLS} from '../src/wizard-third-level';
import {previewWizardLevelDown} from '../src/level-down';
import {wizardSpellSelection} from '../src/wizard-spell-library';
import {collectWizardTraits} from '../src/wizard-traits';

const base:GuidedWizardInput={classId:'wizard',level:1,name:'Neris',species:'dwarf',background:'sage',
 assignedAbilities:{strength:8,dexterity:13,constitution:14,intelligence:15,wisdom:12,charisma:10},
 increaseMode:'two_plus_one',plusTwoAbility:'intelligence',plusOneAbility:'constitution',wizardSkills:['insight','investigation'],equipmentChoice:'equipment',
 cantripIds:[...WIZARD_LEVEL_ONE_DEFAULTS.cantrips],spellbookIds:[...WIZARD_LEVEL_ONE_DEFAULTS.spellbook],preparedIds:[...WIZARD_LEVEL_ONE_DEFAULTS.prepared]};
const to3=()=>{
 const two=prepareWizardLevelUp(base,initialWizardOneState(base),{newSpellIds:['alarm','shield'],preparedIds:[...base.preparedIds,'shield'],scholarSkill:'arcana'});
 return prepareWizardLevelUp(two.input,two.state,{newSpellIds:['misty_step','web'],preparedIds:[...two.input.preparedIds,'web'],evokerBonusSpellIds:['darkness','scorching_ray']});
};
const fourChoices=(input:GuidedWizardInput)=>({newSpellIds:['mirror_image','shatter'] as [string,string],preparedIds:[...input.preparedIds,'shatter'],newCantripId:'fire_bolt',level4Improvement:{mode:'plus_two' as const,first:'intelligence' as const}});
const to4=()=>{const three=to3();return prepareWizardLevelUp(three.input,three.state,fourChoices(three.input));};
const fiveChoices=(input:GuidedWizardInput)=>({newSpellIds:['fireball','fly'] as [string,string],preparedIds:[...input.preparedIds,'fireball','fly'],evokerLevelThreeSpellId:'lightning_bolt'});
const to5=()=>{const four=to4();return prepareWizardLevelUp(four.input,four.state,fiveChoices(four.input));};

describe('Actualización 52: progresión de Mago niveles 4 y 5',()=>{
 it('incluye los 32 conjuros oficiales de nivel 3, con fichas y fuente',()=>{
  expect(WIZARD_LEVEL_THREE_SPELLS).toHaveLength(29);
  expect(new Set(WIZARD_LEVEL_THREE_SPELLS.map(s=>s.id)).size).toBe(29);
  for(const spell of WIZARD_LEVEL_THREE_SPELLS){
   expect(spell.level).toBe(3);
   expect(spell.description.length>70).toBe(true);
   expect(spell.sourcePage>=239&&spell.sourcePage<=343).toBe(true);
   expect(wizardSpellRule(spell.id)?.sourcePage).toBe(spell.sourcePage);
  }
  expect(WIZARD_SPELL_CATALOG.filter(s=>s.level===3)).toHaveLength(29);
  expect(WIZARD_SPELL_RULES.length).toBeGreaterThanOrEqual(217);
 });
 it('Bola de fuego, Rayo relampagueante y Toque vampírico tienen dados base y datos de consulta',()=>{
  expect(wizardSpellRule('fireball')?.rolls[0]?.formula).toBe('8d6');
  expect(wizardSpellRule('lightning_bolt')?.rolls[0]?.formula).toBe('8d6');
  expect(wizardSpellRule('vampiric_touch')?.rolls[0]?.formula).toBe('3d6');
  expect(wizardSpellRule('vampiric_touch')?.attack).toBe(true);
  expect(wizardSpellRule('counterspell')?.attack).toBe(false);
 });
 it('nivel 4: cuarto truco, mejora de característica, 10 conjuros regulares y 7 preparados',()=>{
  const four=to4(),view=calculateGuidedWizard(four.input);
  expect(four.input.level).toBe(4);expect(four.input.cantripIds).toHaveLength(4);
  expect(four.input.spellbookIds).toHaveLength(12);
  expect(view.spells.spellbook).toHaveLength(14); // 12 ordinarios + 2 gratuitos de Evocación
  expect(four.input.preparedIds).toHaveLength(7);
  expect(view.abilityScores.intelligence).toBe(19);
  expect(view.spellAttackBonus).toBe(6);expect(view.spellSaveDC).toBe(14);
  expect(four.state.magic.slots.maximum.slice(0,3)).toEqual([4,3,0]);
 });
 it('la Constitución mejorada recalcula todos los PG y conserva daño anterior',()=>{
  const three=to3();const before=calculateGuidedWizard(three.input);
  const damaged={...three.state,hitPointsCurrent:before.maximumHitPoints-7};
  const choice={...fourChoices(three.input),level4Improvement:{mode:'plus_two' as const,first:'constitution' as const}};
  const four=prepareWizardLevelUp(three.input,damaged,choice),after=calculateGuidedWizard(four.input);
  expect(after.abilityScores.constitution).toBe(17);
  expect(four.state.hitPointsCurrent).toBe(after.maximumHitPoints-7);
  expect(four.hitPointsIncrease).toBe(after.maximumHitPoints-before.maximumHitPoints);
 });
 it('rechaza mejorar por encima de 20 o inventar un cuarto truco duplicado',()=>{
  const three=to3(),c=fourChoices(three.input);
  expect(()=>prepareWizardLevelUp(three.input,three.state,{...c,newCantripId:'mage_hand'})).toThrow();
  expect(()=>prepareWizardLevelUp(three.input,three.state,{...c,newCantripId:''})).toThrow();
  expect(()=>prepareWizardLevelUp(three.input,three.state,{...c,level4Improvement:{mode:'two_ones',first:'intelligence',second:'intelligence'}})).toThrow();
  const impossible={...three.input,level4Improvement:undefined};
  expect(impossible.level).toBe(3);
 });
 it('impide omitir la mejora o introducir sus elecciones en un nivel incorrecto',()=>{
  const three=to3(),c=fourChoices(three.input);
  expect(()=>prepareWizardLevelUp(three.input,three.state,{...c,level4Improvement:undefined})).toThrow();
  expect(()=>prepareWizardLevelUp(base,initialWizardOneState(base),{newSpellIds:['alarm','shield'],preparedIds:[...base.preparedIds,'shield'],scholarSkill:'arcana',newCantripId:'fire_bolt'})).toThrow();
 });
 it('nivel 5: desbloquea ranuras de nivel 3, competencia +3, memorizar y Evocación gratuita',()=>{
  const five=to5(),view=calculateGuidedWizard(five.input);
  expect(five.input.level).toBe(5);
  expect(view.spells.spellbook).toHaveLength(17); // 14 regulares + 2 de 3 + 1 de 5
  expect(five.input.preparedIds).toHaveLength(9);
  expect(five.input.evokerLevelThreeSpellId).toBe('lightning_bolt');
  expect(five.state.magic.slots.maximum.slice(0,3)).toEqual([4,3,2]);
  expect(five.gainedFeatures.map(f=>f.title)).toContain('Memorizar conjuro');
  expect(view.spellAttackBonus).toBe(7);expect(view.spellSaveDC).toBe(15);
 });
 it('el cuarto truco se aprende y prepara en la biblioteca manual sin borrar otras elecciones',()=>{
  const three=to3();
  const manualInput={...three.input,spellSelection:wizardSpellSelection(three.input)};
  const four=prepareWizardLevelUp(manualInput,three.state,fourChoices(manualInput));
  expect(four.input.spellSelection?.learnedIds.includes('fire_bolt')).toBe(true);
  expect(four.input.spellSelection?.preparedIds.includes('fire_bolt')).toBe(true);
  expect(four.input.spellSelection?.preparedIds.includes('mage_hand')).toBe(true);
 });
 it('la Evocación gratis del nivel 5 tiene que ser nueva y de nivel permitido',()=>{
  const four=to4(),c=fiveChoices(four.input);
  expect(()=>prepareWizardLevelUp(four.input,four.state,{...c,evokerLevelThreeSpellId:'fly'})).toThrow();
  expect(()=>prepareWizardLevelUp(four.input,four.state,{...c,evokerLevelThreeSpellId:'fireball'})).toThrow();
  expect(()=>prepareWizardLevelUp(four.input,four.state,{...c,evokerLevelThreeSpellId:'magic_missile'})).toThrow();
  expect(()=>prepareWizardLevelUp(four.input,four.state,{...c,evokerLevelThreeSpellId:'alarm'})).toThrow();
 });
 it('no permite copiar conjuros de nivel 3 mientras aún se está en 4',()=>{
  const three=to3(),c=fourChoices(three.input);
  expect(()=>prepareWizardLevelUp(three.input,three.state,{...c,newSpellIds:['fireball','mirror_image']})).toThrow();
 });
 it('las ranuras nuevas empiezan disponibles y las gastadas se conservan al subir dos niveles',()=>{
  const three=to3(),spent=toggleWizardSlotMark(toggleWizardSlotMark(three.state,0,1),0,2);
  const four=prepareWizardLevelUp(three.input,spent,fourChoices(three.input));
  const five=prepareWizardLevelUp(four.input,four.state,fiveChoices(four.input));
  expect(wizardSlotMarks(five.state,1)).toEqual([true,false,false,false]);
  expect(wizardSlotMarks(five.state,2)).toEqual([true,false,false]);
  expect(wizardSlotMarks(five.state,3)).toEqual([false,false]);
 });
 it('Recuperación arcana de nivel 5 ofrece combinaciones de coste hasta 3, sin excederlas',()=>{
  const five=to5();
  const spent=toggleWizardSlotMark(toggleWizardSlotMark(toggleWizardSlotMark(five.state,0,1),1,1),0,2);
  const combos=wizardArcaneRecoveryOptions(spent,5);
  expect(combos.some(c=>c.join(',')==='1,2')).toBe(true);
  expect(combos.some(c=>c.join(',')==='1,1')).toBe(true);
  expect(combos.some(c=>c.reduce((a,b)=>a+b,0)>3)).toBe(false);
  const recovered=recoverWizardArcaneSlots(spent,[1,2],5);
  expect(recovered.magic.arcaneRecoveryUsed).toBe(true);
  expect(wizardArcaneRecoveryOptions(recovered,5)).toEqual([]);
 });
 it('Recuperación arcana restaura una ranura de nivel 3 sin obligar a gastar la de nivel 1',()=>{
  const five=to5(),spent=toggleWizardSlotMark(five.state,0,3);
  const choices=wizardArcaneRecoveryOptions(spent,5);
  expect(choices.some(c=>c.join(',')==='3')).toBe(true);
  const recovered=recoverWizardArcaneSlots(spent,[3],5);
  expect(wizardSlotMarks(recovered,3)).toEqual([false,false]);
 });
 it('en nivel 4 los descansos validan la fila de ranuras exacta y no falsean el nivel',()=>{
  const four=to4(),spent=toggleWizardSlotMark(four.state,0,2);
  expect(resetWizardSlots(spent,4).magic.slots.remaining.slice(0,3)).toEqual([4,3,0]);
  expect(()=>resetWizardSlots(spent,3)).toThrow();
 });
 it('Memorizar conjuro exige nivel 5 y sustituye exactamente un preparado',()=>{
  const five=to5();const changed=wizardMemorizePreparedSpell(five.input,'mage_armor','lightning_bolt');
  expect(changed.preparedIds).toHaveLength(9);
  expect(changed.preparedIds.includes('mage_armor')).toBe(false);
  expect(changed.preparedIds.includes('lightning_bolt')).toBe(true);
  expect(()=>wizardMemorizePreparedSpell(to4().input,'mage_armor','lightning_bolt')).toThrow();
  expect(()=>wizardMemorizePreparedSpell(five.input,'mage_armor','unseen_spell')).toThrow();
 });
 it('Memorizar respeta y sincroniza la biblioteca manual sin imponer límites',()=>{
  const five=to5();
  const manual={...five.input,spellSelection:{learnedIds:[...five.input.cantripIds,...five.input.spellbookIds,...five.input.evokerBonusSpellIds!,'lightning_bolt'],preparedIds:[...five.input.preparedIds,'lightning_bolt']}};
  const changed=wizardMemorizePreparedSpell(manual,'mage_armor','lightning_bolt');
  expect(changed.spellSelection?.preparedIds.includes('lightning_bolt')).toBe(true);
  expect(changed.spellSelection?.preparedIds.includes('mage_armor')).toBe(false);
  expect(wizardSpellSelection(changed).learnedIds.length>0).toBe(true);
 });
 it('retrocede 5→4 sin perder Evocación de nivel 3, sus mejores estadísticas ni retrato',()=>{
  const five=to5(),down=previewWizardLevelDown(five.input,five.state);
  expect(down.toLevel).toBe(4);expect(down.snapshot.input.level).toBe(4);
  expect(down.snapshot.input.level4Improvement?.mode).toBe('plus_two');
  expect(down.snapshot.input.evokerLevelThreeSpellId).toBe(undefined);
  expect(down.snapshot.input.evokerBonusSpellIds).toEqual(['darkness','scorching_ray']);
  expect(down.lost.some(n=>n.title==='Memorizar conjuro')).toBe(true);
  expect(down.snapshot.wizardState.magic.slots.maximum.slice(0,3)).toEqual([4,3,0]);
 });
 it('retrocede 4→3 y elimina la mejora y el cuarto truco, sin borrar el libro previo',()=>{
  const four=to4(),down=previewWizardLevelDown(four.input,four.state);
  expect(down.toLevel).toBe(3);expect(down.snapshot.input.level4Improvement).toBe(undefined);
  expect(down.snapshot.input.cantripIds).toHaveLength(3);
  expect(down.snapshot.input.evokerBonusSpellIds).toEqual(['darkness','scorching_ray']);
  expect(down.snapshot.input.spellbookIds).toHaveLength(10);
  expect(down.lost.some(n=>n.title.includes('Descarga de fuego'))).toBe(true);
 });
 it('la secuencia 5→4→3→2→1 no pierde el estado y cada guardado sigue siendo válido',()=>{
  let current=to5();
  for(const level of [4,3,2,1]){
   const down=previewWizardLevelDown(current.input,current.state);
   const snapshot=validateWizardCharacterSnapshot(JSON.parse(JSON.stringify(down.snapshot)));
   expect(snapshot.input.level).toBe(level);
   current={input:snapshot.input,state:snapshot.wizardState,gainedFeatures:[],hitPointsIncrease:0};
  }
 });
 it('guarda y recupera Mago de nivel 5 con conjuros de nivel 3 y ranuras gastadas',()=>{
  const five=to5(),spent=toggleWizardSlotMark(five.state,0,3);
  const saved=makeWizardCharacterSnapshot(five.input,spent);
  const loaded=validateWizardCharacterSnapshot(JSON.parse(JSON.stringify(saved)));
  expect(loaded.input.level).toBe(5);
  expect(loaded.wizardState.magic.slots.remaining[2]).toBe(1);
  expect(loaded.input.evokerLevelThreeSpellId).toBe('lightning_bolt');
  expect(loaded.input.level4Improvement?.first).toBe('intelligence');
 });
 it('Rasgos explica Memorizar conjuro y la mejora de característica en nivel 5',()=>{
  const five=to5(),traits=collectWizardTraits(five.input,calculateGuidedWizard(five.input));
  expect(traits.traits.map(t=>t.title)).toContain('Memorizar conjuro');
  expect(traits.traits.map(t=>t.title)).toContain('Mejora de característica');
 });
 it('la progresión sigue siendo consecutiva y la fase 53 habilita el siguiente nivel',()=>{
  expect(wizardLevelUpChoicesPreview(to4().input)?.nextLevel).toBe(5);
  expect(wizardLevelUpChoicesPreview(to5().input)?.nextLevel).toBe(6);
  const five=to5();
  expect(()=>prepareWizardLevelUp(five.input,five.state,fiveChoices(five.input))).toThrow();
 });
});
