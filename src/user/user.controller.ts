import { BackendValidationPipe } from '@app/shared/pipes/backendValidation.pipe';
import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { User } from './decorators/user.decorator';
import { CreateUserDto } from './dto/createUserDto';
import { LoginUserDto } from './dto/loginUserDto';
import { UpdateUserDto } from './dto/updateUser.dto';
import { AuthGuard } from './guards/auth.guards';
import { UserResponseInterface } from './types/userResponse.interface';
import { UserService } from './user.service';

@Controller('')
export class USerController {
  constructor(private readonly userService: UserService) {}
  @Post('users')
  @UsePipes(new BackendValidationPipe())
  async createUser(
    @Body('user') createUserDto: CreateUserDto,
  ): Promise<UserResponseInterface> {
    const user = await this.userService.createUser(createUserDto);
    return this.userService.buildUserResponse(user);
  }
  @Post('users/login')
  @UsePipes(new BackendValidationPipe())
  async signin(
    @Body('user') loginUserDto: LoginUserDto,
  ): Promise<UserResponseInterface> {
    const user = await this.userService.login(loginUserDto);
    return this.userService.buildUserResponse(user);
  }
  @Get('user')
  @UseGuards(AuthGuard)
  async currentUser(@User() user: any): Promise<UserResponseInterface> {
    return this.userService.buildUserResponse(user);
  }

  @Put('user')
  @UseGuards(AuthGuard)
  async updateCurrentUser(
    @Body('user') updateUserDto: UpdateUserDto,
    @User('id') userId: any,
  ): Promise<UserResponseInterface> {
    const user = await  this.userService.updateUser(updateUserDto, userId);
    return this.userService.buildUserResponse(user);
  }
}
