"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const client_1 = require("./bot/client");
console.log('[DEBUG] Instance bot Discord :', !!client_1.bot);
const auth_1 = __importDefault(require("./routes/auth"));
const members_1 = __importDefault(require("./routes/members"));
const reports_1 = __importDefault(require("./routes/reports"));
const formations_1 = __importDefault(require("./routes/formations"));
const discord_1 = __importDefault(require("./routes/discord"));
const config_1 = __importDefault(require("./routes/config"));
const app = (0, express_1.default)();
// Middleware CORS custom pour accepter toutes les origines dynamiquement
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});
// Autorise aussi via le package cors (sécurité supplémentaire)
app.use((0, cors_1.default)({ origin: true, credentials: true }));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use('/api/auth', auth_1.default);
app.use('/api/members', members_1.default);
app.use('/api/reports', reports_1.default);
app.use('/api/formations', formations_1.default);
app.use('/api/discord', discord_1.default);
app.use('/api/config', config_1.default);
app.listen(process.env.PORT || 3001, () => {
    console.log(`✅ MDT Backend lancé sur :${process.env.PORT || 3001}`);
});
// ── database/schema.sql ──────────────────────────────────────
/*
CREATE TABLE members (
  id               SERIAL PRIMARY KEY,
  discord_id       VARCHAR(20) UNIQUE NOT NULL,
  username         VARCHAR(100),
  display_name     VARCHAR(100),
  nom_rp           VARCHAR(100),
  avatar_url       TEXT,
  grade            VARCHAR(30) DEFAULT 'recrue',
  status           VARCHAR(20) DEFAULT 'actif' CHECK (status IN ('actif','suspendu','exclu')),
  rapports         INT DEFAULT 0,
  sanctions        INT DEFAULT 0,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Liaison grade MDT ↔ Rôle Discord
CREATE TABLE grade_role_links (
  id                SERIAL PRIMARY KEY,
  grade_id          VARCHAR(30) UNIQUE NOT NULL,   -- ex: 'commandant'
  discord_role_id   VARCHAR(20) NOT NULL,           -- ID du rôle Discord
  grade_perm_level  INT DEFAULT 0,                  -- 0=recrue, 4=commandant
  grade_label       VARCHAR(50),
  grade_color       VARCHAR(7) DEFAULT '#c9a84c',
  grade_role_name   VARCHAR(100),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Permissions MDT par grade
CREATE TABLE grade_permissions (
  grade_id          VARCHAR(30) PRIMARY KEY REFERENCES grade_role_links(grade_id),
  permissions       JSONB NOT NULL DEFAULT '{}'
);

-- Rapports
CREATE TABLE reports (
  id            SERIAL PRIMARY KEY,
  report_code   VARCHAR(12) UNIQUE NOT NULL,
  type          VARCHAR(30) NOT NULL,
  titre         VARCHAR(200) NOT NULL,
  description   TEXT NOT NULL,
  member_id     INT REFERENCES members(id),
  discord_msg_id VARCHAR(20),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Formations
CREATE TABLE formations (
  id              SERIAL PRIMARY KEY,
  nom             VARCHAR(100) NOT NULL,
  description     TEXT,
  grade_requis    VARCHAR(30),
  categorie       VARCHAR(50),
  discord_role_id VARCHAR(20),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE formation_assignments (
  id              SERIAL PRIMARY KEY,
  member_id       INT REFERENCES members(id),
  formation_id    INT REFERENCES formations(id),
  validateur_id   INT REFERENCES members(id),
  statut          VARCHAR(20) DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, formation_id)
);

-- Webhooks Discord
CREATE TABLE webhooks (
  id          SERIAL PRIMARY KEY,
  nom         VARCHAR(100) NOT NULL,
  url         TEXT NOT NULL,
  event_type  VARCHAR(50) NOT NULL,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Logs sécurité
CREATE TABLE security_logs (
  id          SERIAL PRIMARY KEY,
  member_id   INT REFERENCES members(id),
  action      VARCHAR(200) NOT NULL,
  ip          INET,
  result      VARCHAR(20) DEFAULT 'success',
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
*/
// ── .env ─────────────────────────────────────────────────────
/*
# Discord OAuth2
DISCORD_CLIENT_ID=your_application_client_id
DISCORD_CLIENT_SECRET=your_application_client_secret
DISCORD_REDIRECT_URI=https://your-domain.com/api/auth/discord/callback
DISCORD_GUILD_ID=your_server_guild_id

# Bot Discord
DISCORD_BOT_TOKEN=your_bot_token_here

# Base de données
DATABASE_URL=postgresql://mdt_user:password@localhost:5432/cayo_mdt

# Sécurité
JWT_SECRET=super_long_random_secret_minimum_256_bits

# App
PORT=3001
FRONTEND_URL=https://your-domain.com
NODE_ENV=production
*/
// ── package.json ─────────────────────────────────────────────
/*
{
  "name": "cayo-mdt-backend",
  "scripts": {
    "dev": "ts-node-dev src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "discord.js": "^14.14.1",
    "axios": "^1.6.7",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.11.3",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "dotenv": "^16.4.1",
    "pdfkit": "^0.14.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.11.0",
    "typescript": "^5.3.3",
    "ts-node-dev": "^2.0.0"
  }
}
*/
// ── GUIDE DE MISE EN PLACE RAPIDE ────────────────────────────
/*
═══════════════════════════════════════════════
  MILICE CAYO MDT — DÉMARRAGE EN 10 MINUTES
═══════════════════════════════════════════════

1. CRÉER L'APPLICATION DISCORD
   → https://discord.com/developers/applications
   → Nouvel application → Bot → Copier le TOKEN
   → OAuth2 → Copier CLIENT ID + CLIENT SECRET
   → Redirect URI: https://votre-domaine.com/api/auth/discord/callback
   → Scopes OAuth2: identify + guilds.members.read

2. INVITER LE BOT
   URL: https://discord.com/api/oauth2/authorize
     ?client_id=VOTRE_CLIENT_ID
     &permissions=268435456  (Gérer les rôles)
     &scope=bot

3. REMPLIR .env
   Copier .env.example → .env
   Remplir tous les champs

4. BASE DE DONNÉES
   createdb cayo_mdt
   psql cayo_mdt < database/schema.sql

5. LANCER
   npm install
   npm run dev

6. CONFIGURER LES LIAISONS
   Aller dans MDT → Rôles Discord
   Associer chaque grade MDT à un rôle Discord
   Sauvegarder → le bot gérera les attributions automatiquement

═══════════════════════════════════════════════
*/
