'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'

export default function Home() {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-2xl font-bold text-gray-900">Flash Card Gen</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {session?.user?.name}</span>
              <button
                onClick={() => signOut()}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link
              href="/upload"
              className="bg-white overflow-hidden shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Document</h3>
              <p className="text-gray-600">Upload a file to generate flash cards</p>
            </Link>

            <Link
              href="/sessions"
              className="bg-white overflow-hidden shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-medium text-gray-900 mb-2">Review Sessions</h3>
              <p className="text-gray-600">Review your study sessions</p>
            </Link>

            <Link
              href="/stats"
              className="bg-white overflow-hidden shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-medium text-gray-900 mb-2">Statistics</h3>
              <p className="text-gray-600">View your learning progress</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
