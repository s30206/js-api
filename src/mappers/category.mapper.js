export function toCategoryDto(category) {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    createdAt: category.created_at,
    updatedAt: category.updated_at,
  };
}
