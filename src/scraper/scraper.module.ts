import { Module } from '@nestjs/common';
import { ScraperController } from './scraper.controller';

@Module({
  controllers: [ScraperController],
})
export class ScraperModule {}
 