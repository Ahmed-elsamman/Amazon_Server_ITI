import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Request,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { Login } from './Dtos/login.dtos';
import { AuthService } from 'src/auth/auth.service';
import { AuthenticationGuard } from 'src/common/Guards/authentication/authentication.guard';
import { AuthorizationGuard } from 'src/common/Guards/authorization/authorization.guard';
import { Roles } from 'src/common/Decorators/roles/roles.decorator';
import { UpdateUserDto } from './Dtos/UpdateUser.dtos';
import { CreateUserDto } from './Dtos/createUser.dtos';

@Controller('user')
export class UserController {
  constructor(
    private readonly _UserService: UserService,
    private readonly _AuthService: AuthService,
  ) {}

  @Get('')
  @HttpCode(HttpStatus.FOUND)
  @Roles('user', 'admin')
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  async getAllUser(): Promise<UpdateUserDto[]> {
    try {
      return this._UserService.getAllUsers();
    } catch (error) {
      throw error;
    }
  }

  @Get('/one')
  @Roles('user', 'admin')
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  @HttpCode(HttpStatus.FOUND)
  findUser(@Request() req): Promise<UpdateUserDto> {
    const userId = req.user.id; // Get user ID from the authenticated user
    try {
      return this._UserService.getUserById(userId);
    } catch (error) {
      throw error;
    }
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async CreateUser(@Body() user: CreateUserDto): Promise<UpdateUserDto> {
    try {
      return this._UserService.createNewUser(user);
    } catch (error) {
      throw error;
    }
  }
  @Post('verifyEmail')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Body('email') email?: string,
    @Body('token') token?: string,
  ): Promise<{ message: string; userData: any }> {
    let user = await this._UserService.verifyEmail(email, token);
    if (token) {
      return { message: 'Email verified successfully', userData: user };
    } else {
      return {
        message: 'Email is already verified, you can log in',
        userData: user,
      };
    }
  }

  @Post('/login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() user: Login,
  ): Promise<{ token: string; email: string; userName: string }> {
    return await this._AuthService.login(user);
  }

  @Post('/logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  async logout(@Request() req): Promise<{ message: string }> {
    const userId = req.user.id;
    return await this._AuthService.logout(userId);
  }

  @Patch('update/password')
  @Roles('user', 'admin')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  async updatePassword(
    @Request() req,
    @Body('oldPassword') oldPassword: string,
    @Body('newPassword') newPassword: string,
  ): Promise<{ message: string }> {
    const userId = req.user.id;
    await this._UserService.updateUserPassword(
      userId,
      oldPassword,
      newPassword,
    );
    return { message: 'Password updated successfully' };
  }

  @Delete('')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  DeleteUser(@Request() req): Promise<void> {
    const userId = req.user.id; // Get user ID from the authenticated user

    return this._UserService.deleteUser(userId);
  }
  @Patch('/:id')
  @Roles('user', 'admin')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  UpdateUserDto(
    @Request() req,
    @Body() userData: UpdateUserDto,
  ): Promise<UpdateUserDto> {
    const userId = req.user.id; // Get user ID from the authenticated user

    return this._UserService.updateUserById(userId, userData);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body('email') email: string,
  ): Promise<{ message: string }> {
    await this._UserService.initiatePasswordReset(email);
    return { message: 'Password reset email sent successfully' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
  ): Promise<{ message: string }> {
    await this._UserService.resetPassword(token, newPassword);
    return { message: 'Password reset successfully' };
  }

  //  Admin Section

  // get users by role

  @Get('/role/:role')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  async getUsersByRole(@Param('role') role: string): Promise<UpdateUserDto[]> {
    return await this._UserService.getUsersByRole(role);
  }

  // get user by admin
  @Get('/:id')
  @Roles('admin')
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  @HttpCode(HttpStatus.FOUND)
  findUserForAdmin(@Param('id') id): Promise<UpdateUserDto> {
    return this._UserService.getUserById(id);
  }

  // create user by admin
  @Post('admin/create')
  @Roles('admin')
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  @HttpCode(HttpStatus.CREATED)
  async createUserByAdmin(
    @Request() req,
    @Body() userData: CreateUserDto,
  ): Promise<UpdateUserDto> {
    const adminId = req.user.id;
    return this._UserService.createUserByAdmin(adminId, userData);
  }

  // update user by admin
  @Patch('admin/update/:userId')
  @Roles('admin')
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  @HttpCode(HttpStatus.OK)
  async updateUserByAdmin(
    @Request() req,
    @Param('userId') userId: string,
    @Body() userData: UpdateUserDto,
  ): Promise<UpdateUserDto> {
    const adminId = req.user.id;
    return this._UserService.updateUserByAdmin(adminId, userId, userData);
  }

  // delete user by admin
  @Delete('admin/delete/:userId')
  @Roles('admin')
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  @HttpCode(HttpStatus.OK) // تغيير من NO_CONTENT إلى OK
  async deleteUserByAdmin(
    @Param('userId') userId: string,
  ): Promise<{ message: string }> {
    await this._UserService.deleteUser(userId);
    return { message: 'User deleted successfully' };
  }

  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  async adminLogin(
    @Body() user: Login,
  ): Promise<{ token: string; email: string; userName: string }> {
    return await this._AuthService.adminLogin(user);
  }

  @Post('admin/reset-password')
  @HttpCode(HttpStatus.OK)
  async adminResetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
  ): Promise<{ message: string }> {
    await this._UserService.adminResetPassword(token, newPassword);
    return { message: 'Admin password has been reset successfully' };
  }

  @Post('admin/initiate-password-reset')
  @HttpCode(HttpStatus.OK)
  async initiateAdminPasswordReset(
    @Body('email') email: string,
  ): Promise<{ message: string }> {
    await this._UserService.initiateAdminPasswordReset(email);
    return {
      message:
        'If an admin account exists with this email, a password reset link will be sent.',
    };
  }

@Post('v2/register-website')
@HttpCode(HttpStatus.CREATED)
async registerWebsite(
  @Body() userData: CreateUserDto,
): Promise<{ token: string; user: UpdateUserDto; message: string }> {
  try {
    return await this._UserService.registerUserOnAnyWeiste(userData);
  } catch (error) {
    throw error;
  }
}
} // class
