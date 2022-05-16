import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/createUserDto';
import { User } from './user.entity';
import { sign } from 'jsonwebtoken';
import { JWT_SECRET } from '@app/config';
import { UserResponseInterface } from './types/userResponse.interface';
import { LoginUserDto } from './dto/loginUserDto';
import { scrypt as _scrypt } from 'crypto';
import { promisify } from 'util';
import { UpdateUserDto } from './dto/updateUser.dto';
const scrypt = promisify(_scrypt);

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}
  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const errorsResponse = { errors: {} };
    const { email, username } = createUserDto;
    //see if email is in use
    const userByEmail = await this.userRepository.findOne({ email });
    const userByUsername = await this.userRepository.findOne({ username });
    if (userByEmail || userByUsername) {
      if (userByEmail)
        errorsResponse.errors['email'] = 'has already been taken';
      if (userByEmail)
        errorsResponse.errors['username'] = 'has already been taken';
      throw new HttpException(errorsResponse, HttpStatus.UNPROCESSABLE_ENTITY);
    }
    const user = this.userRepository.create(createUserDto);
    return await this.userRepository.save(user);
  }

  generateJwt(user: User) {
    return sign(
      { id: user.id, email: user.email, username: user.username },
      JWT_SECRET,
    );
  }

  async validateUser(loginUserDto: LoginUserDto): Promise<User> {
    const { email, password } = loginUserDto;
    const userByEmail = await this.userRepository.findOne(
      { email },
      { select: ['id', 'username', 'email', 'bio', 'image', 'password'] },
    );
    if (!userByEmail) return null;
    const [salt, storedHash] = userByEmail?.password.split('.');
    const hash = (await scrypt(password, salt, 32)) as Buffer;
    if (hash.toString('hex') !== storedHash) return null;
    delete userByEmail.password;
    return userByEmail;
  }

  async findById(id: number): Promise<User> {
    return this.userRepository.findOne(id);
  }

  async login(loginUserDto: LoginUserDto): Promise<User> {
    const errorsResponse = { errors: { 'email or password': 'is invalid' } };
    const user = await this.validateUser(loginUserDto);
    if (!user)
      throw new HttpException(errorsResponse, HttpStatus.UNPROCESSABLE_ENTITY);
    return user;
  }

  async updateUser(
    updateUserDto: UpdateUserDto,
    userId: number,
  ): Promise<User> {
    const user = await this.findById(userId);
    const isDifferentEmail =
      updateUserDto?.email && user?.email !== updateUserDto?.email;
    const isDifferentUsername =
      updateUserDto?.username && updateUserDto?.username !== user?.username;
    if (isDifferentEmail && isDifferentUsername) {
      await this.checkUniqueUserAndEmail(
        updateUserDto?.username,
        updateUserDto?.email,
      );
    }

    if (isDifferentEmail && !isDifferentUsername) {
      await this.checkUniqueUserAndEmail(null, updateUserDto?.email);
    }

    if (!isDifferentEmail && isDifferentUsername) {
      await this.checkUniqueUserAndEmail(updateUserDto?.username, null);
    }
    Object.assign(user, updateUserDto);
    return await this.userRepository.save(user);
  }

  buildUserResponse(user: User): UserResponseInterface {
    return {
      user: {
        ...user,
        token: this.generateJwt(user),
      },
    };
  }

  async checkUniqueUserAndEmail(username: string, email: string) {
    const userByEmail = await this.userRepository.findOne({ email });
    const userByUsername = await this.userRepository.findOne({ username });
    if (userByEmail || userByUsername)
      throw new HttpException(
        'Email or username are taken',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
  }
  // Profile logic
  async findByUsername(username: string): Promise<User> {
    const user = await this.userRepository.findOne({ username });
    if (!user) {
      throw new HttpException('Profile does not exist', HttpStatus.NOT_FOUND);
    }
    return user;
  }
}
