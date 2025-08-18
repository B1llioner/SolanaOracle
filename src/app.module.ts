import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiModule } from './api/api.module';
import { ConfigService } from './config/config.service';
import { DbModule } from './db/db.module';
import { IndexerModule } from './indexer/indexer.module';
import { QuoteEngineModule } from './quote-engine/quote.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DbModule,
    IndexerModule,
    QuoteEngineModule,
    ApiModule,
  ],
  providers: [ConfigService],
})
export class AppModule {}
