import { UnderConstruction } from "../components/ui/UnderConstruction";
import { UsersIcon } from "@heroicons/react/24/outline";

export default function SquadWarPage() {
  return (
    <UnderConstruction 
      title="GUERRA DE ESQUADRÃO"
      icon={<UsersIcon />}
      description="Coordenação estratégica e combate em larga escala entre esquadrões estão sendo simulados para garantir o domínio territorial."
    />
  );
}