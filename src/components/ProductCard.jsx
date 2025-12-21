import React, { useState } from 'react';
import { addToCart } from '../store/cartStore';

export default function ProductCard({ product }) {
  const [showVariants, setShowVariants] = useState(false);

  // Formatear precio
  const price = product.variants?.length 
    ? Math.min(...product.variants.map(v => v.price)) // Precio 'desde'
    : product.price;

  const hasStock = product.variants?.length 
    ? product.variants.some(v => v.stock > 0)
    : product.stock > 0;

  if (!product.active) return null;

  return (
    <div className="group bg-white rounded-2xl p-4 shadow-sm hover:shadow-xl transition border border-stone-100 relative">
      <div className="aspect-square rounded-xl overflow-hidden mb-4 bg-gray-100">
        <img 
          src={product.image || "https://via.placeholder.com/300"} 
          alt={product.name} 
          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
        />
      </div>
      
      <h3 className="font-bold text-stone-800 text-lg truncate">{product.name}</h3>
      <p className="text-emerald-600 font-bold mb-4">
        {product.variants?.length ? 'Desde ' : ''}${Number(price).toFixed(2)}
      </p>

      {/* Selector de Variantes (si tiene) */}
      {showVariants && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 p-4 flex flex-col justify-center rounded-2xl animate-in fade-in">
          <h4 className="font-bold text-center mb-2 text-stone-700">Elige una opción:</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {product.variants.map((v, i) => (
              <button 
                key={i}
                disabled={v.stock <= 0}
                onClick={() => { addToCart(product, v); setShowVariants(false); }}
                className="w-full flex justify-between p-2 hover:bg-emerald-50 rounded-lg text-sm border disabled:opacity-50"
              >
                <span>{v.name}</span>
                <span className="font-bold">${v.price}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setShowVariants(false)} className="mt-2 text-xs text-red-500 underline text-center">Cancelar</button>
        </div>
      )}

      {/* Botón de Acción */}
      {product.variants?.length ? (
        <button 
          onClick={() => setShowVariants(true)}
          className="w-full bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700 transition"
        >
          Ver Opciones
        </button>
      ) : (
        <button 
          onClick={() => addToCart(product)}
          disabled={!hasStock}
          className="w-full bg-stone-900 text-white py-2 rounded-lg font-bold hover:bg-stone-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {hasStock ? 'Agregar al Carrito' : 'Agotado'}
        </button>
      )}
    </div>
  );
}
