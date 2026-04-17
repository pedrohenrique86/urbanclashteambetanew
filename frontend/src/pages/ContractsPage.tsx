import { UnderConstruction } from "../components/ui/UnderConstruction";
import { DocumentTextIcon } from "@heroicons/react/24/outline";

export default function ContractsPage() {
  return (
    <UnderConstruction 
      title="SISTEMA DE CONTRATOS"
      icon={<DocumentTextIcon />}
      description="Contratos de alto risco e missões clandestinas estão sendo processados pela rede para distribuição estratégica entre as facções."
    />
  );
}