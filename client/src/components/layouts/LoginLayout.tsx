import React from 'react';

export const LoginLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 bg-gradient-to-tr from-slate-950 via-slate-900 to-brand-950">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
};

export default LoginLayout;
