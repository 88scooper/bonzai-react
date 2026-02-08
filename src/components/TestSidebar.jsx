import React, { useState } from 'react';

// Sidebar Component
function Sidebar({ activePage, onPageChange }) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Portfolio',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'properties',
      label: 'My Properties',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      id: 'data',
      label: 'Data',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
        </svg>
      )
    },
    {
      id: 'analytics',
      label: 'Analysis',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      id: 'calculator',
      label: 'Calculator',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    }
  ];

  return (
    <aside className="w-64 bg-white shadow-lg border-r border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">Bonzai</h1>
      </div>
      
      <nav className="p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onPageChange(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activePage === item.id
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

// Header Component
function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">Portfolio</h2>
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </button>
          
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </div>
      </div>
    </header>
  );
}

// Main Content Component
function MainContent({ activePage }) {
  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-sm font-medium text-gray-500">Total Properties</h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">12</p>
                <p className="text-sm text-green-600 mt-2">+2.5% from last month</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-sm font-medium text-gray-500">Monthly Revenue</h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">$45,230</p>
                <p className="text-sm text-green-600 mt-2">+8.1% from last month</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-sm font-medium text-gray-500">Occupancy Rate</h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">94.2%</p>
                <p className="text-sm text-green-600 mt-2">+1.2% from last month</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-sm font-medium text-gray-500">Total Equity</h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">$2.4M</p>
                <p className="text-sm text-green-600 mt-2">+12.3% from last month</p>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">New tenant signed lease for 123 Main St</span>
                  <span className="text-sm text-gray-400">2 hours ago</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Maintenance request completed at 456 Oak Ave</span>
                  <span className="text-sm text-gray-400">1 day ago</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Rent payment received for 789 Pine St</span>
                  <span className="text-sm text-gray-400">3 days ago</span>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'properties':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">My Properties</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4">
                    <div className="w-full h-32 bg-gray-200 rounded-lg mb-4"></div>
                    <h4 className="font-medium text-gray-900">Property {i}</h4>
                    <p className="text-sm text-gray-600">123 Main St, City, State</p>
                    <p className="text-sm font-medium text-green-600 mt-2">$2,500/month</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
        
      case 'data':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Management</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-gray-900">Property Reports</h4>
                      <p className="text-sm text-gray-600">Financial and performance data</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Export</button>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-gray-900">Analysis Data</h4>
                      <p className="text-sm text-gray-600">Market trends and insights</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">Download</button>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'analytics':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Analysis Portfolio</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Revenue Trends</h4>
                  <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">Chart Placeholder</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Property Performance</h4>
                  <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">Chart Placeholder</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'calculator':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Mortgage Calculator</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Loan Amount</label>
                    <input type="number" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="500,000" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Interest Rate (%)</label>
                    <input type="number" step="0.1" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="4.5" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Loan Term (years)</label>
                    <input type="number" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="30" />
                  </div>
                  <button className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600">Calculate</button>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-4">Results</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Monthly Payment:</span>
                      <span className="font-medium">$2,533</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Interest:</span>
                      <span className="font-medium">$411,880</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Payment:</span>
                      <span className="font-medium">$911,880</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'calendar':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Calendar</h3>
              <div className="grid grid-cols-7 gap-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                    {day}
                  </div>
                ))}
                {Array.from({ length: 35 }, (_, i) => (
                  <div key={i} className="p-2 text-center text-sm border border-gray-200 min-h-[60px] flex items-center justify-center">
                    {i < 31 ? i + 1 : ''}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
        
      default:
        return <div>Select a page from the sidebar</div>;
    }
  };

  return (
    <main className="flex-1 bg-gray-50">
      <Header />
      <div className="p-6">
        {renderContent()}
      </div>
    </main>
  );
}

// Main App Component
function TestSidebar() {
  const [activePage, setActivePage] = useState('dashboard');

  return (
    <div className="flex h-screen">
      <Sidebar activePage={activePage} onPageChange={setActivePage} />
      <MainContent activePage={activePage} />
    </div>
  );
}

export default TestSidebar;
