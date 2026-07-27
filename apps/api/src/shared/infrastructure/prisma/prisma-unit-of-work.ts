import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '../../domain/unit-of-work';
import { PrismaService } from './prisma.service';
import { PrismaTransactionContext } from './prisma-transaction-context';

@Injectable()
export class PrismaUnitOfWork implements UnitOfWork {
  constructor(
    private readonly prisma: PrismaService,
    private readonly txContext: PrismaTransactionContext,
  ) {}

  run<T>(work: () => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) => this.txContext.run(tx, work));
  }
}
