export function getDisplayName(term: string): string {
  if (!term) return term;

  const normalized = term.toLowerCase().trim();

  const map: Record<string, string> = {
    // Singular
    "guarda": "Guardião",
    "gangster": "Renegado",
    "clã": "Divisão",
    "clan": "Divisão",

    // Plural
    "guardas": "Guardiões",
    "gangsters": "Renegados",
    "guardioes": "Guardiões",
    "renegados": "Renegados",
    "clãs": "Divisões",
    "clans": "Divisões",
  };

  const result = map[normalized];

  if (!result) return term;

  // Mantém primeira letra maiúscula se vier assim
  if (term[0] === term[0]?.toUpperCase()) {
    return result;
  }

  return result.toLowerCase();
}