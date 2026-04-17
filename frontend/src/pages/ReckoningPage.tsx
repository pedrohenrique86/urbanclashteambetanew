import { UnderConstruction } from "../components/ui/UnderConstruction";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";

export default function ReckoningPage() {
  return (
    <UnderConstruction 
      title="ACERTO DE CONTAS"
      icon={<ExclamationCircleIcon />}
      description="O sistema de justiça das ruas está sendo calibrado para garantir que cada ação tenha sua consequência e toda dívida seja paga."
    />
  );
}