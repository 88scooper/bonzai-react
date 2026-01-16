import Link from 'next/link'
import Layout from '@/components/Layout'
import { RequireAuth } from '@/context/AuthContext'

export default function NotFound() {
  return (
    <RequireAuth>
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
            <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Page Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              Sorry, we couldn't find the page you're looking for. It might have been moved, deleted, or you entered the wrong URL.
            </p>
            <div className="space-x-4">
              <Link 
                href="/my-properties"
                prefetch={false}
                className="inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-medium transition disabled:opacity-60 disabled:cursor-not-allowed bg-black text-white dark:bg-white dark:text-black hover:opacity-90"
              >
                Go to My Properties
              </Link>
              <Link 
                href="/portfolio-summary"
                prefetch={false}
                className="inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-medium transition disabled:opacity-60 disabled:cursor-not-allowed border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5"
              >
                Portfolio Summary
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    </RequireAuth>
  )
}
