import OrderList from './components/OrderList';

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Orders</h1>
      </div>
      <OrderList />
    </div>
  );
}
