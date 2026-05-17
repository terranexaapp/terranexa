import {S,bg,brand,footer,text,shape,rule,mapPanel,phase} from './shared.mjs';
export async function slide01(presentation,ctx){const slide=presentation.slides.add();bg(slide,ctx,'dark');await brand(slide,ctx,58,46,true);
text(slide,ctx,'TerraNexa: foco de execução a partir de agora',58,156,650,124,{serif:true,bold:true,size:39,color:'#FFFFFF'});
text(slide,ctx,'O app já tem base funcional. A prioridade agora é colocar em teste real no campo, validar GPS/offline/mapa e só depois expandir módulos gerenciais.',60,300,570,58,{size:16,color:'#DDE8D2'});
metricStrip(slide,ctx);mapPanel(slide,ctx,768,126,386,286,{monitor:true,labels:false,badge:'ROADMAP'});
phase(slide,ctx,'P0 colocar para testar',790,450,170,S.green);phase(slide,ctx,'P1 teste no campo',970,450,160,S.amber);
phase(slide,ctx,'P2 módulos essenciais',790,504,190,S.blue);phase(slide,ctx,'P3 operação real',990,504,150,S.soil);phase(slide,ctx,'P4 escala',930,558,110,S.red);
text(slide,ctx,'Entregável desta apresentação: uma linha de raciocínio para manter o projeto em sequência, sem abrir frentes demais antes do teste de campo.',58,594,760,36,{size:13,color:'#CDEAC0'});footer(slide,ctx,1,'Roadmap executivo TerraNexa');return slide;}
function metricStrip(slide,ctx){const data=[['Base web','React + Vite'],['Mapa','Leaflet + Mapbox/Esri'],['Banco','Supabase modelado'],['Deploy','GitHub + Vercel']];data.forEach((d,i)=>{const x=58+i*168;rule(slide,ctx,x,432,3,i===0?S.green:i===1?S.amber:i===2?S.blue:S.soil,54);text(slide,ctx,d[0],x+16,426,130,24,{serif:true,bold:true,size:18,color:'#FFFFFF'});text(slide,ctx,d[1].toUpperCase(),x+16,456,136,14,{mono:true,bold:true,size:7.5,color:'#A8D98F'});});}
