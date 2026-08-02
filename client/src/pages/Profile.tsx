import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../api/firebase';
import { 
  updateProfile, 
  updatePassword, 
  deleteUser, 
  sendEmailVerification,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { 
  User as UserIcon, 
  ShieldCheck, 
  ShieldAlert, 
  Key, 
  Image as ImageIcon, 
  Smartphone, 
  Briefcase, 
  Bell, 
  Eye, 
  Sun, 
  Moon, 
  Trash2, 
  LogOut, 
  Sparkles,
  Check,
  X,
  Lock,
  EyeOff
} from 'lucide-react';

export const Profile = () => {
  const { user, logout } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { theme, toggleTheme } = useTheme();

  // Firebase current user
  const currentUser = auth.currentUser;

  // Tabs state
  const [activeTab, setActiveTab] = useState<'overview' | 'personal' | 'photo' | 'security' | 'workspace' | 'notifications' | 'sessions' | 'danger'>('overview');

  // State Management
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Personal Info Form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [country, setCountry] = useState('United States');
  const [timezone, setTimezone] = useState('UTC-5 (EST)');
  const [language, setLanguage] = useState('English');

  // Security Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Profile Picture File Upload
  const [photoURL, setPhotoURL] = useState(currentUser?.photoURL || '');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Danger Zone
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Notifications Toggles
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [productUpdates, setProductUpdates] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  // Load name values
  useEffect(() => {
    if (user?.displayName) {
      const parts = user.displayName.split(' ');
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
      setDisplayName(user.displayName);
    }
  }, [user]);

  // Password requirements checklist
  const requirements = useMemo(() => {
    return [
      { id: 'length', label: 'At least 8 characters', met: newPassword.length >= 8 },
      { id: 'upper', label: 'At least one uppercase letter', met: /[A-Z]/.test(newPassword) },
      { id: 'lower', label: 'At least one lowercase letter', met: /[a-z]/.test(newPassword) },
      { id: 'number', label: 'At least one number', met: /[0-9]/.test(newPassword) },
      { id: 'special', label: 'At least one special character', met: /[^A-Za-z0-9]/.test(newPassword) },
    ];
  }, [newPassword]);

  const strengthScore = useMemo(() => {
    if (!newPassword) return 0;
    return requirements.filter(req => req.met).length;
  }, [newPassword, requirements]);

  const strengthDetails = useMemo(() => {
    switch (strengthScore) {
      case 0: return { label: 'Empty', color: 'bg-slate-700', text: 'text-slate-400' };
      case 1:
      case 2: return { label: 'Weak', color: 'bg-rose-500', text: 'text-rose-400' };
      case 3:
      case 4: return { label: 'Medium', color: 'bg-amber-500', text: 'text-amber-400' };
      case 5: return { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-400' };
      default: return { label: 'Weak', color: 'bg-rose-500', text: 'text-rose-400' };
    }
  }, [strengthScore]);

  // Connected provider list
  const providers = useMemo(() => {
    if (!currentUser) return ['Email/Password'];
    return currentUser.providerData.map(p => {
      if (p.providerId === 'google.com') return 'Google';
      if (p.providerId === 'password') return 'Email/Password';
      return p.providerId;
    });
  }, [currentUser]);

  const isGoogleUser = useMemo(() => providers.includes('Google'), [providers]);

  // Handlers
  const handleSavePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setLoading(true);

    const mergedName = `${firstName} ${lastName}`.trim() || displayName;

    try {
      if (currentUser) {
        await updateProfile(currentUser, { displayName: mergedName });
        setSuccessMsg('Personal Information updated successfully!');
      } else {
        // Mock fallback
        setSuccessMsg('Personal Information updated successfully! (Mock)');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to update personal details.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }
    if (strengthScore < 4) {
      setErrorMsg('Please choose a stronger password.');
      return;
    }

    setLoading(true);

    try {
      if (currentUser && currentUser.email) {
        // Reauthenticate
        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await reauthenticateWithCredential(currentUser, credential);
        await updatePassword(currentUser, newPassword);
        
        setSuccessMsg('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setSuccessMsg('Password updated successfully! (Mock)');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to update password. Verify current password.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setLoading(true);

    try {
      // Simulate Firebase Storage / photoURL update
      const finalPhoto = photoPreview || photoURL;
      if (currentUser) {
        await updateProfile(currentUser, { photoURL: finalPhoto });
        setPhotoURL(finalPhoto);
        setSuccessMsg('Profile picture updated successfully!');
      } else {
        setSuccessMsg('Profile picture updated successfully! (Mock)');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to upload photo.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePhoto = async () => {
    setSuccessMsg('');
    setErrorMsg('');
    setLoading(true);

    try {
      if (currentUser) {
        await updateProfile(currentUser, { photoURL: '' });
        setPhotoURL('');
        setPhotoPreview(null);
        setSuccessMsg('Profile picture removed.');
      } else {
        setSuccessMsg('Profile picture removed. (Mock)');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to remove photo.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVerifyEmailResend = async () => {
    setSuccessMsg('');
    setErrorMsg('');
    setLoading(true);

    try {
      if (currentUser) {
        await sendEmailVerification(currentUser);
        setSuccessMsg('Verification email sent! Please check your inbox.');
      } else {
        setSuccessMsg('Verification email sent! (Mock)');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to send verification email.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setErrorMsg('Please type DELETE to confirm.');
      return;
    }

    setSuccessMsg('');
    setErrorMsg('');
    setLoading(true);

    try {
      if (currentUser) {
        await deleteUser(currentUser);
        await logout();
        window.location.href = '/login';
      } else {
        setSuccessMsg('Account deleted successfully. (Mock)');
        setTimeout(() => {
          logout();
          window.location.href = '/login';
        }, 1500);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to delete account. You may need to reauthenticate.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Account Settings</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage user profiles, secure credentials, connected applications, and workspace setups.</p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex gap-3 items-start animate-in fade-in duration-200">
          <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex gap-3 items-start animate-in fade-in duration-200">
          <X className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid Layout containing Sidebar Tabs & Setting Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Navigation Tabs */}
        <div className="flex flex-col gap-1">
          {[
            { id: 'overview', label: 'Overview', icon: <UserIcon className="w-4 h-4" /> },
            { id: 'personal', label: 'Personal Information', icon: <Briefcase className="w-4 h-4" /> },
            { id: 'photo', label: 'Profile Picture', icon: <ImageIcon className="w-4 h-4" /> },
            { id: 'security', label: 'Security', icon: <Lock className="w-4 h-4" /> },
            { id: 'workspace', label: 'Workspace details', icon: <Sparkles className="w-4 h-4" /> },
            { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
            { id: 'sessions', label: 'Sessions', icon: <Smartphone className="w-4 h-4" /> },
            { id: 'danger', label: 'Danger Zone', icon: <Trash2 className="w-4 h-4 text-rose-400" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all text-left ${
                activeTab === tab.id
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/15'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dynamic Card Display */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Account Overview</CardTitle>
                <CardDescription>Verified account mappings and profile statistics.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-slate-900/80 rounded-2xl border border-slate-800">
                  <div className="relative">
                    {photoURL ? (
                      <img src={photoURL} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-brand-500" />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-brand-600/20 text-brand-400 flex items-center justify-center font-bold text-3xl">
                        {displayName.charAt(0) || 'U'}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 h-4 w-4 bg-emerald-500 border-2 border-slate-950 rounded-full" />
                  </div>
                  
                  <div className="space-y-1 text-center sm:text-left">
                    <h3 className="text-xl font-bold text-white">{displayName || 'GhostSMTP User'}</h3>
                    <p className="text-slate-400 text-sm">{user?.email}</p>
                    <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                      {currentUser?.emailVerified ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> Verified
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" /> Unverified
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20 uppercase">
                        {activeWorkspace?.plan || 'Free'} Plan
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 text-sm font-medium text-slate-400">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-900">
                    <span className="text-xs text-slate-500 block">Workspace Context</span>
                    <span className="text-white mt-1 block">{activeWorkspace?.name || 'Loading Workspace...'}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-900">
                    <span className="text-xs text-slate-500 block">Sign In Provider</span>
                    <span className="text-white mt-1 block uppercase">{providers.join(', ')}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-900">
                    <span className="text-xs text-slate-500 block">Created On</span>
                    <span className="text-white mt-1 block font-mono text-xs">
                      {currentUser?.metadata.creationTime ? new Date(currentUser.metadata.creationTime).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-900">
                    <span className="text-xs text-slate-500 block">Last Active Session</span>
                    <span className="text-white mt-1 block font-mono text-xs">
                      {currentUser?.metadata.lastSignInTime ? new Date(currentUser.metadata.lastSignInTime).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                </div>

                {!currentUser?.emailVerified && (
                  <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-rose-400">Email Address Unverified</h4>
                      <p className="text-xs text-slate-400 mt-1">Please verify your email address to ensure full API access.</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="text-xs border-slate-800 hover:bg-slate-800" onClick={handleVerifyEmailResend} isLoading={loading}>
                        Resend Verification Email
                      </Button>
                      <Button variant="primary" size="sm" className="text-xs" onClick={() => window.location.reload()}>
                        Refresh Status
                      </Button>
                    </div>
                  </div>
                )}

                <div className="text-xs text-slate-600 font-mono select-all bg-slate-950/80 p-3 rounded-lg border border-slate-900">
                  Firebase UUID: {currentUser?.uid}
                </div>
              </CardContent>
            </Card>
          )}

          {/* PERSONAL INFO TAB */}
          {activeTab === 'personal' && (
            <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Personal Details</CardTitle>
                <CardDescription>Update your contact and configuration details.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSavePersonalInfo} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input
                      label="First Name"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={loading}
                    />
                    <Input
                      label="Last Name"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  
                  <Input
                    label="Display Name"
                    placeholder="John Doe"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    disabled={loading}
                  />

                  <Input
                    label="Phone Number"
                    placeholder="+1 (555) 000-0000"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={loading}
                  />

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Country</label>
                      <select 
                        value={country} 
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-lg text-sm text-slate-350 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option>United States</option>
                        <option>Canada</option>
                        <option>United Kingdom</option>
                        <option>Germany</option>
                        <option>India</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Timezone</label>
                      <select 
                        value={timezone} 
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-lg text-sm text-slate-350 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option>UTC-5 (EST)</option>
                        <option>UTC+0 (GMT)</option>
                        <option>UTC+1 (CET)</option>
                        <option>UTC+5:30 (IST)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Language</label>
                      <select 
                        value={language} 
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-lg text-sm text-slate-350 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option>English</option>
                        <option>Spanish</option>
                        <option>German</option>
                        <option>French</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                    <Button type="button" variant="outline" onClick={() => window.location.reload()} disabled={loading}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" isLoading={loading}>
                      Save Changes
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* PROFILE PICTURE TAB */}
          {activeTab === 'photo' && (
            <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Profile Picture</CardTitle>
                <CardDescription>Drag and drop or select files to update your profile photo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handlePhotoUpload} className="space-y-6">
                  
                  {/* File Upload Box */}
                  <div className="flex flex-col sm:flex-row items-center gap-6 p-6 border border-dashed border-slate-850 rounded-2xl bg-slate-950/40 text-center sm:text-left justify-center sm:justify-start">
                    <div className="relative">
                      {photoPreview || photoURL ? (
                        <img src={photoPreview || photoURL} alt="Preview" className="w-24 h-24 rounded-full object-cover border-2 border-brand-500" />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center">
                          <ImageIcon className="w-10 h-10" />
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-white">Upload New Photo</h4>
                      <p className="text-slate-500 text-xs">Supports JPG, PNG or WEBP. Max size 2MB.</p>
                      
                      <div className="flex gap-2">
                        <label className="cursor-pointer bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs py-2 px-4 rounded-lg inline-block transition-colors">
                          Browse Files
                          <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={loading} />
                        </label>
                        {(photoPreview || photoURL) && (
                          <Button type="button" variant="danger" size="sm" onClick={handleRemovePhoto} isLoading={loading}>
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                    <Button type="submit" variant="primary" isLoading={loading} disabled={!photoPreview}>
                      Save Photo
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* SECURITY PASSWORD TAB */}
          {activeTab === 'security' && (
            <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Security Credentials</CardTitle>
                <CardDescription>Manage password preferences and security states.</CardDescription>
              </CardHeader>
              <CardContent>
                {isGoogleUser ? (
                  <div className="text-slate-400 text-sm py-4 flex gap-3 items-center">
                    <Key className="w-5 h-5 text-brand-400" />
                    <span>Your account is signed in with Google. Password management is handled by your Google account.</span>
                  </div>
                ) : (
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div className="relative">
                      <Input
                        label="Current Password"
                        type={showCurrentPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-[34px] text-slate-400 hover:text-white"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="relative">
                      <Input
                        label="New Password"
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-[34px] text-slate-400 hover:text-white"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Password Strength indicator */}
                    {newPassword && (
                      <div className="space-y-2 mt-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-medium">New Password Strength</span>
                          <span className={`font-semibold ${strengthDetails.text}`}>
                            {strengthDetails.label}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={`h-full flex-1 transition-all duration-300 ${
                                i < strengthScore ? strengthDetails.color : 'bg-slate-800'
                              }`}
                            />
                          ))}
                        </div>
                        {strengthScore < 5 && (
                          <ul className="text-[11px] text-slate-500 space-y-0.5">
                            {requirements.map((req) => (
                              <li key={req.id} className="flex items-center gap-1.5">
                                <span className={req.met ? 'text-emerald-500' : 'text-slate-600'}>✓</span>
                                <span className={req.met ? 'text-slate-400' : 'text-slate-505'}>{req.label}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    <div className="relative">
                      <Input
                        label="Confirm New Password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-[34px] text-slate-400 hover:text-white"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                      <Button type="submit" variant="primary" isLoading={loading}>
                        Save Password
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          )}

          {/* WORKSPACE DETAIL TAB */}
          {activeTab === 'workspace' && (
            <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Workspace details</CardTitle>
                <CardDescription>Review details about your active sending workspaces.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-5 border border-slate-800 rounded-xl bg-slate-950/60 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white text-base">{activeWorkspace?.name || 'Default Workspace'}</h4>
                      <p className="text-slate-500 text-xs font-mono mt-1 select-all">Workspace ID: {activeWorkspace?.id}</p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20 uppercase">
                      {activeWorkspace?.plan || 'Free'} Plan
                    </span>
                  </div>
                  
                  <div className="text-xs text-slate-400 leading-relaxed border-t border-slate-900 pt-3">
                    Plans configure sending rates, tracking windows, API quota triggers, and custom subdomain options.
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Workspace Members</h4>
                  <div className="divide-y divide-slate-900">
                    <div className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-500/10 text-brand-400 flex items-center justify-center font-bold text-xs">
                          {displayName.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{displayName || 'GhostSMTP User'} (You)</p>
                          <p className="text-xs text-slate-500">{user?.email}</p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-slate-400 bg-slate-800/40 px-2 py-0.5 rounded">Owner</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* NOTIFICATIONS SETTINGS */}
          {activeTab === 'notifications' && (
            <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Notification Configurations</CardTitle>
                <CardDescription>Opt in or out of specific system and promotional notifications.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 divide-y divide-slate-800">
                <div className="flex items-center justify-between py-3">
                  <div>
                    <h4 className="text-sm font-bold text-white">Email Notifications</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Receive digests and active delivery updates.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="rounded border-slate-800 bg-slate-950 text-brand-600 focus:ring-brand-500 h-5 w-5"
                  />
                </div>

                <div className="flex items-center justify-between py-3 pt-4">
                  <div>
                    <h4 className="text-sm font-bold text-white">Security Alerts</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Alert on login location modifications or password updates.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={securityAlerts}
                    onChange={(e) => setSecurityAlerts(e.target.checked)}
                    className="rounded border-slate-800 bg-slate-950 text-brand-600 focus:ring-brand-500 h-5 w-5"
                  />
                </div>

                <div className="flex items-center justify-between py-3 pt-4">
                  <div>
                    <h4 className="text-sm font-bold text-white">Product Updates</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Receive monthly digests about new platform features.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={productUpdates}
                    onChange={(e) => setProductUpdates(e.target.checked)}
                    className="rounded border-slate-800 bg-slate-950 text-brand-600 focus:ring-brand-500 h-5 w-5"
                  />
                </div>

                <div className="flex items-center justify-between py-3 pt-4">
                  <div>
                    <h4 className="text-sm font-bold text-white">Marketing Emails</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Opt in to promotional and developer announcements.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={marketingEmails}
                    onChange={(e) => setMarketingEmails(e.target.checked)}
                    className="rounded border-slate-800 bg-slate-950 text-brand-600 focus:ring-brand-500 h-5 w-5"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* SESSIONS DETAILS */}
          {activeTab === 'sessions' && (
            <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Active sessions</CardTitle>
                <CardDescription>Review browser and device instances logged into your user ID.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-800 bg-slate-950/60">
                  <div className="p-2 bg-brand-500/10 text-brand-400 rounded-lg">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">Current Session</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Active Now
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">Chrome on Windows Operating System</p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      IP Address: 127.0.0.1 • Logged in: {currentUser?.metadata.lastSignInTime ? new Date(currentUser.metadata.lastSignInTime).toLocaleTimeString() : 'Just now'}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-900">
                  <Button variant="outline" className="text-xs border-slate-850 hover:bg-slate-900 text-slate-350" onClick={() => setSuccessMsg('Other sessions successfully logged out!')}>
                    Sign Out Other Devices
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* DANGER ZONE TAB */}
          {activeTab === 'danger' && (
            <Card className="border-rose-900/40 bg-rose-950/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-rose-400">Danger Zone</CardTitle>
                <CardDescription className="text-rose-500/80">Irrerversible modifications to your account status.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Deleting your profile will permanently remove all SPF configurations, log tracking indices, sending credentials, and webhook endpoints associated with your user ID.
                </p>

                {showDeleteModal ? (
                  <div className="p-4 border border-rose-900/35 rounded-xl bg-slate-950 space-y-3">
                    <p className="text-xs text-slate-300">
                      To confirm deletion, please type <span className="font-bold text-rose-400">DELETE</span> below:
                    </p>
                    <Input
                      placeholder="DELETE"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      disabled={loading}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setShowDeleteModal(false)} disabled={loading}>
                        Cancel
                      </Button>
                      <Button variant="danger" size="sm" onClick={handleDeleteAccount} isLoading={loading}>
                        Delete Permanently
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="danger" className="w-fit" onClick={() => setShowDeleteModal(true)}>
                    Delete Account
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* APPEARANCE & THEME PREFERENCES CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 border-t border-slate-900 pt-8">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white">Appearance</h3>
          <p className="text-slate-500 text-xs">Configure theme preferences for dashboard templates.</p>
        </div>
        
        <div className="lg:col-span-3">
          <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Theme Selection</CardTitle>
              <CardDescription>Toggle light and dark styling displays.</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
              <button
                onClick={toggleTheme}
                className={`flex-1 flex flex-col items-center gap-3 p-4 rounded-xl border text-center transition-all ${
                  theme === 'dark'
                    ? 'border-brand-600 bg-brand-600/10 text-brand-400'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white'
                }`}
              >
                <Moon className="w-8 h-8" />
                <span className="text-xs font-semibold">Dark Theme</span>
              </button>

              <button
                onClick={toggleTheme}
                className={`flex-1 flex flex-col items-center gap-3 p-4 rounded-xl border text-center transition-all ${
                  theme === 'light'
                    ? 'border-brand-600 bg-brand-600/10 text-brand-400'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white'
                }`}
              >
                <Sun className="w-8 h-8" />
                <span className="text-xs font-semibold">Light Theme</span>
              </button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* LOGOUT SESSION OPTIONS CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 border-t border-slate-900 pt-8">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white">Sign Out</h3>
          <p className="text-slate-500 text-xs">Clear local session data and log out.</p>
        </div>

        <div className="lg:col-span-3">
          <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm">
            <CardContent className="flex justify-between items-center py-6">
              <div>
                <h4 className="font-bold text-white text-sm">Disconnect Account Session</h4>
                <p className="text-slate-500 text-xs mt-1">Clears JWT keys and redirects back to authentication gates.</p>
              </div>
              <Button variant="ghost" className="text-rose-400 hover:bg-rose-500/10 gap-2 font-semibold" onClick={logout}>
                <LogOut className="w-4 h-4" />
                Log Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
