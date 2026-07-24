import { Global, Module } from '@nestjs/common';
import { UNIT_OF_WORK } from '../../domain/unit-of-work';
import { PrismaService } from './prisma.service';
import { PrismaTransactionContext } from './prisma-transaction-context';
import { PrismaUnitOfWork } from './prisma-unit-of-work';

@Global()
@Module({
  providers: [
    PrismaTransactionContext,
    PrismaService,
    { provide: UNIT_OF_WORK, useClass: PrismaUnitOfWork },
  ],
  exports: [PrismaService, UNIT_OF_WORK],
})
export class PrismaModule {}
