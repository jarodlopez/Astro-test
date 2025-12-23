import React, { useState } from 'react';
import { addToCart } from '../store/cartStore';
import { ShoppingCart, Check, Plus } from 'lucide-react';

export default function ProductCard({ product }) {
  const [showVariants, setShowVariants] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  if (!product || !product.active) return null;

  // Precios seguros
  const basePrice = product.variants?.length
    ? Math.min(...product.variants.map(v => Number(v?.price)).filter(p => !isNaN(p)))
    : Number(product.price);
  const safePrice = !isNaN(basePrice) ? basePrice : 0;

  // Stock seguro
  const hasStock = product.variants?.length
    ? product.variants.some(v => Number(v?.stock ?? 0) > 0)
    : Number(product.stock ?? 0) > 0;

  const handleQuickAdd = () => {
    addToCart(product);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div className="group relative bg-white rounded-3xl transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 border border-zinc-100 hover:border-indigo-100 overflow-visible flex flex-col h-full">
      
      {/* Badge Flotante (Stock/Nuevo) */}
      {!hasStock && (
        <span className="absolute top-4 left-4 bg-zinc-900/80 backdrop-blur text-white text-[10px] font-bold px-3 py-1 rounded-full z-20">
          AGOTADO
        </span>
      )}

      {/* Imagen con Aspect Ratio Moderno */}
      <div className="relative aspect-[1/1] p-6 flex items-center justify-center overflow-hidden bg-zinc-50/50 rounded-t-3xl">
        <img
          src={product.image || 'https://via.placeholder.com/300?text=No+Image'}
          alt={product.name}
          className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-110"
        />

        {/* Botón Flotante "Quick Add" - Aparece en Hover */}
        {!product.variants?.length && hasStock && (
          <button
            onClick={(e) => { e.stopPropagation(); handleQuickAdd(); }}
            className={`
              absolute bottom-4 right-4 h-10 w-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100
              ${isAdded ? 'bg-green-500 text-white' : 'bg-zinc-900 text-white hover:bg-indigo-600'}
            `}
          >
            {isAdded ? <Check size={18} /> : <Plus size={20} />}
          </button>
        )}
      </div>

      {/* Información del Producto */}
      <div className="p-5 flex flex-col flex-1">
        {product.category && (
          <p className="text-xs font-semibold text-indigo-500 mb-2 uppercase tracking-wider">
            {product.category}
          </p>
        )}

        <h3 className="font-display font-bold text-zinc-900 text-lg leading-tight mb-2 flex-1 group-hover:text-indigo-700 transition-colors">
          {product.name}
        </h3>

        <div className="flex items-baseline gap-2 mt-2">
          <p className="text-xl font-bold text-zinc-900">
            ${safePrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          {product.variants?.length > 0 && (
            <span className="text-xs text-zinc-400 font-medium">desde</span>
          )}
        </div>

        {/* Acciones para Variantes o Móvil */}
        <div className="mt-4 pt-4 border-t border-zinc-100/50">
          {product.variants?.length ? (
            <div className="relative">
              <button
                onClick={() => setShowVariants(!showVariants)}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-50 text-zinc-700 font-medium text-sm hover:bg-zinc-100 transition-colors flex justify-between items-center group/btn"
              >
                <span>Elegir Opción</span>
                <span className="text-zinc-400 group-hover/btn:text-indigo-600">▼</span>
              </button>

              {showVariants && (
                <div className="absolute bottom-full left-0 w-full bg-white shadow-2xl rounded-2xl border border-zinc-100 p-2 mb-2 z-30 animate-in slide-in-from-bottom-2 fade-in">
                  <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                    {product.variants.map((v, i) => (
                      <button
                        key={i}
                        disabled={Number(v?.stock ?? 0) <= 0}
                        onClick={() => { addToCart(product, v); setShowVariants(false); }}
                        className="w-full text-left text-sm p-3 rounded-xl hover:bg-indigo-50 flex justify-between items-center disabled:opacity-40"
                      >
                        <span className="text-zinc-700 font-medium truncate">{v?.name}</span>
                        <span className="font-bold text-indigo-600">${Number(v?.price).toFixed(0)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleQuickAdd}
              disabled={!hasStock}
              className={`w-full py-2.5 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2 md:hidden
                ${hasStock ? 'bg-zinc-900 text-white active:bg-zinc-800' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}
              `}
            >
              {hasStock ? 'Agregar al Carrito' : 'Sin Stock'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
