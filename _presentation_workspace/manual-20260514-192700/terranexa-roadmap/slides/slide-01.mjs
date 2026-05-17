import {S,header,footer,text,rect,rule,kpi,drawMap,brand} from './shared.mjs';
export async function slide01(presentation, ctx){const slide=presentation.slides.add();
rect(slide,ctx,0,0,1280,720,S.dark); drawMap(slide,ctx,650,74,520,430,{monitor:true,badge:'LEAFLET + MAPBOX'}); await brand(slide,ctx,58,44,true);
text(slide,ctx,'PLANO EXECUTIVO DO PROJETO',58,132,360,18,{mono:true,bold:true,size:10,color:'#A8D98F'});
text(slide,ctx,'TerraNexa: do protótipo ao teste real em campo',58,170,650,136,{serif:true,bold:true,size:46,color:'#FFFFFF'});
text(slide,ctx,'Análise do que já foi construído, lacunas críticas, prioridade de execução e visual futuro do aplicativo agrícola.',60,330,560,60,{size:17,color:'#DDE8D2'});
kpi(slide,ctx,60,500,'20','tabelas de domínio','Base Supabase cobre fazenda, talhão, OS, chuva, solo e scouting','#A8D98F'); kpi(slide,ctx,330,500,'PWA','instalável','Ícone, manifest e service worker já preparados','#E8A84C'); kpi(slide,ctx,590,500,'Mapa','Leaflet + Mapbox','Com fallback Esri se o token não existir','#4A8AB8');
text(slide,ctx,'Status: maio/2026 · Repositório GitHub: terranexaapp/terranexa · Deploy: Vercel',58,674,780,18,{mono:true,bold:true,size:8.5,color:'#B8D7B0'});return slide;}