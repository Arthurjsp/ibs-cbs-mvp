# Tax Transition OS - posicionamento de produto

## Tese

O produto nao deve competir como "mais um sistema fiscal".  
Ele deve competir como sistema de decisao tributaria para reduzir:

- incerteza operacional durante a transicao para IBS/CBS
- risco financeiro de margem e precificacao
- risco de implementacao fiscal em ERP/processos

## Dor que gera compra

Perguntas que o produto precisa responder para CFO/Controller:

1. Quanto a carga muda no IBS/CBS versus modelo atual?
2. Quais produtos/operacoes perdem margem?
3. Qual faixa de repasse protege margem?
4. Quais mudancas de parametrizacao fiscal sao necessarias?
5. Onde existe maior exposicao a risco de autuacao?

## ICP

- Faixa alvo: empresas com faturamento anual de R$ 20M a R$ 500M
- Perfil: ERP robusto (ou proprio), time fiscal interno, dor de margem
- Segmentos prioritarios:
  - industria
  - distribuicao/atacado
  - varejo omnichannel
  - servicos B2B estruturados

## Mapa de modulos

1. Simulador de impacto tributario
- Status: ativo no MVP
- Entrega atual: upload NF-e, engine IBS/CBS, legado x IBS, auditoria por item

2. Engine de precificacao
- Status: parcial no MVP
- Entrega atual: cenario de repasse + override de aliquotas
- Gap: elasticidade e otimizacao de preco

3. Tradutor ERP para reforma
- Status: roadmap
- Escopo: mapeamento CFOP/CST/NCM para regras operacionais de ERP

4. Radar de risco fiscal
- Status: roadmap
- Escopo: score de inconsistencias e exposicao financeira simulada

5. Cockpit do CFO
- Status: ativo no MVP
- Entrega atual: KPIs executivos, MoM/YoY, effective rate, telemetria

## Fluxo de uso alvo

1. Onboarding de empresa e dados fiscais
2. Leitura automatica de operacoes e contexto tributario
3. Simulacao atual versus IBS/CBS
4. Diagnostico de impacto por produto/UF
5. Plano de acao (repasse e ajustes operacionais)
6. Execucao com relatorios e integracoes
7. Monitoramento continuo de impacto

## Monetizacao sugerida

- Setup consultivo + integracao: R$ 10k a R$ 80k
- Assinatura mensal por porte:
  - R$ 20M a R$ 50M: R$ 1.500 a R$ 4.000
  - R$ 50M a R$ 150M: R$ 4.000 a R$ 12.000
  - R$ 150M+: R$ 12.000 a R$ 40.000

## Principio de produto

Nao virar commodity de compliance basico.  
Foco em:

- inteligencia
- decisao
- risco

## Validacao comercial recomendada

1. Entrevistar 15 contadores de empresas medias
2. Entrevistar 10 CFOs/Controllers
3. Testar willingness-to-pay com problema concreto de margem
