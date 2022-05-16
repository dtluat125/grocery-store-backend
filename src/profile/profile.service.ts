import { User } from '@app/user/user.entity';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FollowEntity } from './follow.entity';
import { ProfileType } from './types/profile.type';
import { ProfileResponseInterface } from './types/profileResponse.interface';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(FollowEntity)
    private readonly followRepository: Repository<FollowEntity>,
  ) {}
  async isFollowing(currentUserId: number, user: User) {}

  async getProfile(
    username: string,
    currentUserId: number,
  ): Promise<ProfileType> {
    const user = await this.userRepository.findOne({ username });
    const follow = await this.followRepository.findOne({
      followerId: currentUserId,
      followingId: user.id,
    });
    return {
      ...user,
      following: !!follow,
    };
  }
  async followProfile(
    currentUserId: number,
    profileUsername: string,
  ): Promise<ProfileType> {
    const user = await this.userRepository.findOne({
      username: profileUsername,
    });
    if (user?.id === currentUserId) {
      throw new HttpException(
        'Follower and Following cannot be the same',
        HttpStatus.BAD_REQUEST,
      );
    }
    const follow = await this.followRepository.findOne({
      followerId: currentUserId,
      followingId: user.id,
    });
    if (!follow) {
      const followToCreate = this.followRepository.create({
        followerId: currentUserId,
        followingId: user.id,
      });

      await this.followRepository.save(followToCreate);
    }

    return { ...user, following: true };
  }

  async unFollowProfile(
    currentUserId: number,
    profileUsername: string,
  ): Promise<ProfileType> {
    const user = await this.userRepository.findOne({
      username: profileUsername,
    });
    if (user?.id === currentUserId) {
      throw new HttpException(
        'Follower and Following cannot be the same',
        HttpStatus.BAD_REQUEST,
      );
    }
    const follow = await this.followRepository.findOne({
      followerId: currentUserId,
      followingId: user.id,
    });
    if (follow) {
      await this.followRepository.delete(follow.id);
    }

    return { ...user, following: false };
  }

  async buildProfileResponse(
    profile: ProfileType,
  ): Promise<ProfileResponseInterface> {
    delete profile.email;
    return {
      profile,
    };
  }
}
