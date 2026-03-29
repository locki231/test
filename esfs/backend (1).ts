// ════════════════════════════════════════════════════════════
//  MILICE CAYO — MDT BACKEND COMPLET
//  Node.js + Express + Discord.js + PostgreSQL + JWT
// ════════════════════════════════════════════════════════════

// ── src/index.ts ─────────────────────────────────────────────
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { db } from './config/database';
import { bot } from './bot/client';
import authRouter from './routes/auth';
import membersRouter from './routes/members';
import reportsRouter from './routes/reports';
import formationsRouter from './routes/formations';
import discordRouter from './routes/discord';
import configRouter from './routes/config';

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth',       authRouter);
app.use('/api/members',    membersRouter);
app.use('/api/reports',    reportsRouter);
app.use('/api/formations', formationsRouter);
app.use('/api/discord',    discordRouter);
app.use('/api/config',     configRouter);

app.listen(process.env.PORT || 3001, () => {
  console.log(`✅ MDT Backend lancé sur :${process.env.PORT || 3001}`);
});

// ── src/bot/client.ts ────────────────────────────────────────
import { Client, GatewayIntentBits, Events, ActivityType } from 'discord.js';

export const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
  ],
});

bot.once(Events.ClientReady, (c) => {
  console.log(`🤖 Bot connecté : ${c.user.tag}`);
  c.user.setActivity('Milice Cayo MDT', { type: ActivityType.Watching });
});

bot.login(process.env.DISCORD_BOT_TOKEN);

// ── src/bot/roleManager.ts ───────────────────────────────────
import { bot } from './client';

// Mapping grade MDT → ID rôle Discord (stocké en DB)
export async function getGradeRoleMap(): Promise<Record<string, string>> {
  const res = await db.query('SELECT grade_id, discord_role_id FROM grade_role_links');
  return Object.fromEntries(res.rows.map(r => [r.grade_id, r.discord_role_id]));
}

// Attribuer le bon rôle selon le grade MDT
// Retire automatiquement les anciens rôles de grade
export async function syncMemberRole(discordId: string, newGradeId: string): Promise<void> {
  const guild = await bot.guilds.fetch(process.env.DISCORD_GUILD_ID!);
  const member = await guild.members.fetch(discordId);
  const roleMap = await getGradeRoleMap();

  // Retirer tous les rôles de grade existants
  const allGradeRoleIds = Object.values(roleMap);
  const toRemove = member.roles.cache.filter(r => allGradeRoleIds.includes(r.id));
  if (toRemove.size > 0) await member.roles.remove(toRemove);

  // Ajouter le nouveau rôle
  const newRoleId = roleMap[newGradeId];
  if (newRoleId) {
    await member.roles.add(newRoleId);
    console.log(`✅ Rôle ${newRoleId} attribué à ${discordId}`);
  }
}

// Attribuer un rôle de formation après validation
export async function giveFormationRole(discordId: string, roleId: string): Promise<void> {
  if (!roleId) return;
  const guild = await bot.guilds.fetch(process.env.DISCORD_GUILD_ID!);
  const member = await guild.members.fetch(discordId);
  await member.roles.add(roleId);
}

// Retirer un rôle (sanction/exclusion)
export async function removeRole(discordId: string, roleId: string): Promise<void> {
  const guild = await bot.guilds.fetch(process.env.DISCORD_GUILD_ID!);
  const member = await guild.members.fetch(discordId);
  await member.roles.remove(roleId);
}

// Récupérer tous les membres du serveur + leurs rôles
export async function fetchGuildMembers() {
  const guild = await bot.guilds.fetch(process.env.DISCORD_GUILD_ID!);
  const members = await guild.members.fetch();
  return members.map(m => ({
    discordId: m.id,
    username: m.user.username,
    displayName: m.displayName,
    avatar: m.displayAvatarURL(),
    roles: m.roles.cache.map(r => ({ id: r.id, name: r.name, color: r.hexColor })),
    joinedAt: m.joinedAt,
  }));
}

// Récupérer tous les rôles du serveur
export async function fetchGuildRoles() {
  const guild = await bot.guilds.fetch(process.env.DISCORD_GUILD_ID!);
  const roles = await guild.roles.fetch();
  return roles
    .filter(r => r.name !== '@everyone')
    .map(r => ({ id: r.id, name: r.name, color: r.hexColor, memberCount: r.members.size }))
    .sort((a, b) => b.memberCount - a.memberCount);
}

// ── src/bot/webhooks.ts ──────────────────────────────────────
import axios from 'axios';
import { db } from '../config/database';

interface EmbedField { name: string; value: string; inline?: boolean; }

async function getWebhookUrl(event: string): Promise<string | null> {
  const res = await db.query('SELECT url FROM webhooks WHERE event_type=$1 AND active=TRUE LIMIT 1', [event]);
  return res.rows[0]?.url || null;
}

export async function sendEmbed(event: string, embed: {
  title: string; description: string; color: number; fields?: EmbedField[]; footer?: string;
}) {
  const url = await getWebhookUrl(event);
  if (!url) return;
  await axios.post(url, {
    embeds: [{
      title: embed.title,
      description: embed.description,
      color: embed.color,
      fields: embed.fields || [],
      footer: { text: embed.footer || 'Milice Cayo MDT' },
      timestamp: new Date().toISOString(),
    }]
  });
}

// Webhooks prêts à l'emploi
export const wh = {
  rapport: (id: string, type: string, agent: string, desc: string) =>
    sendEmbed('rapports', {
      title: `⚔️ Rapport ${id} — ${type}`,
      description: desc.substring(0, 280),
      color: 0xC9A84C,
      fields: [{ name: 'Agent', value: agent, inline: true }, { name: 'Type', value: type, inline: true }],
    }),

  promotion: (member: string, fromGrade: string, toGrade: string, by: string) =>
    sendEmbed('general', {
      title: `🏅 Promotion — ${member}`,
      description: `${member} passe de **${fromGrade}** à **${toGrade}**`,
      color: 0xC9A84C,
      fields: [{ name: 'Décision par', value: by, inline: true }],
    }),

  sanction: (member: string, type: string, reason: string, by: string) =>
    sendEmbed('sanctions', {
      title: `⚠️ Sanction — ${member}`,
      description: reason,
      color: 0xC0392B,
      fields: [{ name: 'Type', value: type, inline: true }, { name: 'Décidé par', value: by, inline: true }],
    }),

  formation: (member: string, formation: string, statut: 'validée' | 'refusée', by: string) =>
    sendEmbed('formations', {
      title: `🎓 Formation ${statut} — ${member}`,
      description: `${member} — Formation **${formation}** ${statut}`,
      color: statut === 'validée' ? 0x2D9E6B : 0xC0392B,
      fields: [{ name: 'Validateur', value: by, inline: true }],
    }),

  roleChange: (member: string, role: string, action: 'attribué' | 'retiré') =>
    sendEmbed('general', {
      title: `🔑 Rôle Discord ${action} — ${member}`,
      description: `Rôle **${role}** ${action} à ${member}`,
      color: action === 'attribué' ? 0x2D9E6B : 0xC97A2D,
    }),
};

// ── src/middleware/auth.ts ───────────────────────────────────
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthReq extends Request {
  user?: { memberId: number; discordId: string; grade: string; gradePermLevel: number; };
}

// Vérifier JWT
export function requireAuth(req: AuthReq, res: Response, next: NextFunction) {
  const token = req.cookies?.mdt_token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET!) as any;
    next();
  } catch { res.status(401).json({ error: 'Token invalide ou expiré' }); }
}

// Vérifier permission MDT (basée sur le grade Discord)
export function requirePerm(perm: string) {
  return async (req: AuthReq, res: Response, next: NextFunction) => {
    const result = await db.query(
      'SELECT permissions FROM grade_permissions WHERE grade_id=$1',
      [req.user?.grade]
    );
    const perms = result.rows[0]?.permissions || {};
    if (!perms[perm]) return res.status(403).json({ error: `Permission requise: ${perm}` });
    next();
  };
}

// Vérifier que l'utilisateur a le rôle Discord autorisé
export function requireDiscordRole(req: AuthReq, res: Response, next: NextFunction) {
  if (!req.user?.grade) return res.status(403).json({ error: 'Aucun grade MDT' });
  next();
}

// ── src/routes/auth.ts ───────────────────────────────────────
import { Router } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { db } from '../config/database';
import { syncMemberRole } from '../bot/roleManager';

const router = Router();

// Étape 1: Redirect Discord OAuth2
router.get('/discord', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID!,
    redirect_uri: process.env.DISCORD_REDIRECT_URI!,
    response_type: 'code',
    scope: 'identify guilds.members.read',
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

// Étape 2: Callback OAuth2
router.get('/discord/callback', async (req, res) => {
  try {
    const { code } = req.query;

    // Échange code → access token
    const tokenRes = await axios.post(
      'https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: process.env.DISCORD_REDIRECT_URI!,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const { access_token } = tokenRes.data;

    // Récupérer l'utilisateur Discord
    const userRes = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const dUser = userRes.data;

    // Récupérer les infos du membre dans le serveur
    const memberRes = await axios.get(
      `https://discord.com/api/users/@me/guilds/${process.env.DISCORD_GUILD_ID}/member`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    const dMember = memberRes.data;

    // Vérifier que le membre a un rôle autorisé
    const allowedRes = await db.query('SELECT discord_role_id FROM grade_role_links');
    const allowedRoleIds = allowedRes.rows.map(r => r.discord_role_id);
    const hasRole = dMember.roles.some((r: string) => allowedRoleIds.includes(r));

    if (!hasRole) return res.redirect(`${process.env.FRONTEND_URL}/login?error=unauthorized`);

    // Déterminer le grade MDT depuis les rôles Discord
    const gradeRes = await db.query(
      'SELECT grade_id FROM grade_role_links WHERE discord_role_id = ANY($1) ORDER BY grade_perm_level DESC LIMIT 1',
      [dMember.roles]
    );
    const grade = gradeRes.rows[0]?.grade_id || 'recrue';

    // Upsert membre en base
    const avatar = `https://cdn.discordapp.com/avatars/${dUser.id}/${dUser.avatar}.png`;
    const result = await db.query(`
      INSERT INTO members (discord_id, username, display_name, avatar_url, grade, status)
      VALUES ($1, $2, $3, $4, $5, 'actif')
      ON CONFLICT (discord_id) DO UPDATE SET
        username     = EXCLUDED.username,
        display_name = EXCLUDED.display_name,
        avatar_url   = EXCLUDED.avatar_url,
        grade        = $5,
        updated_at   = NOW()
      RETURNING *
    `, [dUser.id, dUser.username, dMember.nick || dUser.username, avatar, grade]);

    const member = result.rows[0];

    // Log sécurité
    await db.query('INSERT INTO security_logs (member_id, action, ip) VALUES ($1, $2, $3)', [
      member.id, 'LOGIN_DISCORD', req.ip
    ]);

    // JWT
    const token = jwt.sign(
      { memberId: member.id, discordId: dUser.id, grade: member.grade },
      process.env.JWT_SECRET!,
      { expiresIn: '8h' }
    );

    res.cookie('mdt_token', token, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 8 * 3600 * 1000 });
    res.redirect(process.env.FRONTEND_URL!);
  } catch (err: any) {
    console.error('OAuth2 error:', err.message);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=server`);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('mdt_token');
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req: AuthReq, res) => {
  const r = await db.query('SELECT * FROM members WHERE id=$1', [req.user!.memberId]);
  res.json(r.rows[0]);
});

export default router;

// ── src/routes/discord.ts ────────────────────────────────────
import { Router } from 'express';
import { requireAuth, requirePerm } from '../middleware/auth';
import { fetchGuildMembers, fetchGuildRoles, syncMemberRole, giveFormationRole } from '../bot/roleManager';
import { db } from '../config/database';

const router = Router();

// Récupérer tous les membres Discord
router.get('/members', requireAuth, async (req, res) => {
  try {
    const members = await fetchGuildMembers();
    res.json(members);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Récupérer tous les rôles Discord
router.get('/roles', requireAuth, async (req, res) => {
  try {
    const roles = await fetchGuildRoles();
    res.json(roles);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Donner un rôle à un membre
router.post('/give-role', requireAuth, requirePerm('manageRoles'), async (req: AuthReq, res) => {
  const { discordId, roleId } = req.body;
  try {
    await giveFormationRole(discordId, roleId);
    await wh.roleChange('Membre', 'Rôle #'+roleId, 'attribué');
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Synchronisation complète: membres Discord → base MDT
router.post('/sync', requireAuth, requirePerm('manageRoles'), async (req: AuthReq, res) => {
  try {
    const discordMembers = await fetchGuildMembers();
    const gradeLinks = await db.query('SELECT grade_id, discord_role_id FROM grade_role_links');
    const gradeMap = Object.fromEntries(gradeLinks.rows.map(r => [r.discord_role_id, r.grade_id]));

    for (const dm of discordMembers) {
      // Trouver le grade MDT selon les rôles Discord
      let grade = 'recrue';
      for (const role of dm.roles) {
        if (gradeMap[role.id]) { grade = gradeMap[role.id]; break; }
      }
      // Upsert membre
      await db.query(`
        INSERT INTO members (discord_id, username, display_name, avatar_url, grade)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (discord_id) DO UPDATE SET
          username=$2, display_name=$3, avatar_url=$4, grade=$5, updated_at=NOW()
      `, [dm.discordId, dm.username, dm.displayName, dm.avatar, grade]);
    }
    res.json({ synced: discordMembers.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Sauvegarder les liaisons grade → rôle Discord
router.post('/grade-role-links', requireAuth, requirePerm('manageRoles'), async (req, res) => {
  const { links } = req.body; // [{ gradeId, discordRoleId, permLevel }]
  try {
    await db.query('DELETE FROM grade_role_links');
    for (const link of links) {
      await db.query(
        'INSERT INTO grade_role_links (grade_id, discord_role_id, grade_perm_level) VALUES ($1,$2,$3)',
        [link.gradeId, link.discordRoleId, link.permLevel]
      );
    }
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;

// ── src/routes/members.ts ────────────────────────────────────
import { Router } from 'express';
import { requireAuth, requirePerm } from '../middleware/auth';
import { syncMemberRole } from '../bot/roleManager';
import { wh } from '../bot/webhooks';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const r = await db.query('SELECT * FROM members ORDER BY grade_perm_level DESC, nom_rp');
  res.json(r.rows);
});

router.get('/:id', requireAuth, async (req, res) => {
  const r = await db.query('SELECT * FROM members WHERE id=$1', [req.params.id]);
  res.json(r.rows[0]);
});

router.post('/', requireAuth, requirePerm('manageMembers'), async (req: AuthReq, res) => {
  const { discordId, nomRp, grade, status, notes } = req.body;
  try {
    const result = await db.query(`
      INSERT INTO members (discord_id, nom_rp, grade, status, notes)
      VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [discordId, nomRp, grade, status || 'actif', notes]);
    const member = result.rows[0];
    // Attribuer le rôle Discord via bot
    await syncMemberRole(discordId, grade);
    await wh.roleChange(nomRp, grade, 'attribué');
    res.json(member);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id/promote', requireAuth, requirePerm('manageMembers'), async (req: AuthReq, res) => {
  const { grade, by } = req.body;
  const prev = await db.query('SELECT * FROM members WHERE id=$1', [req.params.id]);
  const member = prev.rows[0];
  await db.query('UPDATE members SET grade=$1, updated_at=NOW() WHERE id=$2', [grade, req.params.id]);
  // Sync rôle Discord
  await syncMemberRole(member.discord_id, grade);
  await wh.promotion(member.nom_rp, member.grade, grade, by);
  res.json({ ok: true });
});

router.patch('/:id/sanction', requireAuth, requirePerm('manageMembers'), async (req: AuthReq, res) => {
  const { type, reason, by } = req.body;
  const prev = await db.query('SELECT * FROM members WHERE id=$1', [req.params.id]);
  const member = prev.rows[0];
  const newStatus = type === 'suspension' ? 'suspendu' : type === 'exclusion' ? 'exclu' : 'actif';
  await db.query('UPDATE members SET status=$1, sanctions=sanctions+1, updated_at=NOW() WHERE id=$2', [newStatus, req.params.id]);
  await wh.sanction(member.nom_rp, type, reason, by);
  res.json({ ok: true });
});

export default router;

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
