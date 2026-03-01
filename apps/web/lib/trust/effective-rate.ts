const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export function formatPercent(rate: number): string {
  return `${percentFormatter.format(rate * 100)}%`;
}

export function buildEffectiveRateMessage(effectiveRate: number, baseValue: number) {
  const estimatedTax = baseValue * effectiveRate;

  return {
    estimatedTax,
    message: `Effective rate = tributo final estimado / base tributável. Exemplo: ${formatPercent(effectiveRate)} sobre ${formatCurrency(
      baseValue
    )} equivale a ${formatCurrency(estimatedTax)} de carga estimada.`
  };
}
