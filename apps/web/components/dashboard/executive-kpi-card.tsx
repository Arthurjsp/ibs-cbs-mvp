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
  meaning: string;
  tooltipExample: string;
  mom: VariationData;
  yoy: VariationData;
}

function renderVariation(data: VariationData) {
  if (data.value === null || !Number.isFinite(data.value)) {
    return (
      <p className="text-xs text-muted-foreground">
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

  return (
    <p className={cn("flex items-center gap-1 text-xs", tone)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>
        {data.label}: {formatted}
      </span>
    </p>
  );
}

export function ExecutiveKpiCard({ title, value, meaning, tooltipExample, mom, yoy }: ExecutiveKpiCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2">
          {title}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none"
                aria-label={`Detalhes de ${title}`}
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="max-w-xs text-sm leading-relaxed" align="start">
              <p className="font-medium">Exemplo de impacto</p>
              <p className="mt-1 text-muted-foreground">{tooltipExample}</p>
            </PopoverContent>
          </Popover>
        </CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">{meaning}</p>
        {renderVariation(mom)}
        {renderVariation(yoy)}
      </CardContent>
    </Card>
  );
}
