import { useState, useEffect } from 'react';
import { Input, Tabs, Drawer } from 'antd';
import { api } from '../services/api';
import type { Article } from '../types';

const CATEGORIES: Record<string, string> = {
  sleep: '睡眠', emotion: '情绪', diet: '饮食', sensory: '感统训练',
};

const CAT_ICON: Record<string, string> = {
  sleep: '🌙', emotion: '💛', diet: '🍼', sensory: '🎨',
};

export default function KnowledgePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [selected, setSelected] = useState<Article | null>(null);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (category) params.category = category;
    if (search) params.q = search;
    api.getArticles(params).then(setArticles).catch(() => {});
  }, [category, search]);

  return (
    <div className="fade-in" style={{ padding: 16 }}>
      <Input
        className="search-box"
        prefix={<span style={{ fontSize: 18, marginRight: 4 }}>🔍</span>}
        placeholder="搜索育儿文章..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        allowClear
        variant="borderless"
      />

      <Tabs activeKey={category || 'all'} onChange={k => setCategory(k === 'all' ? '' : k)}
        items={[
          { key: 'all', label: '✨ 全部' },
          ...Object.entries(CATEGORIES).map(([k, v]) => ({ key: k, label: `${CAT_ICON[k] || '📖'} ${v}` })),
        ]} />

      {articles.map(a => (
        <div key={a.id} className="article-card slide-up" onClick={() => setSelected(a)}>
          <div className="article-icon">{CAT_ICON[a.category] || '📖'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 15 }}>{a.title}</div>
            <div>
              <span className="pill-tag pink">{CATEGORIES[a.category] || a.category}</span>
              <span className="pill-tag blue">{a.age_group}岁</span>
              {a.special_type && <span className="pill-tag orange">{a.special_type}</span>}
              {a.is_premium ? <span className="pill-tag orange">👑 会员</span> : null}
            </div>
          </div>
          <div style={{ textAlign: 'right', color: '#bbb', fontSize: 12, flexShrink: 0 }}>
            {a.video_url && <div style={{ fontSize: 20 }}>▶️</div>}
            <div>{a.views} 阅读</div>
          </div>
        </div>
      ))}

      <Drawer open={!!selected} onClose={() => setSelected(null)} width="100%"
        styles={{ body: { padding: 0 }, header: { display: 'none' } }}>
        {selected && (
          <>
            <div className="drawer-cover">
              <button type="button" className="back-btn" onClick={() => setSelected(null)} aria-label="返回">
                ◀
              </button>
              <div className="drawer-cover-title">{selected.title}</div>
            </div>
            <div style={{ padding: '0 20px 24px' }}>
              {selected.video_url && (
                <div className="video-player">
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 8 }}>▶️</div>
                    <div style={{ fontSize: 14, opacity: 0.8 }}>专家视频课程</div>
                  </div>
                </div>
              )}
              <div style={{ marginBottom: 12 }}>
                <span className="pill-tag pink">{CATEGORIES[selected.category]}</span>
                <span className="pill-tag blue">{selected.age_group}岁</span>
              </div>
              <div className="drawer-body">{selected.content}</div>
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}
