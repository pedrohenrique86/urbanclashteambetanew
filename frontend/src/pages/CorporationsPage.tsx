import { UnderConstruction } from "../components/ui/UnderConstruction";
import { BuildingOfficeIcon } from "@heroicons/react/24/outline";

export default function CorporationsPage() {
  return (
    <UnderConstruction 
      title="CENTRO CORPORATIVO"
      icon={<BuildingOfficeIcon />}
      description="As megacorporações estão consolidando seus ativos e expandindo sua influência tecnológica sobre os setores da cidade."
    />
  );
}