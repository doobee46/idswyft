import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { HomePage } from './pages/HomePage'
import { DeveloperPage } from './pages/DeveloperPage'
import { VerificationPage } from './pages/VerificationPage'
import { AdminPage } from './pages/AdminPage'
import { AdminLogin } from './pages/AdminLogin'
import { DocsPage } from './pages/DocsPage'
import { NotFoundPage } from './pages/NotFoundPage'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/developer" element={<DeveloperPage />} />
        <Route path="/verify" element={<VerificationPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/*" element={<AdminPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  )
}

export default App