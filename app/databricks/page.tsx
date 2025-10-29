'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: number;
  username: string;
  email: string;
}

interface DatabricksConnection {
  id: number;
  connection_name: string;
  databricks_host: string;
  warehouse_id?: string;
  is_active: number;
  created_at: string;
}

export default function DatabricksPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [connections, setConnections] = useState<DatabricksConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    connection_name: '',
    databricks_host: '',
    databricks_token: '',
    warehouse_id: ''
  });

  useEffect(() => {
    checkAuth();
    loadConnections();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/login');
        return;
      }
      const data = await response.json();
      setUser(data.user);
    } catch (err) {
      router.push('/login');
    }
  };

  const loadConnections = async () => {
    try {
      const response = await fetch('/api/databricks/connections');
      if (!response.ok) {
        throw new Error('Failed to load connections');
      }
      const data = await response.json();
      setConnections(data.connections);
    } catch (err) {
      setError('Failed to load Databricks connections');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const handleAddConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/databricks/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add connection');
      }

      setShowAddModal(false);
      setFormData({
        connection_name: '',
        databricks_host: '',
        databricks_token: '',
        warehouse_id: ''
      });
      loadConnections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleDeleteConnection = async (id: number) => {
    if (!confirm('Are you sure you want to delete this connection?')) {
      return;
    }

    try {
      const response = await fetch(`/api/databricks/connections/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete connection');
      }

      loadConnections();
    } catch (err) {
      setError('Failed to delete connection');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Databricks Connections</h1>
            {user && <p className="text-sm text-gray-600">Welcome, {user.username}</p>}
          </div>
          <div className="flex gap-4">
            <Link href="/dashboard" className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
              Credentials
            </Link>
            <Link href="/jobs" className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
              Jobs
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Your Databricks Connections</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            + Add Connection
          </button>
        </div>

        {/* Connections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {connections.map((conn) => (
            <div
              key={conn.id}
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{conn.connection_name}</h3>
                <span className={`px-2 py-1 text-xs rounded ${conn.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {conn.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <p><span className="font-medium">Host:</span> {conn.databricks_host}</p>
                {conn.warehouse_id && <p><span className="font-medium">Warehouse ID:</span> {conn.warehouse_id}</p>}
              </div>
              <button
                onClick={() => handleDeleteConnection(conn.id)}
                className="w-full px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        {connections.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No Databricks connections yet. Add your first connection to get started!</p>
          </div>
        )}
      </main>

      {/* Add Connection Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Add Databricks Connection</h2>
              <form onSubmit={handleAddConnection} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Connection Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.connection_name}
                    onChange={(e) => setFormData({ ...formData, connection_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g., Production Databricks"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Databricks Host *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.databricks_host}
                    onChange={(e) => setFormData({ ...formData, databricks_host: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g., dbc-12345678-abcd.cloud.databricks.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Personal Access Token *
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.databricks_token}
                    onChange={(e) => setFormData({ ...formData, databricks_token: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="dapi..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SQL Warehouse ID
                  </label>
                  <input
                    type="text"
                    value={formData.warehouse_id}
                    onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g., 1234567890abcdef"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
                  >
                    Add Connection
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
