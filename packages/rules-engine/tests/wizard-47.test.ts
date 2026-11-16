import {describe,it,expect} from 'vitest';
import {createSlotPool,useSpellSlot,restoreSpellSlots} from '../src/spellcasting-core';
import {
  wizardProgression,initialWizardMagicState,wizardUseSlot,wizardArcaneRecovery,
  wizardLongRest,wizardAdvanceMagicState,wizardShortRest,
  evokerPotentCantrip,evokerSculptMaximum,evokerEmpoweredDamageBonus,evokerOverchannel,
  wizardUseSignatureSpell,validateWizardSpellChoices,wizardCoreStatistics,wizardSpellCopyCost,wizardCanRitualCast,
  type WizardSpellReference,
} from '../src/wizard';

const subclass=(level:number)=>level>=3?'evoker' as const:undefined;
const spell=(id:string,level:WizardSpellReference['level'],other:Partial<WizardSpellReference>={}):WizardSpellReference=>
  ({id,level,school:'evocation',castingTime:'action',...other});

describe('Actualización 47: Mago 2024, progresión de nivel 1 al 20',()=>{
  it('valida las 20 filas oficiales, competencias, trucos, preparados y ranuras',()=>{
    const prepared=[4,5,6,7,9,10,11,12,14,15,16,16,17,18,19,21,22,23,24,25];
    const slots=[
      [2,0,0,0,0,0,0,0,0],[3,0,0,0,0,0,0,0,0],
      [4,2,0,0,0,0,0,0,0],[4,3,0,0,0,0,0,0,0],
      [4,3,2,0,0,0,0,0,0],[4,3,3,0,0,0,0,0,0],
      [4,3,3,1,0,0,0,0,0],[4,3,3,2,0,0,0,0,0],
      [4,3,3,3,1,0,0,0,0],[4,3,3,3,2,0,0,0,0],
      [4,3,3,3,2,1,0,0,0],[4,3,3,3,2,1,0,0,0],
      [4,3,3,3,2,1,1,0,0],[4,3,3,3,2,1,1,0,0],
      [4,3,3,3,2,1,1,1,0],[4,3,3,3,2,1,1,1,0],
      [4,3,3,3,2,1,1,1,1],[4,3,3,3,3,1,1,1,1],
      [4,3,3,3,3,2,1,1,1],[4,3,3,3,3,2,2,1,1],
    ];
    for(let level=1;level<=20;level++){
      const p=wizardProgression(level,subclass(level));
      expect(p.preparedSpellCount).toBe(prepared[level-1]);
      expect(p.cantripsKnown).toBe(level>=10?5:level>=4?4:3);
      expect(p.minimumSpellbookCount).toBe(6+2*(level-1));
      expect(p.hitDie).toBe(6);
      expect(p.spellSlots).toEqual(slots[level-1]);
      expect(p.highestSlotLevel).toBe(Math.min(9,Math.ceil(level/2)));
      expect(p.arcaneRecoveryLimit).toBe(Math.ceil(level/2));
      expect(new Set(p.features.map(f=>f.id)).size).toBe(p.features.length);
    }
    expect(wizardProgression(1).spellSlots).toEqual([2,0,0,0,0,0,0,0,0]);
    expect(wizardProgression(5,'evoker').spellSlots).toEqual([4,3,2,0,0,0,0,0,0]);
    expect(wizardProgression(11,'evoker').spellSlots).toEqual([4,3,3,3,2,1,0,0,0]);
    expect(wizardProgression(17,'evoker').spellSlots).toEqual([4,3,3,3,2,1,1,1,1]);
    expect(wizardProgression(20,'evoker').spellSlots).toEqual([4,3,3,3,3,2,2,1,1]);
    expect(wizardProgression(20,'evoker').preparedSpellCount).toBe(25);
  });
  it('no permite nivel 0 o 21, ni subclases prematuras o ausentes',()=>{
    expect(()=>wizardProgression(0)).toThrow();
    expect(()=>wizardProgression(21,'evoker')).toThrow();
    expect(()=>wizardProgression(2,'evoker')).toThrow();
    expect(()=>wizardProgression(3)).toThrow();
  });
  it('desbloquea Evocación exactamente a los niveles 3, 6, 10 y 14',()=>{
    const expected=[['evocation_savant',3],['potent_cantrip',3],['sculpt_spells',6],
      ['empowered_evocation',10],['overchannel',14]] as const;
    for(let level=1;level<=20;level++){
      const actual=wizardProgression(level,subclass(level)).features.map(f=>f.id);
      for(const [id,at] of expected)expect(actual.includes(id)).toBe(level>=at);
    }
    expect(wizardProgression(20,'evoker').features.map(f=>f.id)).toContain('signature_spells');
  });
});

describe('Actualización 47: ranuras compartidas entre futuras clases',()=>{
  it('gasta y restaura una ranura sin mutar la entrada',()=>{
    const base=createSlotPool([4,3,2,0,0,0,0,0,0]);
    const used=useSpellSlot(base,3);
    expect(used.remaining[2]).toBe(1);
    expect(base.remaining[2]).toBe(2);
    expect(restoreSpellSlots(used,[3]).remaining[2]).toBe(2);
    expect(()=>restoreSpellSlots(base,[3])).toThrow();
    expect(()=>useSpellSlot(base,9)).toThrow();
  });
  it('Recuperación arcana respeta mitad del nivel, sólo ranuras 1 a 5 y una vez por descanso largo',()=>{
    let state=initialWizardMagicState(4,'evoker');
    state=wizardUseSlot(wizardUseSlot(state,1),2);
    expect(()=>wizardArcaneRecovery(state,4,[1,2],'evoker')).toThrow();
    const recovered=wizardArcaneRecovery(state,4,[2],'evoker');
    expect(recovered.slots.remaining[1]).toBe(3);
    expect(recovered.slots.remaining[0]).toBe(3);
    expect(()=>wizardArcaneRecovery(recovered,4,[1],'evoker')).toThrow();
    expect(()=>wizardArcaneRecovery(recovered,4,[6],'evoker')).toThrow();
    const rested=wizardLongRest(recovered,4,'evoker');
    expect(rested.arcaneRecoveryUsed).toBe(false);
    expect(rested.slots.remaining).toEqual(rested.slots.maximum);
  });
  it('subir nivel no cura mágicamente las ranuras gastadas',()=>{
    let state=initialWizardMagicState(2);
    state=wizardUseSlot(state,1);
    const level3=wizardAdvanceMagicState(state,2,'evoker');
    expect(level3.slots.remaining[0]).toBe(3);
    expect(level3.slots.remaining[1]).toBe(2);
    expect(state.slots.maximum[1]).toBe(0);
  });
});

describe('Actualización 47: decisiones y capacidades del Mago',()=>{
  it('rechaza las elecciones incompletas y permite conjuros siempre preparados aparte',()=>{
    const options={
      spellbook:Array.from({length:40},(_,i)=>spell(`spell_${i}`,i<6?1:i<12?2:i<18?3:i<24?4:i<30?5:i<34?6:i<37?7:i<39?8:9)),
      cantrips:Array.from({length:5},(_,i)=>spell(`cantrip_${i}`,0)),
      preparedIds:Array.from({length:25},(_,i)=>`spell_${i}`),
      spellMasteryIds:['spell_0','spell_6'] as [string,string],
      signatureSpellIds:['spell_12','spell_13'] as [string,string],
    };
    // 44 conjuros mínimos por progresión del Mago al llegar a nivel 20.
    expect(()=>validateWizardSpellChoices(20,options,'evoker')).toThrow();
    const completed={...options,spellbook:[...options.spellbook,...Array.from({length:4},(_,i)=>spell(`new_spell_${i}`,9))]};
    const valid=validateWizardSpellChoices(20,completed,'evoker');
    expect(valid.alwaysPreparedIds).toEqual(['spell_0','spell_6','spell_12','spell_13']);
    expect(valid.preparedIds).toHaveLength(25);
    expect(()=>validateWizardSpellChoices(20,{...completed,preparedIds:[...completed.preparedIds.slice(0,24),'unknown_spell']},'evoker')).toThrow();
  });
  it('Admite rituales sin prepararlos: el modelo conserva la marca de ritual',()=>{
    const spellbook=[spell('alarm',1,{school:'abjuration',ritual:true}),...Array.from({length:5},(_,i)=>spell(`evoc_${i}`,1))];
    const valid=validateWizardSpellChoices(1,{spellbook,cantrips:['light','mage_hand','ray_of_frost'].map(id=>spell(id,0)),preparedIds:spellbook.slice(1,5).map(s=>s.id)});
    expect(valid.spellbook.find(s=>s.id==='alarm')?.ritual).toBe(true);
    expect(valid.preparedIds).not.toContain('alarm');
  });
});

describe('Actualización 47: efectos de Evocación',()=>{
  it('Truco potente divide daño entre dos redondeando hacia abajo',()=>{
    expect(evokerPotentCantrip(3,15,true)).toBe(7);
    expect(evokerPotentCantrip(3,15,false)).toBe(15);
    expect(()=>evokerPotentCantrip(2,15,true)).toThrow();
  });
  it('Esculpir conjuros y Evocación potenciada respetan desbloqueo',()=>{
    expect(evokerSculptMaximum(6,3)).toBe(4);
    expect(()=>evokerSculptMaximum(5,3)).toThrow();
    expect(evokerEmpoweredDamageBonus(10,4,true)).toBe(4);
    expect(evokerEmpoweredDamageBonus(10,4,false)).toBe(0);
  });
  it('Sobrecarga no añade daño en el primer uso y aumenta a 2d12, 3d12 por nivel de ranura',()=>{
    const base=initialWizardMagicState(14,'evoker');
    const a=evokerOverchannel(base,14,4);
    expect(a.necroticDice).toBe(0);
    const b=evokerOverchannel(a.state,14,4);
    expect(b.necroticDice).toBe(8);
    const c=evokerOverchannel(b.state,14,4);
    expect(c.necroticDice).toBe(12);
    expect(base.overchannelUses).toBe(0);
    expect(()=>evokerOverchannel(base,14,6)).toThrow();
    expect(wizardLongRest(c.state,14,'evoker').overchannelUses).toBe(0);
  });
  it('Conjuros distintivos se usan una vez por descanso y recuperan usos en descanso corto',()=>{
    const selection=['fireball','lightning_bolt'];
    const initial=initialWizardMagicState(20,'evoker');
    const used=wizardUseSignatureSpell(initial,20,'fireball',selection);
    expect(used.signatureUsed).toEqual(['fireball']);
    expect(()=>wizardUseSignatureSpell(used,20,'fireball',selection)).toThrow();
    expect(wizardShortRest(used).signatureUsed).toEqual([]);
    expect(used.slots.remaining).toEqual(initial.slots.remaining);
  });
});


describe('Actualización 47: estadísticas básicas del Mago',()=>{
  const abilities={strength:8,dexterity:14,constitution:14,intelligence:18,wisdom:12,charisma:10};
  it('calcula PG con d6, ataque mágico y CD sin mezclar lógica de Guerrero',()=>{
    const first=wizardCoreStatistics(1,abilities);
    expect(first.maximumHitPoints).toBe(8);
    expect(first.hitDie).toBe(6);
    expect(first.spellAttackBonus).toBe(6);
    expect(first.spellSaveDC).toBe(14);
    expect(first.armorClassWithoutArmor).toBe(12);
    const high=wizardCoreStatistics(20,abilities);
    expect(high.maximumHitPoints).toBe(122);
    expect(high.spellAttackBonus).toBe(10);
    expect(high.spellSaveDC).toBe(18);
    const lowCon={...abilities,constitution:1};
    expect(wizardCoreStatistics(20,lowCon).maximumHitPoints).toBe(20);
  });
  it('aplica tiempo y oro para copiar conjuros y admite rituales no preparados',()=>{
    expect(wizardSpellCopyCost(3)).toEqual({gold:150,hours:6});
    expect(()=>wizardSpellCopyCost(0)).toThrow();
    const book=[spell('detect_magic',1,{school:'divination',ritual:true}),spell('magic_missile',1)];
    expect(wizardCanRitualCast('detect_magic',book)).toBe(true);
    expect(wizardCanRitualCast('magic_missile',book)).toBe(false);
  });
});
