import {S,header,footer,text,card,shape,rule} from './shared.mjs';
export async function slide10(presentation,ctx){const slide=presentation.slides.add();await header(slide,ctx,'Regras de foco','O projeto precisa de limites claros para não se espalhar.', 'O foco agora não é ter mais telas; é transformar uma visita real em dado confiável.');
card(slide,ctx,80,300,310,210,'Focar agora','P0 e P1: deploy, login, mapa, GPS, monitorar, salvar offline, cor por atraso e timeline mobile/desktop.',S.green,{bodySize:13});
card(slide,ctx,470,300,310,210,'Aguardar','Relatórios avançados, permissões complexas, plano comercial, múltiplas fazendas piloto e automações de alerta.',S.red,{bodySize:13});
card(slide,ctx,860,300,310,210,'Medir no campo','Tempo para abrir o app, precisão do GPS, clareza dos botões, registro salvo e entendimento da cor do talhão.',S.blue,{bodySize:13});
shape(slide,ctx,240,560,780,46,S.dark);text(slide,ctx,'Regra prática: se a melhoria não ajuda o produtor a monitorar um talhão no campo, ela espera.',270,574,720,20,{serif:true,bold:true,size:18,color:'#FFFFFF',align:'center'});footer(slide,ctx,10);return slide;}
