declare module '@codetrix-studio/capacitor-google-auth' {
  interface GoogleUser {
    authentication: {
      accessToken: string;
      idToken: string;
    };
    email: string;
    familyName: string;
    givenName: string;
    id: string;
    imageUrl: string;
    name: string;
  }

  interface GoogleAuthPlugin {
    initialize(): Promise<void>;
    signIn(): Promise<GoogleUser>;
    signOut(): Promise<void>;
    refresh(): Promise<GoogleUser>;
  }

  export const GoogleAuth: GoogleAuthPlugin;
}