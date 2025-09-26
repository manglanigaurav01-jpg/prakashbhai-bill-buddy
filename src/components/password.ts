const PASSWORD_KEY = 'app_lock_password';

export const setPassword = (password: string): { success: boolean; message: string } => {
  if (!/^\d{4}$/.test(password)) {
    return { success: false, message: 'Password must be a 4-digit number.' };
  }
  localStorage.setItem(PASSWORD_KEY, password);
  return { success: true, message: 'Password set successfully.' };
};

export const verifyPassword = (password: string): boolean => {
  const storedPassword = localStorage.getItem(PASSWORD_KEY);
  if (!storedPassword) {
    // If no password is set, any attempt is "successful" in that the action is not blocked.
    // The UI should prevent this from being called if a password is required.
    return true;
  }
  return storedPassword === password;
};

export const changePassword = (oldPassword: string, newPassword: string): { success: boolean; message: string } => {
  const storedPassword = localStorage.getItem(PASSWORD_KEY);
  if (storedPassword && storedPassword !== oldPassword) {
    return { success: false, message: 'Incorrect old password.' };
  }
  return setPassword(newPassword);
};

export const isPasswordSet = (): boolean => {
  return localStorage.getItem(PASSWORD_KEY) !== null;
};

export const removePassword = (password: string): { success: boolean; message: string } => {
    const storedPassword = localStorage.getItem(PASSWORD_KEY);
    if (!storedPassword || storedPassword !== password) {
        return { success: false, message: 'Incorrect password.' };
    }
    localStorage.removeItem(PASSWORD_KEY);
    return { success: true, message: 'Password protection removed.' };
};