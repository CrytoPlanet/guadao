import './globals.css';

import Providers from './providers';
import Background from './components/Background';
import SiteHeader from './components/SiteHeader';

export const metadata = {
  title: 'GUA dApp',
  description: 'GUA airdrop and escrow dApp',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Background />
          <SiteHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}