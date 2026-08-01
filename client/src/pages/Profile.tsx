import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { User } from 'lucide-react';

export const Profile = () => {
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
        <CardContent className="h-[200px] flex flex-col items-center justify-center text-slate-400 text-sm gap-4">
          <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500">
            <User className="w-8 h-8" />
          </div>
          <p>Configure user display parameters.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
