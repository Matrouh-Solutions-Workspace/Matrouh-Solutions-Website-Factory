export interface CartLine {
  readonly variantId: string;
  readonly productId: string;
  readonly quantity: number;
  readonly color?: string;
}

export function addCartLine(
  cart: readonly CartLine[],
  productId: string,
  variantId: string,
  stockQuantity: number,
  color?: string,
): readonly CartLine[] {
  if (stockQuantity < 1) return cart;
  const existing = cart.find((line) => line.variantId === variantId && line.color === color);
  if (!existing) return [...cart, { productId, variantId, quantity: 1, ...(color ? { color } : {}) }];
  return cart.map((line) =>
    line.variantId === variantId
      ? { ...line, quantity: Math.min(line.quantity + 1, stockQuantity) }
      : line,
  );
}

export function updateCartQuantity(
  cart: readonly CartLine[],
  variantId: string,
  quantity: number,
  color?: string,
): readonly CartLine[] {
  if (quantity <= 0) return cart.filter((line) => !(line.variantId === variantId && line.color === color));
  return cart.map((line) =>
    line.variantId === variantId && line.color === color ? { ...line, quantity: Math.min(quantity, 99) } : line,
  );
}

export function isCartLine(value: unknown): value is CartLine {
  if (!value || typeof value !== "object") return false;
  const line = value as Partial<CartLine>;
  return (
    typeof line.productId === "string" &&
    typeof line.variantId === "string" &&
    typeof line.quantity === "number" &&
    Number.isInteger(line.quantity) &&
    line.quantity > 0
  );
}
