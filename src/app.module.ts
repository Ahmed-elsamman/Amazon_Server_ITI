import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { PaymentsModule } from './payments/payments.module';
import { SubCategoryModule } from './sub-category/sub-category.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { OrdersModule } from './orders/orders.module';
import { CartsModule } from './carts/carts.module';
import { ReviewsModule } from './reviews/reviews.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ShippingModule } from './shipping/shipping.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';

import { RateLimiterModule } from 'nestjs-rate-limiter';

import { SellerModule } from './seller/seller.module';



@Module({
  imports: [
    RateLimiterModule.register({
      for: 'Express', // or 'Fastify' if you use Fastify
      type: 'Memory', // or another store like 'Redis'
      keyPrefix: 'api-limit', // unique prefix for limit records
      points: 2, // number of requests
      duration: 60, // per duration in seconds
    }),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.get('JWT_SECRET'),
          signOptions: { expiresIn: '1d' },
        };
      },
      global: true,
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (_configService: ConfigService) => {
        return {
          uri: _configService.get('MONGO_URI'),
        };
      },
    }),

    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),

    UserModule,
    AuthModule,
    ProductsModule,
    CategoriesModule,
    PaymentsModule,
    SubCategoryModule,
    OrdersModule,
    ReviewsModule,
    CartsModule,
    ShippingModule,
    SellerModule,
    CloudinaryModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
