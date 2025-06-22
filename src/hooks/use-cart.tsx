'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { CartItem, Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
  cartCustomer: { name: string } | null;
  setCartCustomer: (customer: { name: string } | null) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartCustomer, setCartCustomer] = useState<{ name: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const storedCart = localStorage.getItem('cart');
      if (storedCart) {
        setCartItems(JSON.parse(storedCart));
      }
      const storedCustomer = localStorage.getItem('cartCustomer');
      if (storedCustomer) {
        setCartCustomer(JSON.parse(storedCustomer));
      }
    } catch (error) {
      console.error("Failed to parse from localStorage", error);
      localStorage.removeItem('cart');
      localStorage.removeItem('cartCustomer');
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(cartItems));
      if (cartCustomer) {
        localStorage.setItem('cartCustomer', JSON.stringify(cartCustomer));
      } else {
        localStorage.removeItem('cartCustomer');
      }
    } catch (error) {
       console.error("Failed to save to localStorage", error);
    }
  }, [cartItems, cartCustomer]);

  const addToCart = (product: Product, quantity: number = 1) => {
    setCartItems(prevItems => {
      const itemExists = prevItems.find(item => item.id === product.id);
      if (itemExists) {
        return prevItems.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prevItems, { ...product, quantity }];
    });

    if (product.category !== 'CashIO') {
      toast({
        title: "Added to order",
        description: `${product.name} has been added to your order.`,
      });
    }
  };

  const removeFromCart = (productId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setCartItems(prevItems =>
      prevItems.map(item => (item.id === productId ? { ...item, quantity } : item))
    );
  };
  
  const clearCart = () => {
    setCartItems([]);
    setCartCustomer(null);
  };

  const cartCount = cartItems.length;
  const cartTotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartCount, cartTotal, cartCustomer, setCartCustomer }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
