import { createContext, useContext, useState, useEffect } from 'react';
import { API_URL } from '../config/api';

const UserContext = createContext();

export function UserProvider({ children }) {

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  // On startup, verify the stored user still exists in the DB.
  // If the account was deleted or the server was reset, clear stale session data.
  useEffect(() => {
    if (!user?._id) return;
    fetch(`${API_URL}/api/users/profile/${user._id}`)
      .then(res => {
        if (res.status === 404) {
          setUser(null);
          localStorage.removeItem('userId');
        }
      })
      .catch(() => {
        // Network error — don't auto-logout, server may just be temporarily down
      });
  }, []);

  // 👇 ADD THIS
  const logout = () => {
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, setUser, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
