'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { CartProvider } from '@/context/CartContext';
import { ReactNode, useState } from 'react';

// Suppress the React 19 "script tag in client component" warning from next-themes.
// next-themes injects an inline <script> to prevent theme flash (FOUC), which is
// harmless but triggers a console warning in React 19+.
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const origConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Encountered a script tag')) {
      return;
    }
    origConsoleError.apply(console, args);
  };
}

/**
 * AppProviders - A Client Component wrapper for all context providers.
 * This ensures that context is available throughout the entire application
 * while keeping the root layout as a Server Component.
 */
export default function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 15_000,
          },
        },
      }),
  );

  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <CartProvider>
          {children}
        </CartProvider>
      </QueryClientProvider>
    </NextThemesProvider>
  );
}
