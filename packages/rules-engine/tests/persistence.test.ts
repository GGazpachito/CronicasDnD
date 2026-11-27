import {describe,it,expect} from 'vitest';
import { makeCharacterSnapshot,validateCharacterSnapshot } from '../src/persistence';
import { calculateGuidedFighter, type GuidedFighterInput } from '../src/guided';
const input=():GuidedFighterInput=>({
  name:'Guerrero de prueba',level:1,background:'soldier',species:'human',
  assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
  increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
  fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'alert',humanSize:'medium',
  armor:null,shield:false,
});
describe('Guardado de personajes v1',()=>{
  it('permite serializar y recuperar elecciones validas',()=>{
    const snapshot=makeCharacterSnapshot(input());
    const restored=validateCharacterSnapshot(JSON.parse(JSON.stringify(snapshot)));
    expect(restored.input.name).toBe('Guerrero de prueba');
    expect(restored.ruleset).toBe('dnd-2024');
  });
  it('conserva compras, equipo y monedas al recuperar un personaje',()=>{
    const base=input();
    const withInventory:GuidedFighterInput={...base,armor:'chain_mail',shield:true,
      martial:{fightingStyle:'defense',weaponMasteries:['greatsword','flail','javelin'],startingPackage:'a'},
      backgroundEquipment:{startingPackage:'a',gamingSet:'dice_set'},
      inventoryActions:[{type:'buy',itemId:'shield',quantity:1},{type:'equip_shield',equipped:true}],
    };
    const snapshot=validateCharacterSnapshot(JSON.parse(JSON.stringify(makeCharacterSnapshot(withInventory))));
    const restored=calculateGuidedFighter(snapshot.input);
    expect(restored.inventory?.coinsCopper).toBe(800);
    expect(restored.inventory?.equipped.shield).toBe(true);
    expect(restored.sheet.armorClass).toBe(19);
  });
  it('rechaza versiones desconocidas', () => {
    expect(() =>
      validateCharacterSnapshot({
        ...makeCharacterSnapshot(input()),
        schemaVersion: 3
      })
    ).toThrow();
  });
  it('rechaza personajes con elecciones invalidas',()=>{
    expect(()=>makeCharacterSnapshot({...input(),level:5 as 1})).toThrow();
  });
  it('no modifica la entrada',()=>{
    const i=input(),copy=JSON.stringify(i);
    makeCharacterSnapshot(i);
    expect(JSON.stringify(i)).toBe(copy);
  });
  it('rechaza campos extras en el contenedor',()=>{
    expect(()=>validateCharacterSnapshot({...makeCharacterSnapshot(input()),injected:true})).toThrow();
  });
});
