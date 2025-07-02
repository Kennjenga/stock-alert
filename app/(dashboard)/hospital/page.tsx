import React from 'react';
import Link from 'next/link';

const HospitalDashboardPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Hospital Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card for Alerts */}
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Alerts</h2>
          <p className="text-gray-600">View and manage stock alerts.</p>
          <Link href="/hospital/alerts" className="text-blue-500 hover:underline mt-4 inline-block">Go to Alerts</Link>
        </div>

        {/* Card for Inventory */}
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Inventory</h2>
          <p className="text-gray-600">Manage your inventory levels.</p>
          <Link href="/hospital/inventory" className="text-blue-500 hover:underline mt-4 inline-block">Manage Inventory</Link>
        </div>

        {/* Card for Profile */}
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Profile</h2>
          <p className="text-gray-600">View and edit your hospital&apos;s profile.</p>
          <Link href="/profile" className="text-blue-500 hover:underline mt-4 inline-block">View Profile</Link>
        </div>
      </div>
    </div>
  );
};

export default HospitalDashboardPage;
