import { Comment } from '@app/article/comment.entity';
import { Article } from '../article.entity';

export type ArticleType = Omit<Article, 'updateTimestamp'> & {
  favorited?: boolean;
};

export interface CommentsRO {
  comments: Comment[];
}
