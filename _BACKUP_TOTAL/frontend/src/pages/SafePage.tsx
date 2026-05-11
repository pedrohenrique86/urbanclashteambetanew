import { UnderConstruction } from "../components/ui/UnderConstruction";
import { FolderIcon } from "@heroicons/react/24/outline";

export default function SafePage() {
  return (
    <UnderConstruction 
      title="COFRE SEGURO"
      icon={<FolderIcon />}
      description="Sistemas de armazenamento seguro e cofres blindados estão sendo instalados para proteger seus ativos mais valiosos contra invasões."
    />
  );
}