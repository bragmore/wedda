import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Vendor, Category, Product } from "@shared/schema";

interface SelectedVendor {
  vendor: Vendor;
  category: Category;
  notes: string;
}

interface PackageContextType {
  selectedVendors: Map<number, SelectedVendor>; // keyed by vendor.id
  selectedProductIds: Set<number>;
  selectedProducts: Map<number, Product>;
  addVendor: (vendor: Vendor, category: Category) => void;
  removeVendor: (vendorId: number) => void;
  isSelected: (vendorId: number) => boolean;
  updateNotes: (vendorId: number, notes: string) => void;
  toggleProduct: (productId: number) => void;
  isProductSelected: (productId: number) => boolean;
  addProduct: (product: Product) => void;
  removeProduct: (id: number) => void;
  toggleProductObj: (product: Product) => void;
  setProducts: (products: Map<number, Product>) => void;
  getSelectedProducts: () => Product[];
  clearAll: () => void;
  getItems: () => SelectedVendor[];
  getSelectedProductIds: () => number[];
}

const PackageContext = createContext<PackageContextType>({
  selectedVendors: new Map(),
  selectedProductIds: new Set(),
  selectedProducts: new Map(),
  addVendor: () => {},
  removeVendor: () => {},
  isSelected: () => false,
  updateNotes: () => {},
  toggleProduct: () => {},
  isProductSelected: () => false,
  addProduct: () => {},
  removeProduct: () => {},
  toggleProductObj: () => {},
  setProducts: () => {},
  getSelectedProducts: () => [],
  clearAll: () => {},
  getItems: () => [],
  getSelectedProductIds: () => [],
});

export function PackageProvider({ children }: { children: ReactNode }) {
  const [selectedVendors, setSelectedVendors] = useState<Map<number, SelectedVendor>>(new Map());
  const [selectedProducts, setSelectedProducts] = useState<Map<number, Product>>(new Map());

  // Derived set for backward compatibility
  const selectedProductIds = new Set(selectedProducts.keys());

  const addVendor = (vendor: Vendor, category: Category) => {
    setSelectedVendors(prev => {
      const next = new Map(prev);
      next.set(vendor.id, { vendor, category, notes: "" });
      return next;
    });
  };

  const removeVendor = (vendorId: number) => {
    setSelectedVendors(prev => {
      const next = new Map(prev);
      next.delete(vendorId);
      return next;
    });
  };

  const isSelected = (vendorId: number) => selectedVendors.has(vendorId);

  const updateNotes = (vendorId: number, notes: string) => {
    setSelectedVendors(prev => {
      const next = new Map(prev);
      const item = next.get(vendorId);
      if (item) next.set(vendorId, { ...item, notes });
      return next;
    });
  };

  // Legacy toggle by ID only (used by products.tsx - will be updated)
  const toggleProduct = (productId: number) => {
    setSelectedProducts(prev => {
      const next = new Map(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        // Can't store full product without the object — just remove if present
        next.delete(productId);
      }
      return next;
    });
  };

  const isProductSelected = (productId: number) => selectedProducts.has(productId);

  const addProduct = useCallback((product: Product) => {
    setSelectedProducts(prev => {
      const next = new Map(prev);
      next.set(product.id, product);
      return next;
    });
  }, []);

  const removeProduct = useCallback((id: number) => {
    setSelectedProducts(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const toggleProductObj = useCallback((product: Product) => {
    setSelectedProducts(prev => {
      const next = new Map(prev);
      if (next.has(product.id)) {
        next.delete(product.id);
      } else {
        next.set(product.id, product);
      }
      return next;
    });
  }, []);

  const setProductsMap = useCallback((products: Map<number, Product>) => {
    setSelectedProducts(products);
  }, []);

  const getSelectedProducts = useCallback(() => [...selectedProducts.values()], [selectedProducts]);

  const clearAll = () => {
    setSelectedVendors(new Map());
    setSelectedProducts(new Map());
  };

  const getItems = () => [...selectedVendors.values()];

  const getSelectedProductIds = () => [...selectedProducts.keys()];

  return (
    <PackageContext.Provider value={{
      selectedVendors,
      selectedProductIds,
      selectedProducts,
      addVendor,
      removeVendor,
      isSelected,
      updateNotes,
      toggleProduct,
      isProductSelected,
      addProduct,
      removeProduct,
      toggleProductObj,
      setProducts: setProductsMap,
      getSelectedProducts,
      clearAll,
      getItems,
      getSelectedProductIds,
    }}>
      {children}
    </PackageContext.Provider>
  );
}

export function usePackage() {
  return useContext(PackageContext);
}
