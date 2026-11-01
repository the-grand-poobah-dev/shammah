/**
 * Shammah Layout Kit - Unified Section Component Library
 * 
 * Reusable, phone-first, container-query driven layout kit for
 * Videos, Reels, Audio, Polls, Courses, Fundraisers, Faith Challenges,
 * Arcade, and Bible section pages.
 */

'use client';

export { ACCENT_PALETTE, accentFor } from './palette';
export { AccentCard } from './AccentCard';
export { ContentLayout } from './ContentLayout';
export { SectionBlock } from './SectionBlock';
export { LayoutSwitcher } from './LayoutSwitcher';

export {
  MediaThumb,
  MetaChips,
  ProgressBar,
  FilterChips,
  SortMenu,
  StatStrip,
  SkeletonLayout,
  SkeletonGrid,
  EmptyState,
  ErrorState,
  InfiniteSentinel,
} from './Companions';

import ContentLayout from './ContentLayout';
export default ContentLayout;
