import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { apiClient } from '../api/client';

export interface Workspace {
  id: string;
  name: string;
  plan: 'free' | 'growth' | 'enterprise';
}

interface WorkspaceContextType {
  activeWorkspace: Workspace | null;
  workspaces: Workspace[];
  setActiveWorkspace: (workspace: Workspace) => void;
  loading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUserWorkspaces = async () => {
      if (!isAuthenticated) {
        setWorkspaces([]);
        setActiveWorkspaceState(null);
        localStorage.removeItem('activeWorkspaceId');
        return;
      }

      setLoading(true);
      try {
        const response = await apiClient.get('/profile');
        const user = response.data;
        
        // Map user workspaces objects
        const mapped: Workspace[] = (user.workspaces || []).map((w: any) => ({
          id: w.workspaceId._id || w.workspaceId,
          name: w.workspaceId.name || 'Default Workspace',
          plan: w.workspaceId.plan || 'free',
        }));

        setWorkspaces(mapped);

        if (mapped.length > 0) {
          const storedId = localStorage.getItem('activeWorkspaceId');
          const matched = mapped.find((w) => w.id === storedId);
          const defaultActive = matched || mapped[0];
          
          setActiveWorkspaceState(defaultActive);
          localStorage.setItem('activeWorkspaceId', defaultActive.id);
        } else {
          setActiveWorkspaceState(null);
          localStorage.removeItem('activeWorkspaceId');
        }
      } catch (err) {
        console.error('Failed to fetch user workspaces profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserWorkspaces();
  }, [isAuthenticated]);

  const setActiveWorkspace = (workspace: Workspace) => {
    setActiveWorkspaceState(workspace);
    localStorage.setItem('activeWorkspaceId', workspace.id);
    // Reload page to reset react query cache state across workspaces
    window.location.reload();
  };

  return (
    <WorkspaceContext.Provider value={{ activeWorkspace, workspaces, setActiveWorkspace, loading }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used within a WorkspaceProvider');
  return context;
};
export default WorkspaceProvider;
