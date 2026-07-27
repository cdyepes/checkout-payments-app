import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaTransactionContext, PrismaTransactionClient } from './prisma-transaction-context';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly txContext: PrismaTransactionContext) {
    super();
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  // Repository adapters must call this instead of touching `this` directly so
  // that reads/writes made inside a UnitOfWork.run() join the same transaction.
  client(): PrismaClient | PrismaTransactionClient {
    return this.txContext.getActiveClient() ?? this;
  }
}
