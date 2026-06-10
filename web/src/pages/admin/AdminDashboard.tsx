import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import { UserOutlined, TeamOutlined, MobileOutlined, AlertOutlined, ReadOutlined } from '@ant-design/icons';
import { api } from '../../services/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, children: 0, devices: 0, articles: 0, alerts: 0 });

  useEffect(() => {
    api.adminStats().then(setStats).catch(() => {});
  }, []);

  const items = [
    { title: '注册用户', value: stats.users, icon: <UserOutlined />, color: '#7eb8da' },
    { title: '儿童档案', value: stats.children, icon: <TeamOutlined />, color: '#a8d8a8' },
    { title: '绑定设备', value: stats.devices, icon: <MobileOutlined />, color: '#f4a7b9' },
    { title: '育儿文章', value: stats.articles, icon: <ReadOutlined />, color: '#ffd666' },
    { title: '未处理报警', value: stats.alerts, icon: <AlertOutlined />, color: '#ff7875' },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>数据概览</h2>
      <Row gutter={[16, 16]}>
        {items.map(item => (
          <Col xs={24} sm={12} lg={8} xl={4} key={item.title}>
            <Card>
              <Statistic title={item.title} value={item.value} prefix={item.icon} valueStyle={{ color: item.color }} />
            </Card>
          </Col>
        ))}
      </Row>
      <Card style={{ marginTop: 24 }} title="系统说明">
        <p>童梦AI 管理后台用于管理用户、设备、育儿内容及监控异常报警。</p>
        <p>实时监测数据通过 WebSocket 推送，设备模拟器每 5 秒更新一次。</p>
      </Card>
    </div>
  );
}
