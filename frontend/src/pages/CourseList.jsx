import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Button, Modal, Form, Input, Select, Upload, message, 
  Space, Tag, Typography, Popconfirm 
} from 'antd';
import { 
  UploadOutlined, EyeOutlined, DeleteOutlined, FilePdfOutlined,
  FilePptOutlined, FileWordOutlined, VideoCameraOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { courseApi, departmentApi } from '../services/api';

const { Title } = Typography;
const { TextArea } = Input;

const fileTypeIcons = {
  pdf: <FilePdfOutlined style={{ color: '#ff4d4f' }} />,
  ppt: <FilePptOutlined style={{ color: '#fa8c16' }} />,
  word: <FileWordOutlined style={{ color: '#1890ff' }} />,
  video: <VideoCameraOutlined style={{ color: '#52c41a' }} />
};

const fileTypeLabels = {
  pdf: 'PDF文档',
  ppt: 'PPT演示',
  word: 'Word文档',
  video: '视频'
};

function CourseList() {
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    loadCourses();
    loadDepartments();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const res = await courseApi.getAll();
      setCourses(res.data);
    } catch (err) {
      message.error('加载课件失败');
    }
    setLoading(false);
  };

  const loadDepartments = async () => {
    try {
      const res = await departmentApi.getAll();
      setDepartments(res.data);
    } catch (err) {
      console.error('加载部门失败:', err);
    }
  };

  const handleUpload = async (values) => {
    const formData = new FormData();
    formData.append('file', values.file.file);
    formData.append('title', values.title);
    formData.append('description', values.description || '');
    if (values.department_id) {
      formData.append('department_id', values.department_id);
    }

    try {
      await courseApi.create(formData);
      message.success('上传成功');
      setModalVisible(false);
      form.resetFields();
      loadCourses();
    } catch (err) {
      message.error('上传失败');
    }
  };

  const handleDelete = async (id) => {
    try {
      await courseApi.delete(id);
      message.success('删除成功');
      loadCourses();
    } catch (err) {
      message.error('删除失败');
    }
  };

  const columns = [
    {
      title: '类型',
      dataIndex: 'file_type',
      key: 'file_type',
      width: 80,
      render: (type) => fileTypeIcons[type] || type
    },
    {
      title: '课件名称',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <a onClick={() => navigate(`/courses/${record.id}`)}>{text}</a>
      )
    },
    {
      title: '文件名',
      dataIndex: 'file_name',
      key: 'file_name',
      ellipsis: true
    },
    {
      title: '所属部门',
      dataIndex: 'department_name',
      key: 'department_name',
      render: (text) => text || <Tag>通用</Tag>
    },
    {
      title: '格式',
      dataIndex: 'file_type',
      key: 'type',
      width: 100,
      render: (type) => <Tag>{fileTypeLabels[type] || type}</Tag>
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button 
            type="link" 
            icon={<EyeOutlined />}
            onClick={() => navigate(`/courses/${record.id}`)}
          >
            查看
          </Button>
          <Popconfirm
            title="确定删除此课件？"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <Card
        title={<Title level={3} style={{ margin: 0 }}>📚 课件管理</Title>}
        extra={
          <Button type="primary" icon={<UploadOutlined />} onClick={() => setModalVisible(true)}>
            上传课件
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={courses}
          rowKey="id"
          loading={loading}
        />
      </Card>

      <Modal
        title="上传课件"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpload}
        >
          <Form.Item
            name="title"
            label="课件名称"
            rules={[{ required: true, message: '请输入课件名称' }]}
          >
            <Input placeholder="请输入课件名称" />
          </Form.Item>

          <Form.Item
            name="description"
            label="课件描述"
          >
            <TextArea rows={3} placeholder="请输入课件描述（选填）" />
          </Form.Item>

          <Form.Item
            name="department_id"
            label="所属部门"
          >
            <Select placeholder="选择部门（选填，不选则为通用课件）">
              {departments.map(dept => (
                <Select.Option key={dept.id} value={dept.id}>
                  {dept.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="file"
            label="上传文件"
            rules={[{ required: true, message: '请选择文件' }]}
          >
            <Upload
              maxCount={1}
              accept=".pdf,.ppt,.pptx,.doc,.docx,.mp4,.webm,.ogg"
              beforeUpload={() => false}
            >
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
          </Form.Item>

          <div style={{ color: '#999', marginBottom: 16 }}>
            支持格式：PDF、PPT、Word、MP4/WebM/OGG视频
          </div>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              上传
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default CourseList;
