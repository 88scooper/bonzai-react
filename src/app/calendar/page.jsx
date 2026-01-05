"use client";

import { useState, useMemo, useEffect } from "react";
import Layout from "@/components/Layout";
import { RequireAuth } from "@/context/AuthContext";
import { useProperties } from "@/context/PropertyContext";
import Button from "@/components/Button";
import { useToast } from "@/context/ToastContext";
import apiClient from "@/lib/api-client";

export default function CalendarPage() {
  const { addToast } = useToast();
  const properties = useProperties(); // Get properties from context
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingEventId, setEditingEventId] = useState(null);

  const [formData, setFormData] = useState({
    date: '',
    time: '',
    description: '',
    property: '',
    notify: false,
    isRecurring: false,
    recurrenceType: 'weekly',
    recurrenceInterval: 1,
    recurrenceEndDate: ''
  });

  // Get property names from context
  const propertyNames = properties.map(prop => prop.address);

  // Fetch events from API on mount
  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        const response = await apiClient.getEvents();
        
        if (response.success && response.data) {
          // Transform database events to UI format
          const transformedEvents = response.data.map(event => ({
            id: event.id,
            date: event.date,
            time: event.time || '',
            description: event.description,
            property: event.property || '',
            notify: event.notify,
            recurrence: event.recurrence || undefined
          }));
          
          setEvents(transformedEvents);
        }
      } catch (error) {
        console.error('Error loading events:', error);
        addToast("Failed to load events.", { type: "error" });
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [addToast]);

  // Get current month and year
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const firstDayWeekday = firstDayOfMonth.getDay();

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayWeekday; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(currentYear, currentMonth, i));
    }
    
    return days;
  }, [currentYear, currentMonth, firstDayWeekday, daysInMonth]);

  // Helper function to normalize date to start of day for comparison
  const normalizeDate = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // Helper function to check if a date matches a recurring event pattern
  const matchesRecurrencePattern = (date, event) => {
    if (!event.recurrence || !event.recurrence.startDate) return false;
    
    const eventDate = normalizeDate(event.recurrence.startDate);
    const checkDate = normalizeDate(date);
    const endDate = event.recurrence.endDate ? normalizeDate(event.recurrence.endDate) : null;
    
    // Check if date is before start date
    if (checkDate < eventDate) return false;
    
    // Check if date is after end date
    if (endDate && checkDate > endDate) return false;
    
    const { type, interval } = event.recurrence;
    const diffTime = checkDate - eventDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    switch (type) {
      case 'daily':
        return diffDays % interval === 0;
      case 'weekly':
        return diffDays % (7 * interval) === 0;
      case 'monthly':
        // Check if it's the same day of month, accounting for months with different lengths
        const eventDay = eventDate.getDate();
        const checkDay = checkDate.getDate();
        if (checkDay !== eventDay) return false;
        
        const monthsDiff = (checkDate.getFullYear() - eventDate.getFullYear()) * 12 + 
                          (checkDate.getMonth() - eventDate.getMonth());
        return monthsDiff >= 0 && monthsDiff % interval === 0;
      case 'yearly':
        // Check if it's the same month and day
        if (checkDate.getMonth() !== eventDate.getMonth() || 
            checkDate.getDate() !== eventDate.getDate()) return false;
        
        const yearsDiff = checkDate.getFullYear() - eventDate.getFullYear();
        return yearsDiff >= 0 && yearsDiff % interval === 0;
      default:
        return false;
    }
  };

  // Filter events for selected date (including recurring events)
  const selectedDateEvents = useMemo(() => {
    const selectedDateString = selectedDate.toISOString().split('T')[0];
    return events.filter(event => {
      // Regular event
      if (!event.recurrence) {
        return event.date === selectedDateString;
      }
      // Recurring event
      return matchesRecurrencePattern(selectedDate, event);
    });
  }, [events, selectedDate]);

  // Check if a date has events (including recurring events)
  const hasEvents = (date) => {
    if (!date) return false;
    const dateString = date.toISOString().split('T')[0];
    return events.some(event => {
      // Regular event
      if (!event.recurrence) {
        return event.date === dateString;
      }
      // Recurring event
      return matchesRecurrencePattern(date, event);
    });
  };

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Handle date selection
  const handleDateClick = (date) => {
    if (date) {
      setSelectedDate(date);
      setFormData(prev => ({
        ...prev,
        date: date.toISOString().split('T')[0]
      }));
    }
  };

  // Handle form input changes
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Start editing an event
  const editEvent = (event) => {
    setEditingEventId(event.id);
    setFormData({
      date: event.date,
      time: event.time || '',
      description: event.description,
      property: event.property || '',
      notify: event.notify || false,
      isRecurring: !!event.recurrence,
      recurrenceType: event.recurrence?.type || 'weekly',
      recurrenceInterval: event.recurrence?.interval || 1,
      recurrenceEndDate: event.recurrence?.endDate || ''
    });
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingEventId(null);
    setFormData({
      date: selectedDate.toISOString().split('T')[0],
      time: '',
      description: '',
      property: '',
      notify: false,
      isRecurring: false,
      recurrenceType: 'weekly',
      recurrenceInterval: 1,
      recurrenceEndDate: ''
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.date || !formData.description) {
      addToast("Please fill in the required fields.", { type: "error" });
      return;
    }

    if (formData.isRecurring && !formData.recurrenceEndDate) {
      addToast("Please specify an end date for recurring events.", { type: "error" });
      return;
    }

    try {
      const eventData = {
        date: formData.date,
        time: formData.time || undefined,
        description: formData.description,
        property: formData.property || undefined,
        notify: formData.notify,
        recurrence: formData.isRecurring ? {
          startDate: formData.date,
          type: formData.recurrenceType,
          interval: parseInt(formData.recurrenceInterval) || 1,
          endDate: formData.recurrenceEndDate
        } : undefined
      };

      if (editingEventId) {
        // Update existing event
        const response = await apiClient.updateEvent(editingEventId, eventData);
        
        if (response.success && response.data) {
          // Transform database event to UI format
          const updatedEvent = {
            id: response.data.id,
            date: response.data.date,
            time: response.data.time || '',
            description: response.data.description,
            property: response.data.property || '',
            notify: response.data.notify,
            recurrence: response.data.recurrence || undefined
          };
          
          setEvents(prev => prev.map(event => 
            event.id === editingEventId ? updatedEvent : event
          ));
          addToast("Event updated successfully!", { type: "success" });
          
          // Reset form and editing state
          setEditingEventId(null);
          setFormData({
            date: selectedDate.toISOString().split('T')[0],
            time: '',
            description: '',
            property: '',
            notify: false,
            isRecurring: false,
            recurrenceType: 'weekly',
            recurrenceInterval: 1,
            recurrenceEndDate: ''
          });
        } else {
          addToast("Failed to update event.", { type: "error" });
        }
      } else {
        // Create new event
        const response = await apiClient.createEvent(eventData);
        
        if (response.success && response.data) {
          // Transform database event to UI format
          const newEvent = {
            id: response.data.id,
            date: response.data.date,
            time: response.data.time || '',
            description: response.data.description,
            property: response.data.property || '',
            notify: response.data.notify,
            recurrence: response.data.recurrence || undefined
          };
          
          setEvents(prev => [...prev, newEvent]);
          addToast(formData.isRecurring ? "Recurring event added successfully!" : "Event added successfully!", { type: "success" });
          
          // Reset form
          setFormData({
            date: selectedDate.toISOString().split('T')[0],
            time: '',
            description: '',
            property: '',
            notify: false,
            isRecurring: false,
            recurrenceType: 'weekly',
            recurrenceInterval: 1,
            recurrenceEndDate: ''
          });
        } else {
          addToast("Failed to save event.", { type: "error" });
        }
      }
    } catch (error) {
      console.error('Error saving event:', error);
      addToast(editingEventId ? "Failed to update event." : "Failed to save event.", { type: "error" });
    }
  };

  // Delete event
  const deleteEvent = async (eventId) => {
    try {
      const response = await apiClient.deleteEvent(eventId);
      
      if (response.success) {
        setEvents(prev => prev.filter(event => event.id !== eventId));
        addToast("Event deleted.", { type: "success" });
      } else {
        addToast("Failed to delete event.", { type: "error" });
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      addToast("Failed to delete event.", { type: "error" });
    }
  };

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <RequireAuth>
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Calendar</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Manage your property events, reminders, and important dates.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Calendar Column - Takes up 2/3 on desktop */}
            <div className="lg:col-span-2">
              <div className="rounded-lg border border-black/10 dark:border-white/10 p-6">
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">
                    {monthNames[currentMonth]} {currentYear}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={goToPreviousMonth}
                      className="p-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
                      aria-label="Previous month"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={goToNextMonth}
                      className="p-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
                      aria-label="Next month"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Day headers */}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                      {day}
                    </div>
                  ))}
                  
                  {/* Calendar days */}
                  {calendarDays.map((date, index) => (
                    <div key={index} className="p-1">
                      {date ? (
                        <button
                          onClick={() => handleDateClick(date)}
                          className={`w-full h-12 rounded-md text-sm font-medium transition-colors relative ${
                            selectedDate.toDateString() === date.toDateString()
                              ? 'bg-black text-white dark:bg-white dark:text-black'
                              : 'hover:bg-black/5 dark:hover:bg-white/5'
                          }`}
                        >
                          {date.getDate()}
                          {hasEvents(date) && (
                            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex items-center gap-0.5">
                              <div className="w-1 h-1 bg-emerald-500 rounded-full"></div>
                              {events.some(event => event.recurrence && matchesRecurrencePattern(date, event)) && (
                                <svg className="w-2 h-2 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          )}
                        </button>
                      ) : (
                        <div className="w-full h-12"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Events Column - Takes up 1/3 on desktop */}
            <div className="space-y-6">
              {/* Add Event Form */}
              <div className="rounded-lg border border-black/10 dark:border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    {editingEventId ? 'Edit Event' : 'Add Event/Reminder'}
                  </h3>
                  {editingEventId && (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      Cancel
                    </button>
                  )}
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="date" className="block text-sm font-medium mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      id="date"
                      name="date"
                      value={formData.date}
                      onChange={handleFormChange}
                      required
                      className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    />
                  </div>

                  <div>
                    <label htmlFor="time" className="block text-sm font-medium mb-1">
                      Time (Optional)
                    </label>
                    <input
                      type="time"
                      id="time"
                      name="time"
                      value={formData.time}
                      onChange={handleFormChange}
                      className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium mb-1">
                      Description *
                    </label>
                    <input
                      type="text"
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleFormChange}
                      placeholder="e.g., Property Tax Due"
                      required
                      className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    />
                  </div>

                  <div>
                    <label htmlFor="property" className="block text-sm font-medium mb-1">
                      Property (Optional)
                    </label>
                    <select
                      id="property"
                      name="property"
                      value={formData.property}
                      onChange={handleFormChange}
                      className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    >
                      <option value="">Select a property</option>
                      {propertyNames.map(property => (
                        <option key={property} value={property}>{property}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="notify"
                      name="notify"
                      checked={formData.notify}
                      onChange={handleFormChange}
                      className="rounded border-black/15 dark:border-white/15"
                    />
                    <label htmlFor="notify" className="ml-2 text-sm">
                      Notify me
                    </label>
                  </div>

                  <div className="border-t border-black/10 dark:border-white/10 pt-4">
                    <div className="flex items-center mb-4">
                      <input
                        type="checkbox"
                        id="isRecurring"
                        name="isRecurring"
                        checked={formData.isRecurring}
                        onChange={handleFormChange}
                        className="rounded border-black/15 dark:border-white/15"
                      />
                      <label htmlFor="isRecurring" className="ml-2 text-sm font-medium">
                        Make this event recurring
                      </label>
                    </div>

                    {formData.isRecurring && (
                      <div className="space-y-4 pl-6 border-l-2 border-black/10 dark:border-white/10">
                        <div>
                          <label htmlFor="recurrenceType" className="block text-sm font-medium mb-1">
                            Repeats
                          </label>
                          <select
                            id="recurrenceType"
                            name="recurrenceType"
                            value={formData.recurrenceType}
                            onChange={handleFormChange}
                            className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                          </select>
                        </div>

                        <div>
                          <label htmlFor="recurrenceInterval" className="block text-sm font-medium mb-1">
                            Every
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              id="recurrenceInterval"
                              name="recurrenceInterval"
                              value={formData.recurrenceInterval}
                              onChange={handleFormChange}
                              min="1"
                              className="w-20 rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                            />
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {formData.recurrenceType === 'daily' && (formData.recurrenceInterval === 1 ? 'day' : 'days')}
                              {formData.recurrenceType === 'weekly' && (formData.recurrenceInterval === 1 ? 'week' : 'weeks')}
                              {formData.recurrenceType === 'monthly' && (formData.recurrenceInterval === 1 ? 'month' : 'months')}
                              {formData.recurrenceType === 'yearly' && (formData.recurrenceInterval === 1 ? 'year' : 'years')}
                            </span>
                          </div>
                        </div>

                        <div>
                          <label htmlFor="recurrenceEndDate" className="block text-sm font-medium mb-1">
                            End Date *
                          </label>
                          <input
                            type="date"
                            id="recurrenceEndDate"
                            name="recurrenceEndDate"
                            value={formData.recurrenceEndDate}
                            onChange={handleFormChange}
                            min={formData.date}
                            required={formData.isRecurring}
                            className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <Button type="submit" className="w-full">
                    {editingEventId ? 'Update Event' : 'Add Event'}
                  </Button>
                </form>
              </div>

              {/* Upcoming Events */}
              <div className="rounded-lg border border-black/10 dark:border-white/10 p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Upcoming Events - {formatDate(selectedDate)}
                </h3>
                
                {selectedDateEvents.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No upcoming events.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedDateEvents.map((event, index) => {
                      const isRecurring = !!event.recurrence;
                      const recurrenceLabel = isRecurring ? 
                        `${event.recurrence.interval === 1 ? '' : `Every ${event.recurrence.interval} `}${event.recurrence.type.charAt(0).toUpperCase() + event.recurrence.type.slice(1)}` : '';
                      
                      return (
                        <div key={`${event.id}-${index}`} className="flex items-start justify-between p-3 rounded-md bg-gray-50 dark:bg-gray-800">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-sm">{event.description}</div>
                              {isRecurring && (
                                <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20" title="Recurring event">
                                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            {isRecurring && (
                              <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                                {recurrenceLabel}
                              </div>
                            )}
                            {event.time && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {event.time}
                              </div>
                            )}
                            {event.property && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {event.property}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => editEvent(event)}
                              className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                              aria-label="Edit event"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => deleteEvent(event.id)}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                              aria-label="Delete event"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </RequireAuth>
  );
}


