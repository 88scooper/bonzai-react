"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, X, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";

export default function PropertyForm({ onSubmit, onCancel, onContinue, accountId, initialData = {} }) {
  // Normalize API data (snake_case) to form data (camelCase)
  const normalizedData = {
    nickname: initialData.nickname || '',
    address: initialData.address || '',
    purchasePrice: initialData.purchasePrice || initialData.purchase_price || '',
    purchaseDate: initialData.purchaseDate || initialData.purchase_date || '',
    closingCosts: initialData.closingCosts ?? initialData.closing_costs ?? '0',
    renovationCosts: initialData.renovationCosts ?? initialData.renovation_costs ?? '0',
    currentMarketValue: initialData.currentMarketValue || initialData.current_market_value || '',
    yearBuilt: initialData.yearBuilt || initialData.year_built || '',
    propertyType: initialData.propertyType || initialData.property_type || '',
    numberOfUnits: initialData.numberOfUnits || initialData.number_of_units || '1',
    principalResidence: initialData.principalResidence ?? initialData.principal_residence ?? false,
    ownership: initialData.ownership || initialData.ownership_type || '',
    units: initialData.units || (initialData.propertyData?.units) || [{ size: '', beds: '', bathrooms: '', dens: '' }],
    image: initialData.image || null,
    imagePreview: initialData.imageUrl || initialData.image_url || null,
  };

  const [formData, setFormData] = useState(normalizedData);

  const imageInputRef = useRef(null);

  // Update form data when initialData changes (for editing)
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      const normalized = {
        nickname: initialData.nickname || '',
        address: initialData.address || '',
        purchasePrice: initialData.purchasePrice || initialData.purchase_price || '',
        purchaseDate: initialData.purchaseDate || initialData.purchase_date || '',
        closingCosts: initialData.closingCosts ?? initialData.closing_costs ?? '0',
        renovationCosts: initialData.renovationCosts ?? initialData.renovation_costs ?? '0',
        currentMarketValue: initialData.currentMarketValue || initialData.current_market_value || '',
        yearBuilt: initialData.yearBuilt || initialData.year_built || '',
        propertyType: initialData.propertyType || initialData.property_type || '',
        numberOfUnits: initialData.numberOfUnits || initialData.number_of_units || '1',
        principalResidence: initialData.principalResidence ?? initialData.principal_residence ?? false,
        ownership: initialData.ownership || initialData.ownership_type || '',
        units: initialData.units || (initialData.propertyData?.units) || [{ size: '', beds: '', bathrooms: '', dens: '' }],
        image: initialData.image || null,
        imagePreview: initialData.imageUrl || initialData.image_url || null,
      };
      setFormData(normalized);
    }
  }, [initialData]);

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

  // Helper function to check if a field is filled (has meaningful user input)
  const isFieldFilled = (fieldName, value) => {
    // Handle null/undefined first
    if (value === null || value === undefined) {
      return false;
    }

    // For text fields (nickname, address), check first before converting
    if (fieldName === 'nickname' || fieldName === 'address') {
      // Convert to string and trim
      const stringValue = String(value).trim();
      // Any non-empty trimmed value is filled
      return stringValue !== '';
    }

    // Convert to string and trim for other fields
    const stringValue = String(value).trim();

    // Empty string values are not filled
    if (stringValue === '') {
      return false;
    }

    // For purchase price and market value, 0 is not meaningful
    if (fieldName === 'purchasePrice' || fieldName === 'currentMarketValue') {
      const numValue = parseFloat(stringValue);
      return !isNaN(numValue) && numValue > 0;
    }

    // Closing costs and renovation costs can be 0, which is valid
    // But for color logic, treat "0" as not filled (user hasn't entered anything meaningful)
    if (fieldName === 'closingCosts' || fieldName === 'renovationCosts') {
      const numValue = parseFloat(stringValue);
      return !isNaN(numValue) && numValue !== 0;
    }

    // For purchase date, check if it's a valid date string
    if (fieldName === 'purchaseDate') {
      return stringValue !== '' && stringValue !== 'yyyy-mm-dd';
    }

    if (fieldName === 'yearBuilt') {
      // Year built should be a valid year
      const year = parseInt(stringValue);
      return !isNaN(year) && year >= 1800 && year <= 2100;
    }

    if (fieldName === 'propertyType') {
      // Property type is filled if it's not empty and not the default "Select type"
      return stringValue !== '' && stringValue !== 'Select type';
    }

    if (fieldName === 'numberOfUnits') {
      // numberOfUnits defaults to '1', which is valid - consider it filled
      return stringValue !== '';
    }

    if (fieldName === 'ownership') {
      // Ownership is filled if it's not empty and not the default "Select ownership"
      return stringValue !== '' && stringValue !== 'Select ownership';
    }

    // For unit fields (size, beds, bathrooms, dens), 0 is not meaningful
    if (fieldName === 'size' || fieldName === 'beds' || fieldName === 'bathrooms' || fieldName === 'dens') {
      const numValue = parseFloat(stringValue);
      return !isNaN(numValue) && numValue > 0;
    }

    // For any other text fields, any non-empty value is filled
    return stringValue !== '';
  };

  // Helper function to find the next empty field
  const getNextEmptyField = () => {
    const fieldOrder = [
      'nickname',
      'address',
      'purchasePrice',
      'purchaseDate',
      'closingCosts',
      'renovationCosts',
      'currentMarketValue',
      'yearBuilt',
      'propertyType',
      'numberOfUnits',
      'ownership'
    ];

    for (const field of fieldOrder) {
      if (!isFieldFilled(field, formData[field])) {
        return field;
      }
    }

    // Check units if numberOfUnits is filled
    if (isFieldFilled('numberOfUnits', formData.numberOfUnits)) {
      for (let i = 0; i < formData.units.length; i++) {
        const unit = formData.units[i];
        if (!isFieldFilled('size', unit.size)) return `unit-${i}-size`;
        if (!isFieldFilled('beds', unit.beds)) return `unit-${i}-beds`;
        if (!isFieldFilled('bathrooms', unit.bathrooms)) return `unit-${i}-bathrooms`;
        if (!isFieldFilled('dens', unit.dens)) return `unit-${i}-dens`;
      }
    }

    return null; // All fields filled
  };

  // Get className based on field state
  const getFieldClassName = (fieldName, value) => {
    const filled = isFieldFilled(fieldName, value);
    const nextEmpty = getNextEmptyField();
    const isNextField = nextEmpty === fieldName;

    // Priority: filled > next field > other empty
    if (filled) {
      // Filled field - white background (completed)
      return "w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 outline-none focus:ring-2 focus:ring-gray-500/20 dark:focus:ring-gray-400/20 focus:border-gray-400 dark:focus:border-gray-500";
    }
    
    if (isNextField) {
      // Next empty field - green background (current field to fill)
      return "w-full rounded-md border-2 border-emerald-400 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/30 dark:focus:ring-emerald-400/30 focus:border-emerald-500 dark:focus:border-emerald-400 shadow-sm";
    }
    
    // Other empty fields - blue background (waiting)
    return "w-full rounded-md border border-black/15 dark:border-white/15 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/30 dark:focus:ring-blue-400/30 focus:border-blue-400 dark:focus:border-blue-500";
  };

  // Get className for unit fields
  const getUnitFieldClassName = (unitIndex, fieldName, value) => {
    const fieldId = `unit-${unitIndex}-${fieldName}`;
    const filled = isFieldFilled(fieldName, value);
    const nextEmpty = getNextEmptyField();
    const isNextField = nextEmpty === fieldId;

    if (filled) {
      // Filled field - white background (completed)
      return "w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 outline-none focus:ring-2 focus:ring-gray-500/20 dark:focus:ring-gray-400/20 focus:border-gray-400 dark:focus:border-gray-500";
    } else if (isNextField) {
      // Next empty field - green background (current field to fill)
      return "w-full rounded-md border-2 border-emerald-400 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/30 dark:focus:ring-emerald-400/30 focus:border-emerald-500 dark:focus:border-emerald-400 shadow-sm";
    } else {
      // Other empty fields - blue background (waiting)
      return "w-full rounded-md border border-black/15 dark:border-white/15 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/30 dark:focus:ring-blue-400/30 focus:border-blue-400 dark:focus:border-blue-500";
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
      principalResidence: formData.principalResidence || false,
      ownership: formData.ownership || undefined,
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
            className={getFieldClassName('nickname', formData.nickname)}
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
            className={getFieldClassName('address', formData.address)}
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
            className={getFieldClassName('purchasePrice', formData.purchasePrice)}
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
            className={getFieldClassName('purchaseDate', formData.purchaseDate)}
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
            className={getFieldClassName('closingCosts', formData.closingCosts)}
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
            className={getFieldClassName('renovationCosts', formData.renovationCosts)}
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
            className={getFieldClassName('currentMarketValue', formData.currentMarketValue)}
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
            className={getFieldClassName('yearBuilt', formData.yearBuilt)}
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
            className={getFieldClassName('propertyType', formData.propertyType)}
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
            className={getFieldClassName('numberOfUnits', formData.numberOfUnits)}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ownership" className="block text-sm font-medium mb-1">
            Ownership
          </label>
          <select
            id="ownership"
            name="ownership"
            value={formData.ownership}
            onChange={handleChange}
            className={getFieldClassName('ownership', formData.ownership)}
          >
            <option value="">Select ownership</option>
            <option value="Personal">Personal</option>
            <option value="Incorporated">Incorporated</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="principalResidence"
              checked={formData.principalResidence || false}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                principalResidence: e.target.checked
              }))}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-emerald-600 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:ring-2"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Principal Residence
            </span>
          </label>
        </div>
      </div>

      {/* Units Configuration Section with Property Image */}
      <div className="mt-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Unit Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Unit Details - First unit takes 50% */}
          {parseInt(formData.numberOfUnits) > 0 && formData.units.map((unit, index) => (
            <div key={index} className={`p-4 border border-black/10 dark:border-white/10 rounded-lg space-y-3 ${index === 0 ? 'md:col-span-1' : 'md:col-span-2'}`}>
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
                  className={getUnitFieldClassName(index, 'size', unit.size)}
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
                  className={getUnitFieldClassName(index, 'beds', unit.beds)}
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
                  className={getUnitFieldClassName(index, 'bathrooms', unit.bathrooms)}
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
                  className={getUnitFieldClassName(index, 'dens', unit.dens)}
                  placeholder="0"
                />
              </div>
            </div>
          ))}
          
          {/* Property Image - 50% width in same row as first unit */}
          <div className="p-4 border border-black/10 dark:border-white/10 rounded-lg md:col-span-1">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Property Image
            </h4>
            {formData.imagePreview ? (
              <div className="relative border border-black/10 dark:border-white/10 rounded-lg overflow-hidden aspect-square w-full">
                <img
                  src={formData.imagePreview}
                  alt="Property preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black/90 text-white rounded-full transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => imageInputRef.current?.click()}
                className="border-2 border-dashed border-black/15 dark:border-white/15 rounded-lg p-4 text-center cursor-pointer hover:border-black/30 dark:hover:border-white/30 transition-colors aspect-square w-full flex flex-col items-center justify-center"
              >
                <ImageIcon className="w-8 h-8 mb-2 text-gray-400 dark:text-gray-500" />
                <p className="text-xs font-medium text-gray-900 dark:text-white mb-1">
                  Click to upload
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  PNG, JPG, WEBP (max 10MB)
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
      </div>

      {/* Buttons Row - Separate row underneath */}
      <div className="pt-6 mt-6 border-t border-black/10 dark:border-white/10 space-y-4">
        {/* Top row: Confirm Details and Add Another Property */}
        <div className="flex gap-3 justify-center">
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition"
          >
            Confirm Details
          </button>
          {!initialData.id && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                // Submit the form to add property, then reset form
                const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                const form = e.target.closest('form');
                if (form) {
                  form.dispatchEvent(submitEvent);
                  // Reset form after submission
                  setTimeout(() => {
                    setFormData(normalizedData);
                    if (imageInputRef.current) {
                      imageInputRef.current.value = '';
                    }
                  }, 100);
                }
              }}
              className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition"
            >
              Add Another Property
            </button>
          )}
        </div>
        
        {/* Bottom row: Back and Continue */}
        <div className="flex justify-between">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-md border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 transition flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}
          {onContinue && (
            <button
              type="button"
              onClick={onContinue}
              className="px-4 py-2 rounded-md bg-black dark:bg-white text-white dark:text-black hover:opacity-90 transition flex items-center gap-1 ml-auto"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

