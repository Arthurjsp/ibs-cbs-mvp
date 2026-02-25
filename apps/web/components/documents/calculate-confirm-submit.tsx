"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  formId: string;
  scenarioSelectId: string;
}

export function CalculateConfirmSubmit({ formId, scenarioSelectId }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [scenarioLabel, setScenarioLabel] = useState("Sem cenario (baseline)");

  const dialogTitleId = useId();
  const dialogDescriptionId = useId();
  const checkboxRef = useRef<HTMLInputElement | null>(null);

  function handleOpen() {
    const select = document.getElementById(scenarioSelectId) as HTMLSelectElement | null;
    const selectedText = select?.options[select.selectedIndex]?.text ?? "Sem cenario (baseline)";
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

  useEffect(() => {
    if (!open) return;

    const timeout = window.setTimeout(() => {
      checkboxRef.current?.focus();
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <Button type="button" onClick={handleOpen} aria-haspopup="dialog" aria-expanded={open}>
        Calcular
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
          <div className="absolute inset-0" onClick={() => setOpen(false)} aria-hidden="true" />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            aria-describedby={dialogDescriptionId}
            className="relative z-10 w-full max-w-xl rounded-xl border bg-card p-5 shadow-sm"
          >
            <p id={dialogTitleId} className="text-lg font-semibold">
              Confirmar simulacao
            </p>
            <p id={dialogDescriptionId} className="mt-2 text-sm text-muted-foreground">
              Voce esta prestes a executar um calculo estimado IBS/CBS/IS. Este fluxo e para planejamento gerencial e nao
              substitui apuracao oficial.
            </p>

            <div className="mt-4 rounded-md border bg-muted/50 p-3 text-sm">
              <p>
                Cenario selecionado: <span className="font-medium">{scenarioLabel}</span>
              </p>
              <p className="mt-1">A trilha de auditoria sera registrada no resultado.</p>
            </div>

            <label className="mt-4 flex items-start gap-2 text-sm">
              <input
                ref={checkboxRef}
                type="checkbox"
                className="mt-1"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              <span>Entendo que este resultado e uma estimativa e nao uma apuracao fiscal oficial.</span>
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
