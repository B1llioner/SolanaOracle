# 📋 Техническое задание: Solana Liquidity Aggregator

## Обзор проекта

Solana Liquidity Aggregator - это система для агрегации ликвидности из различных DeFi протоколов Solana с предоставлением единого API для получения котировок и информации о пулах.

## Текущий статус

### ✅ Реализовано
- Базовая архитектура проекта
- Конфигурация и общие компоненты
- База данных и репозитории
- Raydium AMM модуль (полная реализация)
- Индексация и движок котировок
- REST API с контроллерами
- Документация и Docker конфигурация

### 🔄 В процессе
- Реализация остальных протоколов
- Унифицированный роутинг
- Дополнительные функции

### ❌ Не реализовано
- Raydium CLMM модуль
- Orca Whirlpool модуль
- Meteora DLMM модуль
- WebSocket API
- Расширенный мониторинг
- Тесты

## Задачи для завершения проекта

### 1. 🔧 Реализация недостающих протоколов

#### 1.1 Raydium CLMM (Concentrated Liquidity Market Maker)

**Файлы для создания:**
- `src/pools/raydium-clmm/raydium-clmm.layout.ts`
- `src/pools/raydium-clmm/raydium-clmm.service.ts`

**Требования:**
```typescript
// Layout интерфейс
interface RaydiumClmmPoolLayout {
  // Основные поля
  baseMint: string;
  quoteMint: string;
  baseDecimals: number;
  quoteDecimals: number;
  
  // Позиции ликвидности
  positions: {
    id: string;
    liquidity: number;
    lowerPrice: number;
    upperPrice: number;
    feeGrowthInside0LastX128: number;
    feeGrowthInside1LastX128: number;
  }[];
  
  // Текущее состояние
  currentSqrtPrice: number;
  currentLiquidity: number;
  feeGrowthGlobal0X128: number;
  feeGrowthGlobal1X128: number;
  
  // Конфигурация
  feeRate: number;
  protocolFeeRate: number;
  tickSpacing: number;
  maxLiquidityPerTick: number;
}

// Методы для реализации
class RaydiumClmmLayout {
  parsePoolAccount(data: Buffer, address: string): LiquidityPoolData | null
  private decodeLayout(data: Buffer): RaydiumClmmPoolLayout
  private validateLayout(layout: RaydiumClmmPoolLayout): boolean
  calculatePrice(layout: RaydiumClmmPoolLayout): number
  calculateSwapOutput(
    layout: RaydiumClmmPoolLayout,
    inputAmount: number,
    isTokenAToB: boolean,
    sqrtPriceLimit?: number
  ): { outputAmount: number; fee: number }
  private findCrossedTicks(
    layout: RaydiumClmmPoolLayout,
    inputAmount: number,
    isTokenAToB: boolean
  ): { crossedTicks: any[]; remainingAmount: number }
}
```

**Математические формулы для CLMM:**
```typescript
// Расчет цены из sqrtPrice
price = (sqrtPrice / 2^64) ^ 2

// Расчет ликвидности для позиции
liquidity = amount0 * sqrtPrice * (sqrtPriceUpper - sqrtPrice) / (sqrtPriceUpper - sqrtPriceLower)

// Расчет свапа
function calculateSwap(
  sqrtPrice: number,
  liquidity: number,
  amountIn: number,
  zeroForOne: boolean
): { sqrtPriceNext: number; amountOut: number; fee: number } {
  // Реализация формулы свапа для CLMM
}
```

#### 1.2 Orca Whirlpool

**Файлы для создания:**
- `src/pools/orca-whirlpool/orca-whirlpool.layout.ts`
- `src/pools/orca-whirlpool/orca-whirlpool.service.ts`

**Требования:**
```typescript
interface OrcaWhirlpoolLayout {
  // Основные поля
  whirlpoolsConfig: string;
  whirlpoolBump: number;
  tickSpacing: number;
  tickSpacingSeed: number;
  feeRate: number;
  protocolFeeRate: number;
  
  // Токены
  tokenMintA: string;
  tokenVaultA: string;
  feeGrowthGlobalA: number;
  tokenMintB: string;
  tokenVaultB: string;
  feeGrowthGlobalB: number;
  
  // Текущее состояние
  tickCurrentIndex: number;
  sqrtPrice: number;
  liquidity: number;
  liquidityNet: number;
  liquidityGross: number;
  
  // Конфигурация
  protocolFeeOwedA: number;
  protocolFeeOwedB: number;
  rewardLastUpdatedTimestamp: number;
}

class OrcaWhirlpoolLayout {
  parsePoolAccount(data: Buffer, address: string): LiquidityPoolData | null
  private decodeLayout(data: Buffer): OrcaWhirlpoolLayout
  calculatePrice(layout: OrcaWhirlpoolLayout): number
  calculateSwapOutput(
    layout: OrcaWhirlpoolLayout,
    inputAmount: number,
    isTokenAToB: boolean
  ): { outputAmount: number; fee: number }
}
```

#### 1.3 Meteora DLMM (Dynamic Liquidity Market Maker)

**Файлы для создания:**
- `src/pools/meteora-dlmm/meteora-dlmm.layout.ts`
- `src/pools/meteora-dlmm/meteora-dlmm.service.ts`

**Требования:**
```typescript
interface MeteoraDlmmLayout {
  // Основные поля
  baseMint: string;
  quoteMint: string;
  baseDecimals: number;
  quoteDecimals: number;
  
  // Динамические веса
  baseWeight: number;
  quoteWeight: number;
  
  // Резервы
  baseReserve: number;
  quoteReserve: number;
  
  // Конфигурация
  feeRate: number;
  protocolFeeRate: number;
  swapCap: number;
  
  // Дополнительные параметры
  rebalanceThreshold: number;
  rebalanceCooldown: number;
}

class MeteoraDlmmLayout {
  parsePoolAccount(data: Buffer, address: string): LiquidityPoolData | null
  private decodeLayout(data: Buffer): MeteoraDlmmLayout
  calculatePrice(layout: MeteoraDlmmLayout): number
  calculateSwapOutput(
    layout: MeteoraDlmmLayout,
    inputAmount: number,
    isTokenAToB: boolean
  ): { outputAmount: number; fee: number }
  
  // Специфичные для DLMM методы
  calculateDynamicWeights(layout: MeteoraDlmmLayout): { baseWeight: number; quoteWeight: number }
  shouldRebalance(layout: MeteoraDlmmLayout): boolean
}
```

### 2. 🔄 Обновление существующих модулей

#### 2.1 Обновление `src/pools/raydium-clmm/raydium-clmm.module.ts`
```typescript
@Module({
  providers: [
    RaydiumClmmService,
    RaydiumClmmLayout,
    RpcPoolService,
    CacheService,
    PoolsRepository,
  ],
  exports: [RaydiumClmmService],
})
export class RaydiumClmmModule {}
```

#### 2.2 Обновление `src/pools/orca-whirlpool/orca-whirlpool.module.ts`
```typescript
@Module({
  providers: [
    OrcaWhirlpoolService,
    OrcaWhirlpoolLayout,
    RpcPoolService,
    CacheService,
    PoolsRepository,
  ],
  exports: [OrcaWhirlpoolService],
})
export class OrcaWhirlpoolModule {}
```

#### 2.3 Обновление `src/pools/meteora-dlmm/meteora-dlmm.module.ts`
```typescript
@Module({
  providers: [
    MeteoraDlmmService,
    MeteoraDlmmLayout,
    RpcPoolService,
    CacheService,
    PoolsRepository,
  ],
  exports: [MeteoraDlmmService],
})
export class MeteoraDlmmModule {}
```

### 3. 🏭 Создание фабрики протоколов

#### 3.1 `src/pools/protocol-factory.service.ts`
```typescript
@Injectable()
export class ProtocolFactoryService {
  private protocols: Map<Protocol, ProtocolService> = new Map();
  
  constructor(
    private raydiumAmmService: RaydiumAmmService,
    private raydiumClmmService: RaydiumClmmService,
    private orcaWhirlpoolService: OrcaWhirlpoolService,
    private meteoraDlmmService: MeteoraDlmmService,
  ) {
    this.registerProtocols();
  }
  
  private registerProtocols(): void {
    this.protocols.set(Protocol.RAYDIUM_AMM, this.raydiumAmmService);
    this.protocols.set(Protocol.RAYDIUM_CLMM, this.raydiumClmmService);
    this.protocols.set(Protocol.ORCA_WHIRLPOOL, this.orcaWhirlpoolService);
    this.protocols.set(Protocol.METEORA_DLMM, this.meteoraDlmmService);
  }
  
  getProtocol(protocol: Protocol): ProtocolService {
    const service = this.protocols.get(protocol);
    if (!service) {
      throw new Error(`Протокол ${protocol} не поддерживается`);
    }
    return service;
  }
  
  getAllProtocols(): ProtocolService[] {
    return Array.from(this.protocols.values());
  }
  
  getSupportedProtocols(): Protocol[] {
    return Array.from(this.protocols.keys());
  }
  
  async healthCheck(): Promise<Record<Protocol, boolean>> {
    const health: Record<Protocol, boolean> = {};
    
    for (const [protocol, service] of this.protocols) {
      try {
        const result = await service.healthCheck();
        health[protocol] = result.isHealthy;
      } catch (error) {
        health[protocol] = false;
      }
    }
    
    return health;
  }
}
```

### 4. 🔄 Обновление индексера

#### 4.1 Обновление `src/indexer/indexer.service.ts`
```typescript
private async indexRaydiumClmm(): Promise<number> {
  try {
    this.logger.log('Начинаем индексацию Raydium CLMM пулов');
    const discoveryResult = await this.raydiumClmmService.discoverPools(1000);
    const updateResult = await this.raydiumClmmService.updatePools(discoveryResult.pools);
    this.logger.log(`Raydium CLMM: индексировано ${updateResult.created + updateResult.updated} пулов`);
    return updateResult.created + updateResult.updated;
  } catch (error) {
    this.logger.error('Ошибка индексации Raydium CLMM:', error);
    return 0;
  }
}

private async indexOrcaWhirlpool(): Promise<number> {
  try {
    this.logger.log('Начинаем индексацию Orca Whirlpool пулов');
    const discoveryResult = await this.orcaWhirlpoolService.discoverPools(1000);
    const updateResult = await this.orcaWhirlpoolService.updatePools(discoveryResult.pools);
    this.logger.log(`Orca Whirlpool: индексировано ${updateResult.created + updateResult.updated} пулов`);
    return updateResult.created + updateResult.updated;
  } catch (error) {
    this.logger.error('Ошибка индексации Orca Whirlpool:', error);
    return 0;
  }
}

private async indexMeteoraDlmm(): Promise<number> {
  try {
    this.logger.log('Начинаем индексацию Meteora DLMM пулов');
    const discoveryResult = await this.meteoraDlmmService.discoverPools(1000);
    const updateResult = await this.meteoraDlmmService.updatePools(discoveryResult.pools);
    this.logger.log(`Meteora DLMM: индексировано ${updateResult.created + updateResult.updated} пулов`);
    return updateResult.created + updateResult.updated;
  } catch (error) {
    this.logger.error('Ошибка индексации Meteora DLMM:', error);
    return 0;
  }
}
```

### 5. 🌐 Создание унифицированного API

#### 5.1 `src/api/controllers/unified.controller.ts`
```typescript
@ApiTags('unified')
@Controller('api/v1')
export class UnifiedController {
  constructor(
    private protocolFactory: ProtocolFactoryService,
    private quoteService: QuoteService,
    private aggregatorService: AggregatorService,
  ) {}
  
  @Get('protocols')
  @ApiOperation({ summary: 'Получить список поддерживаемых протоколов' })
  async getProtocols() {
    const protocols = this.protocolFactory.getSupportedProtocols();
    const health = await this.protocolFactory.healthCheck();
    
    return {
      success: true,
      data: protocols.map(protocol => ({
        protocol,
        name: this.getProtocolName(protocol),
        description: this.getProtocolDescription(protocol),
        isActive: health[protocol],
      })),
    };
  }
  
  @Get('protocols/:protocol/pools')
  @ApiOperation({ summary: 'Получить пулы конкретного протокола' })
  async getProtocolPools(
    @Param('protocol') protocol: Protocol,
    @Query() query: GetPoolsDto,
  ) {
    const protocolService = this.protocolFactory.getProtocol(protocol);
    const pools = await protocolService.discoverPools(query.limit);
    
    return {
      success: true,
      data: pools.pools,
      meta: {
        protocol,
        count: pools.pools.length,
        lastUpdate: pools.discoveryTime,
      },
    };
  }
  
  @Post('protocols/:protocol/quote')
  @ApiOperation({ summary: 'Получить котировку от конкретного протокола' })
  async getProtocolQuote(
    @Param('protocol') protocol: Protocol,
    @Body() getQuoteDto: GetQuoteDto,
  ) {
    const protocolService = this.protocolFactory.getProtocol(protocol);
    const quote = await protocolService.getQuote({
      inputToken: getQuoteDto.inputToken,
      outputToken: getQuoteDto.outputToken,
      inputAmount: getQuoteDto.inputAmount,
      slippageTolerance: getQuoteDto.slippageTolerance,
    });
    
    if (!quote) {
      throw new HttpException('Котировка не найдена', HttpStatus.NOT_FOUND);
    }
    
    return {
      success: true,
      data: quote,
    };
  }
  
  @Get('protocols/:protocol/stats')
  @ApiOperation({ summary: 'Получить статистику протокола' })
  async getProtocolStats(@Param('protocol') protocol: Protocol) {
    const protocolService = this.protocolFactory.getProtocol(protocol);
    const stats = await protocolService.getStats();
    
    return {
      success: true,
      data: stats,
    };
  }
  
  @Get('protocols/:protocol/health')
  @ApiOperation({ summary: 'Проверить здоровье протокола' })
  async getProtocolHealth(@Param('protocol') protocol: Protocol) {
    const protocolService = this.protocolFactory.getProtocol(protocol);
    const health = await protocolService.healthCheck();
    
    return {
      success: true,
      data: health,
    };
  }
  
  private getProtocolName(protocol: Protocol): string {
    const names = {
      [Protocol.RAYDIUM_AMM]: 'Raydium AMM',
      [Protocol.RAYDIUM_CLMM]: 'Raydium CLMM',
      [Protocol.ORCA_WHIRLPOOL]: 'Orca Whirlpool',
      [Protocol.METEORA_DLMM]: 'Meteora DLMM',
    };
    return names[protocol] || protocol;
  }
  
  private getProtocolDescription(protocol: Protocol): string {
    const descriptions = {
      [Protocol.RAYDIUM_AMM]: 'Raydium Automated Market Maker',
      [Protocol.RAYDIUM_CLMM]: 'Raydium Concentrated Liquidity Market Maker',
      [Protocol.ORCA_WHIRLPOOL]: 'Orca Whirlpool Concentrated Liquidity',
      [Protocol.METEORA_DLMM]: 'Meteora Dynamic Liquidity Market Maker',
    };
    return descriptions[protocol] || '';
  }
}
```

### 6. 🔌 WebSocket API

#### 6.1 `src/api/websocket/websocket.gateway.ts`
```typescript
@WebSocketGateway({
  namespace: 'api/v1/ws',
  cors: true,
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  
  private subscriptions = new Map<string, Set<Socket>>();
  
  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, payload: { channel: string; filters?: any }) {
    const { channel, filters } = payload;
    const subscriptionKey = this.getSubscriptionKey(channel, filters);
    
    if (!this.subscriptions.has(subscriptionKey)) {
      this.subscriptions.set(subscriptionKey, new Set());
    }
    
    this.subscriptions.get(subscriptionKey)!.add(client);
    client.emit('subscribed', { channel, filters });
  }
  
  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(client: Socket, payload: { channel: string; filters?: any }) {
    const { channel, filters } = payload;
    const subscriptionKey = this.getSubscriptionKey(channel, filters);
    
    const subscribers = this.subscriptions.get(subscriptionKey);
    if (subscribers) {
      subscribers.delete(client);
      if (subscribers.size === 0) {
        this.subscriptions.delete(subscriptionKey);
      }
    }
    
    client.emit('unsubscribed', { channel, filters });
  }
  
  handleConnection(client: Socket) {
    this.logger.log(`Клиент подключился: ${client.id}`);
  }
  
  handleDisconnect(client: Socket) {
    this.logger.log(`Клиент отключился: ${client.id}`);
    
    // Удаляем клиента из всех подписок
    for (const [key, subscribers] of this.subscriptions) {
      subscribers.delete(client);
      if (subscribers.size === 0) {
        this.subscriptions.delete(key);
      }
    }
  }
  
  // Методы для отправки обновлений
  broadcastPoolUpdate(pool: any) {
    const key = this.getSubscriptionKey('pools', { protocol: pool.protocol });
    const subscribers = this.subscriptions.get(key);
    if (subscribers) {
      subscribers.forEach(client => {
        client.emit('pool_update', pool);
      });
    }
  }
  
  broadcastQuoteUpdate(quote: any) {
    const key = this.getSubscriptionKey('quotes', {
      inputToken: quote.inputToken,
      outputToken: quote.outputToken,
    });
    const subscribers = this.subscriptions.get(key);
    if (subscribers) {
      subscribers.forEach(client => {
        client.emit('quote_update', quote);
      });
    }
  }
  
  private getSubscriptionKey(channel: string, filters?: any): string {
    return `${channel}:${JSON.stringify(filters || {})}`;
  }
}
```

### 7. 🧪 Тестирование

#### 7.1 Создание тестовых файлов

**Структура тестов:**
```
test/
├── unit/
│   ├── pools/
│   │   ├── raydium-amm.test.ts
│   │   ├── raydium-clmm.test.ts
│   │   ├── orca-whirlpool.test.ts
│   │   └── meteora-dlmm.test.ts
│   ├── quote-engine/
│   │   ├── quote.service.test.ts
│   │   └── aggregator.service.test.ts
│   └── api/
│       ├── pools.controller.test.ts
│       └── quotes.controller.test.ts
├── integration/
│   ├── api.test.ts
│   └── database.test.ts
└── e2e/
    └── app.e2e-spec.ts
```

#### 7.2 Пример теста для Raydium CLMM
```typescript
describe('RaydiumClmmService', () => {
  let service: RaydiumClmmService;
  let layout: RaydiumClmmLayout;
  let rpcService: RpcPoolService;
  let cacheService: CacheService;
  let poolsRepo: PoolsRepository;
  
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RaydiumClmmService,
        RaydiumClmmLayout,
        {
          provide: RpcPoolService,
          useValue: {
            getProgramAccounts: jest.fn(),
            getAccountInfo: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            getOrSet: jest.fn(),
          },
        },
        {
          provide: PoolsRepository,
          useValue: {
            upsert: jest.fn(),
            findByAddress: jest.fn(),
          },
        },
      ],
    }).compile();
    
    service = module.get<RaydiumClmmService>(RaydiumClmmService);
    layout = module.get<RaydiumClmmLayout>(RaydiumClmmLayout);
    rpcService = module.get<RpcPoolService>(RpcPoolService);
    cacheService = module.get<CacheService>(CacheService);
    poolsRepo = module.get<PoolsRepository>(PoolsRepository);
  });
  
  describe('discoverPools', () => {
    it('should discover CLMM pools successfully', async () => {
      const mockAccounts = [
        {
          pubkey: 'pool1',
          account: {
            data: Buffer.from('mock_data'),
            executable: false,
            lamports: 1000000,
            owner: 'CAMMCzo5YL8w4VFF8KVHrK22GGUQp5KpKpKpKpKpKpKpKpKp',
            rentEpoch: 0,
          },
        },
      ];
      
      jest.spyOn(rpcService, 'getProgramAccounts').mockResolvedValue(mockAccounts);
      jest.spyOn(layout, 'parsePoolAccount').mockReturnValue({
        address: 'pool1',
        protocol: Protocol.RAYDIUM_CLMM,
        poolType: PoolType.CLMM,
        tokenA: 'USDC',
        tokenB: 'SOL',
        tokenAMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        tokenBMint: 'So11111111111111111111111111111111111111112',
        fee: 0.0025,
        liquidity: 1000000,
      });
      
      const result = await service.discoverPools(10);
      
      expect(result.pools).toHaveLength(1);
      expect(result.pools[0].protocol).toBe(Protocol.RAYDIUM_CLMM);
      expect(rpcService.getProgramAccounts).toHaveBeenCalledWith(
        'CAMMCzo5YL8w4VFF8KVHrK22GGUQp5KpKpKpKpKpKpKpKpKpKp',
        expect.any(Array)
      );
    });
  });
  
  describe('getQuote', () => {
    it('should return quote for valid request', async () => {
      const mockPool = {
        address: 'pool1',
        protocol: Protocol.RAYDIUM_CLMM,
        poolType: PoolType.CLMM,
        tokenA: 'USDC',
        tokenB: 'SOL',
        tokenAMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        tokenBMint: 'So11111111111111111111111111111111111111112',
        fee: 0.0025,
        liquidity: 1000000,
      };
      
      jest.spyOn(poolsRepo, 'findByTokens').mockResolvedValue([mockPool]);
      jest.spyOn(layout, 'calculateSwapOutput').mockReturnValue({
        outputAmount: 15.5,
        fee: 2.5,
      });
      
      const request: PoolQuoteRequest = {
        inputToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        outputToken: 'So11111111111111111111111111111111111111112',
        inputAmount: 1000,
      };
      
      const result = await service.getQuote(request);
      
      expect(result).toBeDefined();
      expect(result?.outputAmount).toBe(15.5);
      expect(result?.fee).toBe(2.5);
    });
  });
});
```

### 8. 📊 Расширенный мониторинг

#### 8.1 `src/monitoring/metrics.service.ts`
```typescript
@Injectable()
export class MetricsService {
  private readonly registry = new Registry();
  
  // Метрики для пулов
  private readonly poolsTotal = new Gauge({
    name: 'pools_total',
    help: 'Total number of pools',
    labelNames: ['protocol', 'pool_type'],
    registers: [this.registry],
  });
  
  private readonly poolsLiquidity = new Gauge({
    name: 'pools_liquidity',
    help: 'Total liquidity in pools',
    labelNames: ['protocol'],
    registers: [this.registry],
  });
  
  // Метрики для котировок
  private readonly quotesTotal = new Counter({
    name: 'quotes_total',
    help: 'Total number of quotes',
    labelNames: ['protocol', 'status'],
    registers: [this.registry],
  });
  
  private readonly quoteResponseTime = new Histogram({
    name: 'quote_response_time_seconds',
    help: 'Quote response time in seconds',
    labelNames: ['protocol'],
    buckets: [0.1, 0.5, 1, 2, 5],
    registers: [this.registry],
  });
  
  // Метрики для RPC
  private readonly rpcRequestsTotal = new Counter({
    name: 'rpc_requests_total',
    help: 'Total RPC requests',
    labelNames: ['endpoint', 'method', 'status'],
    registers: [this.registry],
  });
  
  // Метрики для кэша
  private readonly cacheHits = new Counter({
    name: 'cache_hits_total',
    help: 'Total cache hits',
    labelNames: ['cache_type'],
    registers: [this.registry],
  });
  
  private readonly cacheMisses = new Counter({
    name: 'cache_misses_total',
    help: 'Total cache misses',
    labelNames: ['cache_type'],
    registers: [this.registry],
  });
  
  // Методы для обновления метрик
  updatePoolMetrics(pools: any[]) {
    const byProtocol = groupBy(pools, 'protocol');
    const byType = groupBy(pools, 'poolType');
    
    // Обновляем метрики по протоколам
    for (const [protocol, protocolPools] of Object.entries(byProtocol)) {
      this.poolsTotal.set({ protocol, pool_type: 'all' }, protocolPools.length);
      
      const totalLiquidity = protocolPools.reduce((sum, pool) => sum + (pool.liquidity || 0), 0);
      this.poolsLiquidity.set({ protocol }, totalLiquidity);
    }
    
    // Обновляем метрики по типам пулов
    for (const [poolType, typePools] of Object.entries(byType)) {
      this.poolsTotal.set({ protocol: 'all', pool_type: poolType }, typePools.length);
    }
  }
  
  recordQuote(protocol: string, status: 'success' | 'error', duration: number) {
    this.quotesTotal.inc({ protocol, status });
    this.quoteResponseTime.observe({ protocol }, duration);
  }
  
  recordRpcRequest(endpoint: string, method: string, status: 'success' | 'error') {
    this.rpcRequestsTotal.inc({ endpoint, method, status });
  }
  
  recordCacheHit(cacheType: string) {
    this.cacheHits.inc({ cache_type: cacheType });
  }
  
  recordCacheMiss(cacheType: string) {
    this.cacheMisses.inc({ cache_type: cacheType });
  }
  
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
```

### 9. 🔧 Дополнительные улучшения

#### 9.1 Rate Limiting
```typescript
// src/common/guards/rate-limit.guard.ts
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private cacheService: CacheService,
    private configService: ConfigService,
  ) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip;
    const key = `rate_limit:${ip}`;
    
    const current = await this.cacheService.get(key) || 0;
    const limit = this.configService.rateLimitMaxRequests;
    const window = this.configService.rateLimitWindowMs;
    
    if (current >= limit) {
      throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }
    
    await this.cacheService.set(key, current + 1, window / 1000);
    
    return true;
  }
}
```

#### 9.2 Валидация входных данных
```typescript
// src/common/pipes/validation.pipe.ts
@Injectable()
export class ValidationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    const { metatype } = metadata;
    
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }
    
    const object = plainToClass(metatype, value);
    const errors = validate(object);
    
    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: errors.map(error => ({
          field: error.property,
          constraints: error.constraints,
        })),
      });
    }
    
    return object;
  }
  
  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
```

## План реализации

### Этап 1: Реализация протоколов (1-2 недели)
1. ✅ Raydium CLMM layout и service
2. ✅ Orca Whirlpool layout и service  
3. ✅ Meteora DLMM layout и service
4. ✅ Обновление модулей

### Этап 2: Унификация и API (3-5 дней)
1. ✅ Фабрика протоколов
2. ✅ Унифицированный контроллер
3. ✅ Обновление индексера
4. ✅ WebSocket API

### Этап 3: Тестирование и мониторинг (1 неделя)
1. ✅ Unit тесты
2. ✅ Integration тесты
3. ✅ E2E тесты
4. ✅ Метрики и мониторинг

### Этап 4: Документация и развертывание (2-3 дня)
1. ✅ Обновление документации
2. ✅ Docker конфигурация
3. ✅ CI/CD pipeline
4. ✅ Продакшн развертывание

## Критерии готовности

### Функциональные требования
- [ ] Все протоколы реализованы и протестированы
- [ ] API работает корректно для всех эндпоинтов
- [ ] WebSocket API функционирует
- [ ] Индексация работает для всех протоколов
- [ ] Агрегация котировок работает

### Нефункциональные требования
- [ ] Время отклика API < 500ms
- [ ] Покрытие тестами > 80%
- [ ] Мониторинг и алерты настроены
- [ ] Документация актуальна
- [ ] Безопасность обеспечена

## Заключение

После выполнения всех задач проекта Solana Liquidity Aggregator будет полностью функциональной системой для агрегации ликвидности с поддержкой всех основных DeFi протоколов Solana. Система будет готова к продакшн использованию с полным набором функций для мониторинга, масштабирования и поддержки.
