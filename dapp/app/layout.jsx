import './globals.css';

import Providers from './providers';

export const metadata = {
  title: 'GUA Airdrop Claim',
  description: 'GUA airdrop claim dApp',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
