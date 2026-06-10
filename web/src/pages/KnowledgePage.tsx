import { useState, useEffect } from 'react';
import { Input, Tabs, Card, Tag, List, Drawer } from 'antd';
import { SearchOutlined, CrownOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { api } from '../services/api';
import type { Article } from '../types';

const CATEGORIES: Record<string, string> = {
  sleep: '睡眠', emotion: '情绪', diet: '饮食', sensory: '感统训练',
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
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 16, fontWeight: 500 }}>📚 育儿知识</h2>
      <Input prefix={<SearchOutlined />} placeholder="搜索文章..." value={search} onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 16, borderRadius: 20 }} allowClear />

      <Tabs activeKey={category || 'all'} onChange={k => setCategory(k === 'all' ? '' : k)} items={[
        { key: 'all', label: '全部' },
        ...Object.entries(CATEGORIES).map(([k, v]) => ({ key: k, label: v })),
      ]} />

      <List dataSource={articles} renderItem={a => (
        <Card className="card-soft" size="small" style={{ marginBottom: 10, cursor: 'pointer' }}
          onClick={() => setSelected(a)} hoverable>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>{a.title}</div>
              <div>
                <Tag>{CATEGORIES[a.category] || a.category}</Tag>
                <Tag color="blue">{a.age_group}岁</Tag>
                {a.special_type && <Tag color="orange">{a.special_type}</Tag>}
              </div>
            </div>
            <div style={{ textAlign: 'right', color: '#999', fontSize: 12 }}>
              {a.is_premium ? <CrownOutlined style={{ color: '#faad14' }} /> : null}
              {a.video_url && <PlayCircleOutlined style={{ marginLeft: 8 }} />}
              <div>{a.views} 阅读</div>
            </div>
          </div>
        </Card>
      )} />

      <Drawer title={selected?.title} open={!!selected} onClose={() => setSelected(null)} width="100%">
        {selected && (
          <>
            {selected.video_url && (
              <div style={{ background: '#000', height: 200, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', marginBottom: 16 }}>
                <PlayCircleOutlined style={{ fontSize: 48 }} /> 视频课程
              </div>
            )}
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{selected.content}</div>
          </>
        )}
      </Drawer>
    </div>
  );
}
