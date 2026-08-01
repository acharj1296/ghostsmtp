import { createContext, useContext, useState, ReactNode } from 'react';

interface Workspace {
  id: string;
  name: string;
  plan: 'free' | 'growth' | 'enterprise';
}

interface WorkspaceContextType {
  activeWorkspace: Workspace | null;
  workspaces: Workspace[];
  setActiveWorkspace: (workspace: Workspace) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const mockWorkspaces: Workspace[] = [
  { id: 'ws-1', name: 'Default Workspace', plan: 'free' },
  { id: 'ws-2', name: 'Production Tenant', plan: 'growth' },
];

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(mockWorkspaces[0]);
  const [workspaces] = useState<Workspace[]>(mockWorkspaces);

  const setActiveWorkspace = (workspace: Workspace) => {
    setActiveWorkspaceState(workspace);
  };

  return (
    <WorkspaceContext.Provider value={{ activeWorkspace, workspaces, setActiveWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used within a WorkspaceProvider');
  return context;
};
