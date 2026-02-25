# Fase 11 - Revisão de Acessibilidade, Legibilidade e Clareza Cognitiva

## Objetivo
Garantir que as telas principais do produto sejam compreensíveis para usuário novo em até 30 segundos, com navegação por teclado e leitura clara para perfis não técnicos.

## Escopo revisado
- Layout global, cabeçalho e navegação.
- Dashboard, Documentos, Upload, Detalhe de Documento.
- Cenários, Relatórios, Billing, Créditos, Apuração assistida.
- Login e Onboarding.
- Componentes compartilhados (field-help, KPI card, charts, modal de confirmação, tabs de resultado).

## Melhorias aplicadas

### 1. Acessibilidade (WCAG 2.1 AA)
- `skip link` no layout para ir direto ao conteúdo principal.
- Landmark principal (`main#main-content`) e navegação com `aria-label`.
- Destaque de foco visível para links, botões, inputs, selects, textareas, summary e tabs.
- Melhor contraste de `muted-foreground` para leitura de textos secundários.
- Estados ativos na navegação com `aria-current="page"`.
- Tooltips com `aria-expanded`, `aria-controls` e foco via teclado.
- Modal de confirmação com `role="dialog"`, `aria-modal`, fechamento por `Esc` e foco inicial.
- Tabs de resultado com semântica correta: `tablist`, `tab`, `tabpanel`.
- Mensagens de erro com `role="alert"` e `aria-live` (upload e login).
- Tabelas com `caption` para contexto de leitor de tela.
- Graficos com alternativa textual (tabela `sr-only`) e legenda textual clara.

### 2. Clareza cognitiva
- Abertura de cada tela com frase objetiva de decisão: "Nesta tela você decide...".
- Redução de texto denso e reescrita em frases curtas.
- KPIs executivos agora respondem:
  - O que é
  - Por que importa
  - Ação sugerida
- Alertas e variações com texto explícito (não apenas cor):
  - "Subiu/Caiu"
  - "Impacto favorável/desfavorável"

### 3. Leitura facilitada
- Linguagem simplificada (B1/B2), com menos jargão implícito.
- Padrão de nomenclatura mais consistente entre telas.
- Microcopy contextual em campos-chave (onboarding, upload, cenários, relatórios, documento).

## Validação manual recomendada

### Teclado
1. Pressione `Tab` na página inicial logada e valide o `skip link`.
2. Navegue até menu, filtros e botões sem usar mouse.
3. Abra e feche modal de cálculo com teclado (`Enter`, `Esc`, `Tab`).
4. Troque abas de resultado no detalhe de documento.

### Leitura e entendimento
1. Peça para um usuário não técnico abrir cada tela por 30s.
2. Pergunte:
   - Qual decisão essa tela ajuda a tomar?
   - Qual métrica é mais crítica aqui?
   - Qual ação ele tomaria em seguida?
3. Se houver dúvida recorrente, ajustar microcopy da tela correspondente.

### Contraste e dependência de cor
1. Conferir textos secundários em monitores de brilho baixo.
2. Verificar se o entendimento de alertas continua claro em escala de cinza.

## Limites atuais
- Ainda não existe auditoria automática de contraste por CI (ex.: axe/lighthouse gate).
- Alguns termos técnicos (ex.: effective rate, unsupported) permanecem por necessidade de domínio, mas agora sempre com contexto explicativo.

## Próximo passo recomendado
- Adicionar teste automatizado de acessibilidade por smoke (axe + Playwright) para as rotas principais:
  - `/dashboard`
  - `/documents/upload`
  - `/documents/[id]`
  - `/scenarios`
  - `/reports`
