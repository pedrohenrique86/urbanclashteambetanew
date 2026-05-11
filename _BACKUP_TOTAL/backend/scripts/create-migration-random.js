const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const migrationsDir = path.join(__dirname, "..", "migrations");

// Garante que a pasta existe
if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
}

// Lê arquivos existentes
const files = fs.readdirSync(migrationsDir);

// Extrai timestamps
const timestamps = files
  .map((file) => {
    const match = file.match(/^(\d+)_/);
    return match ? Number(match[1]) : null;
  })
  .filter(Boolean);

// Maior timestamp
const maxTimestamp = timestamps.length ? Math.max(...timestamps) : Date.now();

// Incremento seguro
const nextTimestamp = maxTimestamp + 10000000;

// Nome aleatório
const randomName = Math.random().toString(36).slice(2, 10);

// Nome final
const fileName = `${nextTimestamp}_${randomName}.js`;
const filePath = path.join(migrationsDir, fileName);

// 🔥 ARQUIVO TOTALMENTE EM BRANCO
fs.writeFileSync(filePath, "", { flag: "wx" });

console.log("✅ Migration criada:");
console.log(fileName);

// ===============================
// 🔥 ABRIR NO NOTEPAD++
// ===============================

const possibleEditors = [
  "C:\\\\Program Files\\\\Notepad++\\\\notepad++.exe",
  "C:\\\\Program Files (x86)\\\\Notepad++\\\\notepad++.exe",
];

function openWithNotepadPlusPlus(targetPath) {
  const editorPath = possibleEditors.find((p) => fs.existsSync(p));
  if (!editorPath) return false;

  const child = spawn(editorPath, [targetPath], {
    detached: true,
    stdio: "ignore",
  });

  child.unref();
  return true;
}

function openWithNotepad(targetPath) {
  const child = spawn("notepad.exe", [targetPath], {
    detached: true,
    stdio: "ignore",
  });

  child.unref();
}

// Tenta abrir no Notepad++
if (!openWithNotepadPlusPlus(filePath)) {
  console.log("ℹ️ Notepad++ não encontrado, abrindo Bloco de Notas...");
  openWithNotepad(filePath);
}