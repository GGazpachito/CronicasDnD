import { db } from '@/lib/prisma';
import { errorResponse,localDevelopmentOnly,readRevision,validCharacterId } from '@/lib/characters-api';
import { validateCharacterSnapshot } from '@/lib/characters-api';
import type { Prisma } from '@/generated/prisma/client';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};

export async function GET(request:Request,context:Context){
  const forbidden=localDevelopmentOnly(request);if(forbidden)return forbidden;
  const {id}=await context.params;
  if(!validCharacterId(id))return Response.json({error:'Identificador invalido'},{status:400});
  try{
    const c=await db().character.findUnique({where:{id}});
    if(!c)return Response.json({error:'Personaje no encontrado'},{status:404});
    const snapshot=validateCharacterSnapshot(c.selection);
    return Response.json({character:{id:c.id,name:c.name,level:c.level,revision:c.revision,snapshot,updatedAt:c.updatedAt}},{headers:{'Cache-Control':'no-store'}});
  }catch(e){return errorResponse(e);}
}

export async function PUT(request:Request,context:Context){
  const forbidden=localDevelopmentOnly(request);if(forbidden)return forbidden;
  const {id}=await context.params;
  if(!validCharacterId(id))return Response.json({error:'Identificador invalido'},{status:400});
  try{
    const body=await request.text();
    if(body.length>130_000)throw new RangeError('Solicitud demasiado grande');
    let raw:unknown;
    try{raw=JSON.parse(body);}catch{throw new RangeError('JSON invalido');}
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new RangeError('Solicitud invalida');
    const item=raw as Record<string,unknown>;
    const revision=readRevision(item.revision);
    // Se valida igual que en POST. No se confia en valores calculados del navegador.
    const snapshot=validateCharacterSnapshot(item.snapshot);
    const result=await db().character.updateMany({
      where:{id,revision},
      data:{name:snapshot.input.name.trim(),level:snapshot.input.level,schemaVersion:snapshot.schemaVersion,selection:snapshot as unknown as Prisma.InputJsonValue,revision:{increment:1}}
    });
    if(result.count===0)return Response.json({error:'Este personaje ha cambiado o no existe. Vuelve a cargarlo antes de sobrescribir.'},{status:409});
    const current=await db().character.findUnique({where:{id},select:{id:true,name:true,level:true,revision:true,updatedAt:true}});
    return Response.json({character:current},{headers:{'Cache-Control':'no-store'}});
  }catch(e){return errorResponse(e);}
}

export async function DELETE(request:Request,context:Context){
  const forbidden=localDevelopmentOnly(request);if(forbidden)return forbidden;
  const {id}=await context.params;
  if(!validCharacterId(id))return Response.json({error:'Identificador invalido'},{status:400});
  try{
    const revision=readRevision(Number(new URL(request.url).searchParams.get('revision')));
    const result=await db().character.deleteMany({where:{id,revision}});
    if(result.count===0)return Response.json({error:'Este personaje ya no existe o ha sido modificado'},{status:409});
    return new Response(null,{status:204});
  }catch(e){return errorResponse(e);}
}
