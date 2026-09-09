import { Routes, Route, Navigate } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { SidebarLayout } from '@/components/layout/SidebarLayout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import AddSale from '@/pages/sales/AddSale'
import AddExpense from '@/pages/expenses/AddExpense'
import MenuPage from '@/pages/menu/MenuPage'
import ProfitLoss from '@/pages/analysis/ProfitLoss'
import TodayReport from '@/pages/reports/TodayReport'
import ReportsHub from '@/pages/reports/ReportsHub'
import SellingRankings from '@/pages/reports/SellingRankings'
import SalesExpenses from '@/pages/reports/SalesExpenses';
import IncomePage from '@/pages/analysis/IncomePage'
import ExpensesPage from '@/pages/analysis/ExpensesPage'
import BackupRestore from '@/pages/data/BackupRestore';

function AppRoutes() {
  const { user, isLoading } = useAuth({ redirectOnUnauthenticated: true })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  const isOwner = user.role === 'admin'

  return (
    <SidebarLayout isOwner={isOwner}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/sales/add" element={<AddSale />} />
        <Route path="/expenses/add" element={<AddExpense />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/reports/today" element={<TodayReport />} />
        <Route path="/sales-expenses" element={<SalesExpenses />} />
        <Route path="/reports" element={<ReportsHub />} />
        <Route path="/reports/weekly" element={<Navigate to="/reports?tab=weekly" replace />} />
        <Route path="/reports/monthly" element={<Navigate to="/reports?tab=monthly" replace />} />
        <Route path="/reports/yearly" element={<Navigate to="/reports?tab=yearly" replace />} />
        <Route path="/reports/range" element={<Navigate to="/reports?tab=range" replace />} />
        {isOwner && (
          <>
            <Route path="/reports/rankings" element={<SellingRankings />} />
            <Route path="/analysis" element={<ProfitLoss />} />
            <Route path="/income" element={<IncomePage />} />
            <Route path="/expenses/list" element={<ExpensesPage />} />
            <Route path="/data/backup-restore" element={<BackupRestore />} />
          </>
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SidebarLayout>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={<AppRoutes />} />
    </Routes>
  )
}