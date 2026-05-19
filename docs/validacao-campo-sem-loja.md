# Validacao em campo sem App Store

Para validar o TerraNexa sem pagar Apple Developer Program, a rota oficial e
usar o app como PWA instalavel. O produtor acessa um link HTTPS, adiciona o
TerraNexa a tela inicial e usa com experiencia parecida com app.

## Por que nao TestFlight

TestFlight e distribuicao beta da Apple e exige uma conta Apple Developer
Program ativa. Sem essa assinatura, nao temos acesso a App Store Connect,
Certificates, Identifiers & Profiles, provisioning de distribuicao e TestFlight.

## Rota gratuita

1. Usar a URL HTTPS de producao publicada no Vercel a partir do repositorio
   `https://github.com/terranexaapp/terranexa.git`.
2. Abrir essa URL de producao no celular. Nao use `localhost`, IP da maquina
   local ou preview temporario para validar em campo.
3. Instalar na tela inicial:
   - iPhone: Safari > Compartilhar > Adicionar a Tela de Inicio.
   - Android: Chrome > Instalar app ou Adicionar a tela inicial.
4. Validar com produtores usando um QR Code ou link curto.

## O que o TerraNexa ja tem

- Manifest PWA em `vite.config.js`.
- Nome e icones do app em `public/`.
- Service worker gerado no build.
- `display: standalone`, para abrir sem a barra comum do navegador quando
  instalado pela tela inicial.

## Checklist antes de levar a campo

1. Confirmar variaveis no ambiente de producao:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_MAPBOX_TOKEN`
2. Fazer commit e push para a branch conectada ao Vercel.
3. Confirmar que o deploy de producao do Vercel concluiu sem erro.
4. Abrir a URL de producao no iPhone usando Safari.
5. Adicionar a tela inicial e abrir pelo icone.
6. Testar login, cadastro de fazenda, mapa, GPS e captura de foto.
7. Registrar monitoramentos sem internet e sincronizar depois pela tela de
   Monitoramento.
8. Testar em Android usando Chrome.
9. Gerar QR Code apontando para a URL publicada.

## Texto simples para o produtor

No iPhone:

1. Abra o link do TerraNexa no Safari.
2. Toque no botao de compartilhar.
3. Toque em Adicionar a Tela de Inicio.
4. Abra pelo icone TerraNexa.

No Android:

1. Abra o link do TerraNexa no Chrome.
2. Toque em Instalar app ou no menu de tres pontos.
3. Confirme a instalacao.
4. Abra pelo icone TerraNexa.

## Limites dessa rota

- Nao aparece na App Store.
- No iPhone, a instalacao precisa ser feita pelo Safari.
- Alguns recursos avancados de app nativo podem ter limites no iOS.
- Para publicar como app nativo iOS/TestFlight no futuro, sera necessario
  Apple Developer Program.
