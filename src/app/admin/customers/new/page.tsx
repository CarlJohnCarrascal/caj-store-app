import CustomerForm from '../components/CustomerForm';

export default function NewCustomerPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Add New Customer</h1>
      <CustomerForm />
    </div>
  );
}
