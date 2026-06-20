import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Button, Modal, Form, Input, Select, Space, 
  message, Typography, Popconfirm, Tooltip, Tag 
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import { departmentApi } from '../services/api';
import axios from 'axios';

const { Title } = Typography;
const { TextArea } = Input;

function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadEmployees();
    loadDepartments();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/employees');
      setEmployees(res.data);
    } catch (err) {
      message.error('加载员工失败');
    }
    setLoading(false);
  };

  const loadDepartments = async () => {
    try {
      const res = await departmentApi.getAll();
      setDepartments(res.data);
    } catch (err) {}
  };

  const handleSubmit = async (values) => {
    try {
      if (editing) {
        await axios.put(`/api/employees/${editing.id}`, values);
        message.success('更新成功');
      } else {
        await axios.post('/api/employees', values);
        message.success('创建成功');
      }
      setModalVisible(false);
      setEditing(null);
      form.resetFields();
      loadEmployees();
    } catch (err) {
      message.error(err.response?.data?.error || '操作失败');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/employees/${id}`);
      message.success('删除成功');
      loadEmployees();
    } catch (err) {
      message.error('删除失败');
    }
  };

  const columns = [
    {
      title: '账号',
      dataIndex: 'username',
      key: 'username',
      render: (text) => text || '-'
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Space><UserOutlined style={{ color: '#1890ff' }} /><strong>{text}</strong></Space>
    },
    {
      title: '部门',
      dataIndex: 'department_name',
      key: 'department_name',
      render: (text) => <Tag color="blue">{text}</Tag>
    },
    {
      title: '职位',
      dataIndex: 'position',
      key: 'position',
      render: (text) => text || '-'
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      render: (text) => text || '-'
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      render: (text) => text || '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Tooltip title="编辑">
            <Button type="link" icon={<EditOutlined />} onClick={() => {
              setEditing(record);
              form.setFieldsValue(record);
              setModalVisible(true);
            }} />
          </Tooltip>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Tooltip title="删除">
              <Button type="link" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <Card
        title={<Title level={3} style={{ margin: 0 }}>👥 员工管理</Title>}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setEditing(null);
            form.resetFields();
            setModalVisible(true);
          }}>
            添加员工
          </Button>
        }
      >
        <Table columns={columns} dataSource={employees} rowKey="id" loading={loading} />
      </Card>

      <Modal
        title={editing ? '编辑员工' : '添加员工'}
        open={modalVisible}
        onCancel={() => { setModalVisible(false); setEditing(null); form.resetFields(); }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="username" label="用户账号" rules={[{ required: true, message: '请输入用户账号' }]}>
            <Input placeholder="用于登录的账号（如 zhangsan）" />
          </Form.Item>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item name="department_id" label="所属部门" rules={[{ required: true, message: '请选择部门' }]}>
            <Select placeholder="选择部门">
              {departments.map(d => <Select.Option key={d.id} value={d.id}>{d.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="position" label="职位">
            <Input placeholder="请输入职位（选填）" />
          </Form.Item>
          <Form.Item name="phone" label="手机号">
            <Input placeholder="请输入手机号（选填）" />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input placeholder="请输入邮箱（选填）" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">{editing ? '更新' : '添加'}</Button>
              <Button onClick={() => { setModalVisible(false); setEditing(null); form.resetFields(); }}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default EmployeeList;
