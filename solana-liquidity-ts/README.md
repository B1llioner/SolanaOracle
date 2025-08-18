# 🚀 Solana Liquidity Aggregator

Агрегатор ликвидности для Solana DeFi протоколов с поддержкой Raydium, Orca, Meteora и других протоколов.

## 📋 Описание

Solana Liquidity Aggregator - это высокопроизводительная система для агрегации ликвидности из различных DeFi протоколов Solana. Система предоставляет единый API для получения котировок, обнаружения пулов и мониторинга ликвидности.

## ✨ Возможности

- 🔍 **Автоматическое обнаружение пулов** из различных протоколов
- 💱 **Агрегация котировок** с множественными стратегиями
- 🚀 **Высокая производительность** с кэшированием и оптимизацией
- 🔄 **Поддержка протоколов**:
  - Raydium AMM
  - Raydium CLMM
  - Orca Whirlpool
  - Meteora DLMM
- 📊 **Мониторинг и статистика** в реальном времени
- 🛡️ **Надежность** с автоматическими фолбэками и ретраями
- 📚 **Полная документация API** с Swagger

## 🏗️ Архитектура

```
solana-liquidity-ts/
├── src/
│   ├── config/           # Конфигурация приложения
│   ├── common/           # Общие компоненты (типы, утилиты, RPC, кэш)
│   ├── db/              # Работа с базой данных (Prisma, репозитории)
│   ├── pools/           # Модули протоколов (Raydium, Orca, Meteora)
│   ├── indexer/         # Индексация пулов
│   ├── quote-engine/    # Движок котировок и агрегации
│   └── api/             # REST API с контроллерами и DTO
```

## 🚀 Быстрый старт

### Предварительные требования

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker (опционально)

### Установка

1. **Клонирование репозитория**
```bash
git clone https://github.com/your-username/solana-liquidity-ts.git
cd solana-liquidity-ts
```

2. **Установка зависимостей**
```bash
npm install
```

3. **Настройка окружения**
```bash
cp .env.example .env
# Отредактируйте .env файл с вашими настройками
```

4. **Настройка базы данных**
```bash
# Создание миграций
npm run db:migrate

# Генерация Prisma клиента
npm run db:generate
```

5. **Запуск приложения**
```bash
# Режим разработки
npm run dev

# Продакшн
npm run build
npm start
```

### Docker

```bash
# Запуск всех сервисов
docker-compose up -d

# Просмотр логов
docker-compose logs -f app
```

## 📚 API Документация

После запуска приложения, документация Swagger доступна по адресу:
```
http://localhost:3000/api/docs
```

### Основные эндпоинты

#### Пулы
- `GET /api/v1/pools` - Список пулов с фильтрацией
- `GET /api/v1/pools/stats` - Статистика пулов
- `GET /api/v1/pools/tokens/:tokenA/:tokenB` - Пулы по паре токенов
- `GET /api/v1/pools/health` - Проверка здоровья сервиса

#### Котировки
- `POST /api/v1/quotes` - Получение котировки
- `POST /api/v1/quotes/aggregated` - Агрегированная котировка
- `GET /api/v1/quotes/history` - История котировок
- `GET /api/v1/quotes/stats` - Статистика котировок

#### Унифицированный API
- `GET /api/v1/protocols` - Список поддерживаемых протоколов
- `GET /api/v1/protocols/:protocol/pools` - Пулы конкретного протокола
- `POST /api/v1/protocols/:protocol/quote` - Котировка от протокола

## 🔧 Конфигурация

### Переменные окружения

```env
# База данных
DATABASE_URL="postgresql://user:password@localhost:5432/solana_liquidity"

# Redis
REDIS_URL="redis://localhost:6379"

# Solana RPC
SOLANA_RPC_ENDPOINTS="https://api.mainnet-beta.solana.com,https://solana-api.projectserum.com"

# API
API_PORT=3000
API_HOST=0.0.0.0
NODE_ENV=development

# Кэширование
CACHE_TTL=300
POOL_CACHE_TTL=60
QUOTE_CACHE_TTL=30

# Индексация
INDEXER_INTERVAL_MS=5000
MAX_CONCURRENT_REQUESTS=10

# Протоколы
RAYDIUM_AMM_PROGRAM_ID="675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"
RAYDIUM_CLMM_PROGRAM_ID="CAMMCzo5YL8w4VFF8KVHrK22GGUQp5KpKpKpKpKpKpKpKpKp"
ORCA_WHIRLPOOL_PROGRAM_ID="whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc"
METEORA_DLMM_PROGRAM_ID="LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"
```

## 🧪 Тестирование

```bash
# Запуск тестов
npm test

# Тесты с покрытием
npm run test:cov

# E2E тесты
npm run test:e2e
```

## 📊 Мониторинг

### Метрики

Система предоставляет следующие метрики:
- Количество индексированных пулов
- Время отклика API
- Статистика кэширования
- Ошибки протоколов
- Использование ресурсов

### Логирование

Логи структурированы и включают:
- Уровни: error, warn, info, debug
- Контекст: модуль, операция, параметры
- Временные метки и трейсинг

## 🔄 Разработка

### Структура проекта

```
src/
├── config/              # Конфигурация
│   ├── config.module.ts
│   └── config.service.ts
├── common/              # Общие компоненты
│   ├── types/           # Типы и интерфейсы
│   ├── utils/           # Утилиты
│   ├── rpc/             # RPC сервисы
│   └── cache/           # Кэширование
├── db/                  # База данных
│   ├── db.module.ts
│   ├── prisma.service.ts
│   └── repositories/    # Репозитории
├── pools/               # Протоколы
│   ├── common/          # Общие интерфейсы
│   ├── raydium-amm/     # Raydium AMM
│   ├── raydium-clmm/    # Raydium CLMM
│   ├── orca-whirlpool/  # Orca Whirlpool
│   └── meteora-dlmm/    # Meteora DLMM
├── indexer/             # Индексация
├── quote-engine/        # Движок котировок
└── api/                 # REST API
    ├── controllers/     # Контроллеры
    └── dto/             # DTO
```

### Добавление нового протокола

1. Создайте модуль в `src/pools/your-protocol/`
2. Реализуйте интерфейсы `ProtocolService` и `ProtocolLayout`
3. Добавьте в `ProtocolFactoryService`
4. Обновите индексер
5. Добавьте тесты

### Скрипты

```bash
# Разработка
npm run dev              # Запуск в режиме разработки
npm run build            # Сборка проекта
npm run start            # Запуск в продакшне

# База данных
npm run db:migrate       # Применение миграций
npm run db:generate      # Генерация Prisma клиента
npm run db:studio        # Запуск Prisma Studio

# Код
npm run lint             # Проверка кода
npm run format           # Форматирование кода
npm run test             # Запуск тестов
```

## 🤝 Вклад в проект

1. Форкните репозиторий
2. Создайте ветку для новой функции (`git checkout -b feature/amazing-feature`)
3. Зафиксируйте изменения (`git commit -m 'Add amazing feature'`)
4. Отправьте в ветку (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

Этот проект лицензирован под MIT License - см. файл [LICENSE](LICENSE) для деталей.

## 🆘 Поддержка

- 📧 Email: support@example.com
- 💬 Discord: [Ссылка на Discord]
- 📖 Документация: [Ссылка на документацию]
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/solana-liquidity-ts/issues)

## 🙏 Благодарности

- [NestJS](https://nestjs.com/) - Фреймворк для Node.js
- [Prisma](https://www.prisma.io/) - ORM для базы данных
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/) - JavaScript API для Solana
- [Raydium](https://raydium.io/) - DeFi протокол
- [Orca](https://orca.so/) - DeFi протокол
- [Meteora](https://meteora.ag/) - DeFi протокол

---

**Версия**: 1.0.0  
**Последнее обновление**: 2024-01-XX
