const { query } = require("../config/database");

const FACTION_ALIAS_MAP = {
  gangsters: "renegados",
  gangster: "renegados",
  renegados: "renegados",
  renegado: "renegados",
  guardas: "guardioes",
  guarda: "guardioes",
  guardioes: "guardioes",
  guardiao: "guardioes",
  "guardiões": "guardioes",
  "guardião": "guardioes",
};

/**
 * Converte qualquer valor de facção (legado ou novo) para o nome canônico
 * e retorna { canonicalName, factionId } consultando a tabela factions.
 */
async function resolveFaction(factionInput, clientOrQuery) {
  if (!factionInput) {
    throw new Error("Facção não fornecida.");
  }
  
  const canonical = FACTION_ALIAS_MAP[String(factionInput).toLowerCase().trim()];
  if (!canonical) {
    throw new Error(`Facção inválida: "${factionInput}". Use: renegados ou guardioes.`);
  }

  const fn = clientOrQuery?.query ? (sql, p) => clientOrQuery.query(sql, p) : query;
  const result = await fn("SELECT id FROM factions WHERE name = ?", [canonical]);

  if (result.rows.length === 0) {
    throw new Error(`Facção "${canonical}" não encontrada na tabela factions. Verifique as migrations.`);
  }

  return { canonicalName: canonical, factionId: result.rows[0].id };
}

module.exports = { FACTION_ALIAS_MAP, resolveFaction };
