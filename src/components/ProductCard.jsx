import React, { useState } from 'react';
import { addToCart } from '../store/cartStore';
import { ShoppingCart } from 'lucide-react'; // Asegúrate de tener lucide-react instalado

export default function ProductCard({ product }) {
  const [showVariants, setShowVariants] = useState(false);

  // Lógica de precio (detectar variante más barata)
  const basePrice = product.variants?.length 
    ? Math.min(...product.variants.map(v => Number(v.price))) 
    : Number(product.price);

  const hasStock = product.variants?.length 
    ? product.variants.some(v => Number(v.stock) > 0)
    : Number(product.stock) > 0;

  if (!product.active) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-sm hover:shadow-lg transition-shadow duration-300 flex flex-col h-full relative group">
      {/* Badge de Stock bajo o Oferta (Simulado) */}
      {!hasStock && (
        <span className="absolute top-2 left-2 bg-gray-500 text-white text-xs font-bold px-2 py-1 z-10">
          AGOTADO
        </span>
      )}

      {/* Imagen */}
      <div className="aspect-square bg-gray-50 p-4 flex items-center justify-center overflow-hidden border-b border-gray-100 relative">
        <img 
          src={product.image || "https://via.placeholder.com/300?text=Sin+Imagen"} 
          alt={product.name} 
          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300 mix-blend-multiply"
        />
        
        {/* Botón rápido (aparece en hover desktop) */}
        <div className="absolute inset-x-0 bottom-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
           {!product.variants?.length && hasStock && (
             <button 
                onClick={() => addToCart(product)}
                className="w-full bg-blue-600 text-white text-sm font-bold py-2 shadow-md hover:bg-blue-700"
             >
               Añadir Rápido
             </button>
           )}
        </div>
      </div>
      
      {/* Info */}
      <div className="p-4 flex-1 flex flex-col">
        {product.category && (
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{product.category}</p>
        )}
        <h3 className="font-semibold text-slate-800 text-sm md:text-base leading-tight mb-2 flex-1 hover:text-blue-700 cursor-pointer">
          {product.name}
        </h3>
        
        <div className="mt-2">
          <p className="text-2xl font-bold text-slate-900">
            ${basePrice.toLocaleString('en-US', {minimumFractionDigits: 2})}
            <span className="text-xs font-normal text-gray-500 ml-1">
               {product.variants?.length ? 'desde' : ''}
            </span>
          </p>
          {/* Precio tachado simulado (opcional si tuvieras campo compare_price) */}
        </div>

        {/* Botones Móvil / Variantes */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          {product.variants?.length ? (
            <div className="relative">
                <button 
                  onClick={() => setShowVariants(!showVariants)}
                  className="w-full bg-slate-100 text-slate-700 text-sm font-bold py-2 rounded-sm hover:bg-slate-200 transition flex justify-center items-center gap-2"
                >
                  Seleccionar Opción
                </button>
                
                {/* Desplegable de Variantes */}
                {showVariants && (
                  <div className="absolute bottom-full left-0 w-full bg-white shadow-xl border border-gray-200 p-2 mb-1 z-20 rounded-sm">
                     <p className="text-xs font-bold text-gray-500 mb-2">Disponibles:</p>
                     <div className="max-h-40 overflow-y-auto space-y-1">
                        {product.variants.map((v, i) => (
                           <button 
                             key={i}
                             disabled={v.stock <= 0}
                             onClick={() => { addToCart(product, v); setShowVariants(false); }}
                             className="w-full text-left text-sm p-2 hover:bg-blue-50 flex justify-between disabled:opacity-50 disabled:bg-gray-50"
                           >
                              <span className="truncate">{v.name}</span>
                              <span className="font-bold text-blue-700">${v.price}</span>
                           </button>
                        ))}
                     </div>
                  </div>
                )}
            </div>
          ) : (
            <button 
              onClick={() => addToCart(product)}
              disabled={!hasStock}
              className="w-full bg-yellow-500 text-blue-900 text-sm font-bold py-2 rounded-sm hover:bg-yellow-400 transition flex justify-center items-center gap-2 disabled:bg-gray-200 disabled:text-gray-400"
            >
              <ShoppingCart size={16} />
              {hasStock ? 'Agregar' : 'Sin Stock'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
 
