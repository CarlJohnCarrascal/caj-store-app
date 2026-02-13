'use client';

import PosCheckout from './components/PosCheckout';
import PosServices from './components/PosServices';

export default function PosModePage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <div className="lg:col-span-2">
        <PosServices />
      </div>
      <div className="lg:col-span-1">
        <div className="sticky top-20">
          <PosCheckout />
        </div>
      </div>
    </div>
  );
}
