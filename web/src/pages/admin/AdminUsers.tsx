import { useEffect, useState } from 'react';
import { Table, Tag } from 'antd';
import { api } from '../../services/api';
import { ROLE_LABELS, MEMBERSHIP_LABELS } from '../../types';

export default function AdminUsers() {
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.adminUsers().then(setUsers).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>用户管理</h2>
      <Table loading={loading} dataSource={users} rowKey="id" pagination={{ pageSize: 10 }}
        columns={[
          { title: '姓名', dataIndex: 'name' },
          { title: '手机号', dataIndex: 'phone' },
          { title: '角色', dataIndex: 'role', render: (r: string) => <Tag>{ROLE_LABELS[r] || r}</Tag> },
          { title: '会员', dataIndex: 'membership', render: (m: string) => MEMBERSHIP_LABELS[m] || m },
          { title: '注册时间', dataIndex: 'created_at', render: (t: string) => new Date(t).toLocaleDateString('zh-CN') },
        ]} />
    </div>
  );
}
