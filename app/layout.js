import { Fraunces, Work_Sans } from 'next/font/google';
import './globals.css';
import './cx.css';
import AppClientInit from './components/AppClientInit';
import BottomNav from './components/BottomNav';
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

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" className={`${fraunces.variable} ${workSans.variable} dark`} suppressHydrationWarning>
      <body className="theme-dark" suppressHydrationWarning>
        <AppClientInit />
        <ScrollProgressIndicator />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
