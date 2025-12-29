docker-compose up --build

(GET)http://localhost:8080/api/test/all

(GET)http://localhost:8080/api/test/user

(GET)http://localhost:8080/api/test/admin

(POST)http://localhost:8080/api/auth/signup

(POST)http://localhost:8080/api/auth/signin

cd /Users/veronikalitvinovic/actions-runner
./run.sh
v

Запустите runner командой:

./run.sh
Проверим, где находятся файлы runner:

ls -la | grep -E "(run\.sh|config\.sh)"
No output was produced by the command.
cd /tmp && ls -la | grep -E "(run\.sh|config\.sh)"
Отлично! Файлы находятся в tmp. Запускаем runner:

./run.sh
cd /tmp; pwd; ls -la run.sh
cd /tmp; bash run.sh

🎉 Runner успешно запущен! Он уже подключился к GitHub и начал выполнять задачу "🧪 Unit Tests".
