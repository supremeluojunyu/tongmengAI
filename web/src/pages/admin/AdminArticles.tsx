import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Switch, message, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api } from '../../services/api';

export default function AdminArticles() {
  const [articles, setArticles] = useState<Record<string, unknown>[]>([]);
  const [modal, setModal] = useState(false);
  const [form] = Form.useForm();

  const load = () => api.adminArticles().then(setArticles);

  useEffect(() => { load(); }, []);

  const onCreate = async (values: Record<string, unknown>) => {
    await api.createArticle(values);
    message.success('文章已创建');
    setModal(false);
    form.resetFields();
    load();
  };

  const onDelete = async (id: string) => {
    await api.deleteArticle(id);
    message.success('已删除');
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2>内容管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal(true)}>新建文章</Button>
      </div>
      <Table dataSource={articles} rowKey="id" pagination={{ pageSize: 10 }}
        columns={[
          { title: '标题', dataIndex: 'title', ellipsis: true },
          { title: '分类', dataIndex: 'category' },
          { title: '年龄段', dataIndex: 'age_group' },
          { title: '阅读量', dataIndex: 'views' },
          { title: '高级', dataIndex: 'is_premium', render: (v: number) => v ? '是' : '否' },
          {
            title: '操作', render: (_: unknown, r: Record<string, unknown>) => (
              <Popconfirm title="确认删除？" onConfirm={() => onDelete(r.id as string)}>
                <Button danger size="small">删除</Button>
              </Popconfirm>
            ),
          },
        ]} />

      <Modal title="新建文章" open={modal} onCancel={() => setModal(false)} onOk={() => form.submit()} width={600}>
        <Form form={form} layout="vertical" onFinish={onCreate}>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true }]}>
            <Select options={[
              { value: 'sleep', label: '睡眠' }, { value: 'emotion', label: '情绪' },
              { value: 'diet', label: '饮食' }, { value: 'sensory', label: '感统训练' },
            ]} />
          </Form.Item>
          <Form.Item name="ageGroup" label="年龄段" initialValue="0-6"><Input /></Form.Item>
          <Form.Item name="specialType" label="特殊类型"><Input placeholder="如：自闭症" /></Form.Item>
          <Form.Item name="content" label="内容" rules={[{ required: true }]}><Input.TextArea rows={6} /></Form.Item>
          <Form.Item name="isPremium" label="高级会员专享" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
