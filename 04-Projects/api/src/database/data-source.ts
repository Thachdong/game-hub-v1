import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';

// Used exclusively by the TypeORM CLI (migration:run, migration:revert, migration:generate).
// The NestJS runtime uses TypeOrmModule.forRootAsync in AppModule instead.
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [__dirname + '/../**/*.orm-entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: ['error'],
});
