import { Comment } from '@app/article/comment.entity';
import { ArticleType } from './article.type';

export interface CommentResponseInterface {
  comment: Comment;
}
