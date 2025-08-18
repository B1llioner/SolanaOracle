import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PoolsRepository } from './repositories/pools.repo';
import { QuotesRepository } from './repositories/quotes.repo';

@Module({
  providers: [PrismaService, PoolsRepository, QuotesRepository],
  exports: [PrismaService, PoolsRepository, QuotesRepository],
})
export class DbModule {}
