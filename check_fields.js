const { query } = require('./backend/config/database');
const DB_PERSIST_FIELDS = new Set([
  "total_xp", "level",
  "attack", "defense", "focus", "luck",
  "critical_chance", "critical_damage",
  "intimidation", "discipline",
  "money",
  "victories", "defeats", "winning_streak",
  "status", "status_ends_at",
  "recovery_ends_at", "shield_ends_at", 
  "training_ends_at", "daily_training_count", "last_training_reset", "active_training_type",
  "energy", "action_points", "last_ap_reset",
  "energy_updated_at", "toxicity"
]);

async function check() {
  const result = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'user_profiles'");
  const cols = new Set(result.rows.map(r => r.column_name));
  
  const missing = [];
  for (const field of DB_PERSIST_FIELDS) {
    if (!cols.has(field)) {
      missing.push(field);
    }
  }
  
  console.log("MISSING FIELDS:", missing);
  process.exit(0);
}
check();
