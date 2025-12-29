# 🔄 Механизм отката на всех этапах CI/CD Pipeline

## 📋 Обзор

Теперь система отката работает **на каждом этапе** pipeline, обеспечивая максимальную надёжность.

## 🏗️ Этапы с откатом

### 1️⃣ **Unit Tests** (Юнит-тесты)

**Когда:** При провале unit tests  
**Маркер:** `/tmp/last_successful_unit_test.txt`

```yaml
- Сохранить текущий commit
- Запустить unit tests (continue-on-error: true)
- При провале:
  ✗ Логировать проблему
  ✗ Показать какой commit провалился
  ✗ Показать последний успешный commit
  ✗ Остановить pipeline
```

**Что происходит:**

- Тесты не прошли → код не идёт дальше
- Не делаем автоматический откат кода (разработчик должен исправить)
- Но сохраняем информацию о последнем рабочем коммите

---

### 2️⃣ **Deploy Test Environment** (Деплой тестовой среды)

**Когда:** При провале развёртывания на порт 8080  
**Маркер:** `/tmp/last_successful_test_deploy.txt`  
**Проверки:**

- `start_test_app` - запуск PM2
- `verify_test_app` - health check
- `verify_test_status` - проверка статуса

```yaml
Шаги отката:
1. Остановить проблемный деплой (pm2 delete, kill port 8080)
2. Получить предыдущий успешный commit
3. git checkout на предыдущую версию
4. npm ci (переустановка зависимостей)
5. Запустить предыдущую версию на PM2
6. Проверить работоспособность (10 попыток)
7. ✅ Откат успешен → приложение работает на старой версии
8. ❌ Откат провалился → требуется ручное вмешательство
```

**Что происходит:**

- Новая версия не смогла запуститься на 8080
- Система автоматически откатывает на последнюю рабочую версию
- Test environment продолжает работать на старой версии
- Pipeline останавливается, но среда работоспособна

---

### 3️⃣ **Integration Tests** (Интеграционные тесты)

**Когда:** При провале интеграционных тестов  
**Маркер:** `/tmp/last_successful_integration_test.txt`

```yaml
- Запустить integration tests (continue-on-error: true)
- При провале:
  ✗ Получить логи приложения (pm2 logs)
  ✗ Проверить health endpoint
  ✗ Показать последний успешный commit
  ✗ Остановить pipeline
```

**Что происходит:**

- Тесты провалились → код не идёт в production
- Test environment остаётся запущенным (для debugging)
- Pipeline останавливается
- Разработчик может анализировать логи

---

### 4️⃣ **Deploy Production** (Деплой в продакшен)

**Когда:** При провале production деплоя на порт 3000  
**Маркер:** `/tmp/last_successful_deploy.txt`  
**Проверки:**

- `health_check` - запуск и health endpoint
- `verify_deployment` - БД и API endpoints
- `functional_tests` - регистрация и основные функции

```yaml
Шаги отката:
1. Остановить проблемный production деплой
2. Получить предыдущий успешный production commit
3. git checkout на предыдущую версию
4. npm ci (переустановка зависимостей)
5. Запустить предыдущую версию на PM2 (порт 3000)
6. Проверить работоспособность (10 попыток)
7. ✅ Откат успешен → production работает на старой версии
8. ❌ Откат провалился → критическая ситуация
```

**Что происходит:**

- Новая версия провалила проверки в production
- **АВТОМАТИЧЕСКИЙ ОТКАТ** на предыдущую рабочую версию
- Production продолжает работать без простоя
- Деплой помечается как failed, но сервис работает

---

## 🎯 Файлы-маркеры успешных деплоев

| Этап        | Файл маркера                                | Когда обновляется                |
| ----------- | ------------------------------------------- | -------------------------------- |
| Unit Tests  | `/tmp/last_successful_unit_test.txt`        | После успешных unit tests        |
| Test Deploy | `/tmp/last_successful_test_deploy.txt`      | После успешного деплоя на 8080   |
| Integration | `/tmp/last_successful_integration_test.txt` | После успешных integration tests |
| Production  | `/tmp/last_successful_deploy.txt`           | После успешного деплоя на 3000   |

## 📊 Визуальная схема

```
┌─────────────────────────────────────────────────────┐
│  Push to GitHub                                     │
└────────────────┬────────────────────────────────────┘
                 │
    ┌────────────▼───────────────┐
    │  1️⃣ Unit Tests              │
    │  - Save commit             │
    │  - Run tests               │
    │  ❌ Fail → Log + Stop       │
    │  ✅ Pass → Save marker      │
    └────────────┬───────────────┘
                 │
    ┌────────────▼───────────────┐
    │  2️⃣ Deploy Test (8080)      │
    │  - Save commit             │
    │  - Deploy                  │
    │  ❌ Fail → ROLLBACK + Stop  │
    │  ✅ Pass → Save marker      │
    └────────────┬───────────────┘
                 │
    ┌────────────▼───────────────┐
    │  3️⃣ Integration Tests       │
    │  - Run tests               │
    │  ❌ Fail → Log + Stop       │
    │  ✅ Pass → Save marker      │
    └────────────┬───────────────┘
                 │
    ┌────────────▼───────────────┐
    │  4️⃣ Deploy Production (3000)│
    │  - Save commit             │
    │  - Deploy                  │
    │  - Health checks           │
    │  ❌ Fail → ROLLBACK + Stop  │
    │  ✅ Pass → Save marker      │
    └────────────────────────────┘
```

## 🛡️ Преимущества многоуровневого отката

1. **Unit Tests**: Блокирует плохой код на самом раннем этапе
2. **Test Environment**: Автоматически откатывает тестовую среду
3. **Integration Tests**: Проверяет взаимодействие компонентов
4. **Production**: Обеспечивает zero-downtime при проблемах

## 🚀 Как это работает в действии

### Сценарий 1: Unit test провалился

```
1. Developer pushes code
2. Unit tests fail ❌
3. Pipeline stops
4. Test/Production не затронуты
5. Developer fixes and pushes again
```

### Сценарий 2: Test environment не развернулся

```
1. Unit tests pass ✅
2. Deploy test environment fails ❌
3. Automatic rollback to previous test version
4. Test environment works on old version
5. Pipeline stops before integration tests
```

### Сценарий 3: Integration tests провалились

```
1. Unit tests pass ✅
2. Test environment deployed ✅
3. Integration tests fail ❌
4. Test environment stays running (for debugging)
5. Pipeline stops before production
```

### Сценарий 4: Production health check провалился

```
1. All tests pass ✅
2. Production deployment starts
3. Health check fails ❌
4. Automatic rollback to previous production version
5. Production continues working on old version
6. Zero downtime for users
```

## 📝 Логирование

Каждый этап отката логирует:

- 🚨 Причину провала
- 📝 Текущий (проблемный) commit
- 🔄 Commit для отката
- ✅ Результат отката
- 📊 Состояние приложения

## 🎓 Как демонстрировать

1. **Unit test failure**: Добавьте синтаксическую ошибку в тест
2. **Test deploy failure**: Сломайте health endpoint для test env
3. **Integration failure**: Сломайте API endpoint
4. **Production failure**: Сломайте health endpoint для production

Каждый уровень продемонстрирует свой механизм отката!
