import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import db from './index.js';

const now = () => new Date().toISOString();

function seed() {
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (count > 0) {
    console.log('Database already seeded.');
    return;
  }

  const orgId = uuid();
  db.prepare('INSERT INTO orgs (id, name, contact_phone, created_at) VALUES (?, ?, ?, ?)').run(
    orgId, '阳光特教康复中心', '400-888-6688', now()
  );

  const users = [
    { phone: '13800000001', password: '123456', name: '张妈妈', role: 'parent', membership: 'family_premium' },
    { phone: '13800000002', password: '123456', name: '李老师', role: 'teacher', membership: 'institution' },
    { phone: '13800000003', password: '123456', name: '王园长', role: 'org_admin', membership: 'institution' },
    { phone: '13800000000', password: 'admin123', name: '系统管理员', role: 'admin', membership: 'institution' },
  ];

  const userIds = {};
  for (const u of users) {
    const id = uuid();
    userIds[u.phone] = id;
    db.prepare(
      'INSERT INTO users (id, phone, password_hash, name, role, membership, org_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, u.phone, bcrypt.hashSync(u.password, 10), u.name, u.role, u.membership, u.role !== 'parent' ? orgId : null, now());
  }

  const classId = uuid();
  db.prepare('INSERT INTO classes (id, org_id, name, teacher_id, created_at) VALUES (?, ?, ?, ?, ?)').run(
    classId, orgId, '向日葵班', userIds['13800000002'], now()
  );

  const children = [
    { userPhone: '13800000001', nickname: '小星星', age: 4, gender: '男', special: '自闭症', classId: null },
    { userPhone: '13800000001', nickname: '小月亮', age: 2, gender: '女', special: null, classId: null },
    { userPhone: '13800000002', nickname: '小明', age: 5, gender: '男', special: '多动症', classId },
    { userPhone: '13800000002', nickname: '小红', age: 4, gender: '女', special: null, classId },
    { userPhone: '13800000002', nickname: '小刚', age: 3, gender: '男', special: '发育迟缓', classId },
  ];

  const childIds = [];
  for (const c of children) {
    const id = uuid();
    childIds.push(id);
    db.prepare(
      'INSERT INTO children (id, user_id, nickname, age, gender, special_needs, class_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, userIds[c.userPhone], c.nickname, c.age, c.gender, c.special, c.classId, now());
  }

  const deviceTypes = ['nirs', 'ppg', 'exoskeleton'];
  for (let i = 0; i < childIds.length; i++) {
    for (const type of deviceTypes) {
      db.prepare(
        'INSERT INTO devices (id, user_id, child_id, name, type, mac_address, battery, status, last_seen, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        uuid(),
        userIds[i < 2 ? '13800000001' : '13800000002'],
        childIds[i],
        `${type.toUpperCase()}-${childIds[i].slice(0, 4)}`,
        type,
        `AA:BB:CC:DD:${String(i).padStart(2, '0')}:${type.slice(0, 2).toUpperCase()}`,
        60 + Math.floor(Math.random() * 40),
        'online',
        now(),
        now()
      );
    }
  }

  const emotions = ['calm', 'sleepy', 'excited', 'irritable', 'tense'];
  const stages = ['awake', 'light', 'deep', 'rem'];

  for (const childId of childIds) {
    for (let h = 0; h < 24; h++) {
      const t = new Date();
      t.setHours(h, 0, 0, 0);
      db.prepare(
        `INSERT INTO monitoring_snapshots (child_id, emotion, sleep_stage, heart_rate, breath_rate, body_movement,
         exoskeleton_mode, exoskeleton_force, exoskeleton_battery, recorded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        childId,
        emotions[Math.floor(Math.random() * emotions.length)],
        stages[Math.floor(Math.random() * stages.length)],
        70 + Math.floor(Math.random() * 30),
        16 + Math.floor(Math.random() * 8),
        Math.floor(Math.random() * 5),
        'horizontal',
        'standard',
        75,
        t.toISOString()
      );
    }
  }

  const articles = [
    { title: '0-2岁宝宝睡眠规律指南', category: 'sleep', age: '0-2', special: null, premium: 0 },
    { title: '如何识别自闭症儿童的睡眠信号', category: 'sleep', age: '3-6', special: '自闭症', premium: 1 },
    { title: '多动症儿童睡前仪式建立', category: 'emotion', age: '3-6', special: '多动症', premium: 0 },
    { title: '感统训练与助眠的关系', category: 'sensory', age: '3-6', special: null, premium: 0 },
    { title: '外骨骼抱睡正确姿势视频教程', category: 'sleep', age: '0-6', special: null, premium: 0, video: true },
    { title: '夜醒频繁？试试这5个安抚技巧', category: 'sleep', age: '0-2', special: null, premium: 0 },
  ];

  for (const a of articles) {
    db.prepare(
      'INSERT INTO articles (id, title, category, age_group, special_type, content, video_url, is_premium, views, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      uuid(),
      a.title,
      a.category,
      a.age,
      a.special,
      `${a.title}的详细内容...\n\n童梦AI专家团队为您精心编写，结合NIRS无感监测数据与临床实践经验，帮助照护者科学助眠。`,
      a.video ? 'https://example.com/video/demo.mp4' : null,
      a.premium,
      Math.floor(Math.random() * 500),
      now()
    );
  }

  db.prepare(
    'INSERT INTO soothe_records (id, child_id, user_id, trigger_type, sound_type, light_brightness, light_color, posture, force_level, duration_min, effect_minutes_saved, started_at, ended_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(uuid(), childIds[0], userIds['13800000001'], 'auto', 'rain', 40, 'warm', 'horizontal', 'gentle', 30, 12, new Date(Date.now() - 86400000).toISOString(), new Date(Date.now() - 86400000 + 1800000).toISOString());

  console.log('Seed completed. Demo accounts:');
  console.log('  家长: 13800000001 / 123456');
  console.log('  教师: 13800000002 / 123456');
  console.log('  园长: 13800000003 / 123456');
  console.log('  管理员: 13800000000 / admin123');
}

seed();
