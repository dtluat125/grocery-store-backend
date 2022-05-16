import { FollowEntity } from '@app/profile/follow.entity';
import { User } from '@app/user/user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArticleController } from './article.controller';
import { Article } from './article.entity';
import { ArticleService } from './article.service';

@Module({
  imports: [TypeOrmModule.forFeature([Article, User, FollowEntity])],
  controllers: [ArticleController],
  providers: [ArticleService],
})
export class ArticleModule {}
