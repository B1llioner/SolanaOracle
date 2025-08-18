# 🚀 Руководство по развертыванию

## Обзор

Это руководство описывает различные способы развертывания Solana Liquidity Aggregator в различных средах.

## Предварительные требования

### Системные требования

- **CPU**: Минимум 2 ядра, рекомендуется 4+
- **RAM**: Минимум 4GB, рекомендуется 8GB+
- **Диск**: Минимум 20GB свободного места
- **Сеть**: Стабильное интернет-соединение для RPC запросов

### Программное обеспечение

- **Node.js**: 18.x или выше
- **PostgreSQL**: 15.x или выше
- **Redis**: 7.x или выше
- **Docker**: 20.x или выше (опционально)
- **Git**: Для клонирования репозитория

## Локальное развертывание

### 1. Клонирование репозитория

```bash
git clone https://github.com/your-username/solana-liquidity-ts.git
cd solana-liquidity-ts
```

### 2. Установка зависимостей

```bash
npm install
```

### 3. Настройка базы данных

#### PostgreSQL

```bash
# Создание базы данных
createdb solana_liquidity

# Или через psql
psql -U postgres
CREATE DATABASE solana_liquidity;
\q
```

#### Redis

```bash
# Запуск Redis
redis-server

# Или через Docker
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### 4. Настройка окружения

```bash
# Копирование примера конфигурации
cp env.example .env

# Редактирование конфигурации
nano .env
```

**Основные настройки в .env:**

```env
# База данных
DATABASE_URL="postgresql://username:password@localhost:5432/solana_liquidity"

# Redis
REDIS_URL="redis://localhost:6379"

# Solana RPC (добавьте несколько эндпоинтов для надежности)
SOLANA_RPC_ENDPOINTS="https://api.mainnet-beta.solana.com,https://solana-api.projectserum.com,https://rpc.ankr.com/solana"

# API
API_PORT=3000
API_HOST=0.0.0.0
NODE_ENV=development
```

### 5. Инициализация базы данных

```bash
# Генерация Prisma клиента
npm run db:generate

# Применение миграций
npm run db:migrate

# (Опционально) Заполнение тестовыми данными
npm run db:seed
```

### 6. Запуск приложения

```bash
# Режим разработки
npm run dev

# Продакшн режим
npm run build
npm start
```

### 7. Проверка работоспособности

```bash
# Проверка API
curl http://localhost:3000/api/v1/pools/health

# Проверка Swagger документации
open http://localhost:3000/api/docs
```

## Docker развертывание

### 1. Использование Docker Compose

```bash
# Запуск всех сервисов
docker-compose up -d

# Просмотр логов
docker-compose logs -f app

# Остановка сервисов
docker-compose down
```

### 2. Настройка Docker Compose

Создайте файл `docker-compose.override.yml` для локальных настроек:

```yaml
version: '3.8'

services:
  app:
    environment:
      - NODE_ENV=development
      - DEBUG=true
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - "3000:3000"
      - "9229:9229"  # Для отладки

  postgres:
    environment:
      - POSTGRES_DB=solana_liquidity
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 3. Сборка образа

```bash
# Сборка образа
docker build -t solana-liquidity-ts .

# Запуск контейнера
docker run -d \
  --name solana-liquidity \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://postgres:password@host.docker.internal:5432/solana_liquidity" \
  -e REDIS_URL="redis://host.docker.internal:6379" \
  solana-liquidity-ts
```

## Продакшн развертывание

### 1. Подготовка сервера

#### Ubuntu/Debian

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установка PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Установка Redis
sudo apt install redis-server -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

#### CentOS/RHEL

```bash
# Установка Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Установка PostgreSQL
sudo yum install postgresql-server postgresql-contrib -y
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Установка Redis
sudo yum install redis -y
sudo systemctl start redis
sudo systemctl enable redis
```

### 2. Настройка базы данных

```bash
# Создание пользователя и базы данных
sudo -u postgres psql

CREATE USER solana_user WITH PASSWORD 'secure_password';
CREATE DATABASE solana_liquidity OWNER solana_user;
GRANT ALL PRIVILEGES ON DATABASE solana_liquidity TO solana_user;
\q

# Настройка Redis
sudo nano /etc/redis/redis.conf

# Добавьте или измените:
bind 127.0.0.1
maxmemory 256mb
maxmemory-policy allkeys-lru
```

### 3. Развертывание приложения

```bash
# Клонирование репозитория
git clone https://github.com/your-username/solana-liquidity-ts.git
cd solana-liquidity-ts

# Установка зависимостей
npm ci --only=production

# Настройка окружения
cp env.example .env
nano .env

# Сборка приложения
npm run build

# Инициализация базы данных
npm run db:generate
npm run db:migrate
```

### 4. Настройка systemd сервиса

Создайте файл `/etc/systemd/system/solana-liquidity.service`:

```ini
[Unit]
Description=Solana Liquidity Aggregator
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=solana
WorkingDirectory=/opt/solana-liquidity-ts
ExecStart=/usr/bin/node dist/main.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

```bash
# Создание пользователя
sudo useradd -r -s /bin/false solana

# Копирование файлов
sudo cp -r . /opt/solana-liquidity-ts
sudo chown -R solana:solana /opt/solana-liquidity-ts

# Запуск сервиса
sudo systemctl daemon-reload
sudo systemctl enable solana-liquidity
sudo systemctl start solana-liquidity

# Проверка статуса
sudo systemctl status solana-liquidity
```

### 5. Настройка Nginx

Создайте файл `/etc/nginx/sites-available/solana-liquidity`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
    }
}
```

```bash
# Активация сайта
sudo ln -s /etc/nginx/sites-available/solana-liquidity /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Настройка SSL (Let's Encrypt)

```bash
# Установка Certbot
sudo apt install certbot python3-certbot-nginx -y

# Получение сертификата
sudo certbot --nginx -d your-domain.com

# Автоматическое обновление
sudo crontab -e
# Добавьте строку:
0 12 * * * /usr/bin/certbot renew --quiet
```

## Kubernetes развертывание

### 1. Создание ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: solana-liquidity-config
data:
  NODE_ENV: "production"
  API_PORT: "3000"
  API_HOST: "0.0.0.0"
  LOG_LEVEL: "info"
  CACHE_TTL: "300"
  POOL_CACHE_TTL: "60"
  QUOTE_CACHE_TTL: "30"
  INDEXER_INTERVAL_MS: "5000"
  MAX_CONCURRENT_REQUESTS: "10"
```

### 2. Создание Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: solana-liquidity-secret
type: Opaque
data:
  DATABASE_URL: <base64-encoded-database-url>
  REDIS_URL: <base64-encoded-redis-url>
  SOLANA_RPC_ENDPOINTS: <base64-encoded-rpc-endpoints>
  JWT_SECRET: <base64-encoded-jwt-secret>
```

### 3. Создание Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: solana-liquidity
  labels:
    app: solana-liquidity
spec:
  replicas: 3
  selector:
    matchLabels:
      app: solana-liquidity
  template:
    metadata:
      labels:
        app: solana-liquidity
    spec:
      containers:
      - name: solana-liquidity
        image: your-registry/solana-liquidity-ts:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: solana-liquidity-config
        - secretRef:
            name: solana-liquidity-secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/v1/pools/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/v1/pools/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### 4. Создание Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: solana-liquidity-service
spec:
  selector:
    app: solana-liquidity
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

### 5. Создание Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: solana-liquidity-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  rules:
  - host: your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: solana-liquidity-service
            port:
              number: 80
```

## Мониторинг и логирование

### 1. Prometheus метрики

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'solana-liquidity'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

### 2. Grafana дашборд

Создайте дашборд для мониторинга:
- Количество пулов по протоколам
- Время отклика API
- Статистика кэширования
- Ошибки протоколов
- Использование ресурсов

### 3. Логирование

```bash
# Настройка logrotate
sudo nano /etc/logrotate.d/solana-liquidity

/var/log/solana-liquidity/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 solana solana
    postrotate
        systemctl reload solana-liquidity
    endscript
}
```

## Резервное копирование

### 1. База данных

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
DB_NAME="solana_liquidity"

# Создание резервной копии
pg_dump -U postgres $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Сжатие
gzip $BACKUP_DIR/backup_$DATE.sql

# Удаление старых резервных копий (старше 30 дней)
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
```

### 2. Автоматизация

```bash
# Добавление в crontab
crontab -e

# Ежедневное резервное копирование в 2:00
0 2 * * * /path/to/backup.sh
```

## Обновление приложения

### 1. Подготовка обновления

```bash
# Создание резервной копии
./backup.sh

# Остановка сервиса
sudo systemctl stop solana-liquidity

# Обновление кода
git pull origin main
npm ci --only=production
npm run build
```

### 2. Применение миграций

```bash
# Проверка миграций
npm run db:migrate:status

# Применение миграций
npm run db:migrate
```

### 3. Запуск обновленного приложения

```bash
# Запуск сервиса
sudo systemctl start solana-liquidity

# Проверка статуса
sudo systemctl status solana-liquidity

# Проверка работоспособности
curl http://localhost:3000/api/v1/pools/health
```

## Troubleshooting

### Частые проблемы

#### 1. Ошибки подключения к базе данных

```bash
# Проверка статуса PostgreSQL
sudo systemctl status postgresql

# Проверка подключения
psql -U postgres -d solana_liquidity -c "SELECT 1;"

# Проверка логов
sudo journalctl -u postgresql -f
```

#### 2. Ошибки Redis

```bash
# Проверка статуса Redis
sudo systemctl status redis

# Проверка подключения
redis-cli ping

# Очистка кэша
redis-cli FLUSHALL
```

#### 3. Высокое использование памяти

```bash
# Мониторинг процессов
htop

# Проверка логов приложения
sudo journalctl -u solana-liquidity -f

# Перезапуск сервиса
sudo systemctl restart solana-liquidity
```

#### 4. Медленные запросы

```bash
# Проверка индексов базы данных
psql -U postgres -d solana_liquidity -c "\d+ pools"
psql -U postgres -d solana_liquidity -c "\d+ quotes"

# Анализ медленных запросов
psql -U postgres -d solana_liquidity -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

## Заключение

Это руководство покрывает основные сценарии развертывания Solana Liquidity Aggregator. Для продакшн использования рекомендуется:

1. Использовать Docker или Kubernetes для контейнеризации
2. Настроить мониторинг и алерты
3. Регулярно создавать резервные копии
4. Использовать SSL сертификаты
5. Настроить rate limiting и защиту от DDoS
6. Регулярно обновлять зависимости и систему
