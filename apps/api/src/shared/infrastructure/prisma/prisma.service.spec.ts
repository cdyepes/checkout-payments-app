import { PrismaTransactionContext, PrismaTransactionClient } from './prisma-transaction-context';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('connects on module init and disconnects on module destroy', async () => {
    const service = new PrismaService(new PrismaTransactionContext());
    const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue(undefined);
    const disconnectSpy = jest.spyOn(service, '$disconnect').mockResolvedValue(undefined);

    await service.onModuleInit();
    await service.onModuleDestroy();

    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });

  describe('client()', () => {
    it('returns itself when no transaction is active', () => {
      const service = new PrismaService(new PrismaTransactionContext());
      expect(service.client()).toBe(service);
    });

    it('returns the active transaction client when inside a UnitOfWork', async () => {
      const txContext = new PrismaTransactionContext();
      const service = new PrismaService(txContext);
      const fakeTx = {} as PrismaTransactionClient;

      await txContext.run(fakeTx, async () => {
        expect(service.client()).toBe(fakeTx);
      });
    });
  });
});
