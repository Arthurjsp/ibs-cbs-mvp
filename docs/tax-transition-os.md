# Tax Transition OS - posicionamento de produto

## Tese

O produto não deve competir como "mais um sistema fiscal".  
Ele deve competir como sistema de decisão tributária para reduzir:

- incerteza operacional durante a transição para IBS/CBS
- risco financeiro de margem e precificação
- risco de implementação fiscal em ERP/processos

## Dor que gera compra

Perguntas que o produto precisa responder para CFO/Controller:

1. Quanto a carga muda no IBS/CBS versus modelo atual?
2. Quais produtos/operações perdem margem?
3. Qual faixa de repasse protege margem?
4. Quais mudanças de parametrização fiscal são necessárias?
5. Onde existe maior exposição a risco de autuação?

## ICP

- Faixa alvo: empresas com faturamento anual de R$ 20M a R$ 500M
- Perfil: ERP robusto (ou proprio), time fiscal interno, dor de margem
- Segmentos prioritarios:
  - industria
  - distribuição/atacado
  - varejo omnichannel
  - servicos B2B estruturados

## Mapa de modulos

1. Simulador de impacto tributário
- Status: ativo no MVP
- Entrega atual: upload NF-e, engine IBS/CBS, legado x IBS, auditoria por item

2. Engine de precificação
- Status: parcial no MVP
- Entrega atual: cenário de repasse + override de alíquotas
- Gap: elasticidade e otimização de preço

3. Tradutor ERP para reforma
- Status: roadmap
- Escopo: mapeamento CFOP/CST/NCM para regras operacionais de ERP

4. Radar de risco fiscal
- Status: roadmap
- Escopo: score de inconsistencias e exposição financeira simulada

5. Cockpit do CFO
- Status: ativo no MVP
- Entrega atual: KPIs executivos, MoM/YoY, effective rate, telemetria

## Fluxo de uso alvo

1. Onboarding de empresa e dados fiscais
2. Leitura automática de operações e contexto tributário
3. Simulação atual versus IBS/CBS
4. Diagnostico de impacto por produto/UF
5. Plano de ação (repasse e ajustes operacionais)
6. Execução com relatórios e integrações
7. Monitoramento continuo de impacto

## Monetização sugerida

- Setup consultivo + integração: R$ 10k a R$ 80k
- Assinatura mensal por porte:
  - R$ 20M a R$ 50M: R$ 1.500 a R$ 4.000
  - R$ 50M a R$ 150M: R$ 4.000 a R$ 12.000
  - R$ 150M+: R$ 12.000 a R$ 40.000

## Principio de produto

Não virar commodity de compliance básico.  
Foco em:

- inteligência
- decisão
- risco

## Validação comercial recomendada

1. Entrevistar 15 contadores de empresas medias
2. Entrevistar 10 CFOs/Controllers
3. Testar willingness-to-pay com problema concreto de margem
