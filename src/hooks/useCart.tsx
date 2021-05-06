import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {

    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  function saveCart(cartToSave: Product[]) {
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartToSave));
    setCart(cartToSave);
  }

  const addProduct = async (productId: number) => {
    try {

      const productUpdate = cart.find(product => product.id === productId);
      if (productUpdate) {
        updateProductAmount({ productId, amount: productUpdate.amount + 1 });

      } else {
        const { data: product } = await api.get<Product>(`products/${productId}`);
        const { data: stock } = await api.get<Stock>(`stock/${productId}`);
        if (stock.amount >= 1) {
          saveCart([...cart, { ...product, amount: 1 }]);
        }
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productRemove = cart.find(product => product.id === productId);
      if (!productRemove) {
        throw Error;
      }
      const cartProductRemove = cart.filter(product => product.id !== productId);
      saveCart(cartProductRemove);

    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const { data: stock } = await api.get<Stock>(`stock/${productId}`);

      if (amount === 0) {
        return;
      }

      if (amount <= stock.amount) {
        const cartUpdateProductAmount = cart.map(product => ({
          ...product,
          amount: product.id === productId ? amount : product.amount
        }));

        saveCart(cartUpdateProductAmount);

      } else {
        toast.error('Quantidade solicitada fora de estoque');
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
