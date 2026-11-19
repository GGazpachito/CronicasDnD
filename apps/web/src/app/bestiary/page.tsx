import BestiaryBrowser from '../../components/BestiaryBrowser';

export default async function BestiaryPage({searchParams}:Readonly<{searchParams:Promise<{creature?:string}>}>){
 const params=await searchParams;
 return <BestiaryBrowser initialId={params.creature}/>;
}
