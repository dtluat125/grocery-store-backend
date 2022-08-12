import { Comment } from '@app/article/comment.entity';
import { FollowEntity } from '@app/profile/follow.entity';
import { User } from '@app/user/user.entity';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import slugify from 'slugify';
import { DeleteResult, getRepository, Repository } from 'typeorm';
import { Article } from './article.entity';
import { CreateArticleDto } from './dto/createArticle.dto';
import { ArticleType, CommentsRO } from './types/article.type';
import { ArticleResponseInterface } from './types/articleResponse.interface';
import { ArticlesResponseInterface } from './types/articlesResponse.interface';

@Injectable()
export class ArticleService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(FollowEntity)
    private readonly followRepository: Repository<FollowEntity>,
  ) {}

  async getAllArticles(
    currentUserId: number,
    query: any,
  ): Promise<ArticlesResponseInterface> {
    const queryBuilder = getRepository(Article)
      .createQueryBuilder('articles')
      .leftJoinAndSelect('articles.author', 'author');

    queryBuilder.orderBy('articles.createdAt', 'DESC');

    if (query?.tag) {
      queryBuilder.andWhere('articles.tagList LIKE :tag', {
        tag: `%${query.tag}%`,
      });
    }

    if (query?.author) {
      const author = await this.userRepository.findOne({
        username: query.author,
      });
      queryBuilder.andWhere('articles.authorId = :id', { id: author.id });
    }

    if (query?.favorited) {
      const author = await this.userRepository.findOne(
        {
          username: query.favorited,
        },
        { relations: ['favorites'] },
      );
      const ids = author.favorites?.map((art) => art.id);
      if (ids?.length)
        queryBuilder.andWhere('articles.id in (:...ids)', { ids });
      else {
        queryBuilder.andWhere('1=0');
      }
    }

    const articlesCount = await queryBuilder.getCount();

    if (query?.limit) {
      queryBuilder.limit(query.limit);
    }

    if (query?.offset) {
      queryBuilder.offset(query?.offset);
    }

    let favoriteIds: number[] = [];
    if (currentUserId) {
      const currentUser = await this.userRepository.findOne(currentUserId, {
        relations: ['favorites'],
      });
      favoriteIds = currentUser?.favorites?.map((favorite) => favorite.id);
    }

    const articles = await queryBuilder.getMany();
    const articlesWithFavorited = articles.map((article) => {
      const favorited = favoriteIds.includes(article.id);
      return { ...article, favorited };
    });
    return {
      articles: articlesWithFavorited,
      articlesCount,
    };
  }

  async getFeed(
    currentUserId: number,
    query: any,
  ): Promise<ArticlesResponseInterface> {
    const follows = await this.followRepository.find({
      followerId: currentUserId,
    });

    if (follows.length === 0) return { articles: [], articlesCount: 0 };

    const followingUserIds = follows.map((follow) => follow.followingId);

    const queryBuilder = getRepository(Article)
      .createQueryBuilder('articles')
      .leftJoinAndSelect('articles.author', 'author')
      .where('articles.authorId IN (:...ids)', { ids: followingUserIds });
    queryBuilder.orderBy('articles.createdAt', 'DESC');

    const articlesCount = await queryBuilder.getCount();
    if (query.limit) queryBuilder.limit(query.limit);
    if (query.offset) queryBuilder.offset(query.offset);

    const articles = await queryBuilder.getMany();
    let favoriteIds: number[] = [];
    if (currentUserId) {
      const currentUser = await this.userRepository.findOne(currentUserId, {
        relations: ['favorites'],
      });
      favoriteIds = currentUser?.favorites?.map((favorite) => favorite.id);
    }
    const articlesWithFavorited = articles.map((article) => {
      const favorited = favoriteIds.includes(article.id);
      return { ...article, favorited };
    });
    return { articles: articlesWithFavorited, articlesCount };
  }

  async createArticle(
    currentUser: User,
    createArticleDto: CreateArticleDto,
  ): Promise<Article> {
    const article = this.articleRepository.create(createArticleDto);
    if (!article.tagList) {
      article.tagList = [];
    }
    article.author = currentUser;
    article.slug = this.getSlug(article?.title);
    return this.articleRepository.save(article);
  }

  async addArticleToFavorites(
    slug: string,
    userId: number,
  ): Promise<ArticleType> {
    const article = await this.findArticleBySlug(slug);
    const user = await this.userRepository.findOne(userId, {
      relations: ['favorites'],
    });

    const isNotFavorited =
      user.favorites.findIndex(
        (articleFavorited) => articleFavorited?.id === article.id,
      ) === -1;
    if (isNotFavorited) {
      user.favorites.push(article);
      article.favoritesCount++;
      await this.userRepository.save(user);
      await this.articleRepository.save(article);
    }

    return { ...article, favorited: true };
  }

  async deleteArticleFromFavorites(
    slug: string,
    userId: number,
  ): Promise<ArticleType> {
    const article = await this.findArticleBySlug(slug);
    const user = await this.userRepository.findOne(userId, {
      relations: ['favorites'],
    });

    const articleIndex = user.favorites.findIndex(
      (articleFavorited) => articleFavorited?.id === article.id,
    );
    if (articleIndex >= 0) {
      user.favorites.splice(articleIndex, 1);
      article.favoritesCount--;
      await this.userRepository.save(user);
      await this.articleRepository.save(article);
    }
    return { ...article, favorited: false };
  }

  buildArticleResponse(
    article: Article | ArticleType,
  ): ArticleResponseInterface {
    let favorited = false;
    if (article.favoritesCount > 0) favorited = true;
    return {
      article: { ...article, favorited },
    };
  }

  private getSlug(title: string): string {
    return (
      slugify(title, { lower: true }) +
      '-' +
      ((Math.random() * Math.pow(36, 6)) | 0).toString(36)
    );
  }

  async findArticleBySlug(slug: string) {
    return await this.articleRepository.findOne({ slug });
  }

  async deleteArticleBySlug(
    currentUserId: number,
    slug: string,
  ): Promise<DeleteResult> {
    const article = await this.handleAuthorizedArticleException(
      currentUserId,
      slug,
    );

    return await this.articleRepository.delete(article?.id);
  }

  async updateArticle(
    currentUserId: number,
    slug: string,
    updateArticleDto: CreateArticleDto,
  ): Promise<Article> {
    const article = await this.handleAuthorizedArticleException(
      currentUserId,
      slug,
    );

    Object.assign(article, updateArticleDto);

    if (updateArticleDto?.title) {
      article.slug = this.getSlug(updateArticleDto?.title);
    }
    await this.articleRepository.update(article?.id, article);
    return article;
  }

  async handleAuthorizedArticleException(currentUserId: number, slug) {
    const article = await this.findArticleBySlug(slug);

    if (!article)
      throw new HttpException('Article not found', HttpStatus.NOT_FOUND);

    if (article?.author?.id !== currentUserId) {
      throw new HttpException(
        'You are not the author',
        HttpStatus.NOT_ACCEPTABLE,
      );
    }
    return article;
  }

  async findComments(slug: string): Promise<CommentsRO> {
    const article = await this.articleRepository.findOne({ slug });
    console.log(article);
    return { comments: article.comments };
  }

  async addComment(userId, slug, commentData) {
    let article = await this.articleRepository.findOne({ slug });
    let comment = new Comment();
    const user = await this.userRepository.findOne({ id: userId });
    comment.body = commentData.body;
    comment.author = user;
    article.comments.push(comment);
    comment = await this.commentRepository.save(comment);
    await this.articleRepository.save(article);
    return { comment };
  }
}
