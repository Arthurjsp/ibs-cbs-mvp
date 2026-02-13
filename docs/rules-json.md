# Especificação JSON de Regras (MVP)

## whenJson

Formato base:

```json
{
  "op": "in",
  "field": "category",
  "value": ["REDUZIDA"]
}
```

Operadores:

- `eq`, `ne`, `in`, `notIn`, `gt`, `gte`, `lt`, `lte`
- `and`, `or` com `conditions` (array de condições)

Exemplo composto:

```json
{
  "op": "and",
  "conditions": [
    { "op": "eq", "field": "emitterUf", "value": "SP" },
    { "op": "in", "field": "category", "value": ["REDUZIDA", "ISENTA"] }
  ]
}
```

## thenJson

```json
{
  "ibsRate": 0.17,
  "cbsRate": 0.09,
  "creditEligible": true,
  "notes": "Regra padrão"
}
```

## Convenção de prioridade

- O motor ordena regras por `priority` de maior para menor.
- A regra posterior pode sobrescrever os efeitos aplicados anteriormente.
- No seed default: prioridade alta para regra geral e menor para regras específicas (reduzida/isenta), permitindo override específico.

