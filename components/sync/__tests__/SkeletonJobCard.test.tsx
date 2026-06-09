/**
 * SkeletonJobCard — smoke tests: renders without crashing, is hidden from accessibility tree.
 * The Animated.loop is synchronous in the jest/React Native test environment so we don't need
 * fake timers to verify the component mounts correctly.
 */
import { render, screen } from '@testing-library/react-native';
import { SkeletonJobCard } from '../SkeletonJobCard';

describe('SkeletonJobCard', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<SkeletonJobCard />);
    expect(toJSON()).toBeTruthy();
  });

  it('is hidden from the accessibility tree (decorative)', () => {
    render(<SkeletonJobCard />);
    // The root Animated.View has accessible={false} and
    // importantForAccessibility="no-hide-descendants".
    // RNTL does not walk non-accessible subtrees, so no accessible elements should be found.
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.queryAllByRole('text')).toHaveLength(0);
  });
});
