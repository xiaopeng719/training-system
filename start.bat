@echo off
echo ========================================
echo       企业培训系统启动脚本
echo ========================================
echo.

echo [1/3] 启动后端服务...
cd backend
start "培训系统后端" cmd /k "npm start"
cd ..

echo [2/3] 等待后端启动...
timeout /t 3 /nobreak >nul

echo [3/3] 启动前端服务...
cd frontend
start "培训系统前端" cmd /k "npm run dev"
cd ..

echo.
echo ========================================
echo 系统启动中，请稍候...
echo.
echo 前端地址: http://localhost:5173
echo 后端地址: http://localhost:3001
echo ========================================
echo.
pause
