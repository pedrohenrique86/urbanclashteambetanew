import { UnderConstruction } from "../components/ui/UnderConstruction";
import { MoonIcon } from "@heroicons/react/24/outline";

export default function DarkZonesPage() {
  return (
    <UnderConstruction 
      title="ZONAS ESCURAS"
      icon={<MoonIcon />}
      description="Zonas de baixa vigilância e alta periculosidade estão sendo mapeadas para futuras incursões táticas e extração de recursos."
    />
  );
}