import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { useTranslation } from 'react-i18next'
import { AppLayout } from '@/components/app/AppLayout'
import { SiteLayout } from '@/components/layout/SiteLayout'
import HomePage from '@/pages/home/HomePage'
import PlaceholderPage from '@/pages/PlaceholderPage'

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const SignupPage = lazy(() => import('@/pages/auth/SignupPage'))
const ForgotPage = lazy(() => import('@/pages/auth/ForgotPage'))
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'))
const VerifyEmailPage = lazy(() => import('@/pages/auth/VerifyEmailPage'))
const DashboardPage = lazy(() => import('@/pages/app/DashboardPage'))
const ProfilePage = lazy(() => import('@/pages/app/ProfilePage'))

export default function App() {
  const { t } = useTranslation()
  return (
    <Suspense
      fallback={
        <p role="status" className="p-8 text-center text-muted">
          {t('common.loading')}
        </p>
      }
    >
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<HomePage />} />
          <Route
            path="privacy"
            element={
              <PlaceholderPage titleKey="placeholder.privacyTitle" bodyKey="placeholder.body" />
            }
          />
          <Route
            path="terms"
            element={
              <PlaceholderPage titleKey="placeholder.termsTitle" bodyKey="placeholder.body" />
            }
          />
          <Route
            path="*"
            element={
              <PlaceholderPage
                titleKey="placeholder.notFoundTitle"
                bodyKey="placeholder.notFoundBody"
              />
            }
          />
        </Route>

        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="forgot" element={<ForgotPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />

        {/* Logged-in student pages */}
        <Route element={<AppLayout />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
