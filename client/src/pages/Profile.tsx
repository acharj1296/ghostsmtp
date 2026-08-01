import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { useAuth } from '../context/AuthContext';
import { User as UserIcon } from 'lucide-react';

export const Profile = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">User Profile</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Manage login accounts, notification configurations, and display setups.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
          <CardDescription>Verified personal credentials mapping details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
            <div className="p-3 bg-brand-500/10 text-brand-500 rounded-full">
              <UserIcon className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{user?.displayName || 'GhostSMTP User'}</h3>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Firebase User UID: {user?.uid}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
