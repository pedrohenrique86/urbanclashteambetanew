import { UnderConstruction } from "../components/ui/UnderConstruction";
import { UserIcon } from "@heroicons/react/24/outline";

export default function ProfilePage() {
  return (
    <UnderConstruction 
      title="PERFIL DO CIDADÃO"
      icon={<UserIcon />}
      description="O dossiê completo da sua ficha criminal e registros de autoridade está sendo compilado pelos sistemas de inteligência da cidade."
    />
  );
}
