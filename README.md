# 企业培训系统

一个功能完整的企业培训管理系统，支持课件管理、考题创建和部门培训。

## ✨ 功能特性

### 📚 课件管理
- 支持多种文件格式：PDF、PPT、Word、MP4/WebM/OGG视频
- 在线预览功能（PDF内嵌预览、视频播放、Office在线预览）
- 按部门分类管理课件

### ❓ 考题管理
- 支持多种题型：单选题、多选题、判断题、填空题
- 为课件配套创建考试题目
- 答案解析功能

### 🏢 部门管理
- 创建和管理公司部门
- 部门与课件、培训任务关联

### 🎯 培训任务
- 选择课件和目标部门创建培训
- 设置培训截止时间
- 培训进度跟踪和统计

### 📝 在线考试
- 学员在线答题
- 自动评分
- 成绩统计和通过率分析

## 🛠️ 技术栈

### 前端
- React 18 + Vite
- Ant Design 5
- React Router 6
- Axios

### 后端
- Node.js + Express
- SQL.js (纯JS SQLite实现，无需编译)
- Multer (文件上传)

## 🚀 快速开始

### 方式一：使用启动脚本（Windows）
```bash
# 双击运行 start.bat
start.bat
```

### 方式二：手动启动

#### 1. 安装后端依赖
```bash
cd backend
npm install
```

#### 2. 安装前端依赖
```bash
cd frontend
npm install
```

#### 3. 启动后端服务
```bash
cd backend
npm start
# 后端运行在 http://localhost:3001
```

#### 4. 启动前端服务
```bash
cd frontend
npm run dev
# 前端运行在 http://localhost:5173
```

## 📁 项目结构

```
training-system/
├── backend/                # 后端服务
│   ├── server.js          # Express服务器
│   ├── database.js        # 数据库初始化
│   ├── package.json       # 后端依赖
│   └── uploads/           # 上传文件存储目录
├── frontend/              # 前端应用
│   ├── src/
│   │   ├── pages/         # 页面组件
│   │   │   ├── Dashboard.jsx      # 仪表盘
│   │   │   ├── CourseList.jsx     # 课件列表
│   │   │   ├── CourseViewer.jsx   # 课件预览
│   │   │   ├── QuestionList.jsx   # 考题管理
│   │   │   ├── DepartmentList.jsx # 部门管理
│   │   │   ├── TrainingList.jsx   # 培训列表
│   │   │   ├── TrainingDetail.jsx # 培训详情
│   │   │   └── ExamPage.jsx       # 考试页面
│   │   ├── services/
│   │   │   └── api.js     # API服务
│   │   ├── App.jsx        # 主应用
│   │   └── main.jsx       # 入口文件
│   └── package.json       # 前端依赖
├── start.bat              # Windows启动脚本
└── README.md              # 项目说明
```

## 📖 使用流程

1. **创建部门** → 在部门管理中添加公司部门
2. **上传课件** → 上传培训资料（PDF/PPT/Word/视频）
3. **创建考题** → 为课件配套创建考试题目
4. **发起培训** → 选择课件和目标部门，创建培训任务
5. **学员学习** → 学员查看课件并参加考试
6. **查看统计** → 查看培训完成情况和成绩统计

## 🔧 API接口

### 课件管理
- `GET /api/courses` - 获取所有课件
- `GET /api/courses/:id` - 获取课件详情
- `POST /api/courses` - 上传课件
- `DELETE /api/courses/:id` - 删除课件

### 考题管理
- `GET /api/questions` - 获取所有考题
- `POST /api/questions` - 创建考题
- `PUT /api/questions/:id` - 更新考题
- `DELETE /api/questions/:id` - 删除考题

### 部门管理
- `GET /api/departments` - 获取所有部门
- `POST /api/departments` - 创建部门

### 培训任务
- `GET /api/trainings` - 获取所有培训
- `GET /api/trainings/:id` - 获取培训详情
- `POST /api/trainings` - 创建培训
- `DELETE /api/trainings/:id` - 删除培训

### 培训进度
- `POST /api/progress` - 提交考试成绩
- `GET /api/progress/:training_id` - 获取培训进度

### 统计
- `GET /api/stats` - 获取系统统计

## 📝 注意事项

1. 上传文件大小限制：100MB
2. 支持的文件格式：PDF、PPT、PPTX、DOC、DOCX、MP4、WebM、OGG
3. 首次运行会自动创建数据库和示例部门数据
4. 上传的文件存储在 `backend/uploads/` 目录

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License
