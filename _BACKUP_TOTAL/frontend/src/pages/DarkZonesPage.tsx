import { UnderConstruction } from "../components/ui/UnderConstruction";
import { MoonIcon } from "@heroicons/react/24/outline";

export default function DarkZonesPage() {
  return (
    <UnderConstruction 
      title="ZONAS ESCURAS"
      icon={<MoonIcon />}
      description="Territórios de fronteira onde a lei não alcança. Dispute o controle das Zonas Escuras com sua divisão para desbloquear benefícios econômicos e táticos durante o período de ocupação."
    />
  );
}