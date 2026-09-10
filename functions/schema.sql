-- Schéma de la base D1 pour les messages du formulaire de contact.
-- À exécuter UNE SEULE FOIS, dans la console de la base D1
-- (Cloudflare Dashboard → Workers & Pages → D1 → ta base → Console).
-- Voir GUIDE-MESSAGES.md, étape 1.

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  nom TEXT NOT NULL,
  email TEXT NOT NULL,
  entreprise TEXT,
  service TEXT,
  budget TEXT,
  delai TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'nouveau'
);

CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
