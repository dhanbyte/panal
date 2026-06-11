import { create } from 'zustand';

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'partially_completed';
  progress_percentage: number;
  time_spent: number;
}

interface Team {
  id: string;
  name: string;
  owner_id: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
}

interface AppStore {
  // User state
  user: User | null;
  setUser: (user: User | null) => void;

  // Team state
  currentTeam: Team | null;
  setCurrentTeam: (team: Team | null) => void;
  teams: Team[];
  setTeams: (teams: Team[]) => void;

  // Task state
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, task: Partial<Task>) => void;

  // UI state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  // User state
  user: null,
  setUser: (user) => set({ user }),

  // Team state
  currentTeam: null,
  setCurrentTeam: (team) => set({ currentTeam: team }),
  teams: [],
  setTeams: (teams) => set({ teams }),

  // Task state
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) =>
    set((state) => ({
      tasks: [...state.tasks, task],
    })),
  updateTask: (id, task) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...task } : t)),
    })),

  // UI state
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
