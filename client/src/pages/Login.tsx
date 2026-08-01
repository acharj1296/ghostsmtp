import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { LoginLayout } from '../components/layouts/LoginLayout';
import { Server } from 'lucide-react';

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard", {
        replace: true,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginLayout>
      <div className="flex flex-col items-center gap-3 mb-8">
        <div className="bg-brand-600 p-3 rounded-2xl text-white shadow-xl shadow-brand-500/20">
          <Server className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">GhostSMTP</h2>
        <p className="text-slate-400 text-sm">SMTP Hosting Platform Dashboard</p>
      </div>

      <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Sign In</CardTitle>
          <CardDescription className="text-slate-500">Access your sending domains and analytics.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button 
              type="submit" 
              variant="primary" 
              className="w-full mt-2" 
              isLoading={loading}
            >
              Sign In with Firebase
            </Button>
          </form>
        </CardContent>
      </Card>
    </LoginLayout>
  );
};

export default Login;
