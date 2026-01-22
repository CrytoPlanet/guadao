import './globals.css';
import 'katex/dist/katex.min.css';


import Providers from './providers';
import Background from './components/Background';
import SiteHeader from './components/SiteHeader';
import Footer from './components/Footer';

export const metadata = {
  title: 'GUA dApp',
  description: 'GUA airdrop and escrow dApp',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Background />
          <SiteHeader />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}