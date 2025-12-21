import React, { useState } from 'react';
import { useStore } from '@nanostores/react';
import { isCartOpen, cartItems, addToCart, removeFromCart } from '../store/cartStore';
import { db } from '../lib/firebase';
import { doc, runTransaction, setDoc, updateDoc, increment } from 'firebase/firestore';

const APP_ID = 'pos-pro-mobile-v2';

// Iconos sencillos (SVG) para no depender de librerías externas
const IconClose = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const IconTrash = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const IconBag = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>;

export default function CartSidebar() {
  const isOpen = useStore(isCartOpen);
  const items = useStore(cartItems);
  const cart = Object.values(items);
  
  // Estados simples: 'cart' (lista) -> 'form' (datos) -> 'success' (fin)
  const [step, setStep] = useState('cart'); 
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  // --- LÓGICA DE NEGOCIO (Idéntica a tu ModalCobro) ---
  const handleCheckout = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Generar ID de Orden (Secuencial por día)
      const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,'');
      const counterRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'counters', 'orders_'+dateStr);
      
      let seq = 1;
      await runTransaction(db, async (transaction) => {
         const docSnap = await transaction.get(counterRef);
         seq = docSnap.exists() ? docSnap.data().val + 1 : 1;
         transaction.set(counterRef, {val: seq}, {merge:true});
      });

      const oid = `HM-${dateStr}-${String(seq).padStart(3,'0')}`;

      // 2. Crear la Orden (Formato compatible con tu POS)
      const orderData = {
        displayId: oid,
        createdAt: new Date().toISOString(),
        cart: cart.map(i => ({...i, qty: i.quantity})), // Mapeo para compatibilidad
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

      // 3. Descontar Inventario
      for(let item of cart) {
        const prodRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'products', item.id);
        
        if(!item.isVariant) {
            await updateDoc(prodRef, { stock: increment(-item.quantity) });
        } else {
            await runTransaction(db, async (t)=>{ 
                const d = await t.get(prodRef);
                if(!d.exists()) return;
                const currentVars = d.data().variants || [];
                const newVars = currentVars.map(v => 
                    v.name === item.variantName 
                    ? {...v, stock: Math.max(0, Number(v.stock) - item.quantity)} 
                    : v
                );
                t.update(prodRef, { variants: newVars });
            });
        }
      }

      setStep('success');
    } catch (err) {
      console.error(err);
      alert("Error al procesar: " + err.message);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Fondo oscuro al hacer clic cierra */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => isCartOpen.set(false)} />

      {/* Panel Blanco */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
        
        {/* Encabezado */}
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <IconBag /> 
            {step === 'cart' ? 'Carrito de Compras' : step === 'form' ? 'Datos de Envío' : '¡Pedido Listo!'}
          </h2>
          <button onClick={() => isCartOpen.set(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500">
            <IconClose />
          </button>
        </div>

        {/* CONTENIDO SCROLLABLE */}
        <div className="flex-1 overflow-y-auto p-4">
            
            {/* VISTA 1: LISTA */}
            {step === 'cart' && (
              <>
                {cart.length === 0 ? (
                  <p className="text-center text-gray-400 mt-10">Tu carrito está vacío.</p>
                ) : (
                  <div className="space-y-4">
                    {cart.map(item => (
                      <div key={item.cartId} className="flex gap-3 border p-2 rounded-lg relative">
                        <img src={item.image} className="w-16 h-16 object-cover rounded bg-gray-100" />
                        <div className="flex-1">
                          <h4 className="font-bold text-sm text-gray-800">{item.name}</h4>
                          {item.isVariant && <span className="text-xs bg-gray-100 px-2 rounded">{item.variantName}</span>}
                          <div className="flex justify-between items-center mt-2">
                             <p className="text-blue-700 font-bold">${item.price}</p>
                             <div className="flex items-center gap-2 bg-gray-100 rounded px-2">
                                <button onClick={() => removeFromCart(item.cartId)} className="font-bold px-1 text-gray-600">-</button>
                                <span className="text-sm font-bold">{item.quantity}</span>
                                <button onClick={() => addToCart(item, item.isVariant ? {name: item.variantName, stock: 999} : {stock: 999})} className="font-bold px-1 text-gray-600">+</button>
                             </div>
                          </div>
                        </div>
                        <button onClick={() => removeFromCart(item.cartId)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500">
                           <IconTrash />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* VISTA 2: FORMULARIO */}
            {step === 'form' && (
              <form id="checkout-form" onSubmit={handleCheckout} className="space-y-4">
                <div className="bg-blue-50 p-3 rounded text-blue-900 text-sm mb-4">
                    Total a pagar: <strong>${total.toFixed(2)}</strong>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Nombre</label>
                    <input required className="w-full p-3 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                           onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Tu nombre" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Teléfono</label>
                    <input required className="w-full p-3 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                           onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="WhatsApp o celular" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Dirección</label>
                    <textarea required className="w-full p-3 border rounded focus:ring-2 focus:ring-blue-500 outline-none h-24" 
                              onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Dirección exacta de entrega" />
                </div>
              </form>
            )}

            {/* VISTA 3: ÉXITO */}
            {step === 'success' && (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl mb-4">✓</div>
                <h3 className="text-xl font-bold text-gray-800">¡Pedido Recibido!</h3>
                <p className="text-gray-500 mt-2">Pronto nos pondremos en contacto contigo.</p>
                <div className="mt-8 p-4 bg-gray-50 rounded">
                    <p className="font-bold">Total: ${total.toFixed(2)}</p>
                </div>
              </div>
            )}
        </div>

        {/* PIE DE PÁGINA (BOTONES) */}
        {step !== 'success' && (
            <div className="p-4 border-t bg-gray-50">
                {step === 'cart' ? (
                    <button 
                        onClick={() => cart.length > 0 && setStep('form')}
                        disabled={cart.length === 0} 
                        className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 disabled:opacity-50"
                    >
                        Pagar ${total.toFixed(2)}
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button onClick={() => setStep('cart')} type="button" className="w-1/3 bg-gray-200 text-gray-700 py-3 rounded font-bold">
                            Volver
                        </button>
                        <button form="checkout-form" type="submit" disabled={loading} className="w-2/3 bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 disabled:opacity-70">
                            {loading ? '...' : 'Confirmar Pedido'}
                        </button>
                    </div>
                )}
            </div>
        )}
        
        {step === 'success' && (
            <div className="p-4 border-t">
                <button onClick={() => { isCartOpen.set(false); setStep('cart'); cartItems.set({}); window.location.reload(); }} className="w-full bg-gray-900 text-white py-3 rounded font-bold">
                    Cerrar
                </button>
            </div>
        )}

      </div>
    </div>
  );
}

