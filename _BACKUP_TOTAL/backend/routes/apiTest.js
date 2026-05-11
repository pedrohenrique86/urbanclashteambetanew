const express = require('express');
const router = express.Router();
const playerStateService = require('../../services/playerStateService');
const trainingService = require('../../services/trainingService');

router.get('/run-queue', async (req, res) => {
  const readyUserIds = await playerStateService._zrangeByScoreAsync?.(playerStateService.TRAINING_QUEUE_KEY, 0, Date.now()) || [];
  res.json({ message: "Test run", readyUserIds });
});

module.exports = router;
