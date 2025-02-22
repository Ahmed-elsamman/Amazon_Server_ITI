import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './Schemas/users.schema';
import { Model, ObjectId } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { UpdateUserDto } from './Dtos/UpdateUser.dtos';
import { CreateUserDto } from './Dtos/createUser.dtos';
import { EmailService } from 'src/email/email.service';
import { error } from 'console';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly emailService: EmailService,
    private readonly _JwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // this function to get all Users

  async getAllUsers(): Promise<UpdateUserDto[]> {
    try {
      return await this.userModel.find().lean().exec();
    } catch (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
  }
  async getUserById(id: string): Promise<UpdateUserDto> {
    try {
      const user = await this.userModel.findById(id).lean().exec();
      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }
      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to get user by id: ${error.message}`);
    }
  }

  //  this function to get user by email

  async getUserByEmail(email: string): Promise<CreateUserDto> {
    try {
      const user = await this.userModel.findOne({ email }).lean().exec();
      if (!user) {
        throw new NotFoundException(`User with email ${email} not found`);
      }
      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to get user by email: ${error.message}`);
    }
  }

  async getUsersByRole(role: string): Promise<User[]> {
    try {
      return await this.userModel.find({ role }).lean().exec();
    } catch (error) {
      throw new NotFoundException(`No users found with role ${role}`);
    }
  }
  // #############################################################################

  async createNewUser(userData: CreateUserDto): Promise<UpdateUserDto> {
    try {
      const existingUser = await this.userModel
        .findOne({ email: userData.email })

        .exec();

      if (existingUser) {
        if (existingUser.isVerified) {
          throw new ConflictException('Email already exists and is verified.');
        } else {
          // Resend verification email
          const newVerificationToken = crypto.randomBytes(32).toString('hex');
          existingUser.verificationToken = newVerificationToken;

          try {
            await this.emailService.sendVerificationEmail(
              existingUser.email,
              newVerificationToken,
            );
            await existingUser.save();
            throw new ConflictException(
              'Account exists but is not verified. A new verification email has been sent.',
            );
          } catch (error) {
            this.logger.error(
              `Failed to send verification email: ${error.message}`,
            );
            throw new BadRequestException(
              'Failed to send verification email',
            );
          }
        }
      }

      // Create new user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      const randomToken = crypto.randomBytes(32).toString('hex');
      const verificationToken = randomToken;

      const newUser = new this.userModel({
        ...userData,
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        verificationToken,
        isVerified: false,
        isActive: false,
      });

      try {
        await this.emailService.sendVerificationEmail(
          userData.email as string,
          verificationToken,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send verification email: ${error.message}`,
        );
        throw new InternalServerErrorException(
          'Failed to send verification email',
        );
      }

      return await newUser.save();
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      this.logger.error(`Failed to create user: ${error.message}`);
      throw new InternalServerErrorException('Failed to create user');
    }
  }
  // ##############################

  async verifyEmail(email?: string, token?: string): Promise<UpdateUserDto> {
    if (token) {
      // User is logging in for the first time
      const user = await this.userModel.findOne({ verificationToken: token });
      if (!user) {
        throw new NotFoundException('Invalid verification token');
      }

      user.isVerified = true;
      user.verificationToken = undefined;
      await user.save();
      return user;
    } else if (email) {
      // User has registered before
      const user = await this.userModel.findOne({ email });
      if (!user) {
        throw new NotFoundException('Email not found');
      }

      if (!user.isVerified) {
        throw new UnauthorizedException(
          'Please verify your email before logging in',
        );
      }
      return user;
    } else {
      throw new BadRequestException(
        'Either email or verification token must be provided',
      );
    }
  }
  // ############################

  async deleteUser(id: string): Promise<void> {
    try {
      const deletedUser = await this.userModel.findByIdAndDelete(id).exec();
      if (!deletedUser) {
        throw new NotFoundException(`User with id ${id} not found`);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  async updateUserById(
    id: string,
    userData: Partial<UpdateUserDto>,
  ): Promise<UpdateUserDto> {
    try {
      const updatedUser = await this.userModel
        .findByIdAndUpdate(id, userData, {
          new: true,
          runValidators: true,
        })
        .lean()
        .exec();

      if (!updatedUser) {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      return updatedUser;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }
  async updateUserPassword(
    userId: ObjectId,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException(`User not found`);
      }

      const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Old password is incorrect');
      }

      if (oldPassword === newPassword) {
        throw new BadRequestException(
          'New password must be different from the old one',
        );
      }

      const saltOrRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltOrRounds);
      user.password = hashedPassword;
      await user.save();
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new Error(`Failed to update password: ${error.message}`);
    }
  }

  async initiatePasswordReset(email: string): Promise<void> {
    const user = await this.userModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal whether the email exists
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour

    try {
      await this.emailService.sendPasswordResetEmail(user.email, resetToken);
      await user.save();
    } catch (error) {
      this.logger.error(`Failed to initiate password reset: ${error.message}`);
      throw new InternalServerErrorException(
        'Failed to send password reset email',
      );
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.userModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Invalid or expired password reset token',
      );
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;

    await user.save();
  }

  async createUserByAdmin(
    adminId: string,
    userData: CreateUserDto,
  ): Promise<UpdateUserDto> {
    try {
      const admin = await this.userModel.findById(adminId);
      if (!admin || admin.role !== 'admin') {
        throw new UnauthorizedException('Only admins can create users');
      }

      const existingUser = await this.userModel
        .findOne({ email: userData.email })
        .lean()
        .exec();
      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      const newUser = new this.userModel({
        ...userData,
        password: hashedPassword,
        isVerified: true, // Admin-created users are automatically verified
      });

      return await newUser.save();
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new Error(`Failed to create user by admin: ${error.message}`);
    }
  }

  async updateUserByAdmin(
    adminId: string,
    userId: string,
    userData: Partial<UpdateUserDto>,
  ): Promise<UpdateUserDto> {
    try {
      const admin = await this.userModel.findById(adminId);
      if (!admin || admin.role !== 'admin') {
        throw new UnauthorizedException('Only admins can update users');
      }

      const updatedUser = await this.userModel
        .findByIdAndUpdate(userId, userData, {
          new: true,
          runValidators: true,
        })
        .lean()
        .exec();

      if (!updatedUser) {
        throw new NotFoundException(`User with id ${userId} not found`);
      }

      return updatedUser;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new Error(`Failed to update user by admin: ${error.message}`);
    }
  }
  async initiateAdminPasswordReset(email: string): Promise<void> {
    const user = await this.userModel.findOne({
      email: email.toLowerCase(),
      role: 'admin',
    });

    if (!user) {
      // Don't reveal whether the email exists or if user is admin
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour

    try {
      await this.emailService.sendAdminPasswordResetEmail(
        user.email,
        resetToken,
      );
      await user.save();
    } catch (error) {
      this.logger.error(
        `Failed to initiate admin password reset: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Failed to send password reset email',
      );
    }
  }

  async adminResetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.userModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
      role: 'admin',
    });

    if (!user) {
      throw new NotFoundException(
        'Password reset token is invalid or has expired, or user is not an admin',
      );
    }

    // Validate password strength
    if (newPassword.length < 8) {
      throw new BadRequestException(
        'Password must be at least 8 characters long',
      );
    }

    try {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
    } catch (error) {
      throw new Error('Failed to reset password');
    }
  }

  async updateLoginStats(userId: string, success: boolean): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) return;

    if (success) {
      user.lastLoginAt = new Date();
      user.loginAttempts = 0;
      user.lockUntil = undefined;
    } else {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 1800000); // 30 minutes
      }
    }

    await user.save();
  }

  async registerUserOnAnyWeiste(userData: CreateUserDto): Promise<{
    token: string;
    user: UpdateUserDto;
    message: string;
  }> {
    try {
      // Check if JWT_SECRET is configured
      const jwtSecret = this.configService.get<string>('JWT_SECRET');
      if (!jwtSecret) {
        throw new InternalServerErrorException('JWT configuration is missing');
      }

      // Check if user exists
      const existingUser = await this.userModel
        .findOne({ email: userData.email })
        .lean()
        .exec();

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      // Create new user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      const newUser = new this.userModel({
        ...userData,
        email: userData.email,
        password: hashedPassword,
        isVerified: true,
        isActive: true,
      });

      const savedUser = await newUser.save();

      // Create JWT token
      const payload = {
        email: savedUser.email,
        id: savedUser._id,
        role: savedUser.role,
        isActive: savedUser.isActive,
        name: savedUser.name,
      };

      const token = this._JwtService.sign(payload, {
        secret: jwtSecret,
        expiresIn: '3d',
      });

      // Send welcome email
      try {
        await this.emailService.sendWelcomeMessage(
          savedUser.email,
          savedUser.name,
        );
      } catch (error) {
        this.logger.warn(
          `Welcome email could not be sent to ${savedUser.email}: ${error.message}`,
        );
      }

      return {
        token,
        user: savedUser,
        message: 'User registered successfully',
      };
    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to register user: ${error.message}`);
      throw new InternalServerErrorException(
        'Failed to register user: ' + error.message,
      );
    }
  }
}
