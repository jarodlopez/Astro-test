import React, { useState } from 'react';
import { useStore } from '@nanostores/react';
import { isCartOpen, cartItems, addToCart, removeFromCart } from '../store/cartStore';
import { db } from '../lib/firebase';
import { doc, runTransaction, setDoc, updateDoc, increment } from 'firebase/firestore';
import { X, Trash2, ShoppingBag, ArrowRight, Minus, Plus } from 'lucide-react'; // Usamos lucide que ya tienes

const APP_ID = 'pos-pro-mobile-v2';

export default function CartSidebar() {
  const isOpen = useStore(isCartOpen);
  const items = useStore(cartItems);
  const cart = Object.values(items);
  
  const [step, setStep] = useState('cart'); 
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleCheckout = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ... (Lógica de Firebase igual que antes) ...
      const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,'');
      const counterRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'counters', 'orders_'+dateStr);
      let seq = 1;
      await runTransaction(db, async (transaction) => {
         const docSnap = await transaction.get(counterRef);
         seq = docSnap.exists() ? docSnap.data().val + 1 : 1;
         transaction.set(counterRef, {val: seq}, {merge:true});
      });
      const oid = `HM-${dateStr}-${String(seq).padStart(3,'0')}`;
      const orderData = {
        displayId: oid,
        createdAt: new Date().toISOString(),
        cart: cart.map(i => ({...i, qty: i.quantity})),
        client: formData.name,
        phone: formData.phone,
        address: formData.address,
        method: 'Pedido Web',
        status: 'recibido',
        paymentStatus: 'pendiente',
        total: total,
        boxId: 'WEB',
        isDelivery: true
      };
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'orders', oid), orderData);
      
      // Stock update logic
      for(let item of cart) {
        const prodRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'products', item.id);
        if(!item.isVariant) {
            await updateDoc(prodRef, { stock: increment(-item.quantity) });
        } else {
            await runTransaction(db, async (t)=>{ 
                const d = await t.get(prodRef);
                if(!d.exists()) return;
                const newVars = (d.data().variants || []).map(v => 
                    v.name === item.variantName ? {...v, stock: Math.max(0, Number(v.stock) - item.quantity)} : v
                );
                t.update(prodRef, { variants: newVars });
            });
        }
      }
      setStep('success');
    } catch (err) {
      alert("Error: " + err.message);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end font-sans">
      {/* Backdrop con Blur */}
      <div 
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm transition-opacity" 
        onClick={() => isCartOpen.set(false)} 
      />

      <div className="relative w-full max-w-[450px] bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-out">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-100 flex justify-between items-center bg-white z-10">
          <h2 className="font-display font-bold text-xl text-zinc-900 flex items-center gap-2">
            <ShoppingBag className="text-indigo-600" /> 
            {step === 'cart' ? 'Tu Carrito' : step === 'form' ? 'Finalizar Compra' : '¡Listo!'}
          </h2>
          <button 
            onClick={() => isCartOpen.set(false)} 
            className="p-2 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-900 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar">
            {step === 'cart' && (
              <div className="space-y-6">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4 mt-20 opacity-50">
                    <ShoppingBag size={48} className="text-zinc-300" />
                    <p className="text-zinc-400 font-medium">No tienes productos aún.</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.cartId} className="flex gap-4 group">
                      <div className="w-20 h-20 bg-zinc-50 rounded-xl p-2 flex items-center justify-center shrink-0 border border-zinc-100">
                        <img src={item.image} className="w-full h-full object-contain mix-blend-multiply" />
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          <h4 className="font-semibold text-zinc-900 text-sm leading-tight">{item.name}</h4>
                          {item.isVariant && <p className="text-xs text-indigo-500 font-medium mt-0.5">{item.variantName}</p>}
                        </div>
                        
                        <div className="flex justify-between items-end">
                           <p className="text-zinc-900 font-bold">${item.price}</p>
                           
                           {/* Control de cantidad minimalista */}
                           <div className="flex items-center gap-3 bg-zinc-50 rounded-lg p-1 border border-zinc-100">
                              <button onClick={() => removeFromCart(item.cartId)} className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm text-zinc-600 hover:text-red-500 text-xs transition">
                                <Minus size={12} />
                              </button>
                              <span className="text-xs font-bold text-zinc-700 w-4 text-center">{item.quantity}</span>
                              <button onClick={() => addToCart(item, item.isVariant ? {name: item.variantName, stock: 999} : {stock: 999})} className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm text-zinc-600 hover:text-indigo-600 text-xs transition">
                                <Plus size={12} />
                              </button>
                           </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {step === 'form' && (
              <form id="checkout-form" onSubmit={handleCheckout} className="space-y-5 animate-in slide-in-from-right-10">
                <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-center">
                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-wide mb-1">Total a Pagar</p>
                    <p className="text-3xl font-display font-bold text-indigo-900">${total.toFixed(2)}</p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-500 ml-1">NOMBRE COMPLETO</label>
                      <input required className="w-full p-3.5 bg-zinc-50 border-zinc-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-medium text-zinc-800 placeholder-zinc-400" 
                            onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej: Tu Nombre" />
                  </div>
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-500 ml-1">TELÉFONO</label>
                      <input required className="w-full p-3.5 bg-zinc-50 border-zinc-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-medium text-zinc-800 placeholder-zinc-400" 
                            onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="Para contactarte" />
                  </div>
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-500 ml-1">DIRECCIÓN DE ENTREGA</label>
                      <textarea required className="w-full p-3.5 bg-zinc-50 border-zinc-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-medium text-zinc-800 placeholder-zinc-400 min-h-[100px] resize-none" 
                                onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Incluye detalles para encontrar tu casa..." />
                  </div>
                </div>
              </form>
            )}

            {step === 'success' && (
              <div className="flex flex-col items-center justify-center h-full text-center py-10 animate-in zoom-in-95">
                <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-green-100">
                   <Check size={48} strokeWidth={3} />
                </div>
                <h3 className="text-2xl font-display font-bold text-zinc-900 mb-2">¡Orden Confirmada!</h3>
                <p className="text-zinc-500 max-w-[250px]">
                  Gracias por tu compra. Nos pondremos en contacto contigo en breve.
                </p>
              </div>
            )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-zinc-100 bg-white">
            {step === 'cart' ? (
                <button 
                    onClick={() => cart.length > 0 && setStep('form')}
                    disabled={cart.length === 0} 
                    className="w-full bg-zinc-900 text-white py-4 rounded-xl font-bold hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-zinc-900/20 flex items-center justify-center gap-2"
                >
                    Checkout <ArrowRight size={18} />
                </button>
            ) : step === 'form' ? (
                <div className="flex gap-3">
                    <button onClick={() => setStep('cart')} type="button" className="px-6 py-4 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition-colors">
                        Atrás
                    </button>
                    <button form="checkout-form" type="submit" disabled={loading} className="flex-1 bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-70 transition-all shadow-lg shadow-indigo-500/30">
                        {loading ? 'Procesando...' : 'Confirmar Pedido'}
                    </button>
                </div>
            ) : (
                <button onClick={() => { isCartOpen.set(false); cartItems.set({}); window.location.reload(); }} className="w-full bg-zinc-900 text-white py-4 rounded-xl font-bold hover:bg-zinc-800 transition-all">
                    Seguir Comprando
                </button>
            )}
        </div>
      </div>
    </div>
  );
}
