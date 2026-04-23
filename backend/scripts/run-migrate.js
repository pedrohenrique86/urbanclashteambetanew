require("dotenv").config();

const { spawnSync } = require("child_process");
const path = require("path");

const target = process.argv[2];
const action = process.argv[3] || "up";

if (!target || !["dev", "prod"].includes(target)) {
  console.error("Uso: node scripts/run-migrate.js <dev|prod> [up|down]");
  process.exit(1);
}

if (!["up", "down"].includes(action)) {
  console.error("Ação inválida. Use 'up' ou 'down'.");
  process.exit(1);
}

const envVarName = target === "dev" ? "DATABASE_URL_DEV" : "DATABASE_URL_PROD";
let databaseUrl = process.env[envVarName];

// Fallback para DATABASE_URL (padrão do Render) se estiver em prod
if (!databaseUrl && target === "prod") {
  databaseUrl = process.env.DATABASE_URL;
}

if (!databaseUrl) {
  console.error(`A variável ${envVarName} (ou DATABASE_URL) não está definida.`);
  process.exit(1);
}

const cliPath = path.resolve(
  __dirname,
  "../node_modules/node-pg-migrate/bin/node-pg-migrate.js"
);

const result = spawnSync(
  process.execPath,
  [cliPath, action],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  }
);

if (result.error) {
  console.error("Erro ao executar migration:", result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);