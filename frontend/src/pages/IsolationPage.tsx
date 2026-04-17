import { UnderConstruction } from "../components/ui/UnderConstruction";
import { LockClosedIcon } from "@heroicons/react/24/outline";

export default function IsolationPage() {
  return (
    <UnderConstruction 
      title="SETOR DE ISOLAMENTO"
      icon={<LockClosedIcon />}
      description="Protocolos de contenção e segurança máxima estão sendo implementados nos setores de isolamento para processar detentos de alto valor."
    />
  );
}