# Fase 11 - Revisao de Acessibilidade, Legibilidade e Clareza Cognitiva

## Objetivo
Garantir que as telas principais do produto sejam compreensiveis para usuario novo em ate 30 segundos, com navegacao por teclado e leitura clara para perfis nao tecnicos.

## Escopo revisado
- Layout global, cabecalho e navegacao.
- Dashboard, Documentos, Upload, Detalhe de Documento.
- Cenarios, Relatorios, Billing, Creditos, Apuracao assistida.
- Login e Onboarding.
- Componentes compartilhados (field-help, KPI card, charts, modal de confirmacao, tabs de resultado).

## Melhorias aplicadas

### 1. Acessibilidade (WCAG 2.1 AA)
- `skip link` no layout para ir direto ao conteudo principal.
- Landmark principal (`main#main-content`) e navegacao com `aria-label`.
- Destaque de foco visivel para links, botoes, inputs, selects, textareas, summary e tabs.
- Melhor contraste de `muted-foreground` para leitura de textos secundarios.
- Estados ativos na navegacao com `aria-current="page"`.
- Tooltips com `aria-expanded`, `aria-controls` e foco via teclado.
- Modal de confirmacao com `role="dialog"`, `aria-modal`, fechamento por `Esc` e foco inicial.
- Tabs de resultado com semantica correta: `tablist`, `tab`, `tabpanel`.
- Mensagens de erro com `role="alert"` e `aria-live` (upload e login).
- Tabelas com `caption` para contexto de leitor de tela.
- Graficos com alternativa textual (tabela `sr-only`) e legenda textual clara.

### 2. Clareza cognitiva
- Abertura de cada tela com frase objetiva de decisao: "Nesta tela voce decide...".
- Reducao de texto denso e reescrita em frases curtas.
- KPIs executivos agora respondem:
  - O que e
  - Por que importa
  - Acao sugerida
- Alertas e variacoes com texto explicito (nao apenas cor):
  - "Subiu/Caiu"
  - "Impacto favoravel/desfavoravel"

### 3. Leitura facilitada
- Linguagem simplificada (B1/B2), com menos jargao implicito.
- Padrao de nomenclatura mais consistente entre telas.
- Microcopy contextual em campos-chave (onboarding, upload, cenarios, relatorios, documento).

## Validacao manual recomendada

### Teclado
1. Pressione `Tab` na pagina inicial logada e valide o `skip link`.
2. Navegue ate menu, filtros e botoes sem usar mouse.
3. Abra e feche modal de calculo com teclado (`Enter`, `Esc`, `Tab`).
4. Troque abas de resultado no detalhe de documento.

### Leitura e entendimento
1. Peça para um usuario nao tecnico abrir cada tela por 30s.
2. Pergunte:
   - Qual decisao essa tela ajuda a tomar?
   - Qual metrica e mais critica aqui?
   - Qual acao ele tomaria em seguida?
3. Se houver duvida recorrente, ajustar microcopy da tela correspondente.

### Contraste e dependencia de cor
1. Conferir textos secundarios em monitores de brilho baixo.
2. Verificar se o entendimento de alertas continua claro em escala de cinza.

## Limites atuais
- Ainda nao existe auditoria automatica de contraste por CI (ex.: axe/lighthouse gate).
- Alguns termos tecnicos (ex.: effective rate, unsupported) permanecem por necessidade de dominio, mas agora sempre com contexto explicativo.

## Proximo passo recomendado
- Adicionar teste automatizado de acessibilidade por smoke (axe + Playwright) para as rotas principais:
  - `/dashboard`
  - `/documents/upload`
  - `/documents/[id]`
  - `/scenarios`
  - `/reports`
