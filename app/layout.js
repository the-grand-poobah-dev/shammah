import { Fraunces, Work_Sans } from 'next/font/google';
import './globals.css';
import './cx.css'; // categories + churches pages
import BottomNav from './components/BottomNav';
import TopNavGlobal from './components/TopNavGlobal';
import ScrollProgressIndicator from './components/ScrollProgressIndicator';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-fraunces',
  display: 'swap',
});

const workSans = Work_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-work-sans',
  display: 'swap',
});

export const metadata = {
  title: 'Shammah',
  description: 'A shared feed for your church community.',
  openGraph: {
    title: 'Shammah',
    description: 'A shared feed for your church community.',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${workSans.variable}`}>
      <body>
        <ScrollProgressIndicator />
        <TopNavGlobal />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
