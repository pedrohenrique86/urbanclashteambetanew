const { execSync } = require("child_process");

function run(command, name) {
  try {
    console.log(`🔍 ${name}...`);
    execSync(command, { stdio: "inherit" });
  } catch (e) {
    console.error(`❌ Falha em: ${name}`);
    process.exit(1);
  }
}

// valida tudo
run("npm run lint", "ESLint");
run("tsc --noEmit", "TypeScript");

// você pode adicionar mais checks aqui
console.log("✅ Tudo validado com sucesso");