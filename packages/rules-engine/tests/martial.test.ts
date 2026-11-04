import { describe,it,expect } from 'vitest';
import { WEAPONS, FIGHTER_PACKAGES, validateMartialChoices } from '../src/martial';
import { calculateGuidedFighter, type GuidedFighterInput } from '../src/guided';
const base=():GuidedFighterInput=>({
 name:'Aldric',level:1,background:'soldier',species:'human',
 assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
 increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
 fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'tough',humanSize:'medium',
 armor:'chain_mail',shield:false,martial:{fightingStyle:'defense',weaponMasteries:['greatsword','flail','javelin'],startingPackage:'a'}
});
describe('Paso 09: estilo, maestrías y equipo',()=>{
 it('aplica Defensa (+1 CA) con armadura equipada',()=>{const x=calculateGuidedFighter(base());expect(x.sheet.armorClass).toBe(17);expect(x.martial?.gold).toBe(4)});
 it('Defensa no se aplica sin armadura',()=>{const v=base();const x=calculateGuidedFighter({...v,armor:null,martial:{...v.martial!,startingPackage:'c'}});expect(x.sheet.armorClass).toBe(12);expect(x.martial?.gold).toBe(155)});
 it('no añade bonos numéricos inventados para estilos de combate',()=>{const v=base();const x=calculateGuidedFighter({...v,martial:{...v.martial!,fightingStyle:'archery'}});expect(x.sheet.armorClass).toBe(16);expect(x.pendingAutomation.some(t=>t.includes('estilo'))).toBe(true)});
 it('exige exactamente tres armas diferentes',()=>{const v=base();expect(()=>calculateGuidedFighter({...v,martial:{...v.martial!,weaponMasteries:['dagger','dagger','flail']}})).toThrow(/tres armas distintas/)});
 it('rechaza armas desconocidas',()=>expect(()=>validateMartialChoices({fightingStyle:'defense',weaponMasteries:['fake','flail','javelin'],startingPackage:'a'})).toThrow());
 it('rechaza estilos desconocidos',()=>expect(()=>validateMartialChoices({fightingStyle:'anything',weaponMasteries:['greatsword','flail','javelin'],startingPackage:'a'})).toThrow());
 it('valida paquete y armadura adquirida',()=>{const v=base();expect(()=>calculateGuidedFighter({...v,armor:'plate'})).toThrow(/paquete inicial/)});
 it('paquete B proporciona armadura ligera, arco y munición',()=>{const v=base();const x=calculateGuidedFighter({...v,armor:'studded_leather',martial:{...v.martial!,startingPackage:'b'}});expect(x.martial?.gold).toBe(11);expect(x.martial?.inventory.some(it=>it.name==='Flecha'&&it.quantity===20)).toBe(true)});
 it('paquete C tiene 155 po y ningún objeto',()=>{expect(FIGHTER_PACKAGES.c.gold).toBe(155);expect(FIGHTER_PACKAGES.c.items).toHaveLength(0)});
 it('las maestrías están asociadas a la clase de arma elegida',()=>{expect(WEAPONS.greatsword.mastery).toBe('Graze');expect(WEAPONS.dagger.mastery).toBe('Nick')});
 it('no muta los datos de entrada',()=>{const v=base();const json=JSON.stringify(v);calculateGuidedFighter(v);expect(JSON.stringify(v)).toBe(json)});
 it('mantiene compatibilidad con entradas anteriores sin elecciones marciales',()=>{const v=base();const {martial:unused,...old}=v;expect(calculateGuidedFighter(old).martial).toBeUndefined()});
});
