import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nostalgista V',
  description: '口腔内写真は、動画を活用することで次のフェーズに移行する。',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
