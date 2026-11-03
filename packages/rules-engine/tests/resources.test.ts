import { describe, expect, it } from 'vitest';
import {
  advanceFighterLevel, fighterResourceMaximum, finishFighterRest,
  initialFighterState, spendFighterResource, useActionSurge,
  useSecondWind, useTacticalMind, validateFighterState,
} from '../src/resources';

describe('Guerrero: recursos y descansos (niveles 1-3)', () => {
  it('T01 comienza nivel 1 con 2 Segundo aliento y sin Acción súbita', () => {
    const s=initialFighterState(1,12); expect(s.resources.second_wind?.current).toBe(2);
    expect(s.resources.action_surge).toBeUndefined();
  });
  it('T02 nivel 2 tiene un uso de Acción súbita', () => expect(initialFighterState(2,20).resources.action_surge?.current).toBe(1));
  it('T03 máximos correctos en niveles 1 a 3', () => {
    expect(fighterResourceMaximum(1,'action_surge')).toBe(0);
    expect(fighterResourceMaximum(3,'second_wind')).toBe(2);
  });
  it('T04 Segundo aliento recupera d10+nivel, sin sobrecurar', () => {
    const s={...initialFighterState(1,12),hitPoints:{current:3,maximum:12}};
    const r=useSecondWind(s,6); expect(r.state.hitPoints.current).toBe(10);
    expect(r.healed).toBe(7); expect(r.state.resources.second_wind?.current).toBe(1);
  });
  it('T05 Segundo aliento respeta máximo', () => {
    const s={...initialFighterState(1,12),hitPoints:{current:10,maximum:12}};
    const r=useSecondWind(s,10); expect(r.healed).toBe(2); expect(r.state.hitPoints.current).toBe(12);
  });
  it('T06 no permite tiradas d10 inválidas', () => {
    expect(()=>useSecondWind(initialFighterState(1,12),0)).toThrow();
    expect(()=>useSecondWind(initialFighterState(1,12),11)).toThrow();
  });
  it('T07 descanso corto devuelve solo 1 Segundo aliento', () => {
    let s=initialFighterState(1,12);
    s=spendFighterResource(spendFighterResource(s,'second_wind'),'second_wind');
    expect(finishFighterRest(s,'short_rest').resources.second_wind?.current).toBe(1);
  });
  it('T08 descanso corto nunca supera 2 Segundo aliento', () => expect(finishFighterRest(initialFighterState(1,12),'short_rest').resources.second_wind?.current).toBe(2));
  it('T09 descanso largo restaura Segundo aliento completo', () => {
    const s=spendFighterResource(initialFighterState(1,12),'second_wind');
    expect(finishFighterRest(s,'long_rest').resources.second_wind?.current).toBe(2);
  });
  it('T10 Acción súbita se gasta y recupera por descanso corto', () => {
    const s=useActionSurge(initialFighterState(2,20),'attack');
    expect(s.resources.action_surge?.current).toBe(0);
    expect(finishFighterRest(s,'short_rest').resources.action_surge?.current).toBe(1);
  });
  it('T11 Acción súbita no permite la acción Magia', () => expect(()=>useActionSurge(initialFighterState(2,20),'magic')).toThrow());
  it('T12 no permite gastar recursos agotados', () => {
    const s=useActionSurge(initialFighterState(2,20),'attack');
    expect(()=>useActionSurge(s,'attack')).toThrow();
  });
  it('T13 Acción súbita no está disponible antes de nivel 2', () => expect(()=>useActionSurge(initialFighterState(1,12),'attack')).toThrow());
  it('T14 Mente táctica supera CD y consume Segundo aliento', () => {
    const r=useTacticalMind(initialFighterState(2,20),{originalTotal:11,difficultyClass:15,d10:4});
    expect(r.success).toBe(true); expect(r.spent).toBe(true);
    expect(r.state.resources.second_wind?.current).toBe(1);
  });
  it('T15 Mente táctica no alcanza CD y conserva uso', () => {
    const s=initialFighterState(2,20);
    const r=useTacticalMind(s,{originalTotal:11,difficultyClass:15,d10:3});
    expect(r.success).toBe(false); expect(r.spent).toBe(false); expect(r.state).toBe(s);
  });
  it('T16 Mente táctica requiere prueba fallida', () => expect(()=>useTacticalMind(initialFighterState(2,20),{originalTotal:15,difficultyClass:15,d10:2})).toThrow());
  it('T17 Mente táctica no se obtiene en nivel 1', () => expect(()=>useTacticalMind(initialFighterState(1,12),{originalTotal:10,difficultyClass:15,d10:5})).toThrow());
  it('T18 Mente táctica requiere usos disponibles', () => {
    let s=initialFighterState(2,20);
    s=spendFighterResource(spendFighterResource(s,'second_wind'),'second_wind');
    expect(()=>useTacticalMind(s,{originalTotal:10,difficultyClass:15,d10:5})).toThrow();
  });
  it('T19 operaciones no mutan la fuente', () => {
    const s=initialFighterState(2,20); useSecondWind(s,5); finishFighterRest(s,'short_rest');
    expect(s.resources.second_wind?.current).toBe(2); expect(s.hitPoints.current).toBe(20);
  });
  it('T20 recalcular o validar no recupera usos gastados', () => {
    const s=spendFighterResource(initialFighterState(2,20),'second_wind');
    expect(validateFighterState(s).resources.second_wind?.current).toBe(1);
  });
  it('T21 rechaza datos de guardado inconsistentes', () => {
    expect(()=>validateFighterState({...initialFighterState(1,12),resources:{second_wind:{current:3}}})).toThrow();
  });
  it('T22 subida a nivel 2 desbloquea Acción súbita sin rellenar Segundo aliento', () => {
    const s=spendFighterResource(initialFighterState(1,12),'second_wind');
    const next=advanceFighterLevel(s,2,20);
    expect(next.resources.second_wind?.current).toBe(1);
    expect(next.resources.action_surge?.current).toBe(1);
    expect(next.hitPoints.current).toBe(20);
  });
  it('T23 subida de nivel con personaje herido conserva daño recibido', () => {
    const s={...initialFighterState(1,12),hitPoints:{current:5,maximum:12}};
    const next=advanceFighterLevel(s,2,20);
    expect(next.hitPoints.current).toBe(13);
  });
  it('T24 validaciones de progresión rechazan saltos de nivel', () => expect(()=>advanceFighterLevel(initialFighterState(1,12),3,28)).toThrow());
  it('T25 descanso no cura automáticamente PG actuales', () => {
    const s={...initialFighterState(2,20),hitPoints:{current:7,maximum:20}};
    expect(finishFighterRest(s,'long_rest').hitPoints.current).toBe(7);
  });
});
