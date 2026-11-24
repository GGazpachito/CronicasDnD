import {describe,expect,it} from 'vitest';
import {BESTIARY_ENTRIES,challengeRatingValue,compareBestiaryEntries,type BestiaryEntry} from '../src/bestiary';

describe('Actualización 78: orden fijo del Bestiario en catálogo y filtros',()=>{
 it('ordena el desafío numéricamente, incluidas fracciones',()=>{
  expect(['0','1/8','1/4','1/2','1','2','5'].map(challengeRatingValue)).toEqual([0,0.125,0.25,0.5,1,2,5]);
  expect(BESTIARY_ENTRIES.map(x=>x.id)).toEqual([...BESTIARY_ENTRIES].sort(compareBestiaryEntries).map(x=>x.id));
 });
 it('dentro de un mismo desafío ordena en español por nombre y mantiene orden al filtrar',()=>{
  const create=(id:string,name:string,challengeRating:string):BestiaryEntry=>({...BESTIARY_ENTRIES[0],id,name,sheet:{...BESTIARY_ENTRIES[0].sheet,challengeRating}});
  expect([create('z','Zorro','1/4'),create('b','Búho','1/4'),create('a','Águila','1/4')].sort(compareBestiaryEntries).map(x=>x.id)).toEqual(['a','b','z']);
  const filtered=BESTIARY_ENTRIES.filter(x=>x.category==='familiar_especial'&&x.name.toLocaleLowerCase('es').includes('a'));
  expect(filtered.map(x=>x.id)).toEqual([...filtered].sort(compareBestiaryEntries).map(x=>x.id));
 });
});
