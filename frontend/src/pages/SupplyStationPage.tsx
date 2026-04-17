import { UnderConstruction } from "../components/ui/UnderConstruction";
import { TruckIcon } from "@heroicons/react/24/outline";

export default function SupplyStationPage() {
  return (
    <UnderConstruction 
      title="ESTAÇÃO DE SUPRIMENTOS"
      icon={<TruckIcon />}
      description="Cargas de suprimentos críticos e equipamentos táticos estão sendo escoltados para os pontos de extração mais seguros da cidade."
    />
  );
}