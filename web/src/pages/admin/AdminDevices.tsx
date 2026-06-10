import { useEffect, useState } from 'react';
import { Table, Tag } from 'antd';
import { api } from '../../services/api';

export default function AdminDevices() {
  const [devices, setDevices] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    api.adminDevices().then(setDevices);
  }, []);

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>设备管理</h2>
      <Table dataSource={devices} rowKey="id" pagination={{ pageSize: 10 }}
        columns={[
          { title: '设备名', dataIndex: 'name' },
          { title: '类型', dataIndex: 'type' },
          { title: '绑定儿童', dataIndex: 'child_name', render: (v: string) => v || '-' },
          { title: '所属用户', dataIndex: 'user_name' },
          { title: '电量', dataIndex: 'battery', render: (v: number) => `${v}%` },
          { title: '状态', dataIndex: 'status', render: (s: string) => <Tag color={s === 'online' ? 'green' : 'default'}>{s === 'online' ? '在线' : '离线'}</Tag> },
          { title: 'MAC', dataIndex: 'mac_address' },
        ]} />
    </div>
  );
}
