# 📚 API Документация

## Обзор

Solana Liquidity Aggregator предоставляет REST API для работы с пулами ликвидности и котировками. API построен на принципах RESTful архитектуры с использованием JSON для обмена данными.

## Базовый URL

```
http://localhost:3000/api/v1
```

## Аутентификация

В текущей версии API не требует аутентификации. Для продакшн использования рекомендуется добавить API ключи или JWT токены.

## Формат ответов

Все ответы API имеют единый формат:

### Успешный ответ
```json
{
  "success": true,
  "data": {
    // Данные ответа
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "uuid"
  }
}
```

### Ответ с ошибкой
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Описание ошибки",
    "details": {
      // Детали ошибки
    }
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "uuid"
  }
}
```

## Коды ошибок

| Код | Описание |
|-----|----------|
| `VALIDATION_ERROR` | Ошибка валидации входных данных |
| `NOT_FOUND` | Ресурс не найден |
| `RPC_ERROR` | Ошибка RPC запроса |
| `QUOTE_ERROR` | Ошибка получения котировки |
| `POOL_ERROR` | Ошибка работы с пулом |
| `AGGREGATOR_ERROR` | Ошибка агрегации |
| `INTERNAL_ERROR` | Внутренняя ошибка сервера |

## Эндпоинты

### Пулы (Pools)

#### Получить список пулов
```http
GET /pools
```

**Параметры запроса:**
- `protocol` (string, optional) - Фильтр по протоколу
- `poolType` (string, optional) - Фильтр по типу пула
- `tokenMint` (string, optional) - Фильтр по токену
- `minLiquidity` (number, optional) - Минимальная ликвидность
- `maxFee` (number, optional) - Максимальная комиссия
- `limit` (number, optional, default: 100) - Лимит результатов
- `offset` (number, optional, default: 0) - Смещение
- `sortField` (string, optional, default: 'liquidity') - Поле сортировки
- `sortDirection` (string, optional, default: 'desc') - Направление сортировки

**Пример запроса:**
```bash
curl "http://localhost:3000/api/v1/pools?protocol=RAYDIUM_AMM&limit=10"
```

**Пример ответа:**
```json
{
  "success": true,
  "data": {
    "pools": [
      {
        "id": "1",
        "address": "pool_address",
        "protocol": "RAYDIUM_AMM",
        "poolType": "CPMM",
        "tokenA": "USDC",
        "tokenB": "SOL",
        "tokenAMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "tokenBMint": "So11111111111111111111111111111111111111112",
        "fee": 0.0025,
        "liquidity": 1000000,
        "volume24h": 500000,
        "tvl": 2000000,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 10,
    "totalPages": 10
  }
}
```

#### Получить статистику пулов
```http
GET /pools/stats
```

**Пример ответа:**
```json
{
  "success": true,
  "data": {
    "totalPools": 1000,
    "totalLiquidity": 50000000,
    "totalVolume24h": 10000000,
    "averageFee": 0.003,
    "protocols": {
      "RAYDIUM_AMM": 400,
      "RAYDIUM_CLMM": 200,
      "ORCA_WHIRLPOOL": 300,
      "METEORA_DLMM": 100
    },
    "lastUpdate": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Получить пулы по паре токенов
```http
GET /pools/tokens/{tokenA}/{tokenB}
```

**Параметры пути:**
- `tokenA` (string) - Минт первого токена
- `tokenB` (string) - Минт второго токена

**Пример запроса:**
```bash
curl "http://localhost:3000/api/v1/pools/tokens/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/So11111111111111111111111111111111111111112"
```

#### Получить пул по адресу
```http
GET /pools/address/{address}
```

**Параметры пути:**
- `address` (string) - Адрес пула

#### Принудительное обновление пулов
```http
POST /pools/refresh
```

**Пример ответа:**
```json
{
  "success": true,
  "data": {
    "message": "Индексация запущена",
    "indexedPools": 150,
    "duration": 5000
  }
}
```

#### Проверка здоровья сервиса пулов
```http
GET /pools/health
```

### Котировки (Quotes)

#### Получить котировку
```http
POST /quotes
```

**Тело запроса:**
```json
{
  "inputToken": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "outputToken": "So11111111111111111111111111111111111111112",
  "inputAmount": 1000,
  "slippageTolerance": 0.01,
  "protocols": ["RAYDIUM_AMM", "ORCA_WHIRLPOOL"],
  "poolTypes": ["CPMM", "CLMM"]
}
```

**Пример ответа:**
```json
{
  "success": true,
  "data": {
    "id": "quote_id",
    "inputToken": "USDC",
    "outputToken": "SOL",
    "inputAmount": 1000,
    "outputAmount": 15.5,
    "price": 0.0155,
    "priceImpact": 0.001,
    "fee": 2.5,
    "poolAddress": "pool_address",
    "protocol": "RAYDIUM_AMM",
    "poolType": "CPMM",
    "validUntil": "2024-01-01T00:05:00.000Z",
    "route": [
      {
        "poolAddress": "pool_address",
        "protocol": "RAYDIUM_AMM",
        "inputAmount": 1000,
        "outputAmount": 15.5
      }
    ]
  }
}
```

#### Получить агрегированную котировку
```http
POST /quotes/aggregated
```

**Тело запроса:** Аналогично обычной котировке

**Пример ответа:**
```json
{
  "success": true,
  "data": {
    "id": "aggregated_quote_id",
    "inputToken": "USDC",
    "outputToken": "SOL",
    "inputAmount": 1000,
    "outputAmount": 15.7,
    "price": 0.0157,
    "priceImpact": 0.0005,
    "fee": 2.0,
    "strategy": "best_output",
    "routes": [
      {
        "poolAddress": "pool_address_1",
        "protocol": "RAYDIUM_AMM",
        "inputAmount": 600,
        "outputAmount": 9.4
      },
      {
        "poolAddress": "pool_address_2",
        "protocol": "ORCA_WHIRLPOOL",
        "inputAmount": 400,
        "outputAmount": 6.3
      }
    ],
    "summary": {
      "bestPrice": 0.0157,
      "worstPrice": 0.0155,
      "averagePrice": 0.0156,
      "totalFee": 2.0
    },
    "validUntil": "2024-01-01T00:05:00.000Z"
  }
}
```

#### Получить историю котировок
```http
GET /quotes/history
```

**Параметры запроса:**
- `inputToken` (string) - Минт входного токена
- `outputToken` (string) - Минт выходного токена
- `limit` (number, optional, default: 100) - Лимит результатов
- `since` (string, optional) - Время начала (ISO 8601)

#### Получить статистику котировок
```http
GET /quotes/stats
```

**Пример ответа:**
```json
{
  "success": true,
  "data": {
    "totalQuotes": 50000,
    "averagePrice": 0.0156,
    "bestPrice": 0.0157,
    "worstPrice": 0.0155,
    "totalVolume": 1000000,
    "lastQuoteTime": "2024-01-01T00:00:00.000Z",
    "protocols": {
      "RAYDIUM_AMM": 25000,
      "ORCA_WHIRLPOOL": 15000,
      "METEORA_DLMM": 10000
    }
  }
}
```

#### Получить статистику агрегатора
```http
GET /quotes/aggregator/stats
```

#### Проверка здоровья агрегатора
```http
GET /quotes/aggregator/health
```

#### Очистить кэш котировок
```http
POST /quotes/clear-cache
```

### Унифицированный API

#### Получить список протоколов
```http
GET /protocols
```

**Пример ответа:**
```json
{
  "success": true,
  "data": [
    {
      "protocol": "RAYDIUM_AMM",
      "name": "Raydium AMM",
      "description": "Raydium Automated Market Maker",
      "isActive": true
    },
    {
      "protocol": "ORCA_WHIRLPOOL",
      "name": "Orca Whirlpool",
      "description": "Orca Whirlpool Concentrated Liquidity",
      "isActive": true
    }
  ]
}
```

#### Получить пулы протокола
```http
GET /protocols/{protocol}/pools
```

**Параметры пути:**
- `protocol` (string) - Идентификатор протокола

**Параметры запроса:** Аналогично `/pools`

#### Получить котировку от протокола
```http
POST /protocols/{protocol}/quote
```

**Параметры пути:**
- `protocol` (string) - Идентификатор протокола

**Тело запроса:** Аналогично `/quotes`

#### Получить статистику протокола
```http
GET /protocols/{protocol}/stats
```

#### Проверить здоровье протокола
```http
GET /protocols/{protocol}/health
```

## Rate Limiting

API использует rate limiting для защиты от злоупотреблений:

- **Лимит**: 100 запросов в минуту на IP
- **Заголовки ответа**:
  - `X-RateLimit-Limit` - Лимит запросов
  - `X-RateLimit-Remaining` - Оставшиеся запросы
  - `X-RateLimit-Reset` - Время сброса лимита

## Пагинация

Для эндпоинтов, возвращающих списки, используется пагинация:

**Параметры:**
- `limit` - Количество элементов на странице (по умолчанию 100, максимум 1000)
- `offset` - Смещение от начала (по умолчанию 0)

**Ответ включает:**
- `total` - Общее количество элементов
- `page` - Текущая страница
- `pageSize` - Размер страницы
- `totalPages` - Общее количество страниц

## Фильтрация и сортировка

### Поддерживаемые поля для фильтрации:
- `protocol` - Протокол пула
- `poolType` - Тип пула
- `tokenMint` - Минт токена
- `minLiquidity` - Минимальная ликвидность
- `maxFee` - Максимальная комиссия

### Поддерживаемые поля для сортировки:
- `liquidity` - Ликвидность
- `volume24h` - Объем за 24 часа
- `tvl` - Total Value Locked
- `fee` - Комиссия
- `createdAt` - Дата создания

### Направления сортировки:
- `asc` - По возрастанию
- `desc` - По убыванию

## WebSocket API

Для получения обновлений в реальном времени доступен WebSocket API:

```javascript
const ws = new WebSocket('ws://localhost:3000/api/v1/ws');

// Подписка на обновления пулов
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'pools',
  filters: { protocol: 'RAYDIUM_AMM' }
}));

// Подписка на обновления котировок
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'quotes',
  filters: { 
    inputToken: 'USDC',
    outputToken: 'SOL'
  }
}));

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Получено обновление:', data);
};
```

## Примеры использования

### JavaScript/TypeScript

```typescript
class LiquidityClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000/api/v1') {
    this.baseUrl = baseUrl;
  }

  async getPools(filters: any = {}) {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${this.baseUrl}/pools?${params}`);
    return response.json();
  }

  async getQuote(request: any) {
    const response = await fetch(`${this.baseUrl}/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    return response.json();
  }

  async getAggregatedQuote(request: any) {
    const response = await fetch(`${this.baseUrl}/quotes/aggregated`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    return response.json();
  }
}

// Использование
const client = new LiquidityClient();

// Получить пулы Raydium
const pools = await client.getPools({ protocol: 'RAYDIUM_AMM', limit: 10 });

// Получить котировку USDC -> SOL
const quote = await client.getQuote({
  inputToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  outputToken: 'So11111111111111111111111111111111111111112',
  inputAmount: 1000
});
```

### Python

```python
import requests
import json

class LiquidityClient:
    def __init__(self, base_url="http://localhost:3000/api/v1"):
        self.base_url = base_url

    def get_pools(self, **filters):
        response = requests.get(f"{self.base_url}/pools", params=filters)
        return response.json()

    def get_quote(self, request):
        response = requests.post(
            f"{self.base_url}/quotes",
            headers={"Content-Type": "application/json"},
            data=json.dumps(request)
        )
        return response.json()

    def get_aggregated_quote(self, request):
        response = requests.post(
            f"{self.base_url}/quotes/aggregated",
            headers={"Content-Type": "application/json"},
            data=json.dumps(request)
        )
        return response.json()

# Использование
client = LiquidityClient()

# Получить пулы
pools = client.get_pools(protocol="RAYDIUM_AMM", limit=10)

# Получить котировку
quote = client.get_quote({
    "inputToken": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "outputToken": "So11111111111111111111111111111111111111112",
    "inputAmount": 1000
})
```

## Заключение

API Solana Liquidity Aggregator предоставляет полный набор эндпоинтов для работы с пулами ликвидности и котировками. Все эндпоинты документированы в Swagger UI, доступном по адресу `http://localhost:3000/api/docs`.
