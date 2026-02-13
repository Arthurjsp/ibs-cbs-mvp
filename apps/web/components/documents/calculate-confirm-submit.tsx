"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  formId: string;
  scenarioSelectId: string;
}

export function CalculateConfirmSubmit({ formId, scenarioSelectId }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [scenarioLabel, setScenarioLabel] = useState("Sem cenário (baseline)");

  function handleOpen() {
    const select = document.getElementById(scenarioSelectId) as HTMLSelectElement | null;
    const selectedText = select?.options[select.selectedIndex]?.text ?? "Sem cenário (baseline)";
    setScenarioLabel(selectedText);
    setConfirmed(false);
    setOpen(true);
  }

  function handleConfirmAndSubmit() {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    setOpen(false);
    form.requestSubmit();
  }

  return (
    <>
      <Button type="button" onClick={handleOpen}>
        Calcular
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-xl border bg-card p-5 shadow-sm">
            <p className="text-lg font-semibold">Confirmar simulação</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Você está prestes a executar um cálculo estimado IBS/CBS. Este fluxo é para planejamento gerencial e não
              substitui apuração oficial.
            </p>
            <div className="mt-4 rounded-md border bg-muted/50 p-3 text-sm">
              <p>
                Cenário selecionado: <span className="font-medium">{scenarioLabel}</span>
              </p>
              <p className="mt-1">A trilha de auditoria será registrada no resultado.</p>
            </div>
            <label className="mt-4 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              <span>Entendo que este resultado é uma estimativa e não uma apuração fiscal oficial.</span>
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" disabled={!confirmed} onClick={handleConfirmAndSubmit}>
                Confirmar e calcular
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

