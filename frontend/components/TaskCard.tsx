'use client';

import { useState, useEffect } from 'react';
import { Clock, MessageSquare, Paperclip, CheckCircle, AlertCircle } from 'lucide-react';

interface TaskCardProps {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'partially_completed';
  progress_percentage: number;
  due_date?: string;
  time_spent: number;
  assignedTo: string;
  onStart?: (taskId: string) => void;
  onComplete?: (taskId: string) => void;
  onUpdate?: (taskId: string, progress: number) => void;
}

export default function TaskCard({
  id,
  title,
  description,
  status,
  progress_percentage,
  due_date,
  time_spent,
  assignedTo,
  onStart,
  onComplete,
  onUpdate,
}: TaskCardProps) {
  const [isRunning, setIsRunning] = useState(status === 'in_progress');
  const [timeSpent, setTimeSpent] = useState(time_spent);

  // Timer effect
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'partially_completed':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (s: string) => {
    switch (s) {
      case 'completed':
        return <CheckCircle size={16} />;
      case 'in_progress':
        return <Clock size={16} />;
      case 'partially_completed':
        return <AlertCircle size={16} />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 line-clamp-2">{title}</h3>
          <p className="text-gray-600 text-sm mt-1 line-clamp-2">{description}</p>
        </div>
        <span className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium whitespace-nowrap ml-2 ${getStatusColor(status)}`}>
          {getStatusIcon(status)}
          {status.replace('_', ' ')}
        </span>
      </div>

      {/* Progress Bar */}
      {status !== 'pending' && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600">Progress</span>
            <span className="text-xs font-semibold text-gray-900">{progress_percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress_percentage}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Time and Due Date */}
      <div className="flex items-center gap-4 mb-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <Clock size={14} />
          <span>{formatTime(timeSpent)}</span>
        </div>
        {due_date && (
          <div className="text-xs text-amber-600">
            Due: {new Date(due_date).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {status === 'pending' && (
          <button
            onClick={() => {
              setIsRunning(true);
              onStart?.(id);
            }}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Start Task
          </button>
        )}

        {status === 'in_progress' && (
          <>
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {isRunning ? 'Pause' : 'Resume'}
            </button>
            <button
              onClick={() => onComplete?.(id)}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Complete
            </button>
          </>
        )}

        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
          <MessageSquare size={18} className="text-gray-600" />
        </button>
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
          <Paperclip size={18} className="text-gray-600" />
        </button>
      </div>
    </div>
  );
}
