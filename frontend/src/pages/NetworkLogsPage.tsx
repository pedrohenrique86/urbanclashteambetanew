import { UnderConstruction } from "../components/ui/UnderConstruction";
import { ClipboardDocumentListIcon } from "@heroicons/react/24/outline";

export default function NetworkLogsPage() {
  return (
    <UnderConstruction 
      title="REGISTROS DA REDE"
      icon={<ClipboardDocumentListIcon />}
      description="Os logs estritos do sistema incluindo transferências, auditoria e atividades da rede. Histórico detalhado chegará em breve."
    />
  );
}
