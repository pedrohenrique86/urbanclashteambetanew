import { UnderConstruction } from "../components/ui/UnderConstruction";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { useUserProfileContext } from "../contexts/UserProfileContext";
import { FACTION_ALIAS_MAP_FRONTEND } from "../utils/faction";

export default function ContractsPage() {
  const { userProfile } = useUserProfileContext();
  
  const rawFaction = userProfile?.faction as any;
  const factionName = typeof rawFaction === 'string' ? rawFaction : (rawFaction?.name || 'gangsters');
  const canonicalFaction = FACTION_ALIAS_MAP_FRONTEND[factionName.toLowerCase().trim()] || 'gangsters';
  
  const description = canonicalFaction === 'gangsters'
    ? "O pulo do gato do submundo. Aceite contratos de roubo com baixa chance de interceptação. Caso o risco ative, prepare-se para enfrentar Jogadores Reais (Guardiões) ou Inteligência Artificial da lei (Patrulhas, Agentes Táticos ou Bloqueios Policiais)."
    : "Vigilância ativa nos distritos. Aceite contratos de contenção com baixa chance de detecção. Se o risco escalar, você interceptará Jogadores Reais (Renegados) ou Inteligência Artificial criminosa (Contrabandistas, Células Criminosas ou Operadores Clandestinos).";

  return (
    <UnderConstruction 
      title="SISTEMA DE CONTRATOS"
      icon={<DocumentTextIcon />}
      description={description}
    />
  );
}