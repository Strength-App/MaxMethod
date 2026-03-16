import { createContext, useContext, useState } from 'react';

const userContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);

  return (
    <userContext.Provider value={{ user, setUser }}>
      {children}
    </userContext.Provider>
  );
}

export function useUser() {
    return useContext(userContext);
}