const fs = require("fs");
const path = require("path");

// caminho do rules master
const RULES_PATH = path.join(__dirname, "../rules.master.md");

// carregar rules
function loadRules() {
  if (!fs.existsSync(RULES_PATH)) {
    throw new Error("rules.master.md não encontrado");
  }
  return fs.readFileSync(RULES_PATH, "utf-8");
}

// execução principal
async function runAI(prompt) {
  const rules = loadRules();

  const messages = [
    {
      role: "system",
      content: rules
    },
    {
      role: "user",
      content: prompt
    }
  ];

  const response = await callYourAI(messages);

  return response;
}

// 🔌 conecta aqui com sua IA (Gemini)
async function callYourAI(messages) {
  console.log("🧠 Enviando para IA com rules.master.md...");

  // aqui você coloca sua integração real com Gemini
  // exemplo mock:
  return "RESPOSTA DA IA";
}

// pegar argumento do terminal
const userPrompt = process.argv.slice(2).join(" ");

if (!userPrompt) {
  console.log("❌ Digite um prompt");
  process.exit(1);
}

runAI(userPrompt).then((res) => {
  console.log("\n🚀 RESPOSTA:\n");
  console.log(res);
});