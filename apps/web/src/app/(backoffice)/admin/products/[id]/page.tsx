import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getProduct, listAllCategories } from '@/lib/admin/queries/products';
import { ProductForm } from '../_components/ProductForm';
import shared from '../../admin-shared.module.css';

type Props = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const [product, categories] = await Promise.all([getProduct(id), listAllCategories()]);
  if (!product) notFound();

  return (
    <div className={shared.page}>
      <Link href="/admin/products" className={`${shared.btn} ${shared.btnGhost}`}>
        <ChevronLeft size={14} /> Danh sách sản phẩm
      </Link>
      <div className={shared.pageHeader} style={{ marginTop: 12 }}>
        <div>
          <h1 className={shared.pageTitle}>{product.name}</h1>
          <p className={shared.pageSubtitle}>Chỉnh sửa thông tin sản phẩm</p>
        </div>
      </div>
      <ProductForm
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: Number(product.price),
          category_id: product.category_id,
          image: product.image,
          description: product.description,
          ingredients: product.ingredients,
          stock: product.stock,
          is_active: product.is_active,
        }}
        categories={categories}
      />
    </div>
  );
}
