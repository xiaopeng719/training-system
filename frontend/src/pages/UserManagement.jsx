import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Button, Modal, Form, Input, Select, Space, message, 
  Typography, Popconfirm, Tag, Tooltip 
} from 'antd';
import { EditOutlined, DeleteOutlined, UserOutlined, KeyOutlined } from '@ant-design/icons';
import { userApi } from '../services/api';

const { Title, Paragraph } = Typography;

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await userApi.getAll();
      setUsers(res.data);
    } catch (err) {
      message.error('加载用户列表失败');
    }
    setLoading(false);
  };

  const handleSubmit = async (values) => {
    try {
      await userApi.update(editingUser.id, values);
      message.success('更新成功');
      setModalVisible(false);
      setEditingUser(null);
      form.resetFields();
      loadUsers();
    } catch (err) {
      message.error(err.response?.data?.error || '更新失败');
    }
  };

  const handleEdit = (record) => {
    setEditingUser(record);
    form.setFieldsValue({ name: record.name, role: record.role });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await userApi.delete(id);
      message.success('删除成功');
      loadUsers();
    } catch (err) {
      message.error(err.response?.data?.error || '删除失败');
    }
  };

  const handleResetPassword = async (record) => {
    try {
      await userApi.update(record.id, { password: '123456' });
      message.success(`已将 ${record.name} 的密码重置为 123456`);
    } catch (err) {
      message.error('重置密码失败');
    }
  };

  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      render: (text) => (
        <Space>
          <UserOutlined style={{ color: '#1890ff' }} />
          <strong>{text}</strong>
        </Space>
      )
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={role === 'admin' ? 'gold' : 'blue'}>
          {role === 'admin' ? '管理员' : '普通员工'}
        </Tag>
      )
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
      width: 200,
      render: (_, record) => (
        <Space>
          <Tooltip title="编辑">
            <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Tooltip title="重置密码">
            <Popconfirm title="确定将密码重置为 123456？" onConfirm={() => handleResetPassword(record)}>
              <Button type="link" icon={<KeyOutlined />} />
            </Popconfirm>
          </Tooltip>
          <Popconfirm title="确定删除该用户？" onConfirm={() => handleDelete(record.id)}>
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
        title={<Title level={3} style={{ margin: 0 }}>👥 用户管理</Title>}
      >
        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          管理系统用户账号，可编辑角色、重置密码。
        </Paragraph>
        
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
        />
      </Card>

      <Modal
        title="编辑用户"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingUser(null);
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
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>

          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="选择角色">
              <Select.Option value="admin">管理员</Select.Option>
              <Select.Option value="user">普通员工</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="password"
            label="新密码"
            extra="留空则不修改密码"
          >
            <Input.Password placeholder="输入新密码（选填）" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                更新
              </Button>
              <Button onClick={() => {
                setModalVisible(false);
                setEditingUser(null);
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

export default UserManagement;
