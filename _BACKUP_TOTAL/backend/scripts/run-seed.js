require("dotenv").config();

const { spawnSync } = require("child_process");
const path = require("path");

const target = process.argv[2];

if (!target || !["dev", "prod"].includes(target)) {
  console.error("Uso: node scripts/run-seed.js <dev|prod>");
  process.exit(1);
}

const envVarName = target === "dev" ? "DATABASE_URL_DEV" : "DATABASE_URL_PROD";
const databaseUrl = process.env[envVarName];

if (!databaseUrl) {
  console.error(`A variável ${envVarName} não está definida no arquivo .env`);
  process.exit(1);
}

const seedPath = path.resolve(__dirname, "seed_database.js");

console.log(`\n🌱 Rodando seed no ambiente: ${target.toUpperCase()}\n`);

const result = spawnSync(
  process.execPath,
  [seedPath],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  }
);

if (result.error) {
  console.error("Erro ao executar seed:", result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  console.error(`Seed falhou com exit code ${result.status}`);
  process.exit(result.status || 1);
}

console.log(`\n✅ Seed concluída com sucesso em ${target.toUpperCase()}\n`);

process.exit(0);