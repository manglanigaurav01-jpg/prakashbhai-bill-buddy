import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { signUp, signIn, signOutUser, saveData, getData } from '@/lib/firebase-simple';
import { getBills, getCustomers, getPayments, getItems } from '@/lib/storage';
import { toast } from '@/hooks/use-toast';

export const CloudSync = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState('');

  const handleSignUp = async () => {
    const result = await signUp(email, password);
    if (result.success) {
      setIsLoggedIn(true);
      setUserId(result.user.uid);
      toast({
        title: 'Account created',
        description: 'You can now sync your data across devices'
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
      setUserId(result.user.uid);
      toast({
        title: 'Signed in',
        description: 'Welcome back!'
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
      setUserId('');
      toast({
        title: 'Signed out',
        description: 'See you soon!'
      });
    }
  };

  const handleUploadData = async () => {
    // Get all local data
    const data = {
      bills: getBills(),
      customers: getCustomers(),
      payments: getPayments(),
      items: getItems(),
      lastSync: new Date().toISOString()
    };

    const result = await saveData(userId, data);
    if (result.success) {
      toast({
        title: 'Data uploaded',
        description: 'Your data is now in the cloud'
      });
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive'
      });
    }
  };

  const handleDownloadData = async () => {
    const result = await getData(userId);
    if (result.success && result.data) {
      // Save to local storage
      localStorage.setItem('prakash_bills', JSON.stringify(result.data.bills || []));
      localStorage.setItem('prakash_customers', JSON.stringify(result.data.customers || []));
      localStorage.setItem('prakash_payments', JSON.stringify(result.data.payments || []));
      localStorage.setItem('prakash_items', JSON.stringify(result.data.items || []));
      
      toast({
        title: 'Data downloaded',
        description: 'Your data has been restored from the cloud'
      });
      
      // Trigger reload to refresh UI
      window.location.reload();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'No data found',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Cloud Sync</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isLoggedIn ? (
          <>
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
          </>
        ) : (
          <>
            <div className="text-sm text-muted-foreground">
              Signed in as {email}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleUploadData}>Upload Data</Button>
              <Button variant="outline" onClick={handleDownloadData}>Download Data</Button>
              <Button variant="destructive" onClick={handleSignOut}>Sign Out</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};