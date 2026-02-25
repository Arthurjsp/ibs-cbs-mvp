# Fase 2 - Upload Guiado e Validação de XML

## Objetivo

Melhorar a experiência de onboarding no upload de NF-e e tornar as mensagens de erro compreensíveis para time financeiro/fiscal.

## Entregas

1. Fluxo guiado no frontend (`/documents/upload`)
- Passo a passo visível para upload.
- Dicas de validação antes do envio.
- Feedback de arquivo selecionado (nome/tamanho).

2. Validação de arquivo antes do processamento
- Extensão obrigatória `.xml`.
- MIME type de XML.
- arquivo vazio bloqueado.
- limite de tamanho configurado (`2MB`).

3. Parser NF-e com erros amigaveis
- `NfeValidationError` com `userMessage` + `details`.
- Mensagens para:
  - XML malformado
  - falta de `infNFe`
  - ausencia de itens
  - data de emissão invalida
  - falha de schema dos campos principais

4. API de upload com retorno estruturado
- resposta de erro no formato:
  - `error`: mensagem principal
  - `details`: lista de orientações

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
  - data de emissão invalida

## Observabilidade mínima

- `console.warn` estruturado para erros de validação de NF-e no upload.
- Telemetria de sucesso de upload continua ativa (`DOCUMENT_UPLOADED`).
