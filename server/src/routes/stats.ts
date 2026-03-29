import { Router } from 'express';
import db from '../db';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const servers = await db.query('SELECT COUNT(*) as count FROM servers');
    const groups = await db.query('SELECT COUNT(*) as count FROM groups');
    const tags = await db.query('SELECT COUNT(*) as count FROM tags');
    const keys = await db.query('SELECT COUNT(*) as count FROM ssh_keys');

    sendSuccess(res, {
      servers: parseInt(servers.rows[0].count),
      groups: parseInt(groups.rows[0].count),
      tags: parseInt(tags.rows[0].count),
      sshKeys: parseInt(keys.rows[0].count)
    });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

export default router;
