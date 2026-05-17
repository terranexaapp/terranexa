import {S,header,footer,text,shape,card,pill,rule} from './shared.mjs';
export async function slide12(presentation,ctx){const slide=presentation.slides.add();await header(slide,ctx,'Próxima decisão','A próxima etapa deve ser curta, verificável e orientada ao campo.', 'Se seguirmos a ordem, o TerraNexa chega mais rápido a um piloto real sem perder qualidade.');
card(slide,ctx,86,286,280,150,'1. Fechar P0','Conferir variáveis, publicar Vercel, instalar PWA e abrir fazenda/mapa em celular real.',S.green,{bodySize:12});
card(slide,ctx,500,286,280,150,'2. Rodar P1','Testar GPS, monitoramento, offline e cor por dias sem visita em uma área real da fazenda.',S.amber,{bodySize:12});
card(slide,ctx,914,286,280,150,'3. Promover P2','Depois do campo validado, fechar talhões, pluviômetros, solo, estoque e ordem de serviço.',S.blue,{bodySize:12});
rule(slide,ctx,366,360,134,S.softLine,4);rule(slide,ctx,780,360,134,S.softLine,4);
shape(slide,ctx,190,528,900,64,S.dark);text(slide,ctx,'Foco recomendado: P0 + P1 primeiro. O restante entra quando o mapa e o monitoramento funcionarem na mão do produtor.',230,548,820,22,{serif:true,bold:true,size:20,color:'#FFFFFF',align:'center'});pill(slide,ctx,'próxima conversa: validar campo, não redesenhar o escopo',390,614,500,S.pale,S.green,{h:32,size:10.5});footer(slide,ctx,12);return slide;}
