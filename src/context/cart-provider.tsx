

"use client";

import { createContext, useReducer, ReactNode, useEffect, useState, useCallback } from 'react';
import type { Product, CartItem, DBCartItem, XeroxDocument } from '@/lib/types';
import { useAuth } from './auth-provider';
import { updateUserProfile } from '@/lib/users';
import { getProducts } from '@/lib/data';
import { useDebounce } from '@/hooks/use-debounce';

type CartState = {
  items: CartItem[];
  selectedItems: string[];
};

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: { id: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'SET_STATE'; payload: CartState }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_SELECTED_ITEMS', payload: string[] };


const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItemIndex = state.items.findIndex(
        (item) => item.id === action.payload.id
      );
      if (existingItemIndex > -1) {
        const updatedItems = [...state.items];
        updatedItems[existingItemIndex].quantity += action.payload.quantity;
        return { ...state, items: updatedItems };
      }
      return { ...state, items: [...state.items, action.payload] };
    }
    case 'REMOVE_ITEM': {
       const newItems = state.items.filter((item) => item.id !== action.payload.id);
       const newSelectedItems = state.selectedItems.filter(id => id !== action.payload.id);
      return {
        ...state,
        items: newItems,
        selectedItems: newSelectedItems,
      };
    }
    case 'UPDATE_QUANTITY': {
      if (action.payload.quantity <= 0) {
        const newItems = state.items.filter((item) => item.id !== action.payload.id);
        const newSelectedItems = state.selectedItems.filter(id => id !== action.payload.id);
        return {
          ...state,
          items: newItems,
          selectedItems: newSelectedItems,
        };
      }
      const updatedItems = state.items.map((item) =>
        item.id === action.payload.id
          ? { ...item, quantity: action.payload.quantity }
          : item
      );
      return {
        ...state,
        items: updatedItems,
      };
    }
    case 'SET_STATE': {
      return action.payload;
    }
    case 'CLEAR_CART': {
        return { items: [], selectedItems: [] };
    }
    case 'SET_SELECTED_ITEMS': {
        return { ...state, selectedItems: action.payload };
    }
    default:
      return state;
  }
};

type CartContextType = {
  items: CartItem[];
  selectedItems: string[];
  addItem: (product: Product, quantity?: number) => void;
  addXeroxItem: (xeroxDoc: XeroxDocument) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setSelectedItems: (ids: string[]) => void;
};

export const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [state, dispatch] = useReducer(cartReducer, { items: [], selectedItems: [] });
  const [isInitialized, setIsInitialized] = useState(false);
  const debouncedItems = useDebounce(state.items, 2000); // Debounce cart items with a 2-second delay

  const saveCartToDb = useCallback(async (cartItems: CartItem[]) => {
    if (user?.uid) {
      const dbCart: DBCartItem[] = cartItems.map(item => {
        if (item.type === 'xerox' && item.xerox) {
            return {
                id: item.id,
                type: 'xerox',
                quantity: item.quantity,
                price: item.price ?? null,
                xeroxConfig: item.xerox.config ?? null,
                xeroxFile: {
                    name: item.xerox.file?.name || 'Untitled',
                    type: item.xerox.file?.type || '',
                    pageCount: item.xerox.pageCount ?? 0,
                },
                productId: null, // Explicitly null for Xerox items
            };
        }
        return {
            id: item.id,
            type: item.product!.category,
            quantity: item.quantity,
            productId: item.product!.id,
            price: item.price ?? null,
            xeroxConfig: null, // Explicitly null for Product items
            xeroxFile: null,   // Explicitly null for Product items
        };
      });
      try {
        await updateUserProfile(user.uid, { cart: dbCart });
      } catch (error) {
        console.error("Failed to save cart to DB", error);
      }
    }
  }, [user?.uid]);

  useEffect(() => {
    // This effect should not run until authentication is resolved.
    if (authLoading) return;

    const initializeCart = async () => {
      // For guest users, only load from local storage
      if (!user) {
        let localCart: CartItem[] = [];
        try {
            const storedCart = localStorage.getItem('cart');
            if (storedCart && storedCart !== 'undefined') {
                localCart = JSON.parse(storedCart);
            }
        } catch (error) {
            console.error("Failed to parse cart from localStorage", error);
        }
        
        // Validate local cart against existing products, ignoring Xerox items for guests for now.
        const allProducts = await getProducts();
        const productMap = new Map(allProducts.map(p => [p.id, p]));
        const validatedLocalCart = Array.isArray(localCart) ? localCart.filter(item => 
          item.type !== 'xerox' && item.product && productMap.has(item.product.id)
        ).map(item => ({...item, product: productMap.get(item.product!.id)!})) : [];

        const allItemIds = validatedLocalCart.map(item => item.id);
        dispatch({ type: 'SET_STATE', payload: { items: validatedLocalCart, selectedItems: allItemIds }});
        setIsInitialized(true);
        return;
      }
      
      // For logged-in users, prioritize DB cart
      const dbCart: DBCartItem[] = user.cart || [];
      const allProducts = await getProducts();
      const productMap = new Map(allProducts.map(p => [p.id, p]));

      const hydratedCart: CartItem[] = dbCart.map(dbItem => {
        if (dbItem.type === 'xerox' && dbItem.xeroxConfig && dbItem.xeroxFile) {
            return {
                id: dbItem.id,
                type: 'xerox',
                quantity: dbItem.quantity,
                price: dbItem.price!,
                xerox: {
                    id: dbItem.id,
                    file: new File([], dbItem.xeroxFile.name, {type: dbItem.xeroxFile.type}), // Placeholder file
                    pageCount: dbItem.xeroxFile.pageCount,
                    price: dbItem.price!,
                    config: dbItem.xeroxConfig,
                }
            };
        }
        
        const product = productMap.get(dbItem.productId!);
        if (product) {
          return {
            id: dbItem.id,
            type: product.category,
            quantity: dbItem.quantity,
            product: product,
            price: product.discountPrice ?? product.price,
          };
        }
        return null;
      }).filter((item): item is CartItem => item !== null);

      const allItemIds = hydratedCart.map(item => item.id);
      dispatch({ type: 'SET_STATE', payload: { items: hydratedCart, selectedItems: allItemIds } });
      setIsInitialized(true);
    };

    initializeCart();
  }, [user, authLoading]);
  
  useEffect(() => {
    if (isInitialized) {
      if (user) {
        // Only save to DB when debouncedItems changes
        saveCartToDb(debouncedItems);
      } else {
        try {
            // For guests, save only non-xerox items to local storage
            const itemsToSave = state.items.filter(item => item.type !== 'xerox');
            localStorage.setItem('cart', JSON.stringify(itemsToSave));
        } catch (error) {
            console.error("Failed to sync cart to localStorage", error);
        }
      }
    }
  }, [debouncedItems, isInitialized, user, saveCartToDb, state.items]);


  const addItem = (product: Product, quantity: number = 1) => {
    const cartItem: CartItem = {
      id: product.id,
      type: product.category,
      quantity: quantity,
      product: product,
      price: product.discountPrice ?? product.price,
    };
    dispatch({ type: 'ADD_ITEM', payload: cartItem });
  };
  
  const addXeroxItem = (xeroxDoc: XeroxDocument) => {
      const cartItem: CartItem = {
          id: xeroxDoc.id,
          type: 'xerox',
          quantity: xeroxDoc.config.quantity,
          price: xeroxDoc.price,
          xerox: xeroxDoc
      };
      dispatch({ type: 'ADD_ITEM', payload: cartItem });
  }

  const removeItem = (id: string) => dispatch({ type: 'REMOVE_ITEM', payload: { id } });
  const updateQuantity = (id: string, quantity: number) => dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  const clearCart = () => dispatch({ type: 'CLEAR_CART' });
  const setSelectedItems = (ids: string[]) => dispatch({ type: 'SET_SELECTED_ITEMS', payload: ids });

  return (
    <CartContext.Provider value={{ items: state.items, selectedItems: state.selectedItems, addItem, addXeroxItem, removeItem, updateQuantity, clearCart, setSelectedItems }}>
      {children}
    </CartContext.Provider>
  );
};
