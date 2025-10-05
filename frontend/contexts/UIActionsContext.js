import React from 'react';

// Simple context to send UI actions (scan, repeat, settings, help) to the CameraScreen
const UIActionsContext = React.createContext({
  onScan: () => {},
  onRepeat: () => {},
  onSettings: () => {},
  onHelp: () => {},
});

export default UIActionsContext;
