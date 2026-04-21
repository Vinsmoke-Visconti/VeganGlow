import "@/styles/globals.css";
import Layout from "@/components/layout/Layout";
import { CartProvider } from "@/context/CartContext";

export default function App({ Component, pageProps }) {
  return (
    <CartProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </CartProvider>
  );
}
