/** Auditoría reproducible local: compara los IDs del catálogo de Mago con las
 * tablas de clase del SRD 5.2.1 en inglés extraídas mediante pdftotext -raw.
 * Uso: node scripts/audit-srd-spells.mjs /ruta/al/srd-english.txt
 */
import fs from 'node:fs';
import path from 'node:path';

const raw=fs.readFileSync(process.argv[2], 'utf8');
const start=raw.lastIndexOf('\nWizard Spell List\n');
const end=raw.indexOf('\nWizard Subclass: Evoker\n',start);
if(start<0||end<0)throw new Error('No se localizaron los límites de la lista oficial de Mago');
const legal=new Map();
let level=-1;
for(const line of raw.slice(start,end).split('\n')){
 const cantrip=line.match(/^Cantrips \(Level 0 Wizard Spells\)$/);
 const next=line.match(/^Level (\d) Wizard Spells$/);
 if(cantrip)level=0;
 if(next)level=Number(next[1]);
 const spell=line.match(/^(.+?)\s+(Abjuration|Conjuration|Divination|Enchantment|Evocation|Illusion|Necromancy|Transmutation)\s+(?:C|M|R|—|–)/);
 if(spell&&level>=0)legal.set(normalize(spell[1]),level);
}
function normalize(s){return s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[’'\-]/g,'').replace(/[^a-z0-9]/g,'');}
const alternate={
 tashas_hideous_laughter:'Hideous Laughter',tensers_floating_disk:'Floating Disk',
 melfs_acid_arrow:'Acid Arrow',nystuls_magic_aura:'Arcanist’s Magic Aura',
 bigbys_hand:'Arcane Hand',rarys_telepathic_bond:'Telepathic Bond',
 evards_black_tentacles:'Black Tentacles',leomunds_secret_chest:'Secret Chest',
 mordenkainens_faithful_hound:'Faithful Hound',mordenkainens_private_sanctum:'Private Sanctum',
 otilukes_resilient_sphere:'Resilient Sphere',
 mordenkainens_magnificent_mansion:'Magnificent Mansion',mordenkainens_sword:'Arcane Sword',
 drawmijs_instant_summons:'Instant Summons',otilukes_freezing_sphere:'Freezing Sphere',
 ottos_irresistible_dance:'Irresistible Dance',leomunds_tiny_hut:'Tiny Hut',
 feeblemind:'Befuddlement',
};
const dir='packages/rules-engine/src';
const files=fs.readdirSync(dir).filter(f=>/^wizard-(creation|third-level|fourth-level|fifth-level|sixth-level|seventh-level|eighth-level|ninth-level)\.ts$/.test(f));
const current=[];
for(const file of files){
 const complete=fs.readFileSync(path.join(dir,file),'utf8');
 const src=file==='wizard-creation.ts'?complete.slice(complete.indexOf('const rawCantrips='),complete.indexOf('export const WIZARD_SPELL_CATALOG=')):complete;
 for(const match of src.matchAll(/(?:\[\s*['"]|\bid:\s*['"])([a-z][a-z0-9_]+)['"]\s*,\s*(?:name\s*:\s*)?['"]([^'"]+)['"]/g)){
  const id=match[1],name=match[2];
  const guessed=file==='wizard-creation.ts'?(match.index<src.indexOf('const rawLevelOne')?0:match.index<src.indexOf('const rawLevelTwo')?1:2):Number(file.match(/(third|fourth|fifth|sixth|seventh|eighth|ninth)/)?{third:3,fourth:4,fifth:5,sixth:6,seventh:7,eighth:8,ninth:9}[file.match(/(third|fourth|fifth|sixth|seventh|eighth|ninth)/)[1]]:-1);
  const canonical=normalize(alternate[id]??id.replaceAll('_',' '));
  const actual=legal.get(canonical);
  current.push({id,name,file,level:guessed,status:actual===undefined?'EXCLUIDO':actual===guessed?'SRD':'NIVEL_DISTINTO',srdLevel:actual});
 }
}
console.log(JSON.stringify({officialCount:legal.size,currentCount:current.length,excluded:current.filter(x=>x.status!=='SRD'),accepted:current.filter(x=>x.status==='SRD').length},null,2));
