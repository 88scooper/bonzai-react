"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { Trash2, Download, Upload, RefreshCw, Calendar, TrendingUp, Search, Folder, Tag, X, Edit2, ChevronDown } from 'lucide-react';
import Button from '@/components/Button';
import { 
  getSavedScenarios, 
  deleteScenario, 
  getScenariosByProperty,
  getFolders,
  updateScenarioFolder,
  updateScenarioTags,
  getAllTags
} from '@/lib/scenario-storage';
import ScenarioFolderManager from '@/components/analytics/ScenarioFolderManager';

const SavedScenariosPanel = ({ propertyId, onLoadScenario, currentAssumptions, analysisType = 'cash-flow' }) => {
  const [savedScenarios, setSavedScenarios] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState('All Scenarios');
  const [selectedTags, setSelectedTags] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFolderManager, setShowFolderManager] = useState(false);
  const [editingScenario, setEditingScenario] = useState(null);
  const [isOpen, setIsOpen] = useState(true);
  const dropdownRef = useRef(null);

  // Load saved scenarios
  useEffect(() => {
    loadScenarios();
  }, [propertyId, analysisType]);

  const folders = getFolders();
  const allTags = getAllTags();

  const loadScenarios = () => {
    if (propertyId) {
      const scenarios = getScenariosByProperty(propertyId).filter(s => s.type === analysisType);
      setSavedScenarios(scenarios);
    } else {
      setSavedScenarios([]);
    }
  };

  // Filter scenarios by folder, tags, and search
  const filteredScenarios = useMemo(() => {
    let filtered = savedScenarios;

    // Filter by folder
    if (selectedFolder && selectedFolder !== 'All Scenarios') {
      filtered = filtered.filter(s => (s.folder || 'Uncategorized') === selectedFolder);
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(s => {
        const scenarioTags = s.tags || [];
        return selectedTags.every(tag => scenarioTags.includes(tag));
      });
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(query) ||
        (s.description || '').toLowerCase().includes(query) ||
        (s.tags || []).some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Group by folder
    const grouped = filtered.reduce((acc, scenario) => {
      const folder = scenario.folder || 'Uncategorized';
      if (!acc[folder]) {
        acc[folder] = [];
      }
      acc[folder].push(scenario);
      return acc;
    }, {});

    return grouped;
  }, [savedScenarios, selectedFolder, selectedTags, searchQuery]);

  const handleTagToggle = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleMoveToFolder = (scenarioId, folderName) => {
    const success = updateScenarioFolder(scenarioId, folderName);
    if (success) {
      loadScenarios();
    }
  };

  const handleLoadScenario = (scenario) => {
    setSelectedScenarioId(scenario.id);
    onLoadScenario(scenario.assumptions);
  };

  const handleDeleteScenario = (scenarioId) => {
    const success = deleteScenario(scenarioId);
    if (success) {
      loadScenarios();
      if (selectedScenarioId === scenarioId) {
        setSelectedScenarioId(null);
      }
      setShowDeleteConfirm(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const isCurrentScenario = (scenario) => {
    if (!currentAssumptions) return false;
    return JSON.stringify(scenario.assumptions) === JSON.stringify(currentAssumptions);
  };

  const totalScenarios = savedScenarios.length;
  const filteredCount = Object.values(filteredScenarios).flat().length;

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        // Don't close on outside click for this component
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getButtonText = () => {
    if (totalScenarios === 0) {
      return 'No Saved Scenarios';
    }
    const currentScenario = savedScenarios.find(s => isCurrentScenario(s));
    if (currentScenario) {
      return `Current: ${currentScenario.name}`;
    }
    return `${totalScenarios} Saved Scenario${totalScenarios !== 1 ? 's' : ''}`;
  };

  if (totalScenarios === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="font-semibold text-gray-900 dark:text-white">
              Saved Scenarios
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div className="px-4 pb-4">
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                No saved scenarios yet
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-xs">
                Save your current assumptions to compare different scenarios later
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <span className="font-semibold text-gray-900 dark:text-white">
            {getButtonText()}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFolderManager(true)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Manage Folders"
              >
                <Folder className="w-4 h-4" />
              </button>
              <button
                onClick={loadScenarios}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {filteredCount} of {totalScenarios} scenario{totalScenarios !== 1 ? 's' : ''} {selectedFolder !== 'All Scenarios' ? `in "${selectedFolder}"` : 'total'}
      </p>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search scenarios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-black/15 dark:border-white/15 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 outline-none"
          />
        </div>
      </div>

      {/* Folder Filter */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          Folder
        </label>
        <div className="flex flex-wrap gap-2">
          {folders.map((folder) => (
            <button
              key={folder}
              onClick={() => setSelectedFolder(folder)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                selectedFolder === folder
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {folder}
            </button>
          ))}
        </div>
      </div>

      {/* Tag Filter */}
      {allTags.length > 0 && (
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tags
          </label>
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagToggle(tag)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  selectedTags.includes(tag)
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-2 border-blue-300 dark:border-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 border-2 border-transparent'
                }`}
              >
                <Tag className="w-3 h-3" />
                {tag}
              </button>
            ))}
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {Object.keys(filteredScenarios).length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No scenarios match your filters
            </p>
          </div>
        ) : (
          Object.entries(filteredScenarios).map(([folder, scenarios]) => (
            <div key={folder}>
              {selectedFolder === 'All Scenarios' && (
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Folder className="w-3 h-3" />
                  {folder}
                </h4>
              )}
              <div className="space-y-3">
                {scenarios.map((scenario) => (
          <div
            key={scenario.id}
            className={`relative rounded-xl border transition-all ${
              isCurrentScenario(scenario)
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
            }`}
          >
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {scenario.name}
                        {isCurrentScenario(scenario) && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                            Current
                          </span>
                        )}
                      </h4>
                      {scenario.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 line-clamp-2">
                          {scenario.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <Calendar className="w-3 h-3" />
                        <span>Saved {formatDate(scenario.createdAt)}</span>
                        {scenario.folder && scenario.folder !== 'Uncategorized' && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1">
                              <Folder className="w-3 h-3" />
                              {scenario.folder}
                            </span>
                          </>
                        )}
                      </div>
                      {/* Tags */}
                      {scenario.tags && scenario.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {scenario.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                            >
                              <Tag className="w-2.5 h-2.5" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Assumptions Summary */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="text-gray-600 dark:text-gray-400">
                  Rent: <span className="font-medium text-gray-900 dark:text-white">{scenario.assumptions.annualRentIncrease}%</span>
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  Expenses: <span className="font-medium text-gray-900 dark:text-white">{scenario.assumptions.annualExpenseInflation}%</span>
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  Appreciation: <span className="font-medium text-gray-900 dark:text-white">{scenario.assumptions.annualPropertyAppreciation}%</span>
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  Vacancy: <span className="font-medium text-gray-900 dark:text-white">{scenario.assumptions.vacancyRate}%</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {!isCurrentScenario(scenario) && (
                  <Button
                    onClick={() => handleLoadScenario(scenario)}
                    className="flex-1 justify-center"
                  >
                    <Upload className="w-3 h-3 mr-1" />
                    Load Scenario
                  </Button>
                )}
                
                {/* Move to Folder Dropdown */}
                <div className="relative group">
                  <button
                    className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md 
                             hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Move to folder"
                  >
                    <Folder className="w-3 h-3" />
                  </button>
                  <div className="absolute right-0 mt-1 w-48 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-gray-800 shadow-lg z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <div className="py-1">
                      {folders.filter(f => f !== 'All Scenarios').map((folder) => (
                        <button
                          key={folder}
                          onClick={() => handleMoveToFolder(scenario.id, folder)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Move to {folder}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                {showDeleteConfirm === scenario.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <button
                      onClick={() => handleDeleteScenario(scenario.id)}
                      className="flex-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-md 
                               hover:bg-red-700 transition-colors"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(null)}
                      className="flex-1 px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 
                               text-gray-700 dark:text-gray-300 rounded-md 
                               hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(scenario.id)}
                    className={`px-3 py-1.5 text-sm border border-red-300 dark:border-red-800 
                             text-red-600 dark:text-red-400 rounded-md 
                             hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ${
                               isCurrentScenario(scenario) ? 'flex-1' : ''
                             }`}
                  >
                    <Trash2 className="w-3 h-3 inline mr-1" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Folder Manager Modal */}
      {showFolderManager && (
        <ScenarioFolderManager
          isOpen={showFolderManager}
          onClose={() => setShowFolderManager(false)}
          onFolderChange={() => {
            loadScenarios();
            setSelectedFolder('All Scenarios');
          }}
        />
      )}
        </div>
      )}
    </div>
  );
};

export default SavedScenariosPanel;

