import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function EngineDocsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Documentacao da engine IBS/CBS</CardTitle>
          <CardDescription>Resumo pratico para entender como o calculo estimado funciona.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="font-medium">O que e:</span> motor de simulacao tributaria para apoio a decisao gerencial.
          </p>
          <p>
            <span className="font-medium">Por que importa:</span> ajuda a projetar impacto em carga e margem antes da operacao real.
          </p>
          <p>
            <span className="font-medium">Como funciona:</span> regras versionadas em `TaxRuleSet`, aplicadas por prioridade com
            trilha de auditoria por item.
          </p>
          <p>- Campos de condicao: UF emitente/destinatario, NCM, categoria, tipo de operacao e valor do item.</p>
          <p>- Effective rate = (IBS + CBS + IS) / base total simulada no run.</p>
          <p>- Na transicao, o sistema mostra calculo legado ICMS/ISS ponderado por ano de emissao.</p>
          <p>- Limitacoes do legado v1: ISS placeholder (0) e cobertura simplificada para ST/DIFAL.</p>
          <p>- Nao substitui apuracao oficial nem obrigacoes acessorias.</p>
        </CardContent>
      </Card>
    </div>
  );
}
