import { validateCharacterSnapshot, type CharacterSnapshot } from '../../../../packages/rules-engine/src/persistence';

export function localDevelopmentOnly(req:Request):Response|null {
  // Sin autenticacion no se debe exponer esta API en produccion.
  if(process.env.NODE_ENV!=='development')return Response.json({error:'Guardado local desactivado fuera de desarrollo'}, {status:403});
  const host=req.headers.get('host')||'';
  if(!/^(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(host))return Response.json({error:'Solo disponible en localhost'},{status:403});
  const origin=req.headers.get('origin');
  if(origin){
    try{if(new URL(origin).host!==host)return Response.json({error:'Origen no permitido'},{status:403});}
    catch{return Response.json({error:'Origen no permitido'},{status:403});}
  }
  return null;
}

export async function readSnapshot(req:Request):Promise<CharacterSnapshot>{
  const length=Number(req.headers.get('content-length')||0);
  if(length>130_000)throw new RangeError('La solicitud supera el limite permitido');
  const data=await req.text();
  if(data.length>130_000)throw new RangeError('La solicitud supera el limite permitido');
  let parsed:unknown;
  try{parsed=JSON.parse(data);}catch{throw new RangeError('JSON invalido');}
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||!('snapshot' in parsed))throw new RangeError('Falta snapshot');
  return validateCharacterSnapshot((parsed as {snapshot:unknown}).snapshot);
}

export function validCharacterId(id:string):boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function readRevision(raw:unknown):number {
  if(typeof raw!=='number'||!Number.isInteger(raw)||raw<1||raw>1_000_000)throw new RangeError('Revision invalida');
  return raw;
}

export function errorResponse(error:unknown):Response{
  if(error instanceof RangeError)return Response.json({error:error.message},{status:400});
  console.error('[persistence]',error);
  return Response.json({error:'No se pudo acceder a la base de datos. Comprueba PostgreSQL y las migraciones.'},{status:500});
}

export { validateCharacterSnapshot } from '../../../../packages/rules-engine/src/persistence';
