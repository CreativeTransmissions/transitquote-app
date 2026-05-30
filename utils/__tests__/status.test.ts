import { resolveStatusColour } from '../status';
import { COLOURS } from '../../constants';

describe('resolveStatusColour', () => {
  it('maps delivered/complete to success', () => {
    expect(resolveStatusColour('Delivered')).toBe(COLOURS.success);
    expect(resolveStatusColour('Completed')).toBe(COLOURS.success);
  });
  it('maps in-transit/in-progress to warning', () => {
    expect(resolveStatusColour('In Transit')).toBe(COLOURS.warning);
    expect(resolveStatusColour('In Progress')).toBe(COLOURS.warning);
  });
  it('maps assigned to primary', () => {
    expect(resolveStatusColour('Assigned')).toBe(COLOURS.primary);
  });
  it('maps cancelled/failed to danger', () => {
    expect(resolveStatusColour('Cancelled')).toBe(COLOURS.danger);
  });
  it('falls back to neutral for unknown/empty', () => {
    expect(resolveStatusColour('New')).toBe(COLOURS.offline);
    expect(resolveStatusColour(null)).toBe(COLOURS.offline);
  });
});
