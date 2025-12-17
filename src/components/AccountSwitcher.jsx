"use client";

import { useState, useRef, useEffect } from "react";
import { useAccount } from "@/context/AccountContext";
import { useToast } from "@/context/ToastContext";
import { User, ChevronDown, Plus, Trash2, Edit2, Check, X } from "lucide-react";
import Button from "@/components/Button";

export default function AccountSwitcher() {
  const {
    accounts,
    currentAccount,
    switchAccount,
    createNewAccount,
    deleteAccount,
    updateAccountName
  } = useAccount();
  const { addToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [newAccountName, setNewAccountName] = useState("");
  const [editAccountName, setEditAccountName] = useState("");
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsCreating(false);
        setIsEditing(null);
      }
    };

    if (isOpen || isCreating || isEditing) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, isCreating, isEditing]);

  const handleSwitchAccount = (accountId) => {
    if (accountId === currentAccount?.id) {
      setIsOpen(false);
      return;
    }

    try {
      switchAccount(accountId);
      addToast("Account switched successfully", { type: "success" });
      setIsOpen(false);
    } catch (error) {
      addToast("Failed to switch account", { type: "error" });
    }
  };

  const handleCreateAccount = () => {
    if (!newAccountName.trim()) {
      addToast("Please enter an account name", { type: "error" });
      return;
    }

    try {
      createNewAccount(newAccountName.trim());
      addToast("Account created successfully", { type: "success" });
      setNewAccountName("");
      setIsCreating(false);
    } catch (error) {
      addToast("Failed to create account", { type: "error" });
    }
  };

  const handleDeleteAccount = (accountId, accountName) => {
    if (!confirm(`Are you sure you want to delete "${accountName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      deleteAccount(accountId);
      addToast("Account deleted successfully", { type: "success" });
    } catch (error) {
      addToast(error.message || "Failed to delete account", { type: "error" });
    }
  };

  const handleStartEdit = (accountId, currentName) => {
    setIsEditing(accountId);
    setEditAccountName(currentName);
  };

  const handleSaveEdit = (accountId) => {
    if (!editAccountName.trim()) {
      addToast("Account name cannot be empty", { type: "error" });
      return;
    }

    try {
      updateAccountName(accountId, editAccountName.trim());
      addToast("Account name updated", { type: "success" });
      setIsEditing(null);
      setEditAccountName("");
    } catch (error) {
      addToast("Failed to update account name", { type: "error" });
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(null);
    setEditAccountName("");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
        aria-label="Switch account"
      >
        <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 max-w-[150px] truncate">
          {currentAccount?.name || "Select Account"}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-600 dark:text-gray-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg shadow-lg z-50">
          <div className="p-2">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Accounts
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className={`px-3 py-2 rounded-md mb-1 ${
                    account.id === currentAccount?.id
                      ? "bg-[#205A3E] text-white"
                      : "hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-900 dark:text-gray-100"
                  }`}
                >
                  {isEditing === account.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editAccountName}
                        onChange={(e) => setEditAccountName(e.target.value)}
                        className="flex-1 px-2 py-1 text-sm rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(account.id);
                          if (e.key === "Escape") handleCancelEdit();
                        }}
                      />
                      <button
                        onClick={() => handleSaveEdit(account.id)}
                        className="p-1 hover:bg-green-600 rounded"
                        aria-label="Save"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-1 hover:bg-red-600 rounded"
                        aria-label="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handleSwitchAccount(account.id)}
                        className="flex-1 text-left"
                      >
                        <div className="font-medium">{account.name}</div>
                        {account.isDemo && (
                          <div className="text-xs opacity-75">Demo Account</div>
                        )}
                      </button>
                      <div className="flex items-center gap-1">
                        {!account.isDemo && (
                          <>
                            <button
                              onClick={() => handleStartEdit(account.id, account.name)}
                              className="p-1 hover:bg-gray-200 dark:hover:bg-neutral-600 rounded"
                              aria-label="Edit account name"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteAccount(account.id, account.name)}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                              aria-label="Delete account"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {isCreating ? (
              <div className="px-3 py-2 border-t border-gray-200 dark:border-neutral-700 mt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    placeholder="Account name"
                    className="flex-1 px-2 py-1 text-sm rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateAccount();
                      if (e.key === "Escape") {
                        setIsCreating(false);
                        setNewAccountName("");
                      }
                    }}
                  />
                  <button
                    onClick={handleCreateAccount}
                    className="p-1 hover:bg-green-100 dark:hover:bg-green-900 rounded"
                    aria-label="Create"
                  >
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </button>
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setNewAccountName("");
                    }}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                    aria-label="Cancel"
                  >
                    <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full px-3 py-2 mt-2 text-sm font-medium text-[#205A3E] dark:text-[#4ade80] hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-md flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create New Account
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


