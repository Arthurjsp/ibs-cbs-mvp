import { Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface VariationData {
  label: string;
  value: number;
  asPercent?: boolean;
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
  const sign = data.value > 0 ? "+" : "";
  const tone = data.value > 0 ? "text-destructive" : data.value < 0 ? "text-emerald-700" : "text-muted-foreground";
  const formatted = data.asPercent ? `${sign}${data.value.toFixed(1)}%` : `${sign}${data.value.toFixed(2)}`;
  return (
    <p className={`text-xs ${tone}`}>
      {data.label}: {formatted}
    </p>
  );
}

export function ExecutiveKpiCard({ title, value, meaning, tooltipExample, mom, yoy }: ExecutiveKpiCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2">
          {title}
          <span className="inline-flex cursor-help text-muted-foreground" title={tooltipExample}>
            <Info className="h-3.5 w-3.5" />
          </span>
        </CardDescription>
        <CardTitle>{value}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-xs text-muted-foreground">{meaning}</p>
        {renderVariation(mom)}
        {renderVariation(yoy)}
      </CardContent>
    </Card>
  );
}

