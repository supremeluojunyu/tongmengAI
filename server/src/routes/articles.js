import { Router } from 'express';
import db from '../db/index.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.get('/', authRequired, (req, res) => {
  const { category, ageGroup, q } = req.query;
  let sql = 'SELECT * FROM articles WHERE 1=1';
  const params = [];

  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (ageGroup) { sql += ' AND age_group = ?'; params.push(ageGroup); }
  if (q) { sql += ' AND title LIKE ?'; params.push(`%${q}%`); }

  sql += ' ORDER BY created_at DESC';
  const articles = db.prepare(sql).all(...params);
  res.json(articles);
});

router.get('/:id', authRequired, (req, res) => {
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!article) return res.status(404).json({ error: '文章不存在' });
  db.prepare('UPDATE articles SET views = views + 1 WHERE id = ?').run(req.params.id);
  res.json(article);
});

export default router;
