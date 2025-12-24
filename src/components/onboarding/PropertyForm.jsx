"use client";

import { useState } from "react";

export default function PropertyForm({ onSubmit, onCancel, accountId, initialData = {} }) {
  const [formData, setFormData] = useState({
    nickname: initialData.nickname || '',
    address: initialData.address || '',
    purchasePrice: initialData.purchasePrice || '',
    purchaseDate: initialData.purchaseDate || '',
    closingCosts: initialData.closingCosts || '0',
    renovationCosts: initialData.renovationCosts || '0',
    currentMarketValue: initialData.currentMarketValue || '',
    yearBuilt: initialData.yearBuilt || '',
    propertyType: initialData.propertyType || '',
    size: initialData.size || '',
    unitConfig: initialData.unitConfig || '',
    ...initialData,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const propertyData = {
      accountId,
      nickname: formData.nickname || null,
      address: formData.address || null,
      purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined,
      purchaseDate: formData.purchaseDate || undefined,
      closingCosts: formData.closingCosts ? parseFloat(formData.closingCosts) : 0,
      renovationCosts: formData.renovationCosts ? parseFloat(formData.renovationCosts) : 0,
      currentMarketValue: formData.currentMarketValue ? parseFloat(formData.currentMarketValue) : undefined,
      yearBuilt: formData.yearBuilt ? parseInt(formData.yearBuilt) : undefined,
      propertyType: formData.propertyType || undefined,
      size: formData.size ? parseFloat(formData.size) : undefined,
      unitConfig: formData.unitConfig || undefined,
    };

    // Remove undefined values
    Object.keys(propertyData).forEach(key => {
      if (propertyData[key] === undefined) {
        delete propertyData[key];
      }
    });

    onSubmit(propertyData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label htmlFor="nickname" className="block text-sm font-medium mb-1">
            Property Name / Nickname
          </label>
          <input
            id="nickname"
            name="nickname"
            type="text"
            value={formData.nickname}
            onChange={handleChange}
            className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
            placeholder="e.g., Main Street Property"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="address" className="block text-sm font-medium mb-1">
            Address
          </label>
          <input
            id="address"
            name="address"
            type="text"
            value={formData.address}
            onChange={handleChange}
            className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
            placeholder="123 Main St, City, State ZIP"
          />
        </div>

        <div>
          <label htmlFor="purchasePrice" className="block text-sm font-medium mb-1">
            Purchase Price
          </label>
          <input
            id="purchasePrice"
            name="purchasePrice"
            type="number"
            step="0.01"
            min="0"
            value={formData.purchasePrice}
            onChange={handleChange}
            className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
            placeholder="0.00"
          />
        </div>

        <div>
          <label htmlFor="purchaseDate" className="block text-sm font-medium mb-1">
            Purchase Date
          </label>
          <input
            id="purchaseDate"
            name="purchaseDate"
            type="date"
            value={formData.purchaseDate}
            onChange={handleChange}
            className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
          />
        </div>

        <div>
          <label htmlFor="closingCosts" className="block text-sm font-medium mb-1">
            Closing Costs
          </label>
          <input
            id="closingCosts"
            name="closingCosts"
            type="number"
            step="0.01"
            min="0"
            value={formData.closingCosts}
            onChange={handleChange}
            className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
            placeholder="0.00"
          />
        </div>

        <div>
          <label htmlFor="renovationCosts" className="block text-sm font-medium mb-1">
            Renovation Costs
          </label>
          <input
            id="renovationCosts"
            name="renovationCosts"
            type="number"
            step="0.01"
            min="0"
            value={formData.renovationCosts}
            onChange={handleChange}
            className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
            placeholder="0.00"
          />
        </div>

        <div>
          <label htmlFor="currentMarketValue" className="block text-sm font-medium mb-1">
            Current Market Value
          </label>
          <input
            id="currentMarketValue"
            name="currentMarketValue"
            type="number"
            step="0.01"
            min="0"
            value={formData.currentMarketValue}
            onChange={handleChange}
            className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
            placeholder="0.00"
          />
        </div>

        <div>
          <label htmlFor="yearBuilt" className="block text-sm font-medium mb-1">
            Year Built
          </label>
          <input
            id="yearBuilt"
            name="yearBuilt"
            type="number"
            min="1800"
            max="2100"
            value={formData.yearBuilt}
            onChange={handleChange}
            className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
            placeholder="2020"
          />
        </div>

        <div>
          <label htmlFor="propertyType" className="block text-sm font-medium mb-1">
            Property Type
          </label>
          <select
            id="propertyType"
            name="propertyType"
            value={formData.propertyType}
            onChange={handleChange}
            className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
          >
            <option value="">Select type</option>
            <option value="Condo">Condo</option>
            <option value="House">House</option>
            <option value="Townhouse">Townhouse</option>
            <option value="Apartment">Apartment</option>
            <option value="Commercial">Commercial</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="size" className="block text-sm font-medium mb-1">
            Size (sq ft)
          </label>
          <input
            id="size"
            name="size"
            type="number"
            step="0.01"
            min="0"
            value={formData.size}
            onChange={handleChange}
            className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
            placeholder="0"
          />
        </div>

        <div>
          <label htmlFor="unitConfig" className="block text-sm font-medium mb-1">
            Unit Configuration
          </label>
          <input
            id="unitConfig"
            name="unitConfig"
            type="text"
            value={formData.unitConfig}
            onChange={handleChange}
            className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
            placeholder="e.g., 2BR/2BA"
          />
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-md border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 rounded-md bg-black dark:bg-white text-white dark:text-black hover:opacity-90 transition"
        >
          {initialData.id ? 'Update Property' : 'Add Property'}
        </button>
      </div>
    </form>
  );
}

