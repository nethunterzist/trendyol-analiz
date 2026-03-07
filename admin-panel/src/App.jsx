import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/ui/Layout'
import { PageSkeleton } from './components/ui/SkeletonLoader'

// OPTIMIZATION: Lazy load components for smaller initial bundle
// Components are loaded only when user navigates to them
const ReportGeneration = lazy(() => import('./components/ReportGeneration'))
const ReportList = lazy(() => import('./components/ReportList'))
const ReportDashboard = lazy(() => import('./components/ReportDashboard'))
const ReportComparison = lazy(() => import('./components/ReportComparison'))

// Skeleton loading fallback
const LoadingFallback = () => (
  <div className="page-enter page-enter-active">
    <PageSkeleton />
  </div>
)

function App() {
  return (
    <Layout>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<ReportGeneration />} />
          <Route path="/report" element={<ReportGeneration />} />
          <Route path="/reports" element={<ReportList />} />
          <Route path="/reports/:reportId" element={<ReportDashboard />} />
          <Route path="/compare" element={<ReportComparison />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}

export default App
