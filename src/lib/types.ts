export interface Product {
  id: string;
  name: string;
  group: string;
  show: boolean;
  category: string;
  price: number;
  stock: number;
  material: string;
  dimensions: string;
  description: string;
  image: string;
}

export interface CartItem extends Product {
  quantity: number;
}
