import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';

export const NotFound = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 gap-6 p-6">
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-rose-500">
        <AlertCircle className="w-12 h-12" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Page Not Found</h2>
        <p className="text-slate-400 text-sm max-w-sm">
          The page you are looking for does not exist or has been moved.
        </p>
      </div>
      <Link to="/dashboard">
        <Button variant="primary">Return Home</Button>
      </Link>
    </div>
  );
};

export default NotFound;
