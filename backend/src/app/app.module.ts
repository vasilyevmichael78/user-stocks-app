import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { StocksModule } from '../stocks/stocks.module';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { CommonModule } from '../common/common.module';
import { GlobalExceptionFilter } from '../common/filters/global-exception.filter';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';
import { PerformanceInterceptor } from '../common/interceptors/performance.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>('MONGODB_URI');
        console.log('🔗 Connecting to MongoDB:', uri?.replace(/\/\/.*@/, '//***:***@'));
        
        return {
          uri,
          retryWrites: true,
          w: 'majority',
          // Additional options for better connection handling
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          bufferCommands: false,
        };
      },
      inject: [ConfigService],
    }),
    CommonModule,
    AuthModule,
    UsersModule,
    StocksModule,
    PortfolioModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    // Global logging interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // Global performance monitoring interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor,
    },
  ],
})
export class AppModule {}
