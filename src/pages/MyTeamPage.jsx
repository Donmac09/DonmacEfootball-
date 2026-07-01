// Load saved tab on mount
useEffect(() => {
  const savedTab = localStorage.getItem('myTeamTab');
  if (savedTab) {
    setTab(savedTab);
  }
}, []);

// Save tab when it changes
useEffect(() => {
  localStorage.setItem('myTeamTab', tab);
}, [tab]);
