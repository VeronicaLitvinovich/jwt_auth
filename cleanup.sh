#!/bin/bash

echo "🧹 Cleaning up all Docker containers and networks..."

# Останавливаем все контейнеры
docker-compose down
docker-compose -f docker-compose.prod.yml down

# Удаляем все неиспользуемые контейнеры, сети, образы
docker system prune -f

# Проверяем освободились ли порты
echo "📊 Checking port usage:"
echo "Port 5432:"
lsof -i :5432 || echo "Port 5432 is free"
echo "Port 3000:"
lsof -i :3000 || echo "Port 3000 is free"
echo "Port 5433:"
lsof -i :5433 || echo "Port 5433 is free"

echo "✅ Cleanup completed"