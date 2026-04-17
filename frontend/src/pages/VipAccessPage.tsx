import { UnderConstruction } from "../components/ui/UnderConstruction";
import { StarIcon } from "@heroicons/react/24/outline";

export default function VipAccessPage() {
  return (
    <UnderConstruction 
      title="ACESSO VIP"
      icon={<StarIcon />}
      description="Benefícios exclusivos e acesso prioritário aos recursos da cidade estão sendo reservados para os membros da elite urbana."
    />
  );
}