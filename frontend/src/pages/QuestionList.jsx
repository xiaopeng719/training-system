import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Button, Modal, Form, Input, Select, Radio, Space, 
  message, Tag, Typography, Popconfirm, Tooltip, Divider 
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import { questionApi, courseApi } from '../services/api';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

const questionTypes = {
  single: { label: '单选题', color: 'blue' },
  multiple: { label: '多选题', color: 'purple' },
  judge: { label: '判断题', color: 'green' },
  fill: { label: '填空题', color: 'orange' }
};

function QuestionList() {
  const [questions, setQuestions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [form] = Form.useForm();
  const [batchForm] = Form.useForm();
  const [questionType, setQuestionType] = useState('single');
  const [options, setOptions] = useState(['', '']);

  useEffect(() => {
    loadQuestions();
    loadCourses();
  }, []);

  const loadQuestions = async () => {
    setLoading(true);
    try { const res = await questionApi.getAll(); setQuestions(res.data); } catch (err) {}
    setLoading(false);
  };

  const loadCourses = async () => {
    try { const res = await courseApi.getAll(); setCourses(res.data); } catch (err) {}
  };

  const handleSubmit = async (values) => {
    try {
      const data = { ...values, options: (questionType === 'single' || questionType === 'multiple') ? options.filter(o => o.trim()) : [], type: questionType };
      if (editingQuestion) {
        await questionApi.update(editingQuestion.id, data);
        message.success('更新成功');
      } else {
        await questionApi.create(data);
        message.success('创建成功');
      }
      setModalVisible(false); form.resetFields(); setEditingQuestion(null); setOptions(['', '']);
      loadQuestions();
    } catch (err) { message.error('操作失败'); }
  };

  const handleBatchSubmit = async (values) => {
    try {
      const lines = values.text.trim().split('\n').filter(l => l.trim());
      const questions = [];
      let current = null;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.match(/^[A-D]\.\s/) || trimmed.match(/^[A-D]、/)) {
          if (current) current.options.push(trimmed.replace(/^[A-D][.、]\s*/, ''));
        } else if (trimmed.startsWith('答案：') || trimmed.startsWith('答案:')) {
          if (current) current.answer = trimmed.replace(/^答案[：:]\s*/, '');
        } else if (trimmed.startsWith('解析：') || trimmed.startsWith('解析:')) {
          if (current) current.explanation = trimmed.replace(/^解析[：:]\s*/, '');
        } else if (trimmed.match(/^\d+[.、．]/)) {
          if (current) questions.push(current);
          current = { type: values.type, content: trimmed.replace(/^\d+[.、．]\s*/, ''), options: [], answer: '', explanation: '' };
        }
      }
      if (current) questions.push(current);

      if (questions.length === 0) {
        message.error('未解析到有效题目，请检查格式');
        return;
      }

      await fetch('/api/questions/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_id: values.course_id, questions })
      });
      message.success(`成功创建 ${questions.length} 道考题`);
      setBatchModalVisible(false); batchForm.resetFields();
      loadQuestions();
    } catch (err) { message.error('批量创建失败'); }
  };

  const handleEdit = (record) => {
    setEditingQuestion(record); setQuestionType(record.type);
    setOptions(record.options && record.options.length > 0 ? record.options : ['', '']);
    form.setFieldsValue({ course_id: record.course_id, content: record.content, answer: record.answer, explanation: record.explanation });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try { await questionApi.delete(id); message.success('删除成功'); loadQuestions(); } catch (err) { message.error('删除失败'); }
  };

  const addOption = () => setOptions([...options, '']);
  const removeOption = (index) => { if (options.length > 2) setOptions(options.filter((_, i) => i !== index)); };
  const updateOption = (index, value) => { const n = [...options]; n[index] = value; setOptions(n); };

  const renderAnswerInput = () => {
    switch (questionType) {
      case 'single':
        return (
          <Form.Item name="answer" label="正确答案" rules={[{ required: true }]} extra="选择正确选项">
            <Radio.Group>
              <Space direction="vertical">
                {options.map((opt, idx) => (
                  <Radio key={idx} value={String.fromCharCode(65 + idx)}>{String.fromCharCode(65 + idx)}. {opt || `(选项${String.fromCharCode(65 + idx)})`}</Radio>
                ))}
              </Space>
            </Radio.Group>
          </Form.Item>
        );
      case 'multiple':
        return <Form.Item name="answer" label="正确答案" rules={[{ required: true }]} extra="如: A,B,C"><Input placeholder="A,B,C" /></Form.Item>;
      case 'judge':
        return <Form.Item name="answer" label="正确答案" rules={[{ required: true }]}><Radio.Group><Radio value="true">正确</Radio><Radio value="false">错误</Radio></Radio.Group></Form.Item>;
      case 'fill':
        return <Form.Item name="answer" label="正确答案" rules={[{ required: true }]}><Input placeholder="正确答案" /></Form.Item>;
      default: return null;
    }
  };

  const columns = [
    { title: '题型', dataIndex: 'type', key: 'type', width: 100, render: (type) => <Tag color={questionTypes[type]?.color}>{questionTypes[type]?.label}</Tag> },
    { title: '题目内容', dataIndex: 'content', key: 'content', ellipsis: true },
    { title: '所属课件', dataIndex: 'course_id', key: 'course_id', render: (id) => courses.find(c => c.id === id)?.title || id },
    { title: '正确答案', dataIndex: 'answer', key: 'answer', width: 120 },
    { title: '操作', key: 'action', width: 150, render: (_, record) => (
      <Space>
        <Tooltip title="编辑"><Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} /></Tooltip>
        <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}><Tooltip title="删除"><Button type="link" danger icon={<DeleteOutlined />} /></Tooltip></Popconfirm>
      </Space>
    )}
  ];

  return (
    <div>
      <Card
        title={<Title level={3} style={{ margin: 0 }}>❓ 考题管理</Title>}
        extra={
          <Space>
            <Button icon={<CopyOutlined />} onClick={() => setBatchModalVisible(true)}>批量导入</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingQuestion(null); form.resetFields(); setQuestionType('single'); setOptions(['', '']); setModalVisible(true); }}>创建考题</Button>
          </Space>
        }
      >
        <Table columns={columns} dataSource={questions} rowKey="id" loading={loading} />
      </Card>

      {/* 单个创建/编辑 */}
      <Modal title={editingQuestion ? '编辑考题' : '创建考题'} open={modalVisible} onCancel={() => { setModalVisible(false); setEditingQuestion(null); form.resetFields(); setOptions(['', '']); }} footer={null} width={600}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="course_id" label="所属课件" rules={[{ required: true }]}>
            <Select placeholder="选择课件">{courses.map(c => <Select.Option key={c.id} value={c.id}>{c.title}</Select.Option>)}</Select>
          </Form.Item>
          <Form.Item label="题型" required>
            <Select value={questionType} onChange={(v) => { setQuestionType(v); form.resetFields(['answer']); }} disabled={!!editingQuestion}>
              <Select.Option value="single">单选题</Select.Option><Select.Option value="multiple">多选题</Select.Option>
              <Select.Option value="judge">判断题</Select.Option><Select.Option value="fill">填空题</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="content" label="题目内容" rules={[{ required: true }]}><TextArea rows={3} /></Form.Item>
          {(questionType === 'single' || questionType === 'multiple') && (
            <Form.Item label="选项" required>
              <Space direction="vertical" style={{ width: '100%' }}>
                {options.map((opt, idx) => (
                  <Space key={idx}>
                    <span style={{ display: 'inline-block', width: 24, height: 24, lineHeight: '24px', textAlign: 'center', backgroundColor: '#1890ff', color: 'white', borderRadius: '50%' }}>{String.fromCharCode(65 + idx)}</span>
                    <Input value={opt} onChange={e => updateOption(idx, e.target.value)} placeholder={`选项 ${String.fromCharCode(65 + idx)}`} style={{ width: 300 }} />
                    {options.length > 2 && <Button type="link" danger size="small" onClick={() => removeOption(idx)}>删除</Button>}
                  </Space>
                ))}
                {options.length < 6 && <Button type="dashed" onClick={addOption} icon={<PlusOutlined />} style={{ width: '100%' }}>添加选项</Button>}
              </Space>
            </Form.Item>
          )}
          {renderAnswerInput()}
          <Form.Item name="explanation" label="答案解析"><TextArea rows={2} /></Form.Item>
          <Form.Item><Space><Button type="primary" htmlType="submit">{editingQuestion ? '更新' : '创建'}</Button><Button onClick={() => { setModalVisible(false); setEditingQuestion(null); form.resetFields(); setOptions(['', '']); }}>取消</Button></Space></Form.Item>
        </Form>
      </Modal>

      {/* 批量导入 */}
      <Modal title="批量导入考题" open={batchModalVisible} onCancel={() => { setBatchModalVisible(false); batchForm.resetFields(); }} footer={null} width={700}>
        <Form form={batchForm} layout="vertical" onFinish={handleBatchSubmit}>
          <Form.Item name="course_id" label="所属课件" rules={[{ required: true }]}>
            <Select placeholder="选择课件">{courses.map(c => <Select.Option key={c.id} value={c.id}>{c.title}</Select.Option>)}</Select>
          </Form.Item>
          <Form.Item name="type" label="题型" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="single">单选题</Select.Option><Select.Option value="multiple">多选题</Select.Option>
              <Select.Option value="judge">判断题</Select.Option><Select.Option value="fill">填空题</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="text" label="题目内容" rules={[{ required: true }]} extra="每道题以序号开头，选项以A/B/C/D开头，答案行以'答案：'开头">
            <TextArea rows={12} placeholder={`格式示例：
1. 以下哪个是JavaScript框架？
A. React
B. Python
C. Java
D. HTML
答案：A
解析：React是JavaScript框架

2. HTML是编程语言。
答案：false
解析：HTML是标记语言`} />
          </Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" block>批量导入</Button></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default QuestionList;
