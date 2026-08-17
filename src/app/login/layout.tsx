import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login | Vortex Cubes CRM',
  description: 'Sign in to your Vortex Cubes CRM portal.',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
