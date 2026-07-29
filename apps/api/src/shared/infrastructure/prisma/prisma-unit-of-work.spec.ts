import { errAsync, okAsync } from 'neverthrow';
import { PrismaTransactionContext } from './prisma-transaction-context';
import { PrismaUnitOfWork } from './prisma-unit-of-work';
import { PrismaService } from './prisma.service';

/**
 * A fake standing in for Prisma's real $transaction: it only "commits" (resolves)
 * when the callback resolves, and rolls back (rejects with the callback's thrown
 * error) when the callback throws — exactly like the real driver, so a test against
 * this fake is a meaningful proxy for "does Prisma actually roll back".
 */
function buildPrisma(): PrismaService {
  return {
    $transaction: jest.fn((callback: (tx: unknown) => Promise<unknown>) => callback({})),
  } as unknown as PrismaService;
}

describe('PrismaUnitOfWork', () => {
  it('runs the work inside prisma.$transaction and returns its Ok result', async () => {
    const prisma = buildPrisma();
    const unitOfWork = new PrismaUnitOfWork(prisma, new PrismaTransactionContext());

    const result = await unitOfWork.run(() => okAsync('ok'));

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe('ok');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('rolls back and returns the original Err when work resolves to Err', async () => {
    // buildPrisma's $transaction is a bare `callback(tx)` passthrough — exactly like
    // the real driver, a rejection from the callback's promise propagates as a
    // rejection of $transaction itself. That rejection is what proves rollback
    // actually happened, rather than the Err being silently swallowed and committed.
    const prisma = buildPrisma();
    const unitOfWork = new PrismaUnitOfWork(prisma, new PrismaTransactionContext());
    const reason = new Error('insufficient stock');

    const result = await unitOfWork.run(() => errAsync(reason));

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBe(reason);
  });

  it('propagates a thrown Prisma error unchanged (not mistaken for a domain rollback)', async () => {
    const prisma = {
      $transaction: jest.fn(() => Promise.reject(new Error('connection lost'))),
    } as unknown as PrismaService;
    const unitOfWork = new PrismaUnitOfWork(prisma, new PrismaTransactionContext());

    const result = await unitOfWork.run(() => okAsync('unreachable'));

    expect(result.isErr()).toBe(true);
    expect((result._unsafeUnwrapErr() as Error).message).toBe('connection lost');
  });

  it('makes the transaction client active for the duration of the work', async () => {
    const txContext = new PrismaTransactionContext();
    const fakeTx = { marker: 'tx' };
    const prisma = {
      $transaction: jest.fn((callback: (tx: unknown) => Promise<unknown>) => callback(fakeTx)),
    } as unknown as PrismaService;
    const unitOfWork = new PrismaUnitOfWork(prisma, txContext);

    await unitOfWork.run(() => {
      expect(txContext.getActiveClient()).toBe(fakeTx);
      return okAsync('ok');
    });

    expect(txContext.getActiveClient()).toBeUndefined();
  });
});
