import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Button, Modal, Form, Input, Space, message, 
  Typography, Popconfirm, Tooltip, Tag 
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined } from '@ant-design/icons';
import { departmentApi } from '../services/api';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

function DepartmentList() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const res = await departmentApi.getAll();
      setDepartments(res.data);
    } catch (err) {
      message.error('加载部门失败');
    }
    setLoading(false);
  };

  const handleSubmit = async (values) => {
    try {
      await departmentApi.create(values);
      message.success('创建成功');
      setModalVisible(false);
      form.resetFields();
      loadDepartments();
    } catch (err) {
      if (err.response?.data?.error?.includes('UNIQUE')) {
        message.error('部门名称已存在');
      } else {
        message.error('创建失败');
      }
    }
  };

  const columns = [
    {
      title: '部门名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => (
        <Space>
          <TeamOutlined style={{ color: '#1890ff' }} />
          <strong>{text}</strong>
        </Space>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180
    }
  ];

  return (
    <div>
      <Card
        title={<Title level={3} style={{ margin: 0 }}>🏢 部门管理</Title>}
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => {
              form.resetFields();
              setModalVisible(true);
            }}
          >
            新增部门
          </Button>
        }
      >
        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          管理公司部门结构，创建培训任务时可以选择目标部门。
        </Paragraph>
        
        <Table
          columns={columns}
          dataSource={departments}
          rowKey="id"
          loading={loading}
        />
      </Card>

      <Modal
        title="新增部门"
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
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="部门名称"
            rules={[
              { required: true, message: '请输入部门名称' },
              { max: 50, message: '部门名称不能超过50个字符' }
            ]}
          >
            <Input placeholder="请输入部门名称" />
          </Form.Item>

          <Form.Item
            name="description"
            label="部门描述"
          >
            <TextArea rows={3} placeholder="请输入部门描述（选填）" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                创建
              </Button>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default DepartmentList;
