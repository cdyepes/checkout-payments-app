import { PrismaTransactionClient, PrismaTransactionContext } from './prisma-transaction-context';

describe('PrismaTransactionContext', () => {
  it('has no active client outside of run()', () => {
    const context = new PrismaTransactionContext();
    expect(context.getActiveClient()).toBeUndefined();
  });

  it('exposes the given client only for the duration of run()', async () => {
    const context = new PrismaTransactionContext();
    const fakeTx = {} as PrismaTransactionClient;

    const result = await context.run(fakeTx, async () => {
      expect(context.getActiveClient()).toBe(fakeTx);
      return 'done';
    });

    expect(result).toBe('done');
    expect(context.getActiveClient()).toBeUndefined();
  });

  it('isolates concurrent run() calls from each other', async () => {
    const context = new PrismaTransactionContext();
    const txA = { id: 'a' } as unknown as PrismaTransactionClient;
    const txB = { id: 'b' } as unknown as PrismaTransactionClient;

    const [a, b] = await Promise.all([
      context.run(txA, async () => {
        await Promise.resolve();
        return context.getActiveClient();
      }),
      context.run(txB, async () => {
        await Promise.resolve();
        return context.getActiveClient();
      }),
    ]);

    expect(a).toBe(txA);
    expect(b).toBe(txB);
  });
});
