import { UnderConstruction } from "../components/ui/UnderConstruction";
import { TruckIcon } from "@heroicons/react/24/outline";

export default function SupplyStationPage() {
  return (
    <UnderConstruction 
      title="ESTAÇÃO DE SUPRIMENTOS"
      icon={<TruckIcon />}
      description="O ponto de parada essencial para qualquer combatente. Recupere sua vitalidade com rações táticas e bebidas energéticas, revigorando sua saúde para os próximos confrontos nas ruas."
    />
  );
}