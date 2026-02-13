# Fase 2 - Upload Guiado e Validacao de XML

## Objetivo

Melhorar a experiencia de onboarding no upload de NF-e e tornar as mensagens de erro compreensiveis para time financeiro/fiscal.

## Entregas

1. Fluxo guiado no frontend (`/documents/upload`)
- Passo a passo visivel para upload.
- Dicas de validacao antes do envio.
- Feedback de arquivo selecionado (nome/tamanho).

2. Validacao de arquivo antes do processamento
- Extensao obrigatoria `.xml`.
- MIME type de XML.
- arquivo vazio bloqueado.
- limite de tamanho configurado (`2MB`).

3. Parser NF-e com erros amigaveis
- `NfeValidationError` com `userMessage` + `details`.
- Mensagens para:
  - XML malformado
  - falta de `infNFe`
  - ausencia de itens
  - data de emissao invalida
  - falha de schema dos campos principais

4. API de upload com retorno estruturado
- resposta de erro no formato:
  - `error`: mensagem principal
  - `details`: lista de orientacoes

## Arquivos principais

- `apps/web/components/documents/upload-form.tsx`
- `apps/web/app/documents/upload/page.tsx`
- `apps/web/app/api/documents/upload/route.ts`
- `apps/web/lib/xml/nfe-parser.ts`
- `apps/web/lib/xml/constants.ts`

## Testes

- `apps/web/test/nfe-parser.test.ts`
  - parsing valido
  - xml malformado
  - missing infNFe
  - data de emissao invalida

## Observabilidade minima

- `console.warn` estruturado para erros de validacao de NF-e no upload.
- Telemetria de sucesso de upload continua ativa (`DOCUMENT_UPLOADED`).

