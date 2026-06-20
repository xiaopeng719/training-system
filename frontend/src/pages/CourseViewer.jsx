import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Card, Button, Typography, Space, Tag, message, Spin, Empty 
} from 'antd';
import { 
  ArrowLeftOutlined, FilePdfOutlined, FilePptOutlined, 
  FileWordOutlined, VideoCameraOutlined, DownloadOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import { courseApi } from '../services/api';
import axios from 'axios';

const { Title, Paragraph, Text } = Typography;

function CourseViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [studySeconds, setStudySeconds] = useState(0);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // 记住来源页面，用于返回
  const from = new URLSearchParams(location.search).get('from');

  useEffect(() => {
    loadCourse();
    startTimeRef.current = Date.now();
    // 启动计时器
    timerRef.current = setInterval(() => {
      setStudySeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => {
      // 离开页面时记录学习时长
      if (timerRef.current) clearInterval(timerRef.current);
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      if (duration > 5 && id && user.id) {
        axios.post('/api/study-records', {
          employee_id: user.id,
          course_id: id,
          duration,
          completed: duration > 60
        }).catch(() => {});
      }
    };
  }, [id]);

  const loadCourse = async () => {
    try {
      const res = await courseApi.getById(id);
      setCourse(res.data);
    } catch (err) {
      message.error('加载课件失败');
    }
    setLoading(false);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleBack = () => {
    if (from === 'my-trainings') navigate('/my-trainings');
    else if (from === 'trainings') navigate('/trainings');
    else if (from) navigate(from);
    else navigate(-1);
  };

  const renderFileViewer = () => {
    if (!course) return null;
    const fileUrl = `http://localhost:3001/${course.file_path}`;

    switch (course.file_type) {
      case 'pdf':
        return (
          <iframe
            src={fileUrl}
            width="100%"
            height="700"
            style={{ border: '1px solid #d9d9d9', borderRadius: 8 }}
            title={course.title}
          />
        );

      case 'video':
        return (
          <div style={{ textAlign: 'center' }}>
            <video controls width="100%" style={{ maxWidth: 800, backgroundColor: '#000', borderRadius: 8 }}>
              <source src={fileUrl} />
              您的浏览器不支持视频播放
            </video>
          </div>
        );

      case 'ppt':
      case 'word':
        // 有转换后的PDF，用iframe预览
        if (course.preview_path) {
          const pdfUrl = `http://localhost:3001/${course.preview_path}`;
          return (
            <div>
              <div style={{ marginBottom: 12 }}>
                <Space>
                  <Tag color="green">已转换为PDF预览</Tag>
                  <Button icon={<DownloadOutlined />} href={fileUrl} download={course.file_name} size="small">
                    下载原文件
                  </Button>
                </Space>
              </div>
              <iframe
                src={pdfUrl}
                width="100%"
                height="700"
                style={{ border: '1px solid #d9d9d9', borderRadius: 8 }}
                title={course.title}
              />
            </div>
          );
        }
        // 没有转换，只能下载
        return (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 80, marginBottom: 24 }}>
              {course.file_type === 'ppt' 
                ? <FilePptOutlined style={{ color: '#fa8c16' }} /> 
                : <FileWordOutlined style={{ color: '#1890ff' }} />}
            </div>
            <Title level={4}>{course.file_name}</Title>
            <Paragraph type="secondary" style={{ marginBottom: 32 }}>
              文件转换中，请稍后刷新页面，或下载后使用对应软件打开
            </Paragraph>
            <Space size="large">
              <Button type="primary" icon={<DownloadOutlined />} size="large" href={fileUrl} download={course.file_name}>
                下载文件
              </Button>
              <Button icon={<ArrowLeftOutlined />} size="large" onClick={handleBack}>
                返回
              </Button>
            </Space>
          </div>
        );

      default:
        return <Empty description="不支持预览此格式" />;
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;
  if (!course) return <Empty description="课件不存在" />;

  const typeColors = { pdf: 'red', ppt: 'orange', word: 'blue', video: 'green' };

  return (
    <Card
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={handleBack} />
          <Title level={4} style={{ margin: 0 }}>{course.title}</Title>
        </Space>
      }
      extra={
        <Space>
          <Tag icon={<ClockCircleOutlined />} color={studySeconds > 60 ? 'green' : 'blue'} style={{ fontSize: 14, padding: '2px 10px' }}>
            已学习 {formatTime(studySeconds)}
          </Tag>
          <Tag color={typeColors[course.file_type]}>{course.file_type?.toUpperCase()}</Tag>
        </Space>
      }
    >
      {course.description && <Paragraph style={{ marginBottom: 24 }}>{course.description}</Paragraph>}
      {renderFileViewer()}
    </Card>
  );
}

export default CourseViewer;
