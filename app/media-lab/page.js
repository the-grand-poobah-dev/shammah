import { notFound } from 'next/navigation';
import MediaLabClient from './MediaLabClient';

export const metadata = {
  title: 'Media Lab (Dev Only) · Shammah',
  description: 'Dev sandbox for VoiceRecorderBar, CameraCaptureModal, and GifPicker',
};

export default function MediaLabPage() {
  // 404 in production as specified in requirements
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <MediaLabClient />;
}
