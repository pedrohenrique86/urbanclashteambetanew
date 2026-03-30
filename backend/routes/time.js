const express = require('express');
const router = express.Router();
const { getGameState, sseGameStateEmitter } = require('../services/gameStateService');

/**
 * SSE para atualizações em tempo real do estado do jogo e cronômetro.
 * Permite que o frontend reaja instantaneamente a mudanças sem refresh.
 */
router.get('/updates', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  res.flushHeaders();

  const sendState = (state) => {
    res.write(`data: ${JSON.stringify(state)}\n\n`);
  };

  // Envia o estado atual imediatamente na conexão
  getGameState().then(sendState).catch(() => {});

  sseGameStateEmitter.on('gameStateChanged', sendState);

  req.on('close', () => {
    sseGameStateEmitter.removeListener('gameStateChanged', sendState);
  });
});

/**
 * @swagger
 * /api/time:
 *   get:
 *     summary: Retorna a hora atual do servidor e estado do jogo
 *     description: Endpoint leve para sincronização de tempo e estado do jogo.
 *                  Usa Redis como cache - não consulta o banco repetidamente.
 *     tags: [Time]
 *     responses:
 *       200:
 *         description: Hora do servidor e estado atual do jogo.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 serverTime:
 *                   type: string
 *                   format: date-time
 *                 gameState:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [stopped, scheduled, running, paused, finished]
 *                     isActive:
 *                       type: boolean
 *                     startTime:
 *                       type: string
 *                       format: date-time
 *                     endTime:
 *                       type: string
 *                       format: date-time
 *                     duration:
 *                       type: number
 *                     remainingTime:
 *                       type: number
 */
router.get('/', async (req, res) => {
  try {
    const gameState = await getGameState();
    
    res.json({
      serverTime: gameState.serverTime,
      gameState: {
        status: gameState.status,
        isActive: gameState.isActive,
        isPaused: gameState.isPaused,
        startTime: gameState.startTime,
        endTime: gameState.endTime,
        duration: gameState.duration,
        remainingTime: gameState.remainingTime
      }
    });
  } catch (error) {
    console.error('❌ Erro no endpoint /time:', error);
    res.json({ 
      serverTime: new Date().toISOString(),
      gameState: null,
      error: 'Erro ao obter estado do jogo'
    });
  }
});

module.exports = router;
