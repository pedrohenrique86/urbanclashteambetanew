import { UnderConstruction } from "../components/ui/UnderConstruction";
import { HeartIcon } from "@heroicons/react/24/outline";

export default function RecoveryBasePage() {
  return (
    <UnderConstruction 
      title="BASE DE RECUPERAÇÃO"
      icon={<HeartIcon />}
      description="A infraestrutura médica de elite está sendo estabilizada para garantir que nenhum combatente fique fora de combate por muito tempo."
    />
  );
}