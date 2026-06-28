import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountOrmEntity } from './typeorm-entities/account.orm-entity';
import { IAccountRepository } from '../../domain/ports/account.repository.port';
import { Account } from '../../domain/entities/account';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AccountTypeOrmRepository implements IAccountRepository {
  constructor(
    @InjectRepository(AccountOrmEntity)
    private readonly repo: Repository<AccountOrmEntity>,
  ) {}

  async findByEmail(email: string): Promise<Account | null> {
    const row = await this.repo.findOne({ where: { email } });
    return row ? this.toDomain(row) : null;
  }

  async findById(id: string): Promise<Account | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async save(data: Omit<Account, 'id' | 'createdAt'>): Promise<Account> {
    const row = this.repo.create({ ...data, id: uuidv4() });
    const saved = await this.repo.save(row);
    return this.toDomain(saved);
  }

  private toDomain(row: AccountOrmEntity): Account {
    const account = new Account();
    account.id = row.id;
    account.email = row.email;
    account.username = row.username;
    account.avatarUrl = row.avatarUrl;
    account.createdAt = row.createdAt;
    return account;
  }
}
