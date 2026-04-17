import { UnderConstruction } from "../components/ui/UnderConstruction";
import { GlobeAltIcon } from "@heroicons/react/24/outline";

export default function ParallelNetworkPage() {
  return (
    <UnderConstruction 
      title="REDE PARALELA"
      icon={<GlobeAltIcon />}
      description="A infraestrutura da rede paralela está sendo descriptografada para permitir comunicações seguras e transferências de dados criptografados."
    />
  );
}