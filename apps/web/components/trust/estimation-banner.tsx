import Link from "next/link";

export function EstimationBanner() {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
      <p className="font-medium">Estimativa para decisão gerencial.</p>
      <p className="mt-1">
        Este resultado não substitui apuração oficial.{" "}
        <Link href="/docs/engine" className="underline underline-offset-2">
          Ver documentação da engine
        </Link>
        .
      </p>
    </div>
  );
}

