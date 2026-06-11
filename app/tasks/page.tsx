'use client';

import { Suspense } from 'react';
import ProtectedLayout from '@/components/ProtectedLayout';
import TasksPageInner from './TasksPageInner';

export default function TasksPage() {
  return (
    <ProtectedLayout>
      <Suspense fallback={
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      }>
        <TasksPageInner />
      </Suspense>
    </ProtectedLayout>
  );
}
