import { UnderConstruction } from "../components/ui/UnderConstruction";
import { ShoppingBagIcon } from "@heroicons/react/24/outline";

export default function RestrictedStorePage() {
  return (
    <UnderConstruction 
      title="LOJA RESTRITA"
      icon={<ShoppingBagIcon />}
      description="Acesse o catálogo de elite do UrbanClash. Utilize suas moedas premium para adquirir equipamentos experimentais, vantagens táticas e benefícios exclusivos de alta influência."
    />
  );
}