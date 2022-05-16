import { User } from '@app/user/user.entity';

export type ProfileType = Omit<User, 'hashPassword'> & { following: boolean };
