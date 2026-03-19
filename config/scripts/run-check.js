const { execSync } = require("child_process");

try {
  console.log("🔍 Rodando ESLint...");
  execSync("npx eslint . --fix", { stdio: "inherit" });

  console.log("✅ Código corrigido automaticamente");
} catch (err) {
  console.error("❌ Erro detectado no código");
}