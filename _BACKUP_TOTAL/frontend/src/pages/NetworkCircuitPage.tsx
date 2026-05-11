import { UnderConstruction } from "../components/ui/UnderConstruction";
import { CpuChipIcon } from "@heroicons/react/24/outline";

export default function NetworkCircuitPage() {
  return (
    <UnderConstruction 
      title="CIRCUITO DA REDE"
      icon={<CpuChipIcon />}
      description="Participe dos sorteios automatizados e teste sua sorte nos algoritmos de recompensa da rede. Prêmios exclusivos e eventos aleatórios aguardam no circuito."
    />
  );
}
