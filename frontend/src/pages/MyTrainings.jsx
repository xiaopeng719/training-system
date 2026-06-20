import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, Typography, Space, message, Empty } from 'antd';
import { PlayCircleOutlined, EyeOutlined, BookOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title, Paragraph } = Typography;

function MyTrainings() {
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    loadMyTrainings();
  }, []);

  const loadMyTrainings = async () => {
    setLoading(true);
    try {
      // 获取所有培训，然后筛选与当前用户相关的
      const res = await axios.get('/api/trainings');
      const allTrainings = res.data;
      
      // 获取当前用户的培训进度
      const progressRes = await axios.get('/api/progress');
      const myProgress = progressRes.data.filter(p => p.user_name === user.name || p.user_name === user.id);
      const completedTrainingIds = new Set(myProgress.map(p => p.training_id));

      // 筛选出分配给当前用户或其部门的培训
      const myTrainings = allTrainings.map(t => ({
        ...t,
        completed: completedTrainingIds.has(t.id),
        myScore: myProgress.find(p => p.training_id === t.id)?.score
      }));

      setTrainings(myTrainings);
    } catch (err) {
      message.error('加载培训列表失败');
    }
    setLoading(false);
  };

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
          <Button type="link" icon={<EyeOutlined />} onClick={() => navigate(`/courses/${record.course_id}`)}>
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

  return (
    <div>
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
    </div>
  );
}

export default MyTrainings;
