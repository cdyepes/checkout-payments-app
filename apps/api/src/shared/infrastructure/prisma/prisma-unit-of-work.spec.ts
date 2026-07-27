import { PrismaTransactionContext } from './prisma-transaction-context';
import { PrismaUnitOfWork } from './prisma-unit-of-work';
import { PrismaService } from './prisma.service';

describe('PrismaUnitOfWork', () => {
  it('runs the work inside prisma.$transaction and returns its result', async () => {
    const txContext = new PrismaTransactionContext();
    const fakeTx = {};
    const prisma = {
      $transaction: jest.fn((callback: (tx: unknown) => Promise<unknown>) => callback(fakeTx)),
    } as unknown as PrismaService;
    const unitOfWork = new PrismaUnitOfWork(prisma, txContext);

    const result = await unitOfWork.run(async () => 'ok');

    expect(result).toBe('ok');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('makes the transaction client active for the duration of the work', async () => {
    const txContext = new PrismaTransactionContext();
    const fakeTx = { marker: 'tx' };
    const prisma = {
      $transaction: jest.fn((callback: (tx: unknown) => Promise<unknown>) => callback(fakeTx)),
    } as unknown as PrismaService;
    const unitOfWork = new PrismaUnitOfWork(prisma, txContext);

    await unitOfWork.run(async () => {
      expect(txContext.getActiveClient()).toBe(fakeTx);
    });

    expect(txContext.getActiveClient()).toBeUndefined();
  });
});
