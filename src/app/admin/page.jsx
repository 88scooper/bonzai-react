"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { RequireAuth, useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/api-client";
import { useToast } from "@/context/ToastContext";

export default function AdminDashboard() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [usersData, setUsersData] = useState(null);
  const [error, setError] = useState(null);
  const [usersError, setUsersError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingDemo, setTogglingDemo] = useState(null);

  const usersPerPage = 10;

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/");
        return;
      }
      if (!isAdmin) {
        router.push("/");
        return;
      }
    }
  }, [user, isAdmin, authLoading, router]);

  // Fetch dashboard stats
  useEffect(() => {
    if (!user || !isAdmin) return;

    const fetchDashboard = async () => {
      try {
        setDashboardLoading(true);
        setError(null);
        const response = await apiClient.getAdminDashboard();
        if (response.success) {
          setDashboardData(response.data);
        } else {
          setError(response.error || "Failed to load dashboard data");
        }
      } catch (err) {
        console.error("Error fetching dashboard:", err);
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setDashboardLoading(false);
      }
    };

    fetchDashboard();
  }, [user, isAdmin]);

  // Fetch users with pagination and search
  useEffect(() => {
    if (!user || !isAdmin) return;

    const fetchUsers = async () => {
      try {
        setUsersLoading(true);
        setUsersError(null);
        const response = await apiClient.getAdminUsers(currentPage, usersPerPage, searchQuery);
        if (response.success) {
          setUsersData(response.data);
        } else {
          setUsersError(response.error || "Failed to load users");
        }
      } catch (err) {
        console.error("Error fetching users:", err);
        setUsersError(err.message || "Failed to load users");
      } finally {
        setUsersLoading(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(() => {
      fetchUsers();
    }, searchQuery ? 300 : 0);

    return () => clearTimeout(timeoutId);
  }, [user, isAdmin, currentPage, searchQuery]);

  const handleDeleteUser = async (userId, userEmail) => {
    if (deleting) return;
    
    try {
      setDeleting(true);
      const response = await apiClient.deleteAdminUser(userId);
      if (response.success) {
        addToast(`User ${userEmail} deleted successfully`, { type: "success" });
        setDeleteConfirm(null);
        // Refresh users list
        const refreshResponse = await apiClient.getAdminUsers(currentPage, usersPerPage, searchQuery);
        if (refreshResponse.success) {
          setUsersData(refreshResponse.data);
        }
      } else {
        addToast(response.error || "Failed to delete user", { type: "error" });
      }
    } catch (err) {
      console.error("Error deleting user:", err);
      addToast(err.message || "Failed to delete user", { type: "error" });
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleDemoStatus = async (userId, userEmail, currentDemoStatus) => {
    if (togglingDemo === userId) return;
    
    try {
      setTogglingDemo(userId);
      const response = await apiClient.toggleUserDemoStatus(userId);
      if (response.success) {
        const newStatus = response.data?.demo_status;
        addToast(
          `Demo account status ${newStatus ? 'enabled' : 'disabled'} for ${userEmail}`, 
          { type: "success" }
        );
        // Refresh users list
        const refreshResponse = await apiClient.getAdminUsers(currentPage, usersPerPage, searchQuery);
        if (refreshResponse.success) {
          setUsersData(refreshResponse.data);
        }
      } else {
        addToast(response.error || "Failed to toggle demo status", { type: "error" });
      }
    } catch (err) {
      console.error("Error toggling demo status:", err);
      addToast(err.message || "Failed to toggle demo status", { type: "error" });
    } finally {
      setTogglingDemo(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Show loading state while checking auth
  if (authLoading || dashboardLoading) {
    return (
      <RequireAuth>
        <Layout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#205A3E] mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading admin dashboard...</p>
            </div>
          </div>
        </Layout>
      </RequireAuth>
    );
  }

  // Redirect if not admin (handled by useEffect, but show message briefly)
  if (!user || !isAdmin) {
    return null;
  }

  return (
    <RequireAuth>
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
              Admin Dashboard
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Manage users and monitor platform statistics
            </p>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Statistics Cards */}
          {dashboardData && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                        {dashboardData.totalUsers}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        +{dashboardData.newUsers7d} in last 7 days
                      </p>
                    </div>
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Accounts</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                        {dashboardData.totalAccounts}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        +{dashboardData.newAccounts30d} in last 30 days
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Properties</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                        {dashboardData.totalProperties}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        +{dashboardData.newProperties30d} in last 30 days
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Mortgages</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                        {dashboardData.totalMortgages}
                      </p>
                    </div>
                    <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                      <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <circle cx="12" cy="12" r="8.8"/>
                        <text x="12" y="17.5" fontSize="13.2" textAnchor="middle" fill="currentColor" fontFamily="Arial, sans-serif" fontWeight="900">$</text>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Users Table */}
              <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Recent Users (Last 30 Days)
                </h2>
                {dashboardData.recentUsers && dashboardData.recentUsers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-800">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Email</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Name</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Created</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.recentUsers.map((user) => (
                          <tr key={user.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-200">{user.email}</td>
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{user.name || "—"}</td>
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{formatDate(user.created_at)}</td>
                            <td className="py-3 px-4">
                              {user.is_admin ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200">
                                  Admin
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                                  User
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">No recent users</p>
                )}
              </div>
            </>
          )}

          {/* User Management Section */}
          <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              User Management
            </h2>

            {/* Search Input */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset to first page on search
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#205A3E] focus:border-transparent"
              />
            </div>

            {/* Users Table */}
            {usersError ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-200">{usersError}</p>
              </div>
            ) : usersLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#205A3E]"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-400">Loading users...</span>
              </div>
            ) : usersData && usersData.data ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Email</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Name</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Accounts</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Properties</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">User Hours</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Created</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Read-Only (Demo)</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersData.data.map((userItem) => (
                        <tr key={userItem.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-200">{userItem.email}</td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{userItem.name || "—"}</td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{userItem.account_count}</td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{userItem.property_count}</td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                            {userItem.total_hours ? userItem.total_hours.toFixed(2) : '0.00'} hrs
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{formatDate(userItem.created_at)}</td>
                          <td className="py-3 px-4">
                            {userItem.has_demo_account !== undefined && (
                              <button
                                onClick={() => handleToggleDemoStatus(userItem.id, userItem.email, userItem.has_demo_account)}
                                disabled={togglingDemo === userItem.id}
                                className={`
                                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                                  ${userItem.has_demo_account 
                                    ? 'bg-green-600 dark:bg-green-500' 
                                    : 'bg-gray-300 dark:bg-gray-600'
                                  }
                                  ${togglingDemo === userItem.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                `}
                                title={userItem.has_demo_account ? 'Disable read-only (demo) status' : 'Enable read-only (demo) status'}
                              >
                                <span
                                  className={`
                                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                                    ${userItem.has_demo_account ? 'translate-x-6' : 'translate-x-1'}
                                  `}
                                />
                              </button>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => setDeleteConfirm(userItem)}
                              disabled={userItem.id === user?.id || deleting}
                              className="px-3 py-1 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {usersData.pagination && usersData.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Showing {((currentPage - 1) * usersPerPage) + 1} to {Math.min(currentPage * usersPerPage, usersData.pagination.total)} of {usersData.pagination.total} users
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={!usersData.pagination.hasPrev || usersLoading}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(usersData.pagination.totalPages, p + 1))}
                        disabled={!usersData.pagination.hasNext || usersLoading}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No users found</p>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Confirm Deletion
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Are you sure you want to delete user <strong>{deleteConfirm.email}</strong>? This action cannot be undone and will delete all associated accounts and properties.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteUser(deleteConfirm.id, deleteConfirm.email)}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </Layout>
    </RequireAuth>
  );
}

