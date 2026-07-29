import { ResultAsync } from 'neverthrow';

export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');

export interface UnitOfWork {
  /**
   * Runs `work` in a single database transaction. An `Err` result rolls the whole
   * transaction back — the port speaks Result rather than a bare Promise because a
   * resolved-but-failed value is indistinguishable from success to the underlying
   * driver, which only rolls back on rejection.
   */
  run<T, E>(work: () => ResultAsync<T, E>): ResultAsync<T, E>;
}
