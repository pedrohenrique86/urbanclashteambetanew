import { UnderConstruction } from "../components/ui/UnderConstruction";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";

export default function ReckoningPage() {
  return (
    <UnderConstruction 
      title="ACERTO DE CONTAS"
      icon={<ExclamationCircleIcon />}
      description="A lei das ruas em sua forma mais letal. Ajuste suas contas em duelos 1x1 implacáveis, onde a justiça é decidida no asfalto e cada dívida é cobrada com juros."
    />
  );
}