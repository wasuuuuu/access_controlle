'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: number;
  username: string;
  email: string;
}

interface ScheduledJob {
  id: number;
  job_name: string;
  job_type: string;
  source_table: string;
  target_table: string;
  schedule_cron: string;
  is_active: boolean;
  last_run?: string;
  last_status?: string;
  last_error?: string;
}

interface DatabricksConnection {
  id: number;
  connection_name: string;
}

interface Credential {
  id: number;
  credential_name: string;
}

export default function JobsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [connections, setConnections] = useState<DatabricksConnection[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    job_name: '',
    job_type: 'insert_data',
    databricks_connection_id: '',
    oracle_credential_id: '',
    source_table: '',
    target_table: '',
    schedule_cron: '0 2 * * *'
  });

  useEffect(() => {
    checkAuth();
    loadJobs();
    loadConnections();
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

  const loadJobs = async () => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];

      const response = await fetch('http://localhost:8000/api/jobs/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setJobs(data);
      }
    } catch (err) {
      console.error('Failed to load jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadConnections = async () => {
    try {
      const response = await fetch('/api/databricks/connections');
      if (response.ok) {
        const data = await response.json();
        setConnections(data.connections);
      }
    } catch (err) {
      console.error('Failed to load connections:', err);
    }
  };

  const loadCredentials = async () => {
    try {
      const response = await fetch('/api/credentials');
      if (response.ok) {
        const data = await response.json();
        setCredentials(data.credentials.filter((c: any) => c.credential_type === 'oracle_mdm'));
      }
    } catch (err) {
      console.error('Failed to load credentials:', err);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];

      const response = await fetch('http://localhost:8000/api/jobs/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          databricks_connection_id: parseInt(formData.databricks_connection_id),
          oracle_credential_id: parseInt(formData.oracle_credential_id)
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to create job');
      }

      setShowAddModal(false);
      setFormData({
        job_name: '',
        job_type: 'insert_data',
        databricks_connection_id: '',
        oracle_credential_id: '',
        source_table: '',
        target_table: '',
        schedule_cron: '0 2 * * *'
      });
      loadJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleRunJob = async (jobId: number) => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];

      const response = await fetch(`http://localhost:8000/api/jobs/${jobId}/run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert('Job execution started');
        loadJobs();
      } else {
        throw new Error('Failed to run job');
      }
    } catch (err) {
      alert('Failed to run job');
    }
  };

  const handleDeleteJob = async (jobId: number) => {
    if (!confirm('Are you sure you want to delete this job?')) {
      return;
    }

    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];

      const response = await fetch(`http://localhost:8000/api/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        loadJobs();
      } else {
        throw new Error('Failed to delete job');
      }
    } catch (err) {
      alert('Failed to delete job');
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
            <h1 className="text-2xl font-bold text-gray-900">Scheduled Jobs</h1>
            {user && <p className="text-sm text-gray-600">Welcome, {user.username}</p>}
          </div>
          <div className="flex gap-4">
            <Link href="/dashboard" className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
              Credentials
            </Link>
            <Link href="/databricks" className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
              Databricks
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
          <h2 className="text-xl font-semibold text-gray-800">Your Scheduled Jobs</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            + Schedule Job
          </button>
        </div>

        {/* Jobs List */}
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{job.job_name}</h3>
                  <p className="text-sm text-gray-600 mt-1">Schedule: {job.schedule_cron}</p>
                </div>
                <span className={`px-3 py-1 text-xs rounded ${job.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {job.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                <div>
                  <span className="font-medium">Type:</span> {job.job_type}
                </div>
                <div>
                  <span className="font-medium">Source:</span> {job.source_table}
                </div>
                <div>
                  <span className="font-medium">Target:</span> {job.target_table}
                </div>
                <div>
                  <span className="font-medium">Last Run:</span> {job.last_run ? new Date(job.last_run).toLocaleString() : 'Never'}
                </div>
              </div>

              {job.last_status && (
                <div className={`mb-4 px-3 py-2 rounded text-sm ${job.last_status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  Last Status: {job.last_status}
                  {job.last_error && <div className="mt-1 text-xs">{job.last_error}</div>}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleRunJob(job.id)}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                >
                  Run Now
                </button>
                <button
                  onClick={() => handleDeleteJob(job.id)}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {jobs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No scheduled jobs yet. Create your first job to automate data transfers!</p>
          </div>
        )}
      </main>

      {/* Add Job Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Schedule New Job</h2>
              <form onSubmit={handleAddJob} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.job_name}
                    onChange={(e) => setFormData({ ...formData, job_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g., Daily Customer Sync"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Type *
                  </label>
                  <select
                    value={formData.job_type}
                    onChange={(e) => setFormData({ ...formData, job_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="insert_data">Insert Data</option>
                    <option value="create_table">Create Table & Insert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Databricks Connection *
                  </label>
                  <select
                    value={formData.databricks_connection_id}
                    onChange={(e) => setFormData({ ...formData, databricks_connection_id: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Select a connection</option>
                    {connections.map((conn) => (
                      <option key={conn.id} value={conn.id}>{conn.connection_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Oracle MDM Credential *
                  </label>
                  <select
                    value={formData.oracle_credential_id}
                    onChange={(e) => setFormData({ ...formData, oracle_credential_id: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Select a credential</option>
                    {credentials.map((cred) => (
                      <option key={cred.id} value={cred.id}>{cred.credential_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Source Table (Databricks) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.source_table}
                    onChange={(e) => setFormData({ ...formData, source_table: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g., default.customers"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Table (Oracle MDM) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.target_table}
                    onChange={(e) => setFormData({ ...formData, target_table: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g., CUSTOMERS"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schedule (Cron Expression) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.schedule_cron}
                    onChange={(e) => setFormData({ ...formData, schedule_cron: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0 2 * * *"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Format: minute hour day month day_of_week (e.g., "0 2 * * *" = Daily at 2 AM)
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
                  >
                    Schedule Job
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
