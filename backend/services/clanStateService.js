const { query } = require("../config/database");
const sseService = require("./sseService");

/**
 * Atualiza a pontuação de um clã e emite um evento SSE.
 *
 * @param {string} clanId - O ID do clã.
 * @param {number} pointsToAdd - O número de pontos a serem adicionados (pode ser negativo).
 * @returns {Promise<object|null>} O novo estado do clã após a atualização.
 */
async function updateClanScore(clanId, pointsToAdd) {
  if (pointsToAdd === 0) {
    return null;
  }

  try {
    const result = await query(
      `
      UPDATE clans
      SET points = points + $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, points, faction
    `,
      [pointsToAdd, clanId],
    );

    if (result.rows.length > 0) {
      const updatedClan = result.rows[0];

      sseService.publish("ranking", "ranking:clan-score:update", {
        clanId: updatedClan.id,
        score: parseInt(updatedClan.points, 10),
        faction: updatedClan.faction,
      });

      return updatedClan;
    }

    return null;
  } catch (error) {
    console.error(
      `❌ Erro ao atualizar pontuação do clã ${clanId}:`,
      error,
    );
    return null;
  }
}

module.exports = {
  updateClanScore,
};