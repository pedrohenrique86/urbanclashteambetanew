require('dotenv').config({ path: './backend/.env' });
const { query } = require('./backend/config/database');
const fs = require('fs');

async function getMetoData() {
  const tables = [
    'items', 'shop_items', 'player_inventory', 'badges',
    'daily_card_pools', 'card_rewards', 'raffles',
    'game_events', 'active_events', 'wallet_transactions'
  ];
  let out = "";

  try {
    for (const table of tables) {
      out += `\n\n[TABLE: ${table}]\n`;
      const { rows } = await query(`
        SELECT column_name, data_type, is_nullable, column_default 
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, [table]);
      
      out += rows.map(r => `${r.column_name}: ${r.data_type} (null: ${r.is_nullable}) [def: ${r.column_default}]`).join('\n') + '\n';

      const constraints = await query(`
        SELECT tc.constraint_type, tc.constraint_name, kcu.column_name,
               ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.table_name = $1;
      `, [table]);
      out += "Constraints:\n";
      out += constraints.rows.map(r => `${r.constraint_type} on ${r.column_name} -> ${r.foreign_table_name}.${r.foreign_column_name}`).join('\n') + '\n';
    }
    fs.writeFileSync('schema_utf8.txt', out, 'utf8');
  } catch (err) {
    console.error("Error retrieving schema:", err);
  } finally {
    process.exit(0);
  }
}

getMetoData();
