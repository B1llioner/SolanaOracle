import { Module } from '@nestjs/common';
import { RaydiumAmmService } from './raydium-amm.service';
import { RaydiumAmmLayout } from './raydium-amm.layout';
import { RpcPoolService } from '../../common/rpc/rpc-pool.service';
import { CacheService } from '../../common/cache/cache.service';
import { PoolsRepository } from '../../db/repositories/pools.repo';

@Module({
  providers: [
    RaydiumAmmService,
    RaydiumAmmLayout,
    RpcPoolService,
    CacheService,
    PoolsRepository,
  ],
  exports: [RaydiumAmmService],
})
export class RaydiumAmmModule {}
