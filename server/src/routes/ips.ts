import { Router } from 'express';
import { z } from 'zod';
import db from '../db';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

const ipSchema = z.object({
  server_id: z.number(),
  ip_address: z.string().min(1),
  ip_type: z.enum(['public', 'private', 'ipv6']).default('public'),
  label: z.string().optional(),
});

type IpType = 'public' | 'private' | 'ipv6';
type EmbeddedIpKind = 'public' | 'private' | 'ipv6' | 'private_ipv6';

type MergedIpRow = {
  id: number;
  server_id: number;
  ip_address: string;
  ip_type: IpType | 'private_ipv6';
  label: string | null;
  created_at: string;
  server_name: string;
  server_hostname: string;
  source: 'server' | 'catalog';
};

function slotForEmbedded(kind: EmbeddedIpKind): number {
  if (kind === 'public') return 1;
  if (kind === 'private') return 2;
  if (kind === 'ipv6') return 3;
  return 4;
}

/** Negative id encodes server + field so UI can tell embedded rows apart */
function embeddedId(serverId: number, kind: EmbeddedIpKind): number {
  return -(serverId * 1000 + slotForEmbedded(kind));
}

function dedupeKey(serverId: number, addr: string): string {
  return `${serverId}\0${addr.trim().toLowerCase()}`;
}

/**
 * Build list: catalog (server_ips) + IPs stored on servers.* columns, deduped by (server_id, ip_address).
 */
async function listAllIpsMerged(): Promise<MergedIpRow[]> {
  const [catalogR, serversR] = await Promise.all([
    db.query(`
      SELECT
        ip.id, ip.ip_address, ip.ip_type, ip.label, ip.created_at,
        ip.server_id, s.name as server_name, s.hostname as server_hostname
      FROM server_ips ip
      JOIN servers s ON s.id = ip.server_id
    `),
    db.query(`
      SELECT id, name, hostname, ip_address, private_ip, ipv6_address, private_ipv6, cloud_provider_id, created_at, updated_at
      FROM servers
    `),
  ]);

  const catalog = catalogR.rows as {
    id: number;
    ip_address: string;
    ip_type: IpType;
    label: string | null;
    created_at: string;
    server_id: number;
    server_name: string;
    server_hostname: string;
  }[];

  const catalogKeys = new Set(catalog.map((r) => dedupeKey(r.server_id, r.ip_address)));

  const embedded: MergedIpRow[] = [];
  const servers = serversR.rows as {
    id: number;
    name: string;
    hostname: string;
    ip_address: string | null;
    private_ip: string | null;
    ipv6_address: string | null;
    private_ipv6: string | null;
    cloud_provider_id: number | null;
    created_at: string;
    updated_at: string;
  }[];

  const pushIf = (
    s: (typeof servers)[0],
    addr: string | null | undefined,
    kind: EmbeddedIpKind,
    defaultLabel: string
  ) => {
    const a = addr?.trim();
    if (!a) return;
    if (catalogKeys.has(dedupeKey(s.id, a))) return;
    const ipType: MergedIpRow['ip_type'] =
      kind === 'public'
        ? 'public'
        : kind === 'private'
          ? 'private'
          : kind === 'ipv6'
            ? 'ipv6'
            : 'private_ipv6';
    embedded.push({
      id: embeddedId(s.id, kind),
      server_id: s.id,
      ip_address: a,
      ip_type: ipType,
      label: defaultLabel,
      created_at: s.updated_at || s.created_at,
      server_name: s.name,
      server_hostname: s.hostname,
      source: 'server',
    });
  };

  for (const s of servers) {
    pushIf(s, s.ip_address, 'public', 'Public IPv4 (server)');
    // For cloud-synced servers, keep private addresses out of /ips inventory.
    if (!s.cloud_provider_id) {
      pushIf(s, s.private_ip, 'private', 'Private IPv4 (server)');
    }
    pushIf(s, s.ipv6_address, 'ipv6', 'Public IPv6 (server)');
    if (!s.cloud_provider_id) {
      pushIf(s, s.private_ipv6, 'private_ipv6', 'Private IPv6 (server)');
    }
  }

  const catalogMerged: MergedIpRow[] = catalog.map((r) => ({
    id: r.id,
    server_id: r.server_id,
    ip_address: r.ip_address,
    ip_type: r.ip_type,
    label: r.label,
    created_at: r.created_at,
    server_name: r.server_name,
    server_hostname: r.server_hostname,
    source: 'catalog',
  }));

  const all = [...embedded, ...catalogMerged];
  all.sort((a, b) => a.ip_address.localeCompare(b.ip_address));
  return all;
}

async function listServerIpsMerged(serverId: number): Promise<MergedIpRow[]> {
  const [catalogR, serverR] = await Promise.all([
    db.query(
      `
      SELECT ip.id, ip.ip_address, ip.ip_type, ip.label, ip.created_at, ip.server_id,
             s.name as server_name, s.hostname as server_hostname
      FROM server_ips ip
      JOIN servers s ON s.id = ip.server_id
      WHERE ip.server_id = $1
    `,
      [serverId]
    ),
    db.query(
      `SELECT id, name, hostname, ip_address, private_ip, ipv6_address, private_ipv6, cloud_provider_id, created_at, updated_at FROM servers WHERE id = $1`,
      [serverId]
    ),
  ]);

  const catalog = catalogR.rows as {
    id: number;
    ip_address: string;
    ip_type: IpType;
    label: string | null;
    created_at: string;
    server_id: number;
    server_name: string;
    server_hostname: string;
  }[];

  const catalogKeys = new Set(catalog.map((r) => dedupeKey(r.server_id, r.ip_address)));

  const embedded: MergedIpRow[] = [];
  const s = serverR.rows[0] as
    | {
        id: number;
        name: string;
        hostname: string;
        ip_address: string | null;
        private_ip: string | null;
        ipv6_address: string | null;
        private_ipv6: string | null;
        cloud_provider_id: number | null;
        created_at: string;
        updated_at: string;
      }
    | undefined;

  if (s) {
    const pushIf = (addr: string | null | undefined, kind: EmbeddedIpKind, defaultLabel: string) => {
      const a = addr?.trim();
      if (!a) return;
      if (catalogKeys.has(dedupeKey(s.id, a))) return;
      const ipType: MergedIpRow['ip_type'] =
        kind === 'public'
          ? 'public'
          : kind === 'private'
            ? 'private'
            : kind === 'ipv6'
              ? 'ipv6'
              : 'private_ipv6';
      embedded.push({
        id: embeddedId(s.id, kind),
        server_id: s.id,
        ip_address: a,
        ip_type: ipType,
        label: defaultLabel,
        created_at: s.updated_at || s.created_at,
        server_name: s.name,
        server_hostname: s.hostname,
        source: 'server',
      });
    };
    pushIf(s.ip_address, 'public', 'Public IPv4 (server)');
    if (!s.cloud_provider_id) {
      pushIf(s.private_ip, 'private', 'Private IPv4 (server)');
    }
    pushIf(s.ipv6_address, 'ipv6', 'Public IPv6 (server)');
    if (!s.cloud_provider_id) {
      pushIf(s.private_ipv6, 'private_ipv6', 'Private IPv6 (server)');
    }
  }

  const catalogMerged: MergedIpRow[] = catalog.map((r) => ({
    id: r.id,
    server_id: r.server_id,
    ip_address: r.ip_address,
    ip_type: r.ip_type,
    label: r.label,
    created_at: r.created_at,
    server_name: r.server_name,
    server_hostname: r.server_hostname,
    source: 'catalog',
  }));

  const all = [...embedded, ...catalogMerged];
  all.sort((a, b) => a.ip_address.localeCompare(b.ip_address));
  return all;
}

// GET / - List all IPs (server record fields + server_ips catalog), deduped
router.get('/', async (_req, res) => {
  try {
    const rows = await listAllIpsMerged();
    sendSuccess(res, rows);
  } catch (err: any) {
    sendError(res, err.message);
  }
});

// GET /server/:serverId - IPs for one server (embedded + catalog)
router.get('/server/:serverId', async (req, res) => {
  try {
    const sid = parseInt(req.params.serverId, 10);
    if (Number.isNaN(sid)) return sendError(res, 'Invalid server id', 400);
    const rows = await listServerIpsMerged(sid);
    sendSuccess(res, rows);
  } catch (err: any) {
    sendError(res, err.message);
  }
});

// POST / - Add new IP
router.post('/', async (req, res) => {
  const parsed = ipSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, parsed.error.issues[0].message);

  try {
    const { server_id, ip_address, ip_type, label } = parsed.data;
    const result = await db.query(
      'INSERT INTO server_ips (server_id, ip_address, ip_type, label) VALUES ($1, $2, $3, $4) RETURNING *',
      [server_id, ip_address, ip_type, label || null]
    );
    sendSuccess(res, result.rows[0], 201);
  } catch (err: any) {
    sendError(res, err.message);
  }
});

// PUT /:id - Update IP (catalog rows only)
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id) || id <= 0) {
    return sendError(res, 'Addresses from the server record are edited on the server, not here.', 400);
  }
  const parsed = ipSchema.partial().safeParse(req.body);
  if (!parsed.success) return sendError(res, parsed.error.issues[0].message);

  try {
    const { ip_address, ip_type, label } = parsed.data;
    const result = await db.query(
      `UPDATE server_ips SET
        ip_address = COALESCE($1, ip_address),
        ip_type = COALESCE($2, ip_type),
        label = COALESCE($3, label)
      WHERE id = $4 RETURNING *`,
      [ip_address, ip_type, label, id]
    );
    if (result.rows.length === 0) {
      return sendError(res, 'IP not found', 404);
    }
    sendSuccess(res, result.rows[0]);
  } catch (err: any) {
    sendError(res, err.message);
  }
});

// DELETE /:id - Delete catalog IP only (embedded server fields are not rows in server_ips)
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id) || id <= 0) {
    return sendError(res, 'Remove or change this address by editing the server in Servers.', 400);
  }
  try {
    const r = await db.query('DELETE FROM server_ips WHERE id = $1', [id]);
    if (r.rowCount === 0) {
      return sendError(res, 'IP not found', 404);
    }
    sendSuccess(res, { message: 'IP deleted' });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

export default router;
