import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography } from 'antd';
import {
  BookOutlined,
  QuestionCircleOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserOutlined
} from '@ant-design/icons';
import { statsApi } from '../services/api';

const { Title } = Typography;

function Dashboard() {
  const [stats, setStats] = useState({
    courses: 0,
    questions: 0,
    departments: 0,
    employees: 0,
    trainings: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await statsApi.get();
      setStats(res.data);
    } catch (err) {
      console.error('加载统计失败:', err);
    }
  };

  return (
    <div>
      <Title level={3}>📊 系统概览</Title>
      
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="课件总数"
              value={stats.courses}
              prefix={<BookOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="考题总数"
              value={stats.questions}
              prefix={<QuestionCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="部门数量"
              value={stats.departments}
              prefix={<TeamOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="员工数量"
              value={stats.employees}
              prefix={<UserOutlined style={{ color: '#13c2c2' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="培训任务"
              value={stats.trainings}
              prefix={<TrophyOutlined style={{ color: '#fa8c16' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 24 }}>
        <Title level={4}>🚀 快速开始</Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card type="inner" title="1. 上传课件">
              支持 PDF、PPT、Word、视频等多种格式的课件上传和在线预览。
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card type="inner" title="2. 创建考题">
              为课件配套创建考试题目，支持单选、多选、判断、填空等题型。
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card type="inner" title="3. 发起培训">
              选择课件和目标部门，创建培训任务并跟踪完成情况。
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
}

export default Dashboard;
