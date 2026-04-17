import { UnderConstruction } from "../components/ui/UnderConstruction";
import { ShoppingBagIcon } from "@heroicons/react/24/outline";

export default function RestrictedStorePage() {
  return (
    <UnderConstruction 
      title="LOJA RESTRITA"
      icon={<ShoppingBagIcon />}
      description="O mercado negro está organizando seus estoques de itens raros e equipamentos experimentais para os membros mais influentes."
    />
  );
}