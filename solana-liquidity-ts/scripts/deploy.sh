#!/bin/bash

# Скрипт для ручного развертывания Solana Liquidity Aggregator
# Использование: ./scripts/deploy.sh [environment]

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функции для логирования
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка аргументов
ENVIRONMENT=${1:-production}
DEPLOY_DIR="/opt/solana-liquidity-ts"

log_info "Начинаем развертывание в окружение: $ENVIRONMENT"

# Проверка наличия необходимых файлов
if [ ! -f "package.json" ]; then
    log_error "package.json не найден. Запустите скрипт из корня проекта."
    exit 1
fi

# Сборка проекта
log_info "Устанавливаем зависимости..."
npm ci

log_info "Генерируем Prisma клиент..."
npm run db:generate

log_info "Собираем проект..."
npm run build

# Создание пакета для развертывания
log_info "Создаем пакет для развертывания..."
tar -czf deployment.tar.gz \
    dist/ \
    node_modules/.prisma/ \
    prisma/ \
    package.json \
    package-lock.json \
    docker-compose.yml \
    .env.example \
    scripts/

# Проверка SSH подключения к серверу
if [ -z "$SERVER_HOST" ] || [ -z "$SERVER_USER" ]; then
    log_error "Переменные SERVER_HOST и SERVER_USER не установлены"
    log_info "Установите переменные окружения или отредактируйте скрипт"
    exit 1
fi

# Развертывание на сервер
log_info "Подключаемся к серверу $SERVER_HOST..."

# Создание backup
ssh $SERVER_USER@$SERVER_HOST << EOF
    if [ -d "$DEPLOY_DIR" ]; then
        log_info "Создаем backup текущей версии..."
        cd $DEPLOY_DIR
        if [ -d "current" ]; then
            cp -r current backup-\$(date +%Y%m%d_%H%M%S)
        fi
    else
        log_info "Создаем директорию для проекта..."
        sudo mkdir -p $DEPLOY_DIR
        sudo chown $SERVER_USER:$SERVER_USER $DEPLOY_DIR
    fi
EOF

# Загрузка файлов
log_info "Загружаем файлы на сервер..."
scp deployment.tar.gz $SERVER_USER@$SERVER_HOST:$DEPLOY_DIR/

# Установка на сервере
log_info "Устанавливаем приложение на сервере..."
ssh $SERVER_USER@$SERVER_HOST << EOF
    cd $DEPLOY_DIR
    
    # Останавливаем текущий сервис
    log_info "Останавливаем текущий сервис..."
    sudo systemctl stop solana-liquidity || true
    
    # Распаковываем новый код
    log_info "Распаковываем новый код..."
    tar -xzf deployment.tar.gz
    
    # Устанавливаем зависимости
    log_info "Устанавливаем зависимости..."
    npm ci --only=production
    
    # Применяем миграции базы данных
    log_info "Применяем миграции базы данных..."
    npm run db:migrate
    
    # Настройка systemd сервиса
    log_info "Настраиваем systemd сервис..."
    sudo tee /etc/systemd/system/solana-liquidity.service > /dev/null << 'SERVICE'
[Unit]
Description=Solana Liquidity Aggregator
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=$SERVER_USER
WorkingDirectory=$DEPLOY_DIR
ExecStart=/usr/bin/node dist/main.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
SERVICE
    
    # Перезагружаем systemd и включаем сервис
    sudo systemctl daemon-reload
    sudo systemctl enable solana-liquidity
    
    # Запускаем сервис
    log_info "Запускаем сервис..."
    sudo systemctl start solana-liquidity
    
    # Проверяем статус
    log_info "Проверяем статус сервиса..."
    sudo systemctl status solana-liquidity
    
    # Ждем запуска и проверяем здоровье
    log_info "Проверяем здоровье API..."
    sleep 10
    if curl -f http://localhost:3000/api/v1/pools/health; then
        log_info "✅ API работает корректно"
    else
        log_error "❌ API не отвечает"
        exit 1
    fi
    
    # Очистка
    rm -f deployment.tar.gz
    
    log_info "✅ Развертывание завершено успешно!"
EOF

# Очистка локальных файлов
rm -f deployment.tar.gz

log_info "🎉 Развертывание завершено!"
log_info "API доступен по адресу: http://$SERVER_HOST:3000"
log_info "Swagger документация: http://$SERVER_HOST:3000/api/docs"
