import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { TodayPage } from './pages/TodayPage';
import { CalendarPage } from './pages/CalendarPage';
import { ManageLayout } from './pages/manage/ManageLayout';
import { GoalsPage } from './pages/GoalsPage';
import { SupportPage } from './pages/SupportPage';
import { SettingsPage } from './pages/SettingsPage';
import { ManageTasks } from './pages/manage/ManageTasks';
import { ManageHabits } from './pages/manage/ManageHabits';
import { ManageCategories } from './pages/manage/ManageCategories';
import { ManageGroups } from './pages/manage/ManageGroups';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<TodayPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="goals" element={<GoalsPage />} />
        <Route path="support" element={<SupportPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="manage" element={<ManageLayout />}>
          <Route index element={<Navigate to="tasks" replace />} />
          <Route path="tasks" element={<ManageTasks />} />
          <Route path="habits" element={<ManageHabits />} />
          <Route path="categories" element={<ManageCategories />} />
          <Route path="groups" element={<ManageGroups />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
