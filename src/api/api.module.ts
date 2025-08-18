import { Module } from '@nestjs/common';
import { PoolsController } from './controllers/pools.controller';
import { QuotesController } from './controllers/quotes.controller';
import { PoolsRepository } from '../db/repositories/pools.repo';
import { QuotesRepository } from '../db/repositories/quotes.repo';
import { QuoteService } from '../quote-engine/quote.service';
import { AggregatorService } from '../quote-engine/aggregator.service';
import { IndexerService } from '../indexer/indexer.service';

@Module({
  controllers: [PoolsController, QuotesController],
  providers: [
    PoolsRepository,
    QuotesRepository,
    QuoteService,
    AggregatorService,
    IndexerService,
  ],
})
export class ApiModule {}
