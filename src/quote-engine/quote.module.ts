import { Module } from '@nestjs/common';
import { QuoteService } from './quote.service';
import { AggregatorService } from './aggregator.service';
import { RpcPoolService } from '../common/rpc/rpc-pool.service';
import { CacheService } from '../common/cache/cache.service';
import { PoolsRepository } from '../db/repositories/pools.repo';
import { QuotesRepository } from '../db/repositories/quotes.repo';
import { RaydiumAmmModule } from '../pools/raydium-amm/raydium-amm.module';

@Module({
  imports: [RaydiumAmmModule],
  providers: [
    QuoteService,
    AggregatorService,
    RpcPoolService,
    CacheService,
    PoolsRepository,
    QuotesRepository,
  ],
  exports: [QuoteService, AggregatorService],
})
export class QuoteEngineModule {}
