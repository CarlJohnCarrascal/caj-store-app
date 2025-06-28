import CompleteProfileForm from './CompleteProfileForm';

export default function CompleteProfilePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-4">
        <CompleteProfileForm />
      </div>
    </div>
  );
}
