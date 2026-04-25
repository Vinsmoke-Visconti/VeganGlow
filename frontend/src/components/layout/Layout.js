import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main style={{ minHeight: 'calc(100vh - var(--header-height) - 400px)' }}>
        {children}
      </main>
      <Footer />
    </>
  );
}
