import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu, ConfigProvider, theme, Tag, Space, Dropdown, message, Modal, Form, Input, Button } from 'antd';
import {
  BookOutlined, QuestionCircleOutlined, TeamOutlined, TrophyOutlined,
  DashboardOutlined, UserOutlined, LogoutOutlined, KeyOutlined
} from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import axios from 'axios';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CourseList from './pages/CourseList';
import CourseViewer from './pages/CourseViewer';
import QuestionList from './pages/QuestionList';
import DepartmentList from './pages/DepartmentList';
import EmployeeList from './pages/EmployeeList';
import TrainingList from './pages/TrainingList';
import TrainingDetail from './pages/TrainingDetail';
import ExamPage from './pages/ExamPage';
import MyTrainings from './pages/MyTrainings';

const { Header, Sider, Content } = Layout;

function AppContent({ user, onLogout }) {
  const location = useLocation();
  const isAdmin = user.role === 'admin';
  const [pwdModalVisible, setPwdModalVisible] = useState(false);
  const [pwdForm] = Form.useForm();

  const allMenuItems = [
    { key: '/', icon: <DashboardOutlined />, label: <Link to="/">仪表盘</Link>, adminOnly: true },
    { key: '/courses', icon: <BookOutlined />, label: <Link to="/courses">课件管理</Link>, adminOnly: true },
    { key: '/questions', icon: <QuestionCircleOutlined />, label: <Link to="/questions">考题管理</Link>, adminOnly: true },
    { key: '/departments', icon: <TeamOutlined />, label: <Link to="/departments">部门管理</Link>, adminOnly: true },
    { key: '/employees', icon: <UserOutlined />, label: <Link to="/employees">员工管理</Link>, adminOnly: true },
    { key: '/trainings', icon: <TrophyOutlined />, label: <Link to="/trainings">培训任务</Link>, adminOnly: true },
    { key: '/my-trainings', icon: <BookOutlined />, label: <Link to="/my-trainings">我的培训</Link>, adminOnly: false }
  ];

  const menuItems = isAdmin ? allMenuItems : allMenuItems.filter(i => !i.adminOnly);

  const handleChangePassword = async (values) => {
    try {
      await axios.put('/api/user/password', {
        old_password: values.old_password,
        new_password: values.new_password
      });
      message.success('密码修改成功');
      setPwdModalVisible(false);
      pwdForm.resetFields();
    } catch (err) {
      message.error(err.response?.data?.error || '修改失败');
    }
  };

  const userMenu = {
    items: [
      { key: 'role', label: <Tag color={isAdmin ? 'gold' : 'blue'}>{isAdmin ? '管理员' : '普通员工'}</Tag>, disabled: true },
      { type: 'divider' },
      { key: 'password', icon: <KeyOutlined />, label: '修改密码' },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true }
    ],
    onClick: ({ key }) => {
      if (key === 'logout') onLogout();
      if (key === 'password') setPwdModalVisible(true);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={200} theme="light">
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <h2 style={{ margin: 0, color: '#1890ff' }}>📚 培训系统</h2>
        </div>
        <Menu mode="inline" selectedKeys={[location.pathname]} items={menuItems} style={{ borderRight: 0 }} />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <Tag color={isAdmin ? 'gold' : 'blue'}>{isAdmin ? '👑 管理员' : '👤 员工'}</Tag>
          <Dropdown menu={userMenu}>
            <Space style={{ cursor: 'pointer' }}>
              <UserOutlined />
              <span>{user.name}</span>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ padding: 24, background: '#f5f5f5' }}>
          <Routes>
            <Route path="/" element={isAdmin ? <Dashboard /> : <MyTrainings />} />
            {isAdmin && <>
              <Route path="/courses" element={<CourseList />} />
              <Route path="/questions" element={<QuestionList />} />
              <Route path="/departments" element={<DepartmentList />} />
              <Route path="/employees" element={<EmployeeList />} />
              <Route path="/trainings" element={<TrainingList />} />
            </>}
            <Route path="/courses/:id" element={<CourseViewer />} />
            <Route path="/my-trainings" element={<MyTrainings />} />
            <Route path="/trainings/:id" element={<TrainingDetail />} />
            <Route path="/exam/:trainingId" element={<ExamPage />} />
          </Routes>
        </Content>
      </Layout>

      <Modal title="修改密码" open={pwdModalVisible} onCancel={() => { setPwdModalVisible(false); pwdForm.resetFields(); }} footer={null}>
        <Form form={pwdForm} layout="vertical" onFinish={handleChangePassword}>
          <Form.Item name="old_password" label="原密码" rules={[{ required: true, message: '请输入原密码' }]}>
            <Input.Password placeholder="请输入原密码" />
          </Form.Item>
          <Form.Item name="new_password" label="新密码" rules={[{ required: true, message: '请输入新密码' }, { min: 6, message: '密码至少6位' }]}>
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item name="confirm_password" label="确认新密码" rules={[{ required: true, message: '请确认新密码' }, ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('new_password') === value) return Promise.resolve();
              return Promise.reject(new Error('两次密码不一致'));
            }
          })]}>
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">确认修改</Button>
              <Button onClick={() => { setPwdModalVisible(false); pwdForm.resetFields(); }}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(JSON.parse(savedUser));
    }
    setChecking(false);
  }, []);

  const handleLogin = (userData) => setUser(userData);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    message.success('已退出登录');
  };

  if (checking) return null;

  if (!user) {
    return (
      <ConfigProvider locale={zhCN} theme={{ algorithm: theme.defaultAlgorithm }}>
        <Login onLogin={handleLogin} />
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider locale={zhCN} theme={{ algorithm: theme.defaultAlgorithm }}>
      <Router>
        <AppContent user={user} onLogout={handleLogout} />
      </Router>
    </ConfigProvider>
  );
}

export default App;
