export function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2)}`;
}

export function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}

export function buildEffectiveRateMessage(effectiveRate: number, baseValue: number) {
  const estimatedTax = baseValue * effectiveRate;
  return {
    estimatedTax,
    message: `Effective rate = (IBS + CBS) / base tributável. Exemplo: ${formatPercent(effectiveRate)} sobre ${formatCurrency(
      baseValue
    )} equivale a ${formatCurrency(estimatedTax)} de carga estimada.`
  };
}

