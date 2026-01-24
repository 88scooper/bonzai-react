"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, User, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/api-client";
import Button from "@/components/Button";

export default function MyAccountModal({ isOpen, onClose }) {
  const { addToast } = useToast();
  const { user: authUser, logOut } = useAuth();
  
  // Profile state
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  
  // Edit profile state
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", email: "" });
  const [profileError, setProfileError] = useState("");
  
  // Change password state
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  
  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadProfile = async () => {
    try {
      setLoadingProfile(true);
      const response = await apiClient.getUserProfile();
      if (response.success && response.data) {
        setProfile(response.data);
        setProfileForm({
          name: response.data.name || "",
          email: response.data.email || "",
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      // Use authUser as fallback if API call fails
      if (authUser) {
        setProfile({
          id: authUser.id || '',
          email: authUser.email || '',
          name: authUser.name || null,
          created_at: authUser.createdAt || new Date().toISOString(),
        });
        setProfileForm({
          name: authUser.name || "",
          email: authUser.email || "",
        });
      }
      // Only show error toast if it's not a network error (user might be offline)
      if (error instanceof Error && !error.message.includes('Failed to fetch')) {
        addToast("Failed to load profile", { type: "error" });
      }
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileError("");
    setLoading(true);

    try {
      const updateData = {};
      if (profileForm.name !== profile.name) {
        updateData.name = profileForm.name || null;
      }
      if (profileForm.email !== profile.email) {
        updateData.email = profileForm.email;
      }

      if (Object.keys(updateData).length === 0) {
        setEditingProfile(false);
        setLoading(false);
        return;
      }

      const response = await apiClient.updateUserProfile(updateData);
      if (response.success && response.data) {
        setProfile(response.data);
        setEditingProfile(false);
        addToast("Profile updated successfully", { type: "success" });
        setProfile(response.data);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      let errorMessage = "Failed to update profile";
      if (error.message) {
        if (error.message.includes("Email already in use")) {
          errorMessage = "Email is already in use";
        } else {
          errorMessage = error.message;
        }
      }
      setProfileError(errorMessage);
      addToast(errorMessage, { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");

    // Validate passwords match
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    // Validate password length
    if (passwordForm.newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );
      if (response.success) {
        addToast("Password changed successfully", { type: "success" });
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setChangingPassword(false);
      }
    } catch (error) {
      console.error("Error changing password:", error);
      let errorMessage = "Failed to change password";
      if (error.message) {
        if (error.message.includes("Current password is incorrect")) {
          errorMessage = "Current password is incorrect";
        } else {
          errorMessage = error.message;
        }
      }
      setPasswordError(errorMessage);
      addToast(errorMessage, { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const response = await apiClient.deleteUserAccount();
      if (response.success) {
        addToast("Account deleted successfully", { type: "success" });
        // Log out and redirect
        await logOut();
        onClose();
        setTimeout(() => {
          window.location.href = "/";
        }, 100);
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      addToast("Failed to delete account", { type: "error" });
      setDeleting(false);
    }
  };

  // Load user profile when modal opens
  useEffect(() => {
    if (isOpen) {
      loadProfile();
    } else {
      // Reset state when modal closes
      setEditingProfile(false);
      setChangingPassword(false);
      setShowDeleteConfirm(false);
      setProfileError("");
      setPasswordError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, authUser]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen && !loading && !deleting) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, loading, deleting, onClose]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  if (!isOpen) return null;

  // Render using portal to document body
  if (typeof window === 'undefined' || !document.body) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-neutral-950 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col border border-black/10 dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-black/10 dark:border-white/10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <User className="w-5 h-5" />
            My Account
          </h2>
          <button
            onClick={onClose}
            disabled={loading || deleting}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {loadingProfile ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Loading profile...
              </div>
            </div>
          ) : (
            <>
              {/* Profile Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Profile Information
                </h3>
                
                {!editingProfile ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Name
                      </label>
                      <div className="mt-1 text-sm text-gray-900 dark:text-white">
                        {profile?.name || "Not set"}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Email
                      </label>
                      <div className="mt-1 text-sm text-gray-900 dark:text-white">
                        {profile?.email || "N/A"}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Account Created
                      </label>
                      <div className="mt-1 text-sm text-gray-900 dark:text-white">
                        {formatDate(profile?.created_at)}
                      </div>
                    </div>
                    <Button
                      onClick={() => setEditingProfile(true)}
                      variant="secondary"
                      className="mt-4"
                    >
                      Edit Profile
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    {profileError && (
                      <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                        <p className="text-sm text-red-800 dark:text-red-200">
                          {profileError}
                        </p>
                      </div>
                    )}
                    <div className="grid gap-2">
                      <label htmlFor="profile-name" className="text-sm font-medium">
                        Name
                      </label>
                      <input
                        id="profile-name"
                        type="text"
                        value={profileForm.name}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, name: e.target.value })
                        }
                        className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                        placeholder="Your name"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="profile-email" className="text-sm font-medium">
                        Email
                      </label>
                      <input
                        id="profile-email"
                        type="email"
                        value={profileForm.email}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, email: e.target.value })
                        }
                        required
                        className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        type="submit"
                        loading={loading}
                        disabled={loading}
                        className="flex-1"
                      >
                        Save Changes
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setEditingProfile(false);
                          setProfileForm({
                            name: profile?.name || "",
                            email: profile?.email || "",
                          });
                          setProfileError("");
                        }}
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </div>

              {/* Change Password Section */}
              <div className="space-y-4 border-t border-black/10 dark:border-white/10 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Change Password
                </h3>
                
                {!changingPassword ? (
                  <Button
                    onClick={() => setChangingPassword(true)}
                    variant="secondary"
                  >
                    Change Password
                  </Button>
                ) : (
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    {passwordError && (
                      <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                        <p className="text-sm text-red-800 dark:text-red-200">
                          {passwordError}
                        </p>
                      </div>
                    )}
                    <div className="grid gap-2">
                      <label htmlFor="current-password" className="text-sm font-medium">
                        Current Password
                      </label>
                      <input
                        id="current-password"
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            currentPassword: e.target.value,
                          })
                        }
                        required
                        className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="new-password" className="text-sm font-medium">
                        New Password
                      </label>
                      <input
                        id="new-password"
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            newPassword: e.target.value,
                          })
                        }
                        required
                        minLength={8}
                        className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="confirm-password" className="text-sm font-medium">
                        Confirm New Password
                      </label>
                      <input
                        id="confirm-password"
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            confirmPassword: e.target.value,
                          })
                        }
                        required
                        minLength={8}
                        className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        type="submit"
                        loading={loading}
                        disabled={loading}
                        className="flex-1"
                      >
                        Change Password
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setChangingPassword(false);
                          setPasswordForm({
                            currentPassword: "",
                            newPassword: "",
                            confirmPassword: "",
                          });
                          setPasswordError("");
                        }}
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </div>

              {/* Danger Zone Section */}
              <div className="space-y-4 border-t border-red-200 dark:border-red-800 pt-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
                    Danger Zone
                  </h3>
                </div>
                
                {!showDeleteConfirm ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Once you delete your account, there is no going back. Please be certain.
                    </p>
                    <Button
                      onClick={() => setShowDeleteConfirm(true)}
                      variant="secondary"
                      className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Account
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm font-medium text-red-900 dark:text-red-100">
                      Are you absolutely sure? This action cannot be undone. This will
                      permanently delete your account and all associated data.
                    </p>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleDeleteAccount}
                        loading={deleting}
                        disabled={deleting}
                        className="bg-red-600 hover:bg-red-700 text-white border-0"
                      >
                        Yes, delete my account
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={deleting}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

