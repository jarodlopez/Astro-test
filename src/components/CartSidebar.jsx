import React, { useState } from 'react';
import { useStore } from '@nanostores/react';
import { isCartOpen, cartItems, addToCart, removeFromCart } from '../store/cartStore';
import { db } from '../lib/firebase';
import { doc, runTransaction, setDoc, updateDoc, increment } from 'firebase/firestore';

const APP_ID = 'pos-pro-mobile-v2';

// Iconos HomeMart (SVG puros para evitar errores de librerías)
const IconClose = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const IconTrash = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const IconBag = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>;

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
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => isCartOpen.set(false)} />

      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
        
        <div className="p-4 border-b flex justify-between items-center bg-blue-800 text-white">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <IconBag /> {step === 'cart' ? 'Mi Carrito' : step === 'form' ? 'Checkout' : '¡Éxito!'}
          </h2>
          <button onClick={() => isCartOpen.set(false)} className="p-1 hover:bg-blue-700 rounded-full">
            <IconClose />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
            {step === 'cart' && (
              <div className="space-y-3">
                {cart.length === 0 ? (
                  <p className="text-center text-slate-400 mt-20">Tu carrito está vacío</p>
                ) : (
                  cart.map(item => (
                    <div key={item.cartId} className="flex gap-3 bg-white border border-slate-200 p-3 rounded shadow-sm relative">
                      <img src={item.image} className="w-16 h-16 object-cover rounded bg-slate-100 mix-blend-multiply" />
                      <div className="flex-1">
                        <h4 className="font-bold text-sm text-slate-800 uppercase italic">{item.name}</h4>
                        {item.isVariant && <span className="text-[10px] font-bold text-blue-600">{item.variantName}</span>}
                        <div className="flex justify-between items-center mt-2">
                           <p className="text-blue-800 font-black">${item.price}</p>
                           <div className="flex items-center gap-2 bg-slate-100 rounded border">
                              <button onClick={() => removeFromCart(item.cartId)} className="px-2 py-1 text-slate-600 font-bold">-</button>
                              <span className="text-xs font-bold">{item.quantity}</span>
                              <button onClick={() => addToCart(item, item.isVariant ? {name: item.variantName, stock: 999} : {stock: 999})} className="px-2 py-1 text-slate-600 font-bold">+</button>
                           </div>
                        </div>
                      </div>
                      <button onClick={() => removeFromCart(item.cartId)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500">
                         <IconTrash />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {step === 'form' && (
              <form id="checkout-form" onSubmit={handleCheckout} className="space-y-4 pt-2">
                <div className="bg-blue-100 p-4 rounded text-blue-900 mb-6 border border-blue-200">
                    <p className="text-xs font-bold uppercase opacity-60">Total a pagar</p>
                    <p className="text-2xl font-black">${total.toFixed(2)}</p>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nombre Completo</label>
                    <input required className="w-full p-3 bg-white border border-slate-300 rounded focus:border-blue-600 outline-none transition" 
                           onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej: Juan Pérez" />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Teléfono</label>
                    <input required className="w-full p-3 bg-white border border-slate-300 rounded focus:border-blue-600 outline-none transition" 
                           onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="Ej: 8888-8888" />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Dirección Exacta</label>
                    <textarea required className="w-full p-3 bg-white border border-slate-300 rounded focus:border-blue-600 outline-none h-24 resize-none transition" 
                              onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Barrio, número de casa, puntos de referencia..." />
                </div>
              </form>
            )}

            {step === 'success' && (
              <div className="text-center py-16 animate-in zoom-in-95">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                   <svg size={40} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} className="w-10 h-10"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-2xl font-black text-slate-900 uppercase italic">¡Pedido Confirmado!</h3>
                <p className="text-slate-500 mt-2 text-sm">Tu orden ha sido enviada al sistema HomeMart. Nos comunicaremos contigo pronto.</p>
              </div>
            )}
        </div>

        <div className="p-4 border-t bg-white">
            {step === 'cart' ? (
                <button 
                    onClick={() => cart.length > 0 && setStep('form')}
                    disabled={cart.length === 0} 
                    className="w-full bg-yellow-500 text-blue-900 py-4 rounded font-black uppercase tracking-tighter hover:bg-yellow-400 disabled:opacity-50 transition shadow-lg shadow-yellow-100"
                >
                    Continuar Pedido
                </button>
            ) : step === 'form' ? (
                <div className="flex gap-2">
                    <button onClick={() => setStep('cart')} type="button" className="w-1/3 bg-slate-100 text-slate-500 py-4 rounded font-bold uppercase text-xs">
                        Volver
                    </button>
                    <button form="checkout-form" type="submit" disabled={loading} className="w-2/3 bg-blue-700 text-white py-4 rounded font-black uppercase tracking-tighter hover:bg-blue-800 disabled:opacity-70 transition">
                        {loading ? 'Procesando...' : 'Confirmar Ahora'}
                    </button>
                </div>
            ) : (
                <button onClick={() => { isCartOpen.set(false); cartItems.set({}); window.location.reload(); }} className="w-full bg-slate-900 text-white py-4 rounded font-black uppercase italic">
                    Finalizar y Volver
                </button>
            )}
        </div>
      </div>
    </div>
  );
}

