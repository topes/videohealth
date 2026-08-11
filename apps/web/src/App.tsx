import { Route, Routes } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { JoinPage } from './pages/JoinPage';
import { RoomPage } from './pages/RoomPage';
import { NotFoundPage } from './pages/NotFoundPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/join/:code" element={<JoinPage />} />
      <Route path="/room/:code" element={<RoomPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
