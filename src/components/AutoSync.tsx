import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { signUp, signIn, signOutUser, initializeAuth } from '@/lib/firebase-realtime';
import { toast } from '@/hooks/use-toast';

export const AutoSync = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Initialize auth state
    initializeAuth();
    
    // Check if user is already logged in
    const savedEmail = localStorage.getItem('userEmail');
    if (savedEmail) {
      setIsLoggedIn(true);
      setEmail(savedEmail);
    }
  }, []);

  const handleSignUp = async () => {
    const result = await signUp(email, password);
    if (result.success) {
      setIsLoggedIn(true);
      localStorage.setItem('userEmail', email);
      toast({
        title: 'Account created',
        description: 'Auto-sync is now enabled across your devices'
      });
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive'
      });
    }
  };

  const handleSignIn = async () => {
    const result = await signIn(email, password);
    if (result.success) {
      setIsLoggedIn(true);
      localStorage.setItem('userEmail', email);
      toast({
        title: 'Signed in',
        description: 'Your data will automatically sync across devices'
      });
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive'
      });
    }
  };

  const handleSignOut = async () => {
    const result = await signOutUser();
    if (result.success) {
      setIsLoggedIn(false);
      localStorage.removeItem('userEmail');
      toast({
        title: 'Signed out',
        description: 'Auto-sync disabled'
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Auto-Sync</CardTitle>
        <CardDescription>
          {isLoggedIn 
            ? 'Your data automatically syncs across all your devices' 
            : 'Sign in to enable automatic syncing across devices'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isLoggedIn ? (
          <div className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={handleSignIn}>Sign In</Button>
              <Button variant="outline" onClick={handleSignUp}>Sign Up</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Signed in as</div>
                <div className="text-sm text-muted-foreground">{email}</div>
              </div>
              <Button variant="destructive" onClick={handleSignOut}>Sign Out</Button>
            </div>
            <div className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
              ✓ Auto-sync is active. Any changes you make will automatically appear on all your devices.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};