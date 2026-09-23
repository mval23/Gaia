import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { TodayPage } from './pages/TodayPage';
import { CalendarPage } from './pages/CalendarPage';
import { ManageLayout } from './pages/manage/ManageLayout';
import { GoalsPage } from './pages/GoalsPage';
import { LookBackPage } from './pages/LookBackPage';
import { SupportPage } from './pages/SupportPage';
import { HelpPage } from './pages/HelpPage';
import { SettingsPage } from './pages/SettingsPage';
import { PlansPage } from './pages/PlansPage';
import { ManageTasks } from './pages/manage/ManageTasks';
import { ManageGroups } from './pages/manage/ManageGroups';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<TodayPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="goals" element={<GoalsPage />} />
        <Route path="look-back" element={<LookBackPage />} />
        <Route path="support" element={<SupportPage />} />
        <Route path="help" element={<HelpPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="manage" element={<ManageLayout />}>
          <Route index element={<Navigate to="tasks" replace />} />
          <Route path="tasks" element={<ManageTasks />} />
          {/* Habits moved in with goals; keep old links working. */}
          <Route path="habits" element={<Navigate to="/goals" replace />} />
          {/* Categories now live with their groups; keep old links working. */}
          <Route path="categories" element={<Navigate to="/manage/groups" replace />} />
          <Route path="groups" element={<ManageGroups />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
