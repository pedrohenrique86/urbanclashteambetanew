import { UnderConstruction } from "../components/ui/UnderConstruction";
import { AcademicCapIcon } from "@heroicons/react/24/outline";

export default function TrainingPage() {
  return (
    <UnderConstruction 
      title="CENTRO DE TREINAMENTO"
      icon={<AcademicCapIcon />}
      description="Circuitos de treinamento tático e simulações de combate avançado estão sendo configurados para elevar suas capacidades físicas e mentais."
    />
  );
}