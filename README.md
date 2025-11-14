docker-compose up --build

(GET)http://localhost:8080/api/test/all

(GET)http://localhost:8080/api/test/user

(GET)http://localhost:8080/api/test/admin

(POST)http://localhost:8080/api/auth/signup

(POST)http://localhost:8080/api/auth/signin

curl -X POST -H "Content-Type: application/json" -d '{
"username": "manualtest",
"email": "manual@example.com",
"password": "123456"
}' http://localhost:8080/api/auth/signup

curl -X POST -H "Content-Type: application/json" -d '{
"username": "manualtest",
"password": "123456"
}' http://localhost:8080/api/auth/signin

{"id":1,"username":"manualtest","email":"manual@example.com","roles":["ROLE_USER"],"accessToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNzYyODc0OTk0LCJleHAiOjE3NjI4NzU4OTR9.HaRLW7MyHcXoq20sY-opO1zV807dC5bfXPowVR7pRCU","refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNzYyODc0OTk0LCJleHAiOjE3NjI4NzU5OTR9.Y6wYiZy36utzo5oVUUor0F7M_bMkTrLqz69t2_12Upk","sessionId":"47c59ba1-5300-4121-be9e-8e71aaf9c1dc"}

curl -X POST -H "Content-Type: application/json" -d '{
"refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNzYyODc0OTk0LCJleHAiOjE3NjI4NzU5OTR9.Y6wYiZy36utzo5oVUUor0F7M_bMkTrLqz69t2_12Upk"
}' http://localhost:8080/api/auth/refresh

curl -X POST -H "Content-Type: application/json" -d '{
"refreshToken": "REFRESH-TOKEN"
}' http://localhost:8080/api/auth/refresh

curl -X POST -H "Content-Type: application/json" -d '{
"username": "user1",
"email": "user1@example.com",
"password": "123456"
}' http://localhost:8080/api/auth/signup

curl -X POST -H "Content-Type: application/json" -d '{
"username": "admin1",
"email": "admin1@example.com",
"password": "123456",
"roles": ["admin"]
}' http://localhost:8080/api/auth/signup

curl -c user_cookies.txt -X POST -H "Content-Type: application/json" -d '{
"username": "user1",
"password": "123456"
}' http://localhost:8080/api/auth/signin

curl -b user_cookies.txt http://localhost:8080/api/test/user

curl -H "x-access-token: ACCESS-TOKEN" http://localhost:8080/api/test/user-token

curl -b user_cookies.txt -H "x-access-token: ACCESS-TOKEN" http://localhost:8080/api/test/user

curl -b user_cookies.txt http://localhost:8080/api/test/admin

curl -H "x-access-token: ACCESS-TOKEN" http://localhost:8080/api/test/admin

curl http://localhost:8080/api/test/all

curl -b user_cookies.txt -X POST http://localhost:8080/api/auth/logout

curl -c user_cookies.txt -X POST -H "Content-Type: application/json" -d '{
"username": "hybridadmin",
"password": "123456"
}' http://localhost:8080/api/auth/signin
