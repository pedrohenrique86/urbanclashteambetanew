import { UnderConstruction } from "../components/ui/UnderConstruction";
import { UserGroupIcon } from "@heroicons/react/24/outline";

export default function SocialZonePage() {
  return (
    <UnderConstruction 
      title="ZONA SOCIAL"
      icon={<UserGroupIcon />}
      description="Espaços de interação neutra estão sendo preparados para permitir a convivência e negociação entre facções rivais."
    />
  );
}