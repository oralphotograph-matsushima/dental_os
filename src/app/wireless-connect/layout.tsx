import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wireless Connect',
  description: '次世代のワイヤレス接続プラットフォーム',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
