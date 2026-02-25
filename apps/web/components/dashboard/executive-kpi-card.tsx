import { ArrowDownRight, ArrowUpRight, HelpCircle, Minus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface VariationData {
  label: string;
  value: number | null;
  asPercent?: boolean;
  positiveIsGood?: boolean;
}

interface ExecutiveKpiCardProps {
  title: string;
  value: string;
  whatIsIt: string;
  whyItMatters: string;
  action: string;
  tooltipExample: string;
  mom: VariationData;
  yoy: VariationData;
}

function buildVariationText(data: VariationData) {
  if (data.value === null || !Number.isFinite(data.value)) {
    return {
      directionLabel: "Sem base comparativa",
      impactLabel: "Aguardando histórico mínimo para interpretar tendência."
    };
  }

  const isUp = data.value > 0;
  const isDown = data.value < 0;
  const positiveIsGood = data.positiveIsGood ?? false;

  if (!isUp && !isDown) {
    return {
      directionLabel: "Estável",
      impactLabel: "Sem variação material no período comparado."
    };
  }

  const favorable = isUp ? positiveIsGood : !positiveIsGood;

  return {
    directionLabel: isUp ? "Subiu" : "Caiu",
    impactLabel: favorable ? "Impacto favorável no negócio." : "Impacto desfavorável no negócio."
  };
}

function renderVariation(data: VariationData) {
  if (data.value === null || !Number.isFinite(data.value)) {
    return (
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {data.label}: sem base comparativa
      </p>
    );
  }

  const isUp = data.value > 0;
  const isDown = data.value < 0;
  const positiveIsGood = data.positiveIsGood ?? false;
  const tone = isUp
    ? positiveIsGood
      ? "text-emerald-700"
      : "text-destructive"
    : isDown
      ? positiveIsGood
        ? "text-destructive"
        : "text-emerald-700"
      : "text-muted-foreground";

  const sign = data.value > 0 ? "+" : "";
  const formatted = data.asPercent ? `${sign}${data.value.toFixed(1)}%` : `${sign}${data.value.toFixed(2)}`;
  const Icon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;

  const { directionLabel, impactLabel } = buildVariationText(data);

  return (
    <div className="space-y-0.5 text-xs" aria-label={`${data.label}: ${formatted}. ${directionLabel}. ${impactLabel}`}>
      <p className={cn("flex items-center gap-1", tone)}>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        <span>
          {data.label}: {formatted} ({directionLabel})
        </span>
      </p>
      <p className="text-muted-foreground">{impactLabel}</p>
    </div>
  );
}

export function ExecutiveKpiCard({ title, value, whatIsIt, whyItMatters, action, tooltipExample, mom, yoy }: ExecutiveKpiCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2">
          {title}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label={`Exemplo de impacto para ${title}`}
              >
                <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="max-w-xs border border-border bg-popover text-sm leading-relaxed" align="start" role="note">
              <p className="font-medium">Exemplo de impacto</p>
              <p className="mt-1 text-muted-foreground">{tooltipExample}</p>
            </PopoverContent>
          </Popover>
        </CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">O que é:</span> {whatIsIt}
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Por que importa:</span> {whyItMatters}
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Ação sugerida:</span> {action}
        </p>
        {renderVariation(mom)}
        {renderVariation(yoy)}
      </CardContent>
    </Card>
  );
}
