import { db } from '@/lib/prisma';
import { errorResponse, localDevelopmentOnly, readSnapshot } from '@/lib/characters-api';
import type { Prisma } from '@/generated/prisma/client';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(request:Request){
  const forbidden=localDevelopmentOnly(request);if(forbidden)return forbidden;
  try{
    const characters=await db().character.findMany({
      select:{id:true,name:true,level:true,revision:true,createdAt:true,updatedAt:true},
      orderBy:{updatedAt:'desc'},take:100,
    });
    return Response.json({characters},{headers:{'Cache-Control':'no-store'}});
  }catch(e){return errorResponse(e);}
}

export async function POST(request:Request){
  const forbidden=localDevelopmentOnly(request);if(forbidden)return forbidden;
  try{
    const snap=await readSnapshot(request);
    const row=await db().character.create({data:{
      name:snap.input.name.trim(),level:snap.input.level,ruleset:snap.ruleset,
      schemaVersion:snap.schemaVersion,rulesVersion:'phb-2024-srd-5.2.1',
      selection:snap as unknown as Prisma.InputJsonValue,
    },select:{id:true,name:true,level:true,revision:true,updatedAt:true}});
    return Response.json({character:row},{status:201,headers:{'Cache-Control':'no-store'}});
  }catch(e){return errorResponse(e);}
}
