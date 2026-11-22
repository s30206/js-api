export function toBrandDto(brand) {
  return {
    id: brand.id,
    name: brand.name,
    createdAt: brand.created_at,
    updatedAt: brand.updated_at,
  };
}
