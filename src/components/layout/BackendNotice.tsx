import { AlertTriangle } from "lucide-react";
import { isBackendConfigured } from "@/lib/data/client";

// "Só avisando" — quando não há gateway configurado (VITE_GATEWAY_URL vazio), o
// app não finge dados: mostra esta barra deixando claro que o login está em
// modo mock e que os dados não persistem até um backend ser conectado.
// Some sozinho assim que VITE_GATEWAY_URL é definido (isBackendConfigured=true).
export function BackendNotice() {
  if (isBackendConfigured) return null;

  return (
    <div className="flex items-start gap-2 border-b border-warning/30 bg-warning/10 px-3 py-2 text-xs text-foreground sm:px-6">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
      <p className="leading-snug">
        <span className="font-semibold text-warning">Backend não conectado.</span>{" "}
        O login está em modo mock (dados de demonstração: <code>admin@demo.local</code> /{" "}
        <code>demo1234</code>) e nenhum dado é salvo. Defina{" "}
        <code>VITE_GATEWAY_URL</code> para conectar o gateway real — veja{" "}
        <code>doc/FLUXO-DE-DADOS.md</code>.
      </p>
    </div>
  );
}
