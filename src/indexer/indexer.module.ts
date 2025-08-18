import { Module } from '@nestjs/common';
import { IndexerService } from './indexer.service';
import { RpcPoolService } from '../common/rpc/rpc-pool.service';
import { CacheService } from '../common/cache/cache.service';
import { PoolsRepository } from '../db/repositories/pools.repo';
import { RaydiumAmmModule } from '../pools/raydium-amm/raydium-amm.module';

@Module({
  imports: [RaydiumAmmModule],
  providers: [
    IndexerService,
    RpcPoolService,
    CacheService,
    PoolsRepository,
  ],
  exports: [IndexerService],
})
export class IndexerModule {}
