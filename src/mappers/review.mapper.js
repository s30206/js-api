export function toReviewDto(review) {
  return {
    id: review.id,
    productId: review.product_id,
    userId: review.user_id,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.created_at,
    updatedAt: review.updated_at,
  };
}
