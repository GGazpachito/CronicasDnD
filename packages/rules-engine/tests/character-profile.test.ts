import {describe,it,expect} from 'vitest';
import {
  EMPTY_CHARACTER_PROFILE, PROFILE_TEXT_LIMITS, MAX_PORTRAIT_DATA_URL_LENGTH,
  validateCharacterProfile, type CharacterProfile,
} from '../src/character-profile';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';
import {makeCharacterSnapshot,validateCharacterSnapshot} from '../src/persistence';
import {prepareFighterLevelUp} from '../src/level-up';

function fighter():GuidedFighterInput{
  return {name:'Maelis',level:1,background:'soldier',species:'human',
    assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
    increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
    fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'tough',humanSize:'medium',
    armor:null,shield:false};
}
const tinyJpeg='data:image/jpeg;base64,/9j/AAAA';

describe('Actualización 42: perfil narrativo y retrato',()=>{
  it('valida y normaliza campos narrativos sin modificar el objeto original',()=>{
    const source={backstory:'Creció en el norte',personality:'Reservada',eyes:'Grises'};
    const copy=JSON.stringify(source);
    const profile=validateCharacterProfile(source);
    expect(profile.backstory).toBe('Creció en el norte');
    expect(profile.personality).toBe('Reservada');
    expect(profile.notes).toBe('');
    expect(profile.eyes).toBe('Grises');
    expect(JSON.stringify(source)).toBe(copy);
  });
  it('preserva historia, notas y retrato en un ciclo de guardado y recuperación v2',()=>{
    const profile:CharacterProfile={...EMPTY_CHARACTER_PROFILE,backstory:'Era un soldado',notes:'Visitar la torre',portraitDataUrl:tinyJpeg};
    const saved=makeCharacterSnapshot({...fighter(),profile});
    const restored=validateCharacterSnapshot(JSON.parse(JSON.stringify(saved)));
    expect(restored.schemaVersion).toBe(2);
    expect(restored.input.profile?.backstory).toBe('Era un soldado');
    expect(restored.input.profile?.notes).toBe('Visitar la torre');
    expect(restored.input.profile?.portraitDataUrl).toBe(tinyJpeg);
  });
  it('puede cargar guardados antiguos sin perfil',()=>{
    const saved=makeCharacterSnapshot(fighter());
    const restored=validateCharacterSnapshot(JSON.parse(JSON.stringify(saved)));
    expect(restored.input.profile).toBeUndefined();
    expect(restored.input.name).toBe('Maelis');
  });
  it('los campos narrativos no modifican las estadísticas',()=>{
    const old=calculateGuidedFighter(fighter()).sheet;
    const changed=calculateGuidedFighter({...fighter(),profile:{...EMPTY_CHARACTER_PROFILE,backstory:'Algo sucedió'}}).sheet;
    expect(changed).toEqual(old);
  });
  it('preserva el perfil al subir de nivel',()=>{
    const profile={...EMPTY_CHARACTER_PROFILE,backstory:'Una promesa',portraitDataUrl:tinyJpeg};
    const current={...fighter(),profile};
    const snapshot=makeCharacterSnapshot(current);
    const next=prepareFighterLevelUp(current,snapshot.adventure,{...current,level:2});
    expect(next.snapshot.input.profile).toEqual(profile);
  });
  it('rechaza campos desconocidos, datos no textuales y exceso de longitud',()=>{
    expect(()=>validateCharacterProfile({unknown:'value'})).toThrow();
    expect(()=>validateCharacterProfile({notes:42})).toThrow();
    expect(()=>validateCharacterProfile({backstory:'x'.repeat(PROFILE_TEXT_LIMITS.backstory+1)})).toThrow();
    expect(()=>makeCharacterSnapshot({...fighter(),profile:{...EMPTY_CHARACTER_PROFILE,notes:'x'.repeat(PROFILE_TEXT_LIMITS.notes+1)}})).toThrow();
  });
  it('rechaza retratos externos, SVG, formatos no JPEG o sobredimensionados',()=>{
    for (const value of ['https://example.com/portrait.jpg','javascript:alert(1)','data:image/svg+xml;base64,PHN2Zz4=',
      'data:image/png;base64,iVBORw0KGgo=', 'data:image/jpeg;base64,AAAA']) {
      expect(()=>validateCharacterProfile({portraitDataUrl:value})).toThrow();
    }
    expect(()=>validateCharacterProfile({portraitDataUrl:'data:image/jpeg;base64,/9j/'+ 'A'.repeat(MAX_PORTRAIT_DATA_URL_LENGTH)})).toThrow();
    expect(validateCharacterProfile({portraitDataUrl:tinyJpeg}).portraitDataUrl).toBe(tinyJpeg);
  });
  it('permite quitar el retrato sin borrar los otros datos',()=>{
    const saved=makeCharacterSnapshot({...fighter(),profile:{...EMPTY_CHARACTER_PROFILE,notes:'Siguen aquí',portraitDataUrl:undefined}});
    expect(saved.input.profile?.portraitDataUrl).toBeUndefined();
    expect(saved.input.profile?.notes).toBe('Siguen aquí');
  });
});
