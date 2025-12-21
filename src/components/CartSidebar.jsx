import React, { useState } from 'react';
import { useStore } from '@nanostores/react';
import { isCartOpen, cartItems, addToCart, removeFromCart } from '../store/cartStore';
import { db } from '../lib/firebase';
import { doc, runTransaction, setDoc, updateDoc, increment } from 'firebase/firestore';
import { X, Trash2, ShoppingBag, CheckCircle, MapPin, Phone, User, CreditCard } from 'lucide-react';

const APP_ID = 'pos-pro-mobile-v2'; // Tu ID exacto del POS

export default function CartSidebar() {
  const isOpen = useStore(isCartOpen);
  const items = useStore(cartItems);
  const cart = Object.values(items);
  const [step, setStep] = useState('cart'); // cart | form | success
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });

  // Totales
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const total = subtotal; // Puedes agregar envío dinámico aquí si lo deseas

  const handleCheckout = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Generar ID de Orden (Lógica idéntica a tu ModalCobro.js)
      const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,'');
      const counterRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'counters', 'orders_'+dateStr);
      
      let seq = 1;
      await runTransaction(db, async (transaction) => {
         const docSnap = await transaction.get(counterRef);
         seq = docSnap.exists() ? docSnap.data().val + 1 : 1;
         transaction.set(counterRef, {val: seq}, {merge:true});
      });

      const oid = `HM-${dateStr}-${String(seq).padStart(3,'0')}`;

      // 2. Crear Objeto de Orden compatible con tu POS
      const orderData = {
        displayId: oid,
        createdAt: new Date().toISOString(),
        cart: cart.map(i => ({...i, qty: i.quantity})), // Adaptamos quantity a qty como lo usa tu POS
        client: formData.name,
        phone: formData.phone,
        address: formData.address,
        method: 'Pedido Web', // Método fijo para identificar origen
        status: 'recibido',   // Estado inicial para tu tablero Kanban/Lista
        paymentStatus: 'pendiente',
        total: total,
        boxId: 'WEB',         // Caja virtual
        isDelivery: true
      };

      // 3. Guardar Orden en Firestore
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'orders', oid), orderData);

      // 4. Descontar Stock (Manejo de Variantes y Productos Simples)
      for(let item of cart) {
        const prodRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'products', item.id);
        
        if(!item.isVariant) {
            // Producto simple
            await updateDoc(prodRef, { stock: increment(-item.quantity) });
        } else {
            // Producto con variantes: Transacción necesaria para leer array, modificarlo y guardar
            await runTransaction(db, async (t)=>{ 
                const d = await t.get(prodRef);
                if(!d.exists()) return;
                
                const currentData = d.data();
                const vars = currentData.variants || [];
                
                const newVars = vars.map(v => 
                    v.name === item.variantName 
                    ? {...v, stock: Math.max(0, Number(v.stock) - item.quantity)} 
                    : v
                );
                
                t.update(prodRef, { variants: newVars });
            });
        }
      }

      setStep('success');
      // No borramos el carrito inmediatamente por si el usuario quiere ver qué pidió,
      // pero idealmente deberías limpiar: cartItems.set({});
    } catch (err) {
      console.error(err);
      alert("Error al procesar el pedido. Por favor intenta de nuevo.");
    }
    setLoading(false);
  };

  const closeSidebar = () => {
      isCartOpen.set(false);
      if(step === 'success') {
          setStep('cart');
          cartItems.set({}); // Limpiar carrito al cerrar si fue exitoso
          window.location.reload(); // Recargar para actualizar stock visualmente
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end font-sans">
      {/* Overlay Oscuro */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={closeSidebar} />

      {/* Panel Lateral */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* HEADER */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white shadow-sm z-10">
          <h2 className="font-bold text-xl text-slate-800 flex items-center gap-2">
            <ShoppingBag className="text-blue-600" size={24} />
            {step === 'cart' ? 'Mi Carrito' : step === 'form' ? 'Checkout' : 'Confirmación'}
          </h2>
          <button onClick={closeSidebar} className="p-2 hover:bg-gray-100 rounded-full text-slate-500 transition">
            <X size={24} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
            {/* VISTA 1: LISTA DE PRODUCTOS */}
            {step === 'cart' && (
              <div className="p-4 space-y-3">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full pt-20 opacity-50">
                    <ShoppingBag size={64} className="mb-4 text-slate-300"/>
                    <p className="text-lg font-medium text-slate-400">Tu carrito está vacío</p>
                    <button onClick={closeSidebar} className="mt-4 text-blue-600 hover:underline">Seguir comprando</button>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.cartId} className="flex gap-4 bg-white p-3 rounded-lg border border-gray-200 shadow-sm relative group">
                      <div className="w-20 h-20 bg-gray-100 rounded-md overflow-hidden shrink-0">
                         <img src={item.image} className="w-full h-full object-cover mix-blend-multiply" alt={item.name} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-slate-800 truncate pr-6">{item.name}</h4>
                        {item.isVariant && (
                            <span className="inline-block text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded mt-1">
                                {item.variantName}
                            </span>
                        )}
                        <div className="mt-2 flex justify-between items-end">
                            <p className="text-blue-700 font-bold text-lg">${item.price}</p>
                            
                            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1 border border-gray-200">
                                <button 
                                    onClick={() => removeFromCart(item.cartId)} 
                                    className="w-6 h-6 flex items-center justify-center rounded bg-white shadow-sm text-slate-600 hover:text-red-500 font-bold text-sm"
                                >-</button>
                                <span className="font-semibold text-sm w-4 text-center">{item.quantity}</span>
                                <button 
                                    onClick={() => addToCart(item, item.isVariant ? {name: item.variantName, stock: 999} : {stock: 999})} 
                                    className="w-6 h-6 flex items-center justify-center rounded bg-white shadow-sm text-slate-600 hover:text-blue-600 font-bold text-sm"
                                >+</button>
                            </div>
                        </div>
                      </div>
                      {/* Botón eliminar directo */}
                      <button 
                        onClick={() => removeFromCart(item.cartId)} 
                        className="absolute top-2 right-2 text-gray-300 hover:text-red-500 transition p-1"
                      >
                         <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* VISTA 2: FORMULARIO */}
            {step === 'form' && (
              <form id="checkout-form" onSubmit={handleCheckout} className="p-6 space-y-5">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg mb-6">
                    <h3 className="text-blue-800 font-bold text-sm mb-1 flex items-center gap-2">
                        <CreditCard size={16}/> Resumen de Pago
                    </h3>
                    <div className="flex justify-between text-sm text-blue-900/70">
                        <span>Total a pagar:</span>
                        <span className="font-bold text-lg">${total.toFixed(2)}</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Nombre Completo</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 text-slate-400" size={18} />
                            <input 
                              required 
                              placeholder="Ej: Juan Pérez" 
                              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                              onChange={e => setFormData({...formData, name: e.target.value})}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Teléfono / WhatsApp</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3 text-slate-400" size={18} />
                            <input 
                              required 
                              placeholder="Ej: 8888-8888" 
                              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                              onChange={e => setFormData({...formData, phone: e.target.value})}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Dirección de Entrega</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 text-slate-400" size={18} />
                            <textarea 
                              required 
                              placeholder="Barrio, calle, número de casa..." 
                              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none h-24 resize-none transition"
                              onChange={e => setFormData({...formData, address: e.target.value})}
                            />
                        </div>
                    </div>
                </div>
              </form>
            )}

            {/* VISTA 3: ÉXITO */}
            {step === 'success' && (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in zoom-in-95">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
                    <CheckCircle className="text-green-600 w-12 h-12" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Pedido Recibido!</h2>
                <p className="text-slate-500 mb-8 max-w-xs mx-auto">
                    Hemos registrado tu pedido exitosamente. Nos pondremos en contacto contigo pronto.
                </p>
                <div className="bg-gray-100 p-4 rounded-lg w-full mb-8">
                    <p className="text-xs text-slate-400 uppercase font-bold">Total del pedido</p>
                    <p className="text-xl font-bold text-slate-800">${total.toFixed(2)}</p>
                </div>
              </div>
            )}
        </div>

        {/* FOOTER (Totales y Botones) */}
        {step !== 'success' && (
            <div className="p-5 border-t border-gray-200 bg-white">
                {step === 'cart' && (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-slate-500">Subtotal</span>
                            <span className="text-2xl font-bold text-slate-800">${total.toFixed(2)}</span>
                        </div>
                        <button 
                            onClick={() => cart.length > 0 && setStep('form')} 
                            disabled={cart.length === 0}
                            className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none flex justify-center items-center gap-2"
                        >
                            Finalizar Compra <CheckCircle size={18} />
                        </button>
                    </>
                )}

                {step === 'form' && (
                    <div className="flex gap-3">
                        <button 
                            type="button" 
                            onClick={() => setStep('cart')} 
                            className="w-1/3 bg-gray-100 text-slate-600 py-3 rounded-lg font-bold hover:bg-gray-200 transition"
                        >
                            Volver
                        </button>
                        <button 
                            form="checkout-form"
                            type="submit" 
                            disabled={loading} 
                            className="w-2/3 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:opacity-70 flex justify-center items-center gap-2"
                        >
                            {loading ? 'Procesando...' : 'Confirmar Pedido'}
                        </button>
                    </div>
                )}
            </div>
        )}
        
        {step === 'success' && (
             <div className="p-5 border-t border-gray-200 bg-white">
                <button onClick={closeSidebar} className="w-full bg-slate-900 text-white py-4 rounded-lg font-bold hover:bg-slate-800 transition">
                    Cerrar y Volver a la Tienda
                </button>
             </div>
        )}
      </div>
    </div>
  );
}

