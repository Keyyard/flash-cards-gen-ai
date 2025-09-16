'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { SessionStorage } from '../../lib/storage'

export default function Upload() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [totalSessions, setTotalSessions] = useState(0)
  const [sessionName, setSessionName] = useState('')
  const [createdSession, setCreatedSession] = useState<any>(null)
  const [generationComplete, setGenerationComplete] = useState(false)
  useEffect(() => {
    const sessions = SessionStorage.getSessions()
    setTotalSessions(sessions.length)
  }, [])

  useEffect(() => {
    if (progress === 100 && createdSession) {
      const sessions = SessionStorage.getSessions()
      setTotalSessions(sessions.length)
    }
  }, [progress, createdSession])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setProgress(0)
    setProgressMessage('Uploading file...')

    const formData = new FormData()
    formData.append('file', file)

    try {
      setProgress(25)
      setProgressMessage('Processing document...')

      const response = await fetch('/api/generate-cards', {
        method: 'POST',
        body: formData,
      })

      setProgress(75)
      setProgressMessage('Generating flash cards...')

      if (response.ok) {
        const data = await response.json()
        const session = SessionStorage.createSession(sessionName || `Session ${Date.now()}`, data.cards)
        setCreatedSession(session)
        setProgress(100)
        setProgressMessage(`Successfully created session "${session.name}" with ${data.cards.length} cards!`)
        setGenerationComplete(true)
        // Don't redirect immediately, allow user to go to session
      } else {
        alert('Failed to generate cards')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  if (generationComplete && createdSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              FLASH CARD SESSION GENERATED
            </h1>
            <p className="text-lg text-gray-600">
              Successfully created session &quot;{createdSession.name}&quot; with {createdSession.cards.length} cards
            </p>
          </div>
          <Link
            href={`/sessions/${createdSession.id}`}
            className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            GO TO SESSION
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-2xl font-bold text-gray-900">Upload Document</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {totalSessions} sessions total
              </span>
              <Link
                href="/"
                className="text-indigo-600 hover:text-indigo-500"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Session Name
                </label>
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="Enter a name for this study session"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Select a document to generate flash cards
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                      >
                        <span>Upload a file</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          accept=".txt,.pdf,.doc,.docx"
                          onChange={handleFileChange}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      TXT, PDF, DOC, DOCX up to 10MB
                    </p>
                  </div>
                </div>
              </div>

              {file && (
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-sm text-gray-700">
                    Selected file: {file.name}
                  </p>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={!file || uploading || !sessionName.trim()}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {uploading ? 'Generating Cards...' : 'Generate Flash Cards'}
              </button>

              {uploading && (
                <div className="mt-4">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 text-center">{progressMessage}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}