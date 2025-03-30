// src/header.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { LogOut, User } from "lucide-react";

interface UserContextType {
  currentUser: string;
  setCurrentUser: (user: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<string>("Dr. Smith");

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser }}>
      <Header />
      {children}
    </UserContext.Provider>
  );
};

const Header: React.FC = () => {
  const { currentUser } = useUser();

  const handleLogout = () => {
    console.log("Logout clicked");
  };

  const handleProfile = () => {
    console.log("Profile clicked");
  };

  return (
    <div className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">ENT-Annotate</h1>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{currentUser}</span>
          <button 
            onClick={handleProfile}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-gray-50"
          >
            <User className="h-4 w-4" />
            Profile
          </button>
          <button 
            onClick={handleLogout}
            className="p-2 text-gray-600 hover:text-gray-900"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Header;