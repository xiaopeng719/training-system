import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Button, Modal, Form, Input, Select, DatePicker, Space, 
  message, Tag, Typography, Popconfirm, Checkbox 
} from 'antd';
import { PlusOutlined, EyeOutlined, DeleteOutlined, PlayCircleOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { trainingApi, courseApi, departmentApi, questionApi } from '../services/api';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;

function TrainingList() {
  const [trainings, setTrainings] = useState([]);
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [courseQuestions, setCourseQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    loadTrainings(); loadCourses(); loadDepartments(); loadEmployees();
  }, []);

  const loadTrainings = async () => { setLoading(true); try { const r = await trainingApi.getAll(); setTrainings(r.data); } catch(e){} setLoading(false); };
  const loadCourses = async () => { try { const r = await courseApi.getAll(); setCourses(r.data); } catch(e){} };
  const loadDepartments = async () => { try { const r = await departmentApi.getAll(); setDepartments(r.data); } catch(e){} };
  const loadEmployees = async (deptId) => { try { const url = deptId ? `/api/employees?department_id=${deptId}` : '/api/employees'; const r = await axios.get(url); setEmployees(r.data); } catch(e){} };

  const handleDeptChange = (deptId) => { form.setFieldsValue({ employee_ids: [] }); loadEmployees(deptId); };

  const handleCourseChange = async (courseId) => {
    form.setFieldsValue({ question_ids: [] });
    try { const r = await questionApi.getAll(courseId); setCourseQuestions(r.data); } catch(e) { setCourseQuestions([]); }
  };

  const handleSubmit = async (values) => {
    const data = { ...values, deadline: values.deadline ? values.deadline.format('YYYY-MM-DD HH:mm:ss') : null };
    try { await trainingApi.create(data); message.success('创建成功'); setModalVisible(false); form.resetFields(); loadTrainings(); } catch(e) { message.error('创建失败'); }
  };

  const handleDelete = async (id) => { try { await trainingApi.delete(id); message.success('删除成功'); loadTrainings(); } catch(e) { message.error('删除失败'); } };

  const getStatusTag = (r) => r.deadline && dayjs(r.deadline).isBefore(dayjs()) ? <Tag color="red">已过期</Tag> : <Tag color="green">进行中</Tag>;

  const columns = [
    { title: '培训名称', dataIndex: 'title', key: 'title', render: (t, r) => <a onClick={() => navigate(`/trainings/${r.id}`)}>{t}</a> },
    { title: '课件', dataIndex: 'course_title', key: 'course_title', ellipsis: true },
    { title: '目标部门', dataIndex: 'department_name', key: 'department_name', render: (t) => <Tag color="blue">{t}</Tag> },
    { title: '截止时间', dataIndex: 'deadline', key: 'deadline', width: 180, render: (t) => t || '无限制' },
    { title: '状态', key: 'status', width: 100, render: (_, r) => getStatusTag(r) },
    { title: '完成情况', key: 'completion', width: 120, render: (_, r) => (
      <Space>
        <TeamOutlined style={{ color: '#1890ff' }} />
        <span>{r.completed_count || 0} 人已完成</span>
      </Space>
    ) },
    { title: '操作', key: 'action', width: 200, render: (_, r) => (
      <Space>
        <Button type="link" icon={<EyeOutlined />} onClick={() => navigate(`/trainings/${r.id}`)}>详情</Button>
        <Button type="link" icon={<PlayCircleOutlined />} onClick={() => navigate(`/exam/${r.id}`)}>考试</Button>
        <Popconfirm title="确定删除？" onConfirm={() => handleDelete(r.id)}><Button type="link" danger icon={<DeleteOutlined />} /></Popconfirm>
      </Space>
    )}
  ];

  return (
    <div>
      <Card title={<Title level={3} style={{ margin: 0 }}>🎯 培训任务</Title>} extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setCourseQuestions([]); setModalVisible(true); }}>创建培训</Button>}>
        <Table columns={columns} dataSource={trainings} rowKey="id" loading={loading} />
      </Card>

      <Modal title="创建培训任务" open={modalVisible} onCancel={() => { setModalVisible(false); form.resetFields(); }} footer={null} width={700}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="title" label="培训名称" rules={[{ required: true }]}><Input placeholder="培训名称" /></Form.Item>
          <Form.Item name="course_id" label="选择课件" rules={[{ required: true }]}>
            <Select placeholder="选择课件" onChange={handleCourseChange}>{courses.map(c => <Select.Option key={c.id} value={c.id}>{c.title}</Select.Option>)}</Select>
          </Form.Item>
          <Form.Item name="question_ids" label="选择考题（不选则使用该课件下所有考题）">
            <Checkbox.Group style={{ width: '100%' }}>
              <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid #d9d9d9', borderRadius: 8, padding: 8 }}>
                {courseQuestions.length === 0 ? <span style={{ color: '#999' }}>请先选择课件</span> : courseQuestions.map(q => (
                  <div key={q.id} style={{ padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <Checkbox value={q.id}>{q.content.substring(0, 50)}{q.content.length > 50 ? '...' : ''} <Tag size="small">{q.type === 'single' ? '单选' : q.type === 'multiple' ? '多选' : q.type === 'judge' ? '判断' : '填空'}</Tag></Checkbox>
                  </div>
                ))}
              </div>
            </Checkbox.Group>
          </Form.Item>
          <Form.Item name="department_id" label="目标部门" rules={[{ required: true }]}>
            <Select placeholder="选择部门" onChange={handleDeptChange}>{departments.map(d => <Select.Option key={d.id} value={d.id}>{d.name}</Select.Option>)}</Select>
          </Form.Item>
          <Form.Item name="employee_ids" label="指定员工（可选）">
            <Select mode="multiple" placeholder="选择员工" allowClear optionFilterProp="label" options={employees.map(e => ({ label: `${e.name}${e.position ? ` (${e.position})` : ''}`, value: e.id }))} />
          </Form.Item>
          <Form.Item name="description" label="培训说明"><TextArea rows={2} /></Form.Item>
          <Form.Item name="deadline" label="截止时间"><DatePicker showTime format="YYYY-MM-DD HH:mm:ss" style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="time_limit" label="考试限时（分钟）" extra="0表示不限"><Input type="number" min={0} /></Form.Item>
          <Form.Item><Space><Button type="primary" htmlType="submit">创建</Button><Button onClick={() => { setModalVisible(false); form.resetFields(); }}>取消</Button></Space></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default TrainingList;
