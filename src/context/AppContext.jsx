import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

const AppContext = createContext();

const initialProfile = {
  autonomy: 5,
  workEnvironment: 5,
  cost: 5,
  flexibility: 5,
  workload: 5,
};

const initialSchools = [];

const initialCriteria = [
  { id: 'autonomy', label: 'Autonomie', color: '#8884d8' },
  { id: 'workEnvironment', label: 'Cadre de travail', color: '#82ca9d' },
  { id: 'cost', label: 'Coût', color: '#ffc658' },
  { id: 'flexibility', label: 'Flexibilité', color: '#ff7300' },
  { id: 'workload', label: 'Charge de travail', color: '#387908' },
];

export const AppProvider = ({ children }) => {
  const { user, token } = useAuth();

  // Load from local storage or use defaults
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('ov_profile');
    return saved ? JSON.parse(saved) : initialProfile;
  });

  const [schools, setSchools] = useState(() => {
    const saved = localStorage.getItem('ov_schools');
    return saved ? JSON.parse(saved) : initialSchools;
  });

  const [criteria, setCriteria] = useState(() => {
    const saved = localStorage.getItem('ov_criteria');
    return saved ? JSON.parse(saved) : initialCriteria;
  });

  // Track if data is initially loaded from server to avoid overwriting with local empty state
  const isDataLoaded = useRef(false);

  // Sync with Server on Login
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        const res = await fetch('http://localhost:3001/api/data', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.profile) setProfile(data.profile);
          if (data.schools) setSchools(data.schools);
          if (data.criteria && data.criteria.length > 0) setCriteria(data.criteria);
          isDataLoaded.current = true;
        }
      } catch (e) {
        console.error("Failed to fetch data", e);
      }
    };

    fetchData();
  }, [token]);

  // Save to local storage AND server on change
  // We debounce server saves slightly in real apps, but here direct call is fine for low frequency
  const saveDataToServer = async (newData) => {
    if (!token || !isDataLoaded.current) return;
    try {
      await fetch('http://localhost:3001/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newData)
      });
    } catch (e) {
      console.error("Failed to save data", e);
    }
  };

  useEffect(() => {
    localStorage.setItem('ov_profile', JSON.stringify(profile));
    if (token) saveDataToServer({ profile });
  }, [profile, token]);

  useEffect(() => {
    localStorage.setItem('ov_schools', JSON.stringify(schools));
    if (token) saveDataToServer({ schools });
  }, [schools, token]);

  useEffect(() => {
    localStorage.setItem('ov_criteria', JSON.stringify(criteria));
    if (token) saveDataToServer({ criteria });
  }, [criteria, token]);

  // Actions
  const updateProfile = (key, value) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  const addSchool = (school) => {
    setSchools(prev => [...prev, { ...school, id: Date.now() }]);
  };

  const updateSchool = (id, updatedSchool) => {
    setSchools(prev => prev.map(s => s.id === id ? { ...s, ...updatedSchool } : s));
  };

  const removeSchool = (id) => {
    setSchools(prev => prev.filter(s => s.id !== id));
  };

  const addCriterion = (criterion) => {
    setCriteria(prev => [...prev, { ...criterion, id: criterion.label.toLowerCase().replace(/\s+/g, '') }]);
    setProfile(prev => ({ ...prev, [criterion.label.toLowerCase().replace(/\s+/g, '')]: 5 }));
  };

  const removeCriterion = (id) => {
    setCriteria(prev => prev.filter(c => c.id !== id));
    setProfile(prev => {
      const newProfile = { ...prev };
      delete newProfile[id];
      return newProfile;
    });
  };

  return (
    <AppContext.Provider value={{
      profile, updateProfile,
      schools, addSchool, updateSchool, removeSchool,
      criteria, addCriterion, removeCriterion
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
