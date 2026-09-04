# Kit Sem Telas / Kit Sin Pantallas — páginas de venda

As páginas atuais ficam em `vsl/pt/` e `vsl/es/`. O caminho foi preservado para não quebrar os anúncios antigos, mas o vídeo de venda foi retirado do fluxo. `kit/pt/` e `kit/es/` redirecionam para essas páginas com atribuição filtrada.

Correção de 04/09/2026: demonstração real em português, compra direta, preços sem contagem regressiva, sem promessas de comportamento ou packs futuros, suporte e condições acessíveis, consentimento opcional antes do Pixel. A página ES deixou de exibir amostras em português; a comprovação visual da versão espanhola permanece pendente para uma futura campanha LATAM.

O site emite PageView, ViewContent e CheckoutClick somente com consentimento. InitiateCheckout e Purchase pertencem à Hotmart. Configurar o pixel web não comprova uma venda recebida: aprovação, valor, moeda e ausência de duplicação precisam ser verificados na integração da Hotmart. Nunca adicionar tokens ao repositório.

```sh
python3 -m http.server 8766 --bind 127.0.0.1
node tests/sales.test.mjs
node tests/tracking.test.mjs
```

A raiz ainda contém o quiz legado do produto Esencial (6–24 meses), com consentimento também corrigido. A documentação histórica desse quiz segue abaixo; seus resultados anteriores não comprovam o checkout dos novos kits.

---

# Quiz V2 — “Descubre cuánto conoces a tu hijo”

Referência funcional local do quiz conectado ao produto **Agenda de Juegos y Rutinas — Esencial (6–24 meses)**, marca **Pequeños Ritmos**. A pasta é autocontida: `demo.html`, `privacidad.html`, `terminos.html`, `reembolsos.html` e `site-config.js` não dependem da landing V3.

Execute a partir da raiz do workspace:

```bash
python3 -m http.server 8767 --directory outputs
```

Abra `http://127.0.0.1:8767/campaign-v5/quiz-preview/`. Não publique como produção sem concluir endereço/revisão legal, consentimento, integração Pixel/Hotmart, URL HTTPS e compra-teste.

## O que funciona

- dez perguntas, sem nota, percentual ou comparação parental;
- quatro mapas de jogo (`OBS`, `RIT`, `EXP`, `FLX`) e resultado informativo `NF`;
- recomendação de atividade coerente com a fonte Essential V3;
- eco visível de sinal, preferência e repetição;
- uma atividade completa entregue antes da oferta;
- estado em `sessionStorage`;
- retomada, voltar e reiniciar;
- todas as perguntas alteram a atividade, o mapa, o contexto visível ou o gate NF;
- H1 único e consistente com a campanha;
- UTMs, SCK e IDs `mcid`/`masid`/`maid` preservados;
- SCK de entrada preservado ou fallback `qz-conoce-{conceito}`, até 30 caracteres e sem `_`; perfil, idade e respostas nunca entram na URL;
- checkout Hotmart Essential em `checkoutMode=10`, preservando o order bump Premium publicado;
- demonstração sem `entry`, idade, resposta ou resultado na URL; o gate do CTA usa apenas `sessionStorage`;
- fallback sem JavaScript e fallback visual de imagens;
- navegação por teclado e preferências de movimento reduzido.

## QA executado

- `node --check` aprovado;
- caminhos locais retornando HTTP 200;
- OBS e NF percorridos ponta a ponta após a revisão; NF permanece sem checkout;
- os demais mapas foram percorridos antes do rebalanceamento e a lógica final foi testada exaustivamente em 250.000 combinações;
- nenhum dos 250.000 caminhos retorna um perfil abaixo da pontuação máxima;
- distribuição estrutural após rebalanceamento: OBS 22,50%, RIT 20,55%, EXP 28,26%, FLX 28,70% — não é distribuição esperada de tráfego real;
- retomada durante transição e persistência do resultado aprovadas;
- checkout com `checkoutMode=10`, sem `off`/`hotfeature`, um único `?` e `sck` pré-registrado preservado (ex.: `mx-c04-h2-ugc-cr1-qz`);
- `fbclid` descartado sem consentimento e conservado somente depois de aceitar a medição;
- nenhum perfil, idade ou resposta na URL;
- resultado → demo mantém CTA e atribuição; NF → demo não mostra CTA, sem expor o motivo na URL;
- sem overflow em 320, 360, 375, 390, 430, 768, 960, 1024 e 1440 px;
- contraste do eyebrow corrigido para 6,49:1;
- imagens carregadas com dimensões reais.

O teste de regressão está versionado em `tests/tracking.test.mjs` e pode ser repetido com:

```bash
node --test outputs/campaign-v5/quiz-preview/tests/tracking.test.mjs
```

Ele prova a allowlist de atribuição, exclusão de respostas/dados arbitrários, consentimento antes do Pixel, preservação condicional de `fbclid`, ausência de `Purchase` local e passagem segura pela página de demonstração. Teclado via botões nativos e foco programático foi revisado estaticamente; leitor de tela, axe, zoom real de 200% e compra aprovada permanecem gates de release.

## Medição

`measurementEnabled` está `true` em `site-config.js`; isso disponibiliza a medição, mas não dispensa o consentimento. O Dataset/Pixel é `2085840802138189`. Quando habilitado, o script de Meta só carrega após uma aceitação explícita; rejeitar não bloqueia o quiz nem o checkout.

O clique próprio usa apenas o evento customizado `CheckoutClick`. `InitiateCheckout` fica reservado ao carregamento confirmado do checkout Hotmart, e `Purchase` deve vir somente da Hotmart Web/API após aprovação.

## Gates de produção

Antes de publicar, preencher `publicBaseUrl`, `legalAddress`, marcar `legalReviewApproved`, remover `noindex` somente depois do QA e então habilitar `measurementEnabled`. Em produção, `site-config.js` bloqueia os CTAs de checkout se URL, endereço ou revisão legal continuarem incompletos.
