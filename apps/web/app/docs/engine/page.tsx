import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function EngineDocsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Documentação da engine IBS/CBS</CardTitle>
          <CardDescription>Resumo prático para entender como o cálculo estimado funciona.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="font-medium">O que é:</span> motor de simulação tributária para apoio à decisão gerencial.
          </p>
          <p>
            <span className="font-medium">Por que importa:</span> ajuda a projetar impacto em carga e margem antes da operação real.
          </p>
          <p>
            <span className="font-medium">Como funciona:</span> regras versionadas em `TaxRuleSet`, aplicadas por prioridade com
            trilha de auditoria por item.
          </p>
          <p>- Campos de condição: UF emitente/destinatário, NCM, categoria, tipo de operação e valor do item.</p>
          <p>- Effective rate = (IBS + CBS + IS) / base total simulada no run.</p>
          <p>- Na transição, o sistema mostra cálculo legado ICMS/ISS ponderado por ano de emissão.</p>
          <p>- Limitações do legado v1: ISS placeholder (0) e cobertura simplificada para ST/DIFAL.</p>
          <p>- Não substitui apuração oficial nem obrigações acessórias.</p>
        </CardContent>
      </Card>
    </div>
  );
}
