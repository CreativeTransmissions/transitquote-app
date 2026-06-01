import { describeOutboxAction, explainOutboxError } from '../outboxMessages';

describe('describeOutboxAction', () => {
  it('labels a driver assignment', () => {
    expect(describeOutboxAction('ASSIGN_DRIVER')).toMatch(/assign/i);
  });
  it('labels a status update', () => {
    expect(describeOutboxAction('UPDATE_STATUS')).toMatch(/status/i);
  });
});

describe('explainOutboxError', () => {
  it('explains a network error in plain language', () => {
    expect(explainOutboxError('Network Error')).toMatch(/reach the server/i);
  });
  it('explains a timeout the same way', () => {
    expect(explainOutboxError('timeout of 20000ms exceeded')).toMatch(/reach the server/i);
  });
  it('describes a null error as a server rejection', () => {
    expect(explainOutboxError(null)).toMatch(/rejected/i);
  });
  it('passes a server rejection message through verbatim', () => {
    expect(explainOutboxError('Driver is unavailable')).toBe('Driver is unavailable');
  });
});
