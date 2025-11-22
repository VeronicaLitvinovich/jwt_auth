# Перейдите в правильную директорию (сначала найдем ее)
cd /Users/veronikalitvinovic/actions-runner/_work/jwt-auth/jwt-auth

# Создайте файл
cat > start-test-env.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting test environment..."

# Автоматически находим директорию проекта
if [ -n "$GITHUB_WORKSPACE" ]; then
    PROJECT_DIR="$GITHUB_WORKSPACE"
    echo "📁 Using GitHub workspace: $PROJECT_DIR"
else
    PROJECT_DIR="/Users/veronikalitvinovic/actions-runner/_work/JWT-AUTH/JWT-AUTH"
    echo "📁 Using default path: $PROJECT_DIR"
fi

if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Project directory not found: $PROJECT_DIR"
    echo "🔍 Searching for project..."
    FOUND_DIR=$(find /Users/veronikalitvinovic/actions-runner/_work -name "package.json" -type f 2>/dev/null | head -1 | xargs dirname 2>/dev/null)
    if [ -n "$FOUND_DIR" ]; then
        PROJECT_DIR="$FOUND_DIR"
        echo "📁 Found project at: $PROJECT_DIR"
    else
        echo "❌ Cannot find project directory"
        exit 1
    fi
fi

cd "$PROJECT_DIR"
echo "📁 Working in: $(pwd)"

# Останавливаем предыдущую версию
echo "🛑 Stopping previous test instances..."
pkill -f "node.*8080" || true
sleep 3

# Устанавливаем зависимости
echo "📦 Installing dependencies..."
npm ci

# Запускаем тестовое окружение
echo "🚀 Starting test environment..."
export PORT=8080
export NODE_ENV=test
export DB_STORAGE=./test.sqlite

# Очищаем старую БД
rm -f test.sqlite

# Запускаем
nohup npm start > test.log 2>&1 &
echo $! > test.pid

echo "⏳ Waiting for startup... (30 seconds)"
sleep 30

# Проверяем
echo "🔍 Verifying deployment..."
if curl -f --max-time 10 http://localhost:8080/health > /dev/null 2>&1; then
    echo "🎉 Test environment ready!"
    echo "🌐 URL: http://localhost:8080"
    echo "🏥 Health: http://localhost:8080/health"
    echo "📝 Logs: tail -f test.log"
else
    echo "❌ Failed to start test environment"
    echo "📋 Last logs:"
    tail -20 test.log
    exit 1
fi
EOF

# Сделайте файл исполняемым
chmod +x start-test-env.sh

# Проверьте что файл создался
ls -la start-test-env.sh