import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Table, Tag, Space, Progress } from 'antd';
import {
  BookOutlined,
  QuestionCircleOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { statsApi, trainingApi, recentApi } from '../services/api';

const { Title } = Typography;

function Dashboard() {
  const [stats, setStats] = useState({
    courses: 0,
    questions: 0,
    departments: 0,
    employees: 0,
    trainings: 0
  });
  const [trainings, setTrainings] = useState([]);
  const [recentCompletions, setRecentCompletions] = useState([]);

  useEffect(() => {
    loadStats();
    loadTrainings();
    loadRecentCompletions();
  }, []);

  const loadStats = async () => {
    try {
      const res = await statsApi.get();
      setStats(res.data);
    } catch (err) {
      console.error('加载统计失败:', err);
    }
  };

  const loadTrainings = async () => {
    try {
      const res = await trainingApi.getAll();
      setTrainings(res.data);
    } catch (err) {
      console.error('加载培训失败:', err);
    }
  };

  const loadRecentCompletions = async () => {
    try {
      const res = await recentApi.getCompletions();
      setRecentCompletions(res.data);
    } catch (err) {
      console.error('加载最近完成记录失败:', err);
    }
  };

  // 计算总体完成率
  const totalCompleted = trainings.reduce((sum, t) => sum + (t.completed_count || 0), 0);
  const avgCompletionRate = trainings.length > 0 
    ? Math.round(trainings.reduce((sum, t) => {
        const rate = t.completed_count > 0 ? 100 : 0;
        return sum + rate;
      }, 0) / trainings.length)
    : 0;

  const recentColumns = [
    {
      title: '员工',
      dataIndex: 'employee_name',
      key: 'employee_name',
      render: (text, record) => text || record.user_name
    },
    {
      title: '培训',
      dataIndex: 'training_title',
      key: 'training_title',
      ellipsis: true
    },
    {
      title: '得分',
      dataIndex: 'score',
      key: 'score',
      render: (score) => (
        <span style={{ 
          color: score >= 60 ? '#52c41a' : '#ff4d4f',
          fontWeight: 'bold' 
        }}>
          {score}分
        </span>
      )
    },
    {
      title: '结果',
      key: 'result',
      render: (_, record) => (
        record.score >= 60 ? 
          <Tag icon={<CheckCircleOutlined />} color="success">通过</Tag> : 
          <Tag icon={<ClockCircleOutlined />} color="warning">未通过</Tag>
      )
    },
    {
      title: '完成时间',
      dataIndex: 'completed_at',
      key: 'completed_at',
      width: 180
    }
  ];

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
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="培训完成总人次"
              value={totalCompleted}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* 培训完成率概览 */}
      {trainings.length > 0 && (
        <Card style={{ marginTop: 16 }} title="📈 培训完成率">
          <Row gutter={[16, 16]}>
            {trainings.slice(0, 6).map(t => (
              <Col xs={24} sm={12} md={8} key={t.id}>
                <Card type="inner" size="small">
                  <div style={{ marginBottom: 8 }}>
                    <strong>{t.title}</strong>
                  </div>
                  <Space>
                    <Progress 
                      type="circle" 
                      size={48} 
                      percent={t.completed_count > 0 ? 100 : 0}
                      strokeColor={t.completed_count > 0 ? '#52c41a' : '#d9d9d9'}
                      format={() => t.completed_count || 0}
                    />
                    <div>
                      <div style={{ color: '#666', fontSize: 12 }}>已完成人数</div>
                      <div style={{ fontWeight: 'bold' }}>{t.completed_count || 0}</div>
                    </div>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* 最近完成记录 */}
      {recentCompletions.length > 0 && (
        <Card style={{ marginTop: 16 }} title="📋 最近培训完成记录">
          <Table 
            columns={recentColumns} 
            dataSource={recentCompletions} 
            rowKey="id" 
            pagination={false}
            size="small"
          />
        </Card>
      )}

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
