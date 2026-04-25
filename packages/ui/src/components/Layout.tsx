import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
  itemCount?: number;
  LinkComponent?: React.ElementType;
}

export default function Layout({ children, itemCount, LinkComponent }: LayoutProps) {
  return (
    <>
      <Navbar itemCount={itemCount} LinkComponent={LinkComponent} />
      <main style={{ minHeight: 'calc(100vh - var(--header-height) - 400px)' }}>
        {children}
      </main>
      <Footer LinkComponent={LinkComponent} />
    </>
  );
}
