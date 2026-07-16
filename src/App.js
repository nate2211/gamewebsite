import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import GamePage from "./pages/GamePage";
import SettingsPage from "./pages/SettingsPage";
import JoinWorldPage from "./pages/JoinWorldPage";
import MultiplayerAnswerPage from "./pages/MultiplayerAnswerPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/play/:worldId" element={<GamePage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/join" element={<JoinWorldPage />} />
      <Route path="/multiplayer/answer" element={<MultiplayerAnswerPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
