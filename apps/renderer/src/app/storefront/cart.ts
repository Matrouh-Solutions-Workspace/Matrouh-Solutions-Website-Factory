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
  const reserved = cart.reduce(
    (total, line) => total + (line.variantId === variantId ? line.quantity : 0),
    0,
  );
  if (reserved >= stockQuantity) return cart;
  const existing = cart.find((line) => line.variantId === variantId && line.color === color);
  if (!existing)
    return [...cart, { productId, variantId, quantity: 1, ...(color ? { color } : {}) }];
  return cart.map((line) =>
    line.variantId === variantId && line.color === color
      ? { ...line, quantity: line.quantity + 1 }
      : line,
  );
}

export function updateCartQuantity(
  cart: readonly CartLine[],
  variantId: string,
  quantity: number,
  color?: string,
  stockQuantity = 99,
): readonly CartLine[] {
  if (quantity <= 0)
    return cart.filter((line) => !(line.variantId === variantId && line.color === color));
  return cart.map((line) =>
    line.variantId === variantId && line.color === color
      ? {
          ...line,
          quantity: Math.max(
            0,
            Math.min(
              quantity,
              99,
              stockQuantity - cart.reduce(
                (total, other) => total + (other.variantId === variantId && other.color !== color ? other.quantity : 0),
                0,
              ),
            ),
          ),
        }
      : line,
  ).filter((line) => line.quantity > 0);
}

export function changeCartColor(
  cart: readonly CartLine[],
  variantId: string,
  fromColor: string | undefined,
  toColor: string,
): readonly CartLine[] {
  if (fromColor === toColor) return cart;
  const source = cart.find((line) => line.variantId === variantId && line.color === fromColor);
  if (!source) return cart;
  const target = cart.find((line) => line.variantId === variantId && line.color === toColor);
  if (!target) return cart.map((line) => line === source ? { ...line, color: toColor } : line);
  return cart
    .filter((line) => line !== source)
    .map((line) => line === target ? { ...line, quantity: line.quantity + source.quantity } : line);
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
