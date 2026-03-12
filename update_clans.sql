-- Atualizar clãs existentes
DELETE FROM clans;

-- Inserir novos clãs com facções corretas
INSERT INTO clans (name, description, faction, max_members) VALUES
('Família Corleone', 'Clã tradicional focado em negócios e território', 'gangsters', 40),
('Cartel dos Irmãos', 'Especialistas em operações de alto risco', 'gangsters', 40),
('Máfia Siciliana', 'Veteranos com experiência em estratégias urbanas', 'gangsters', 40),
('Força Tática', 'Unidade de elite especializada em combate urbano', 'guardas', 40),
('Esquadrão Alpha', 'Operações especiais e missões de resgate', 'guardas', 40),
('Batalhão Central', 'Força principal de manutenção da ordem', 'guardas', 40);

-- Atualizar max_members padrão para novos clãs
ALTER TABLE clans ALTER COLUMN max_members SET DEFAULT 40;