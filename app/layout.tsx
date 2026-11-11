import './globals.css';

export const metadata = { title: 'Conta Clara', description: 'Assistente financeiro com dados Sandbox' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
