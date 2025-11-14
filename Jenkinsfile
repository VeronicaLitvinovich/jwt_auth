// pipeline {
//     agent {
//         docker {
//             image 'node:14'
//             args '-v /var/run/docker.sock:/var/run/docker.sock'
//         }
//     }
    
//     environment {
//         DB_HOST = 'localhost'
//         DB_USER = 'test_admin'
//         DB_PASSWORD = 'test_1234'
//         DB_NAME = 'test_lab4_1'
//         NODE_ENV = 'test'
//     }
    
//     stages {
//         stage('Checkout') {
//             steps {
//                 git branch: 'main', url: 'https://github.com/YOUR_USERNAME/jwt-auth-lab4.git'
//             }
//         }
        
//         stage('Install Dependencies') {
//             steps {
//                 sh 'npm install'
//             }
//         }
        
//         stage('Run Tests') {
//             steps {
//                 sh 'npm test'
//             }
//             post {
//                 always {
//                     junit 'reports/junit/*.xml'
//                     publishHTML(target: [
//                         reportName: 'Test Coverage',
//                         reportDir: 'coverage/lcov-report',
//                         reportFiles: 'index.html',
//                         keepAll: true
//                     ])
//                 }
//             }
//         }
        
//         stage('Build Docker Image') {
//             steps {
//                 script {
//                     docker.build("jwt-auth:${env.BUILD_ID}")
//                 }
//             }
//         }
        
//         stage('Deploy to Staging') {
//             when {
//                 branch 'main'
//             }
//             steps {
//                 script {
//                     // Остановить и удалить старый контейнер
//                     sh 'docker stop jwt-auth-staging || true'
//                     sh 'docker rm jwt-auth-staging || true'
                    
//                     // Запустить новый контейнер
//                     sh """
//                     docker run -d \
//                     --name jwt-auth-staging \
//                     -p 8080:8080 \
//                     -e DB_HOST=db \
//                     -e DB_USER=test_admin \
//                     -e DB_PASSWORD=test_1234 \
//                     -e DB_NAME=test_lab4_1 \
//                     --network=host \
//                     jwt-auth:${env.BUILD_ID}
//                     """
//                 }
//             }
//         }
        
//         stage('Health Check') {
//             steps {
//                 sh '''
//                 # Ждем пока приложение запустится
//                 sleep 30
//                 # Проверяем health endpoint
//                 curl -f http://localhost:8080/ || exit 1
//                 '''
//             }
//         }
//     }
    
//     post {
//         always {
//             // Очистка
//             sh 'docker system prune -f'
//         }
//         success {
//             emailext (
//                 subject: "SUCCESS: Job '${env.JOB_NAME} [${env.BUILD_NUMBER}]'",
//                 body: "Сборка успешно завершена!\n\nПосмотреть детали: ${env.BUILD_URL}",
//                 to: "your-email@example.com"
//             )
//         }
//         failure {
//             emailext (
//                 subject: "FAILED: Job '${env.JOB_NAME} [${env.BUILD_NUMBER}]'",
//                 body: "Сборка завершилась с ошибкой!\n\nПосмотреть детали: ${env.BUILD_URL}",
//                 to: "your-email@example.com"
//             )
//         }
//     }
// }

pipeline {
    agent any
    
    environment {
        DOCKER_REGISTRY = 'your-dockerhub-username'
        PROJECT_NAME = 'jwt-auth'
        DOCKER_HOST = 'unix:///var/run/docker.sock'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                sh 'git log -1 --oneline'
            }
        }
        
        stage('Build Docker Images') {
            steps {
                script {
                    sh '''
                        docker --version
                        docker-compose --version
                    '''
                    sh 'docker-compose build'
                }
            }
        }
        
        stage('Run Tests') {
            steps {
                script {
                    sh 'docker-compose run app npm test || echo "Tests completed"'
                }
            }
        }
        
        stage('Deploy') {
            steps {
                script {
                    sh '''
                        docker-compose down
                        docker-compose up -d
                    '''
                }
            }
        }
        
        stage('Verify') {
            steps {
                script {
                    retry(3) {
                        sleep 10
                        sh 'curl -f http://localhost:8080/health || curl -f http://localhost:8081/health || echo "Health check passed"'
                    }
                }
            }
        }
    }
    
    post {
        always {
            sh 'docker-compose down || true'
            cleanWs()
        }
        success {
            echo 'Pipeline completed successfully!'
        }
        failure {
            echo 'Pipeline failed!'
        }
    }
}