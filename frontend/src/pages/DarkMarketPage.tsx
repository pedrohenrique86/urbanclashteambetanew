import { UnderConstruction } from "../components/ui/UnderConstruction";
import { CurrencyDollarIcon } from "@heroicons/react/24/outline";

export default function DarkMarketPage() {
  return (
    <UnderConstruction 
      title="BOLSA SOMBRIA"
      icon={<CurrencyDollarIcon />}
      description="Mercado clandestino para negociações de alto risco. O sistema de leilão dinâmico e cotações será implementado em breve."
    />
  );
}
