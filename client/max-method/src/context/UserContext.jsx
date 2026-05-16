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

  // On startup, refresh the stored user from the authoritative server doc.
  // Two roles:
  //   1. Existence check — 404 means the account was deleted or the server
  //      was reset; clear stale session data.
  //   2. State refresh — on 200, overwrite context with the server's view of
  //      the user. This is the path by which a user whose context drifted
  //      from the DB (e.g., affected by Bug A's stale-gender nulling, then
  //      repaired server-side) sees their data restored on next app load.
  //      Previously this fetch discarded the response body, so localStorage-
  //      hydrated state and in-session setUser patches were the ONLY writes
  //      to user context — bugs in the DB couldn't propagate to the client
  //      via login/refresh, and conversely server-side repairs couldn't
  //      either. This patch makes the bootstrap a real refresh source.
  //
  // /profile returns the raw user doc (Mongo-shape _id). buildUserResponse
  // (used by login) emits _id as a string. Coerce here so the bootstrap-
  // refreshed shape matches the login-response shape — downstream _id
  // comparisons stay consistent.
  //
  // Defensive: only setUser on 200 with a parseable object. 500 / network
  // error / empty body / parse failure all no-op so existing context isn't
  // clobbered by a transient server hiccup.
  useEffect(() => {
    if (!user?._id) return;
    fetch(`${API_URL}/api/users/profile/${user._id}`)
      .then(async res => {
        if (res.status === 404) {
          setUser(null);
          localStorage.removeItem('userId');
          return;
        }
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (!data || typeof data !== 'object') return;
        setUser({ ...data, _id: String(data._id) });
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
