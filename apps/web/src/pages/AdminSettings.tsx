import React from 'react';
import Layout from '../components/Layout';

export default function AdminSettings(){
  return (
    <Layout>
      <h2 className="text-xl font-semibold mb-2">Admin Settings</h2>
      <ul className="list-disc pl-6 space-y-1 text-sm">
        <li>Manage Users & Roles (coming)</li>
        <li>System Metrics: storage, usage graphs (coming)</li>
        <li>Mail & Notifications (coming)</li>
        <li>Theme customization (coming)</li>
      </ul>
    </Layout>
  );
}