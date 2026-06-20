import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, Button, Typography, Space, Radio, Checkbox, Input, message, 
  Progress, Result, Modal, Form, Tag, Alert
} from 'antd';
import { 
  ArrowLeftOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined 
} from '@ant-design/icons';
import { trainingApi, progressApi } from '../services/api';
import axios from 'axios';

const { Title, Paragraph, Text } = Typography;

function ExamPage() {
  const { trainingId } = useParams();
  const navigate = useNavigate();
  const [training, setTraining] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [results, setResults] = useState(null);
  const [studyTime, setStudyTime] = useState(0);
  const [minStudyTime, setMinStudyTime] = useState(0);
  const timerRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    loadTraining();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [trainingId]);

  const loadTraining = async () => {
    try {
      const res = await trainingApi.getById(trainingId);
      setTraining(res.data);
      setQuestions(res.data.questions || []);
      if (res.data.time_limit > 0) {
        setTimeLeft(res.data.time_limit * 60);
      }
      // 加载最低学习时长要求
      setMinStudyTime(res.data.min_study_time || 0);
      // 加载当前用户的学习时长
      if (user.employee_id && res.data.course_id) {
        try {
          const srRes = await axios.get(`/api/study-records?employee_id=${user.employee_id}&course_id=${res.data.course_id}`);
          if (srRes.data.length > 0) {
            setStudyTime(srRes.data[0].duration || 0);
          }
        } catch (e) {}
      }
    } catch (err) {
      message.error('加载考试失败');
    }
    setLoading(false);
  };

  // 倒计时
  useEffect(() => {
    if (timeLeft <= 0 || submitted) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          message.warning('时间到，自动提交试卷！');
          autoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [submitted]);

  const autoSubmit = () => {
    submitExam();
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const calculateScoreAndResults = () => {
    let correct = 0;
    const details = questions.map(q => {
      const userAnswer = answers[q.id];
      let isCorrect = false;

      if (q.type === 'multiple') {
        const correctAnswers = q.answer.split(',').map(s => s.trim()).sort();
        const userAnswers = (userAnswer || []).sort();
        isCorrect = JSON.stringify(correctAnswers) === JSON.stringify(userAnswers);
      } else {
        isCorrect = userAnswer === q.answer;
      }

      if (isCorrect) correct++;
      return { ...q, userAnswer, isCorrect };
    });

    return { score: Math.round((correct / questions.length) * 100), details };
  };

  const handleSubmit = () => {
    // 检查是否已登录
    if (!user.employee_id) {
      message.error('请先登录后再参加考试');
      return;
    }
    // 检查学习时长
    if (minStudyTime > 0 && studyTime < minStudyTime) {
      const needMinutes = Math.ceil((minStudyTime - studyTime) / 60);
      message.warning(`学习时长不足，还需学习约 ${needMinutes} 分钟才能参加考试`);
      return;
    }
    const unanswered = questions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      message.warning(`还有 ${unanswered.length} 道题未作答`);
      return;
    }
    // 直接提交，不再弹出姓名输入框
    submitExam();
  };

  const submitExam = async () => {
    const { score: finalScore, details } = calculateScoreAndResults();
    setScore(finalScore);
    setResults(details);

    try {
      await progressApi.submit({
        training_id: trainingId,
        user_name: user.name,
        employee_id: user.employee_id,
        score: finalScore,
        answers
      });
      setSubmitted(true);
      if (timerRef.current) clearInterval(timerRef.current);
    } catch (err) {
      message.error('提交失败');
    }
  };

  const renderQuestion = (question) => {
    const answer = answers[question.id];
    const optionStyle = (val) => ({
      display: 'block', padding: '12px 16px', margin: '4px 0',
      border: '1px solid #d9d9d9', borderRadius: 8,
      backgroundColor: answer === val ? '#e6f7ff' : 'white',
      cursor: 'pointer'
    });

    switch (question.type) {
      case 'single':
        return (
          <Radio.Group value={answer} onChange={e => handleAnswer(question.id, e.target.value)}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {question.options.map((opt, idx) => (
                <Radio key={idx} value={String.fromCharCode(65 + idx)} style={optionStyle(String.fromCharCode(65 + idx))}>
                  {String.fromCharCode(65 + idx)}. {opt}
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        );

      case 'multiple':
        return (
          <Checkbox.Group value={answer || []} onChange={val => handleAnswer(question.id, val)}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {question.options.map((opt, idx) => (
                <Checkbox key={idx} value={String.fromCharCode(65 + idx)} style={optionStyle(String.fromCharCode(65 + idx))}>
                  {String.fromCharCode(65 + idx)}. {opt}
                </Checkbox>
              ))}
            </Space>
          </Checkbox.Group>
        );

      case 'judge':
        return (
          <Radio.Group value={answer} onChange={e => handleAnswer(question.id, e.target.value)}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Radio value="true" style={optionStyle('true')}>✓ 正确</Radio>
              <Radio value="false" style={optionStyle('false')}>✗ 错误</Radio>
            </Space>
          </Radio.Group>
        );

      case 'fill':
        return <Input value={answer || ''} onChange={e => handleAnswer(question.id, e.target.value)} placeholder="请输入答案" size="large" style={{ maxWidth: 400 }} />;

      default: return null;
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 100 }}>加载中...</div>;
  if (!training || questions.length === 0) {
    return <Result status="warning" title="暂无考题" extra={<Button onClick={() => navigate('/trainings')}>返回</Button>} />;
  }

  // 提交后显示结果（含错题回顾）
  if (submitted && results) {
    const wrongQuestions = results.filter(r => !r.isCorrect);
    return (
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <Result
          icon={score >= 60 ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
          title={score >= 60 ? '恭喜通过考试！' : '未通过考试'}
          subTitle={<div><div style={{ fontSize: 48, fontWeight: 'bold', color: score >= 60 ? '#52c41a' : '#ff4d4f' }}>{score}分</div><div>及格分数：60分</div></div>}
          extra={[
            <Button type="primary" key="back" onClick={() => navigate(`/trainings/${trainingId}`)}>查看详情</Button>,
            <Button key="retry" onClick={() => { setSubmitted(false); setAnswers({}); setCurrentIdx(0); setResults(null); }}>重新考试</Button>
          ]}
        />

        {wrongQuestions.length > 0 && (
          <Card title={<Space><CloseCircleOutlined style={{ color: '#ff4d4f' }} /><span>错题回顾 ({wrongQuestions.length}题)</span></Space>}>
            {wrongQuestions.map((q, idx) => (
              <Card type="inner" key={q.id} style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8 }}>
                  <Tag color="red">{idx + 1}</Tag>
                  <Tag>{q.type === 'single' ? '单选' : q.type === 'multiple' ? '多选' : q.type === 'judge' ? '判断' : '填空'}</Tag>
                </div>
                <Paragraph strong>{q.content}</Paragraph>
                {q.options && q.options.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    {q.options.map((opt, i) => <div key={i}>{String.fromCharCode(65 + i)}. {opt}</div>)}
                  </div>
                )}
                <Alert type="error" message={<span>你的答案: <strong>{Array.isArray(q.userAnswer) ? q.userAnswer.join(',') : (q.userAnswer || '未作答')}</strong></span>} style={{ marginBottom: 8 }} />
                <Alert type="success" message={<span>正确答案: <strong>{q.answer}</strong></span>} style={{ marginBottom: 8 }} />
                {q.explanation && <Alert type="info" message={q.explanation} />}
              </Card>
            ))}
          </Card>
        )}
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const answeredCount = Object.keys(answers).length;
  const progressPercent = Math.round((answeredCount / questions.length) * 100);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Card
        title={<Space><Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/trainings/${trainingId}`)} /><Title level={4} style={{ margin: 0 }}>{training.title}</Title></Space>}
        extra={
          <Space>
            {timeLeft > 0 && (
              <Tag icon={<ClockCircleOutlined />} color={timeLeft < 60 ? 'red' : 'blue'} style={{ fontSize: 16, padding: '4px 12px' }}>
                {formatTime(timeLeft)}
              </Tag>
            )}
            <Text type="secondary">{answeredCount}/{questions.length}</Text>
          </Space>
        }
      >
        <Progress percent={progressPercent} status="active" style={{ marginBottom: 24 }} />

        <Card type="inner">
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">第 {currentIdx + 1} / {questions.length} 题</Text>
            <Tag style={{ marginLeft: 8 }}>
              {currentQuestion.type === 'single' && '单选题'}
              {currentQuestion.type === 'multiple' && '多选题'}
              {currentQuestion.type === 'judge' && '判断题'}
              {currentQuestion.type === 'fill' && '填空题'}
            </Tag>
          </div>
          <Title level={5}>{currentQuestion.content}</Title>
          <div style={{ margin: '24px 0' }}>{renderQuestion(currentQuestion)}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
            <Button disabled={currentIdx === 0} onClick={() => setCurrentIdx(prev => prev - 1)}>上一题</Button>
            <Space>
              {currentIdx < questions.length - 1 ? (
                <Button type="primary" onClick={() => setCurrentIdx(prev => prev + 1)}>下一题</Button>
              ) : (
                <Button type="primary" onClick={handleSubmit} disabled={answeredCount < questions.length}>提交试卷</Button>
              )}
            </Space>
          </div>
        </Card>

        <Card type="inner" title="答题卡" style={{ marginTop: 16 }}>
          <Space wrap>
            {questions.map((q, idx) => (
              <Button 
                key={q.id}
                type={idx === currentIdx ? 'primary' : answers[q.id] ? 'default' : 'dashed'}
                style={{ backgroundColor: answers[q.id] && idx !== currentIdx ? '#f6ffed' : undefined }}
                onClick={() => setCurrentIdx(idx)}
              >
                {idx + 1}
              </Button>
            ))}
          </Space>
        </Card>

        {minStudyTime > 0 && studyTime < minStudyTime && (
          <Alert
            type="warning"
            showIcon
            message={`学习时长不足：已学习 ${Math.floor(studyTime / 60)} 分钟，需 ${Math.ceil(minStudyTime / 60)} 分钟才能参加考试`}
            style={{ marginTop: 16 }}
          />
        )}
      </Card>
    </div>
  );
}

export default ExamPage;
