'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  username: string;
  email: string;
}

interface Credential {
  id: number;
  credential_name: string;
  credential_type: string;
  username: string;
  host?: string;
  port?: number;
  database_name?: string;
  additional_info?: string;
  created_at: string;
}

interface CredentialWithPassword extends Credential {
  password?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<CredentialWithPassword | null>(null);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    credential_name: '',
    credential_type: 'oracle_mdm',
    username: '',
    password: '',
    host: '',
    port: '',
    database_name: '',
    additional_info: ''
  });

  useEffect(() => {
    checkAuth();
    loadCredentials();
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

  const loadCredentials = async () => {
    try {
      const response = await fetch('/api/credentials');
      if (!response.ok) {
        throw new Error('Failed to load credentials');
      }
      const data = await response.json();
      setCredentials(data.credentials);
    } catch (err) {
      setError('Failed to load credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const handleAddCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add credential');
      }

      setShowAddModal(false);
      setFormData({
        credential_name: '',
        credential_type: 'oracle_mdm',
        username: '',
        password: '',
        host: '',
        port: '',
        database_name: '',
        additional_info: ''
      });
      loadCredentials();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleViewCredential = async (id: number) => {
    try {
      const response = await fetch(`/api/credentials/${id}`);
      if (!response.ok) {
        throw new Error('Failed to load credential');
      }
      const data = await response.json();
      setSelectedCredential(data.credential);
      setShowViewModal(true);
    } catch (err) {
      setError('Failed to load credential details');
    }
  };

  const handleDeleteCredential = async (id: number) => {
    if (!confirm('Are you sure you want to delete this credential?')) {
      return;
    }

    try {
      const response = await fetch(`/api/credentials/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete credential');
      }

      loadCredentials();
      setShowViewModal(false);
    } catch (err) {
      setError('Failed to delete credential');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
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
            <h1 className="text-2xl font-bold text-gray-900">Credential Manager</h1>
            {user && <p className="text-sm text-gray-600">Welcome, {user.username}</p>}
          </div>
          <div className="flex gap-4">
            <a href="/databricks" className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
              Databricks
            </a>
            <a href="/jobs" className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
              Jobs
            </a>
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
          <h2 className="text-xl font-semibold text-gray-800">Your Credentials</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            + Add Credential
          </button>
        </div>

        {/* Credentials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {credentials.map((cred) => (
            <div
              key={cred.id}
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer"
              onClick={() => handleViewCredential(cred.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{cred.credential_name}</h3>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                  {cred.credential_type}
                </span>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <p><span className="font-medium">Username:</span> {cred.username}</p>
                {cred.host && <p><span className="font-medium">Host:</span> {cred.host}</p>}
                {cred.database_name && <p><span className="font-medium">Database:</span> {cred.database_name}</p>}
              </div>
            </div>
          ))}
        </div>

        {credentials.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No credentials yet. Add your first credential to get started!</p>
          </div>
        )}
      </main>

      {/* Add Credential Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Credential</h2>
              <form onSubmit={handleAddCredential} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Credential Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.credential_name}
                    onChange={(e) => setFormData({ ...formData, credential_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g., Production Oracle MDM"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Credential Type *
                  </label>
                  <select
                    value={formData.credential_type}
                    onChange={(e) => setFormData({ ...formData, credential_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="oracle_mdm">Oracle MDM</option>
                    <option value="database">Database</option>
                    <option value="api">API</option>
                    <option value="ssh">SSH</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Host
                    </label>
                    <input
                      type="text"
                      value={formData.host}
                      onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="e.g., db.example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Port
                    </label>
                    <input
                      type="text"
                      value={formData.port}
                      onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="e.g., 1521"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Database Name
                  </label>
                  <input
                    type="text"
                    value={formData.database_name}
                    onChange={(e) => setFormData({ ...formData, database_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Info
                  </label>
                  <textarea
                    value={formData.additional_info}
                    onChange={(e) => setFormData({ ...formData, additional_info: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    rows={3}
                    placeholder="Any additional notes..."
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
                  >
                    Add Credential
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

      {/* View Credential Modal */}
      {showViewModal && selectedCredential && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{selectedCredential.credential_name}</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <p className="text-gray-900">{selectedCredential.credential_type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <div className="flex items-center gap-2">
                      <p className="text-gray-900">{selectedCredential.username}</p>
                      <button
                        onClick={() => copyToClipboard(selectedCredential.username)}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-900 font-mono bg-gray-100 px-3 py-2 rounded flex-1">
                      {selectedCredential.password}
                    </p>
                    <button
                      onClick={() => copyToClipboard(selectedCredential.password || '')}
                      className="text-blue-600 hover:text-blue-700 text-sm whitespace-nowrap"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {selectedCredential.host && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
                    <p className="text-gray-900">{selectedCredential.host}</p>
                  </div>
                )}

                {selectedCredential.port && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                    <p className="text-gray-900">{selectedCredential.port}</p>
                  </div>
                )}

                {selectedCredential.database_name && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Database</label>
                    <p className="text-gray-900">{selectedCredential.database_name}</p>
                  </div>
                )}

                {selectedCredential.additional_info && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Additional Info</label>
                    <p className="text-gray-900">{selectedCredential.additional_info}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  onClick={() => handleDeleteCredential(selectedCredential.id)}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition"
                >
                  Delete
                </button>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
