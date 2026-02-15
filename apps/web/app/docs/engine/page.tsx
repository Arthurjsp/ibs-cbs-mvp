import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function EngineDocsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Documentação da Engine IBS/CBS</CardTitle>
          <CardDescription>Resumo funcional para entendimento do cálculo estimado no produto.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>- O cálculo é estimativo e orientado à simulação estratégica.</p>
          <p>- O objetivo central do produto é reduzir incerteza operacional e risco financeiro na transição.</p>
          <p>- Regras são versionadas em `TaxRuleSet` e aplicadas por prioridade.</p>
          <p>- Cada item recebe trilha de auditoria com regras avaliadas e efeitos aplicados.</p>
          <p>- Campos de condição suportados: UF emitente/destinatário, NCM, categoria, tipo de operação e valor item.</p>
          <p>- Effective rate = (IBS + CBS) / base total simulada no run.</p>
          <p>- Em fase de transição, o produto também exibe cálculo legado ICMS/ISS ponderado por ano de emissão.</p>
          <p>- Limitações do legado v1: ISS placeholder (0), sem ST/MVA/DIFAL oficial.</p>
          <p>- Não é apuração oficial nem substitui obrigações acessórias; é um sistema de apoio à decisão.</p>
        </CardContent>
      </Card>
    </div>
  );
}
