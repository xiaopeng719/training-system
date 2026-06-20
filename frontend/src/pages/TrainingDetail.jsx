import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, Button, Typography, Space, Tag, Table, message, Spin, Descriptions, Progress 
} from 'antd';
import { 
  ArrowLeftOutlined, PlayCircleOutlined, TrophyOutlined,
  CheckCircleOutlined, ClockCircleOutlined, DownloadOutlined 
} from '@ant-design/icons';
import { trainingApi, progressApi } from '../services/api';
import dayjs from 'dayjs';

const { Title, Paragraph } = Typography;

function TrainingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [training, setTraining] = useState(null);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTraining();
    loadProgress();
  }, [id]);

  const loadTraining = async () => {
    try {
      const res = await trainingApi.getById(id);
      setTraining(res.data);
    } catch (err) {
      message.error('加载培训详情失败');
    }
    setLoading(false);
  };

  const loadProgress = async () => {
    try {
      const res = await progressApi.getByTraining(id);
      setProgress(res.data);
    } catch (err) {
      console.error('加载进度失败:', err);
    }
  };

  const calculateStats = () => {
    if (!progress.length) return { avg: 0, max: 0, pass: 0 };
    
    const scores = progress.map(p => p.score || 0);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const max = Math.max(...scores);
    const pass = scores.filter(s => s >= 60).length;
    
    return { avg, max, pass };
  };

  const progressColumns = [
    {
      title: '姓名',
      dataIndex: 'user_name',
      key: 'user_name'
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
      title: '完成时间',
      dataIndex: 'completed_at',
      key: 'completed_at'
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record) => (
        record.score >= 60 ? 
          <Tag icon={<CheckCircleOutlined />} color="success">通过</Tag> : 
          <Tag icon={<ClockCircleOutlined />} color="warning">未通过</Tag>
      )
    }
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!training) {
    return <div>培训任务不存在</div>;
  }

  const stats = calculateStats();
  const isExpired = training.deadline && dayjs(training.deadline).isBefore(dayjs());

  return (
    <div>
      <Card
        title={
          <Space>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate('/trainings')}
            />
            <Title level={4} style={{ margin: 0 }}>{training.title}</Title>
          </Space>
        }
        extra={
          <Space>
            <Button 
              icon={<DownloadOutlined />} 
              href={`/api/export/training/${id}`}
            >
              导出报告
            </Button>
            {isExpired ? (
              <Tag color="red">已过期</Tag>
            ) : (
              <Button 
                type="primary" 
                icon={<PlayCircleOutlined />}
                onClick={() => navigate(`/exam/${id}`)}
              >
                开始考试
              </Button>
            )}
          </Space>
        }
      >
        <Descriptions bordered column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="关联课件">
            <a onClick={() => navigate(`/courses/${training.course_id}?from=trainings`)}>{training.course_title}</a>
          </Descriptions.Item>
          <Descriptions.Item label="目标部门">
            <Tag color="blue">{training.department_name}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="截止时间">
            {training.deadline || '无限制'}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {training.created_at}
          </Descriptions.Item>
          {training.description && (
            <Descriptions.Item label="培训说明" span={2}>
              {training.description}
            </Descriptions.Item>
          )}
          {training.min_study_time > 0 && (
            <Descriptions.Item label="最低学习时长">
              <Tag color="orange">{Math.ceil(training.min_study_time / 60)} 分钟</Tag>
            </Descriptions.Item>
          )}
        </Descriptions>

        {training.questions && training.questions.length > 0 && (
          <Card type="inner" title="考试信息" style={{ marginTop: 16 }}>
            <Space size="large">
              <div>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                  {training.questions.length}
                </div>
                <div style={{ color: '#666' }}>题目数量</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                  60分
                </div>
                <div style={{ color: '#666' }}>及格分数</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#722ed1' }}>
                  {training.completed_count || 0}
                </div>
                <div style={{ color: '#666' }}>已完成人数</div>
              </div>
              {training.avg_score > 0 && (
                <div>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fa8c16' }}>
                    {training.avg_score}分
                  </div>
                  <div style={{ color: '#666' }}>平均分</div>
                </div>
              )}
            </Space>
          </Card>
        )}
      </Card>

      <Card 
        title={
          <Space>
            <TrophyOutlined />
            <span>培训进度统计</span>
          </Space>
        } 
        style={{ marginTop: 16 }}
      >
        {progress.length > 0 ? (
          <>
            <Space size="large" style={{ marginBottom: 24 }}>
              <Card type="inner">
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1890ff' }}>
                    {progress.length}
                  </div>
                  <div>参与人数</div>
                </div>
              </Card>
              <Card type="inner">
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 'bold', color: '#52c41a' }}>
                    {stats.avg}分
                  </div>
                  <div>平均分</div>
                </div>
              </Card>
              <Card type="inner">
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 'bold', color: '#722ed1' }}>
                    {stats.max}分
                  </div>
                  <div>最高分</div>
                </div>
              </Card>
              <Card type="inner">
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 'bold', color: '#fa8c16' }}>
                    {stats.pass}/{progress.length}
                  </div>
                  <div>通过人数</div>
                </div>
              </Card>
            </Space>

            <Table
              columns={progressColumns}
              dataSource={progress}
              rowKey="id"
              pagination={false}
            />
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            暂无培训记录
          </div>
        )}
      </Card>
    </div>
  );
}

export default TrainingDetail;
