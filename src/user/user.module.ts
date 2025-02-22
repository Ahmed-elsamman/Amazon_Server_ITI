import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './Schemas/users.schema';
import { AuthModule } from 'src/auth/auth.module';
import { EmailModule } from '../email/email.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    AuthModule,
    EmailModule,
    JwtModule
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
