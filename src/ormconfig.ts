import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import fs from 'fs';

const config: PostgresConnectionOptions = {
  type: 'postgres',
  host: 'ec2-34-203-182-65.compute-1.amazonaws.com',
  port: 5432,
  username: 'wigxatdetdztmx',
  password: 'cbe9d28f8938c3e6b15321a32bea4edab3b4b91d6971ca813a5df57e5d00bb57',
  database: 'db62jnfib24alr',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  synchronize: false,
  migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
  // ssl: {
  //   ca: process.env.SSL_CERT,
  // },
  extra: {
    ssl: {
      rejectUnauthorized: false,
    },
  },
  cli: {
    migrationsDir: 'src/migrations',
  },
};

export default config;
