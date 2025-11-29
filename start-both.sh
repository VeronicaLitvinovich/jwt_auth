#!/bin/bash

echo "🚀 Starting both test and production environments..."

# Останавливаем все предыдущие контейнеры
echo "🧹 Cleaning up previous containers..."
docker-compose down -v --remove-orphans 2>/dev/null || true
docker-compose -f docker-compose.prod.yml -p jwt-auth-prod down -v --remove-orphans 2>/dev/null || true

echo "🔧 Starting test environment (port 8080)..."
docker-compose up -d --build

echo "⏳ Waiting for test environment to be ready..."
MAX_ATTEMPTS=30
ATTEMPT=1
until curl -s http://localhost:8080/health > /dev/null; do
  if [ $ATTEMPT -gt $MAX_ATTEMPTS ]; then
    echo "❌ Test environment failed to start"
    docker-compose logs app-test
    exit 1
  fi
  echo "Attempt $ATTEMPT/$MAX_ATTEMPTS - Test app not ready..."
  ATTEMPT=$((ATTEMPT + 1))
  sleep 3
done
echo "✅ Test environment is ready on port 8080"

echo "🔧 Starting production environment (port 3000)..."
docker-compose -f docker-compose.prod.yml -p jwt-auth-prod up -d --build

echo "⏳ Waiting for production environment to be ready..."
ATTEMPT=1
until curl -s http://localhost:3000/health > /dev/null; do
  if [ $ATTEMPT -gt $MAX_ATTEMPTS ]; then
    echo "❌ Production environment failed to start"
    docker-compose -f docker-compose.prod.yml -p jwt-auth-prod logs app-prod
    exit 1
  fi
  echo "Attempt $ATTEMPT/$MAX_ATTEMPTS - Production app not ready..."
  ATTEMPT=$((ATTEMPT + 1))
  sleep 3
done
echo "✅ Production environment is ready on port 3000"

echo ""
echo "🎉 BOTH ENVIRONMENTS ARE RUNNING!"
echo "📍 Test: http://localhost:8080"
echo "📍 Production: http://localhost:3000"
echo "🏥 Test Health: http://localhost:8080/health"
echo "🏥 Production Health: http://localhost:3000/health"