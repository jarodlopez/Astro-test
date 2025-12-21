import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import ProductCard from "./ProductCard";

// ID de tu POS / APP
const APP_ID = "pos-pro-mobile-v2";

export default function ProductGrid() {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        const q = query(
          collection(db, "artifacts", APP_ID, "public", "data", "products"),
          where("active", "==", true)
        );

        const snapshot = await getDocs(q);

        if (!isMounted) return;

        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        setProducts(data);
      } catch (err) {
        console.error("Error cargando productos:", err);
        setError("No se pudo cargar el catálogo");
      }
    }

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  if (error) {
    return (
      <div className="text-center py-20 bg-white rounded shadow">
        <p className="text-red-500 font-bold mb-2">⚠️ {error}</p>
        <p className="text-sm text-gray-500">
          Intenta recargar la página.
        </p>
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="text-center py-20">
        <p className="text-xl text-slate-400">
          Cargando inventario...
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
