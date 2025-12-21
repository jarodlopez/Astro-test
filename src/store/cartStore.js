import { atom, map } from 'nanostores';

export const isCartOpen = atom(false);
export const cartItems = map({}); // Mapa para acceso rápido por ID

// Agregar producto
export function addToCart(product, variant = null) {
  const cartId = variant ? `${product.id}-${variant.name}` : product.id;
  const current = cartItems.get()[cartId];
  const maxStock = variant ? Number(variant.stock) : Number(product.stock);

  if (current && current.quantity >= maxStock) {
    alert("¡Stock máximo alcanzado!");
    return;
  }

  const newItem = {
    cartId,
    id: product.id,
    name: product.name,
    price: Number(variant ? variant.price : product.price),
    image: product.image,
    quantity: current ? current.quantity + 1 : 1,
    maxStock,
    isVariant: !!variant,
    variantName: variant?.name || null
  };

  cartItems.setKey(cartId, newItem);
  isCartOpen.set(true); // Abrir carrito al comprar
}

// Restar/Eliminar
export function removeFromCart(cartId) {
  const current = cartItems.get()[cartId];
  if (!current) return;

  if (current.quantity > 1) {
    cartItems.setKey(cartId, { ...current, quantity: current.quantity - 1 });
  } else {
    const newCart = { ...cartItems.get() };
    delete newCart[cartId];
    cartItems.set(newCart);
  }
}
