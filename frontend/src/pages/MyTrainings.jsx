import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, Typography, Space, message, Empty, Row, Col, Statistic } from 'antd';
import { PlayCircleOutlined, EyeOutlined, BookOutlined, CheckCircleOutlined, ClockCircleOutlined, TrophyOutlined, PercentageOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { trainingApi, progressApi } from '../services/api';
import dayjs from 'dayjs';

const { Title, Paragraph } = Typography;

function MyTrainings() {
  const [trainings, setTrainings] = useState([]);
  const [myProgress, setMyProgress] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    loadMyTrainings();
  }, []);

  const loadMyTrainings = async () => {
    setLoading(true);
    try {
      const [trainingsRes, progressRes] = await Promise.all([
        trainingApi.getAll(),
        progressApi.getAll()
      ]);
      
      const allTrainings = trainingsRes.data;
      const allProgress = progressRes.data;
      
      // 筛选当前用户的进度记录
      const userProgress = allProgress.filter(p => p.user_name === user.name || p.user_name === user.id);
      setMyProgress(userProgress);
      
      const completedTrainingIds = new Set(userProgress.map(p => p.training_id));

      const myTrainings = allTrainings.map(t => ({
        ...t,
        completed: completedTrainingIds.has(t.id),
        myScore: userProgress.find(p => p.training_id === t.id)?.score
      }));

      setTrainings(myTrainings);
    } catch (err) {
      message.error('加载培训列表失败');
    }
    setLoading(false);
  };

  // 计算统计数据
  const getStats = () => {
    if (myProgress.length === 0) return { avg: 0, passRate: 0, total: 0, passed: 0 };
    const scores = myProgress.map(p => p.score || 0);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const passed = scores.filter(s => s >= 60).length;
    const passRate = Math.round((passed / scores.length) * 100);
    return { avg, passRate, total: scores.length, passed };
  };

  const stats = getStats();

  const getStatusTag = (record) => {
    if (record.completed) {
      return <Tag icon={<CheckCircleOutlined />} color="success">已完成 {record.myScore}分</Tag>;
    }
    if (record.deadline && dayjs(record.deadline).isBefore(dayjs())) {
      return <Tag color="red">已过期</Tag>;
    }
    return <Tag icon={<ClockCircleOutlined />} color="processing">待完成</Tag>;
  };

  const columns = [
    {
      title: '培训名称',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => <a onClick={() => navigate(`/trainings/${record.id}`)}>{text}</a>
    },
    { title: '课件', dataIndex: 'course_title', key: 'course_title', ellipsis: true },
    { title: '部门', dataIndex: 'department_name', key: 'department_name', render: t => <Tag color="blue">{t}</Tag> },
    { title: '截止时间', dataIndex: 'deadline', key: 'deadline', width: 180, render: t => t || '无限制' },
    { title: '状态', key: 'status', width: 150, render: (_, r) => getStatusTag(r) },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => navigate(`/courses/${record.course_id}?from=my-trainings`)}>
            学习课件
          </Button>
          {!record.completed && (
            <Button type="primary" link icon={<PlayCircleOutlined />} onClick={() => navigate(`/exam/${record.id}`)}>
              参加考试
            </Button>
          )}
          {record.completed && (
            <Button type="link" onClick={() => navigate(`/exam/${record.id}`)}>
              重新考试
            </Button>
          )}
        </Space>
      )
    }
  ];

  // 历史成绩列表
  const historyColumns = [
    {
      title: '培训名称',
      dataIndex: 'training_title',
      key: 'training_title',
      render: (text) => text || '未知培训'
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
      key: 'completed_at'
    }
  ];

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="完成培训数"
              value={stats.total}
              prefix={<BookOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="通过数"
              value={stats.passed}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="平均分"
              value={stats.avg}
              suffix="分"
              prefix={<TrophyOutlined style={{ color: '#fa8c16' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="通过率"
              value={stats.passRate}
              suffix="%"
              prefix={<PercentageOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <Space>
            <BookOutlined />
            <Title level={4} style={{ margin: 0 }}>我的培训</Title>
          </Space>
        }
      >
        {trainings.length === 0 && !loading ? (
          <Empty description="暂无培训任务" />
        ) : (
          <Table columns={columns} dataSource={trainings} rowKey="id" loading={loading} />
        )}
      </Card>

      {/* 历史成绩 */}
      {myProgress.length > 0 && (
        <Card
          title={
            <Space>
              <TrophyOutlined />
              <Title level={4} style={{ margin: 0 }}>历史成绩</Title>
            </Space>
          }
          style={{ marginTop: 16 }}
        >
          <Table 
            columns={historyColumns} 
            dataSource={[...myProgress].sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))} 
            rowKey="id" 
            pagination={{ pageSize: 10 }}
          />
        </Card>
      )}
    </div>
  );
}

export default MyTrainings;
