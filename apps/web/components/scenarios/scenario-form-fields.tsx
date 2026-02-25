"use client";

import { useMemo, useState } from "react";
import { FieldHelp } from "@/components/ui/field-help";
import { Input } from "@/components/ui/input";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function parseNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function ScenarioFormFields() {
  const [transitionFactor, setTransitionFactor] = useState("1");
  const [passThroughPercent, setPassThroughPercent] = useState("0");

  const transitionFactorNumber = useMemo(() => clamp(parseNumber(transitionFactor, 1), 0, 1), [transitionFactor]);
  const passThroughNumber = useMemo(() => clamp(parseNumber(passThroughPercent, 0), 0, 100), [passThroughPercent]);
  const legacyShareNumber = 1 - transitionFactorNumber;

  return (
    <>
      <div className="space-y-2 md:col-span-3">
        <FieldHelp
          htmlFor="name"
          label="Nome"
          tooltip="Nome interno do cenario para voce identificar simulacoes (ex.: 'Transicao 30% + repasse 50%')."
          microcopy="Dica: use um padrao como 'Ano/Transicao + Repasse'."
          microcopyId="name-help"
          iconAriaLabel="Ajuda sobre o campo Nome"
        />
        <Input id="name" name="name" aria-describedby="name-help" required />
      </div>

      <div className="space-y-2">
        <FieldHelp
          htmlFor="transitionFactor"
          label="Transition factor (0-1)"
          tooltip="Percentual da transicao para o novo regime (IBS/CBS). 0 = 100% regime atual (ICMS/ISS). 1 = 100% IBS/CBS. Valores intermediarios simulam a fase de transicao."
          microcopy="Ex.: 0.3 = 30% IBS/CBS e 70% ICMS/ISS."
          microcopyId="transition-factor-help"
          iconAriaLabel="Ajuda sobre o campo Transition factor"
        />
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={transitionFactorNumber}
          onChange={(event) => setTransitionFactor(event.target.value)}
          className="h-2 w-full cursor-pointer accent-primary"
          aria-label="Controle deslizante de transicao"
          aria-describedby="transition-factor-help transition-factor-live"
        />
        <p id="transition-factor-live" className="text-xs text-muted-foreground" aria-live="polite">
          Valor atual: {(transitionFactorNumber * 100).toFixed(0)}% IBS/CBS e {(legacyShareNumber * 100).toFixed(0)}% legado.
        </p>
        <Input
          id="transitionFactor"
          name="transitionFactor"
          type="number"
          step="0.01"
          min="0"
          max="1"
          value={transitionFactor}
          onChange={(event) => setTransitionFactor(event.target.value)}
          aria-describedby="transition-factor-help transition-factor-live"
          required
        />
      </div>

      <div className="space-y-2">
        <FieldHelp
          htmlFor="pricePassThroughPercent"
          label="Repasse (%)"
          tooltip="Percentual do impacto tributario que sera repassado ao preco. 0% = empresa absorve tudo. 100% = repasse total ao cliente."
          microcopy="Ex.: 50% = metade do impacto vai para o preco."
          microcopyId="repasse-help"
          iconAriaLabel="Ajuda sobre o campo Repasse"
        />
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={passThroughNumber}
          onChange={(event) => setPassThroughPercent(event.target.value)}
          className="h-2 w-full cursor-pointer accent-primary"
          aria-label="Controle deslizante de repasse"
          aria-describedby="repasse-help repasse-live"
        />
        <p id="repasse-live" className="text-xs text-muted-foreground" aria-live="polite">
          Valor atual: {passThroughNumber.toFixed(0)}% de repasse do impacto tributario.
        </p>
        <Input
          id="pricePassThroughPercent"
          name="pricePassThroughPercent"
          type="number"
          step="1"
          min="0"
          max="100"
          value={passThroughPercent}
          onChange={(event) => setPassThroughPercent(event.target.value)}
          aria-describedby="repasse-help repasse-live"
          required
        />
      </div>

      <div className="space-y-2">
        <FieldHelp
          htmlFor="overrideIbsRate"
          label="Override IBS (opcional)"
          tooltip="Forca uma aliquota de IBS diferente da regra padrao, apenas para simulacao."
          microcopy="Use numero decimal (ex.: 0.17 para 17%). Deixe vazio para usar a regra."
          microcopyId="override-ibs-help"
          iconAriaLabel="Ajuda sobre o campo Override IBS"
        />
        <Input
          id="overrideIbsRate"
          name="overrideIbsRate"
          type="number"
          step="0.0001"
          placeholder="0.17"
          aria-describedby="override-ibs-help"
        />
      </div>

      <div className="space-y-2">
        <FieldHelp
          htmlFor="overrideCbsRate"
          label="Override CBS (opcional)"
          tooltip="Forca uma aliquota de CBS diferente da regra padrao, apenas para simulacao."
          microcopy="Use numero decimal (ex.: 0.09 para 9%). Deixe vazio para usar a regra."
          microcopyId="override-cbs-help"
          iconAriaLabel="Ajuda sobre o campo Override CBS"
        />
        <Input
          id="overrideCbsRate"
          name="overrideCbsRate"
          type="number"
          step="0.0001"
          placeholder="0.09"
          aria-describedby="override-cbs-help"
        />
      </div>

      <div className="rounded-md border bg-muted/40 p-3 md:col-span-3">
        <p className="text-sm font-medium">Preview rapido do cenario</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Transicao configurada: {(transitionFactorNumber * 100).toFixed(0)}% IBS/CBS e {(legacyShareNumber * 100).toFixed(0)}%
          regime legado.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Repasse configurado: {passThroughNumber.toFixed(0)}% do impacto tributario para preco.
        </p>
      </div>
    </>
  );
}
