const express = require('express');
const router = express.Router();

/**
 * @swagger
 * /api/time:
 *   get:
 *     summary: Retorna a hora atual do servidor
 *     description: Endpoint para obter a hora exata do servidor, útil para sincronizar clientes.
 *     tags: [Time]
 *     responses:
 *       200:
 *         description: A hora atual do servidor.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 serverTime:
 *                   type: string
 *                   format: date-time
 *                   example: "2023-10-27T10:30:00.000Z"
 */
router.get('/', (req, res) => {
  res.json({ serverTime: new Date().toISOString() });
});

module.exports = router;