import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getProduct, listAllCategories, listProductVariants } from '@/lib/admin/queries/products';
import { listAllTags, listProductTagIds } from '@/lib/admin/queries/tags';
import { ProductForm } from '../_components/ProductForm';
import { VariantManager } from '../_components/VariantManager';
import shared from '../../admin-shared.module.css';

type Props = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const [product, categories, availableTags, tagIds, variants] = await Promise.all([
    getProduct(id),
    listAllCategories(),
    listAllTags(),
    listProductTagIds(id),
    listProductVariants(id),
  ]);
  if (!product) notFound();

  return (
    <div className={shared.page}>
      <Link href="/admin/products" className={`${shared.btn} ${shared.btnGhost}`} style={{ width: 'fit-content' }}>
        <ChevronLeft size={16} /> Quay lại danh sách
      </Link>

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
          tag_ids: tagIds,
        }}
        categories={categories}
        availableTags={availableTags}
      />

      <VariantManager productId={product.id} variants={variants} />
    </div>
  );
}
