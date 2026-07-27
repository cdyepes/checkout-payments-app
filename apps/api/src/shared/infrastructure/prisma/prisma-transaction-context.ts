import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export type PrismaTransactionClient = Prisma.TransactionClient;

// Lets repository adapters transparently join an in-flight prisma.$transaction
// without the use case or ports ever seeing a Prisma type.
@Injectable()
export class PrismaTransactionContext {
  private readonly storage = new AsyncLocalStorage<PrismaTransactionClient>();

  run<T>(tx: PrismaTransactionClient, work: () => Promise<T>): Promise<T> {
    return this.storage.run(tx, work);
  }

  getActiveClient(): PrismaTransactionClient | undefined {
    return this.storage.getStore();
  }
}
