import {
  BeforeInsert,
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {} from 'bcrypt';
import { randomBytes, scrypt as _scrypt } from 'crypto';
import { promisify } from 'util';
import { Article } from '@app/article/article.entity';
import { Comment } from '@app/article/comment.entity';

const scrypt = promisify(_scrypt);

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @Column()
  username: string;

  @Column({ default: '' })
  bio: string;

  @Column({ default: '' })
  image: string;

  @Column({ select: false })
  password: string;

  @OneToMany((type) => Comment, (comment) => comment.author, { eager: true })
  comments: Comment[];

  @BeforeInsert()
  async hashPassword() {
    // Generate salt
    const salt = randomBytes(8).toString('hex');
    // Hash the salt and the password together
    const hash = (await scrypt(this.password, salt, 32)) as Buffer;
    //Join the hash result and the salt together
    const result = salt + '.' + hash.toString('hex');
    this.password = result;
  }

  @OneToMany(() => Article, (article) => article.author)
  articles: Article[];

  @ManyToMany(() => Article)
  @JoinTable()
  favorites: Article[];
}
