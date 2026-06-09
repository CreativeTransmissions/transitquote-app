import { resolveStatusColour } from '../statusColours';
import { COLOURS } from '../../constants';

describe('resolveStatusColour', () => {
  // ── keyword groups ────────────────────────────────────────────────────────

  describe('pending / new / open → statusNeutral', () => {
    it('matches "pending"', () => expect(resolveStatusColour('Pending')).toBe(COLOURS.statusNeutral));
    it('matches "new"', () => expect(resolveStatusColour('New')).toBe(COLOURS.statusNeutral));
    it('matches "open"', () => expect(resolveStatusColour('Open')).toBe(COLOURS.statusNeutral));
    it('matches a compound like "New Order"', () => expect(resolveStatusColour('New Order')).toBe(COLOURS.statusNeutral));
  });

  describe('assigned / accepted / claimed → statusInfo', () => {
    it('matches "assigned"', () => expect(resolveStatusColour('Assigned')).toBe(COLOURS.statusInfo));
    it('matches "accepted"', () => expect(resolveStatusColour('Accepted')).toBe(COLOURS.statusInfo));
    it('matches "claimed"', () => expect(resolveStatusColour('Claimed')).toBe(COLOURS.statusInfo));
    it('matches "Driver Assigned"', () => expect(resolveStatusColour('Driver Assigned')).toBe(COLOURS.statusInfo));
  });

  describe('transit / route / progress / collected / picked → statusActive', () => {
    it('matches "transit"', () => expect(resolveStatusColour('In Transit')).toBe(COLOURS.statusActive));
    it('matches "route"', () => expect(resolveStatusColour('En Route')).toBe(COLOURS.statusActive));
    it('matches "progress"', () => expect(resolveStatusColour('In Progress')).toBe(COLOURS.statusActive));
    it('matches "collected"', () => expect(resolveStatusColour('Collected')).toBe(COLOURS.statusActive));
    it('matches "picked"', () => expect(resolveStatusColour('Picked Up')).toBe(COLOURS.statusActive));
  });

  describe('delivered / completed / done → statusDone', () => {
    it('matches "delivered"', () => expect(resolveStatusColour('Delivered')).toBe(COLOURS.statusDone));
    it('matches "completed"', () => expect(resolveStatusColour('Completed')).toBe(COLOURS.statusDone));
    it('matches "done"', () => expect(resolveStatusColour('Done')).toBe(COLOURS.statusDone));
    it('matches "Order Completed"', () => expect(resolveStatusColour('Order Completed')).toBe(COLOURS.statusDone));
  });

  describe('cancelled / failed / rejected → statusProblem', () => {
    it('matches "cancelled"', () => expect(resolveStatusColour('Cancelled')).toBe(COLOURS.statusProblem));
    it('matches "failed"', () => expect(resolveStatusColour('Failed')).toBe(COLOURS.statusProblem));
    it('matches "rejected"', () => expect(resolveStatusColour('Rejected')).toBe(COLOURS.statusProblem));
    it('matches "Delivery Failed"', () => expect(resolveStatusColour('Delivery Failed')).toBe(COLOURS.statusProblem));
  });

  // ── case-insensitivity ───────────────────────────────────────────────────

  describe('case-insensitivity', () => {
    it('upper-case "PENDING" → statusNeutral', () => expect(resolveStatusColour('PENDING')).toBe(COLOURS.statusNeutral));
    it('mixed-case "In TRANSIT" → statusActive', () => expect(resolveStatusColour('In TRANSIT')).toBe(COLOURS.statusActive));
    it('lower-case "delivered" → statusDone', () => expect(resolveStatusColour('delivered')).toBe(COLOURS.statusDone));
    it('lower-case "cancelled" → statusProblem', () => expect(resolveStatusColour('cancelled')).toBe(COLOURS.statusProblem));
  });

  // ── no-match fallback — determinism by id ────────────────────────────────

  describe('no-match fallback', () => {
    const CYCLE = [
      COLOURS.statusNeutral,
      COLOURS.statusInfo,
      COLOURS.statusActive,
      COLOURS.statusDone,
      COLOURS.statusProblem,
    ];

    it('cycles by id mod 5', () => {
      CYCLE.forEach((colour, i) => {
        expect(resolveStatusColour('Custom Status', String(i))).toBe(colour);
      });
    });

    it('cycles correctly for id=5 (wraps to index 0)', () =>
      expect(resolveStatusColour('Custom Status', '5')).toBe(COLOURS.statusNeutral));

    it('cycles correctly for id=7 (wraps to index 2)', () =>
      expect(resolveStatusColour('Custom Status', '7')).toBe(COLOURS.statusActive));

    it('always returns the same colour for the same id (determinism)', () => {
      const a = resolveStatusColour('Unknown', '42');
      const b = resolveStatusColour('Unknown', '42');
      expect(a).toBe(b);
    });
  });

  // ── null / undefined inputs ───────────────────────────────────────────────

  describe('null / undefined inputs', () => {
    it('returns statusNeutral for null name + no id', () =>
      expect(resolveStatusColour(null)).toBe(COLOURS.statusNeutral));

    it('returns statusNeutral for undefined name + no id', () =>
      expect(resolveStatusColour(undefined)).toBe(COLOURS.statusNeutral));

    it('returns statusNeutral for empty string + no id', () =>
      expect(resolveStatusColour('')).toBe(COLOURS.statusNeutral));

    it('uses id fallback when name is null but id is present', () =>
      expect(resolveStatusColour(null, '3')).toBe(COLOURS.statusDone));

    it('uses id fallback when name is undefined but id is present', () =>
      expect(resolveStatusColour(undefined, '1')).toBe(COLOURS.statusInfo));

    it('returns statusNeutral when both name and id are null', () =>
      expect(resolveStatusColour(null, null)).toBe(COLOURS.statusNeutral));

    it('returns statusNeutral when name is null and id is undefined', () =>
      expect(resolveStatusColour(null, undefined)).toBe(COLOURS.statusNeutral));
  });
});
