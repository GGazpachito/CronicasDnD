import {describe,expect,it} from 'vitest';
import {initialWizardMagicState,wizardLongRest,wizardShortRest,wizardUseSlot} from '../src/wizard';

/** Contrato que utiliza la pestaña Hechizos al registrar descansos de Mago. */
describe('Mago · descanso corto y largo desde la hoja (paso 65)',()=>{
 it.each([1,5,14,18,19,20])('nivel %i: el corto no cura ranuras ni reinicia recursos de descanso largo',level=>{
  const subclass:'evoker'|undefined=level>=3?'evoker':undefined;
  const initial=initialWizardMagicState(level,subclass);
  const spent=wizardUseSlot(initial,1);
  const before={...spent,arcaneRecoveryUsed:true,overchannelUses:level>=14?2:0,
   signatureUsed:level===20?['fireball']:[]};

  const after=wizardShortRest(before);
  expect(after.slots.remaining).toEqual(before.slots.remaining);
  expect(after.slots.maximum).toEqual(before.slots.maximum);
  expect(after.arcaneRecoveryUsed).toBe(true);
  expect(after.overchannelUses).toBe(before.overchannelUses);
  expect(after.signatureUsed).toEqual([]);

  const long=wizardLongRest(after,level,subclass);
  expect(long.slots.remaining).toEqual(long.slots.maximum);
  expect(long.arcaneRecoveryUsed).toBe(false);
  expect(long.overchannelUses).toBe(0);
  expect(long.signatureUsed).toEqual([]);
 });

 it('nivel 20: un segundo descanso corto no regala ranuras ni otros recursos',()=>{
  const spent=wizardUseSlot(initialWizardMagicState(20,'evoker'),3);
  const afterFirst=wizardShortRest({...spent,signatureUsed:['fireball','fly'],arcaneRecoveryUsed:true,overchannelUses:1});
  const afterSecond=wizardShortRest(afterFirst);
  expect(afterSecond).toEqual(afterFirst);
  expect(afterSecond.slots.remaining[2]).toBe(spent.slots.remaining[2]);
 });
});
