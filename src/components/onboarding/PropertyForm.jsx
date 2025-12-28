"use client";

import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";

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
    numberOfUnits: initialData.numberOfUnits || '1',
    units: initialData.units || [{ size: '', beds: '', bathrooms: '', dens: '' }],
    image: initialData.image || null,
    imagePreview: initialData.imageUrl || null,
    ...initialData,
  });

  const imageInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle number of units change
    if (name === 'numberOfUnits') {
      const numUnits = parseInt(value) || 1;
      setFormData(prev => {
        const currentUnits = prev.units || [];
        const newUnits = Array.from({ length: numUnits }, (_, i) => 
          currentUnits[i] || { size: '', beds: '', bathrooms: '', dens: '' }
        );
        return {
          ...prev,
          numberOfUnits: value,
          units: newUnits,
        };
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleUnitChange = (index, field, value) => {
    setFormData(prev => {
      const newUnits = [...prev.units];
      newUnits[index] = {
        ...newUnits[index],
        [field]: value,
      };
      return {
        ...prev,
        units: newUnits,
      };
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Image size must be less than 10MB');
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          image: file,
          imagePreview: reader.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      image: null,
      imagePreview: null,
    }));
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Calculate total size from all units
    const totalSize = formData.units.reduce((sum, unit) => {
      return sum + (unit.size ? parseFloat(unit.size) : 0);
    }, 0);

    // Format unit configurations from beds, bathrooms, dens
    const unitConfigs = formData.units
      .map((unit, index) => {
        const parts = [];
        if (unit.beds) parts.push(`${unit.beds}BR`);
        if (unit.bathrooms) parts.push(`${unit.bathrooms}BA`);
        if (unit.dens) parts.push(`${unit.dens}Den`);
        
        if (parts.length > 0) {
          const config = parts.join('/');
          return formData.units.length > 1 ? `Unit ${index + 1}: ${config}` : config;
        }
        return null;
      })
      .filter(Boolean)
      .join('; ');

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
      size: totalSize > 0 ? totalSize : undefined,
      unitConfig: unitConfigs || undefined,
      numberOfUnits: formData.numberOfUnits ? parseInt(formData.numberOfUnits) : 1,
      units: formData.units,
      image: formData.image || undefined,
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
            <option value="Commercial">Commercial</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="numberOfUnits" className="block text-sm font-medium mb-1">
            Number of Units
          </label>
          <select
            id="numberOfUnits"
            name="numberOfUnits"
            value={formData.numberOfUnits}
            onChange={handleChange}
            className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Units Configuration Section */}
      {parseInt(formData.numberOfUnits) > 0 && (
        <div className="mt-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Unit Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formData.units.map((unit, index) => (
              <div key={index} className="p-4 border border-black/10 dark:border-white/10 rounded-lg space-y-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {formData.units.length > 1 ? `Unit ${index + 1}` : 'Unit'}
                </h4>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Size (sq ft)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={unit.size || ''}
                    onChange={(e) => handleUnitChange(index, 'size', e.target.value)}
                    className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Bedrooms
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={unit.beds || ''}
                    onChange={(e) => handleUnitChange(index, 'beds', e.target.value)}
                    className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Bathrooms
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={unit.bathrooms || ''}
                    onChange={(e) => handleUnitChange(index, 'bathrooms', e.target.value)}
                    className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Dens
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={unit.dens || ''}
                    onChange={(e) => handleUnitChange(index, 'dens', e.target.value)}
                    className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    placeholder="0"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Upload Section */}
      <div className="mt-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Property Image
        </h3>
        <div>
          {formData.imagePreview ? (
            <div className="relative border border-black/10 dark:border-white/10 rounded-lg overflow-hidden">
              <img
                src={formData.imagePreview}
                alt="Property preview"
                className="w-full h-64 object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 p-2 bg-black/70 hover:bg-black/90 text-white rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => imageInputRef.current?.click()}
              className="border-2 border-dashed border-black/15 dark:border-white/15 rounded-lg p-8 text-center cursor-pointer hover:border-black/30 dark:hover:border-white/30 transition-colors"
            >
              <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                Click to upload property image
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                PNG, JPG, or WEBP (max 10MB)
              </p>
            </div>
          )}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
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

