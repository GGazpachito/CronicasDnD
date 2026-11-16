import { db } from '@/lib/prisma';
import { errorResponse, localDevelopmentOnly, readSnapshot } from '@/lib/characters-api';
import type { Prisma } from '@/generated/prisma/client';
import {validateStoredSnapshot} from '@/lib/characters-api';
import {getCharacterCardDetails} from '../../../../../../packages/rules-engine/src/character-card';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(request:Request){
  const forbidden=localDevelopmentOnly(request);if(forbidden)return forbidden;
  try{
    const characters=await db().character.findMany({
      select:{id:true,name:true,level:true,characterClass:true,revision:true,createdAt:true,updatedAt:true,selection:true},
      orderBy:{updatedAt:'desc'},take:100,
    });
    const summaries=characters.map(({selection,...row})=>{
      try{return {...row,...getCharacterCardDetails(validateStoredSnapshot(selection))};}
      catch{return {...row,species:'Sin datos',subclass:null,portraitDataUrl:undefined};}
    });
    return Response.json({characters:summaries},{headers:{'Cache-Control':'no-store'}});
  }catch(e){return errorResponse(e);}
}

export async function POST(request:Request){
  const forbidden=localDevelopmentOnly(request);if(forbidden)return forbidden;
  try{
    const snap=await readSnapshot(request);
    const row=await db().character.create({data:{
      name:snap.input.name.trim(),level:snap.input.level,ruleset:snap.ruleset,
      characterClass:snap.schemaVersion===3?'wizard':'fighter',
      schemaVersion:snap.schemaVersion,rulesVersion:'phb-2024-srd-5.2.1',
      selection:snap as unknown as Prisma.InputJsonValue,
    },select:{id:true,name:true,level:true,characterClass:true,revision:true,updatedAt:true}});
    return Response.json({character:row},{status:201,headers:{'Cache-Control':'no-store'}});
  }catch(e){return errorResponse(e);}
}
