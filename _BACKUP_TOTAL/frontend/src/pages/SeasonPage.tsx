import { UnderConstruction } from "../components/ui/UnderConstruction";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";

export default function SeasonPage() {
  return (
    <UnderConstruction 
      title="TEMPORADA"
      icon={<CalendarDaysIcon />}
      description="Visão geral e progresso das temporadas vigentes do UrbanClash. Acompanhe os encerramentos, eventos pontuais e recompensas aqui."
    />
  );
}
