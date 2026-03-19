const fs = require("fs");

function load(file) {
  return fs.readFileSync(file, "utf-8");
}

const system = load("config/ai/system.md");
const rules = load("config/rules.md");
const guard = load("config/guard.md");

const fullPrompt = `
${system}

REGRAS:
${rules}

GUARD:
${guard}
`;

console.log(fullPrompt);