export function toAddressDto(address) {
  return {
    id: address.id,
    label: address.label,
    recipientName: address.recipient_name,
    phone: address.phone,
    street: address.street,
    city: address.city,
    postalCode: address.postal_code,
    country: address.country,
    createdAt: address.created_at,
    updatedAt: address.updated_at,
  };
}
