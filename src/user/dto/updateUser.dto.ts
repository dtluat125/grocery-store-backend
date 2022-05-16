import { IsEmail, IsNotEmpty } from 'class-validator';

export class UpdateUserDto {
   readonly email: string;

  readonly bio: string;

  readonly username: string;

  readonly image: string;
}
