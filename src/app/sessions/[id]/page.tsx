'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { SessionStorage, Session, FlashCard } from '../../../lib/storage'

export default function SessionReview() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string

  const [session, setSession] = useState<Session | null>(null)
  const [shuffledCards, setShuffledCards] = useState<FlashCard[]>([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [answeredCards, setAnsweredCards] = useState<Set<string>>(new Set())
  const [showAnswer, setShowAnswer] = useState(false)
  const [userAnswer, setUserAnswer] = useState('')
  const [selectedOption, setSelectedOption] = useState('')
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)

  useEffect(() => {
    const sessionData = SessionStorage.getSession(sessionId)
    if (!sessionData) {
      router.push('/sessions')
      return
    }

    // Increment study sessions count
    const updatedSession = { ...sessionData, studySessions: sessionData.studySessions + 1 }
    SessionStorage.updateSession(sessionId, { studySessions: updatedSession.studySessions })

    // Filter cards based on study sessions and difficulty
    const availableCards = updatedSession.cards.filter((card: FlashCard) => {
      if (!card.userAnswer) return true // New cards

      // Easy cards reappear every 5 study sessions
      if (card.difficulty === 'easy') {
        return updatedSession.studySessions % 5 === 0
      }

      // Normal cards reappear every 2 study sessions
      if (card.difficulty === 'normal') {
        return updatedSession.studySessions % 2 === 0
      }

      // Hard cards always reappear
      return true
    })

    // Shuffle the available cards
    const shuffled = [...availableCards].sort(() => Math.random() - 0.5)
    setShuffledCards(shuffled)

    // Track which cards have been answered (have userAnswer)
    const answered = new Set(
      updatedSession.cards
        .filter((card: FlashCard) => card.userAnswer !== undefined)
        .map((card: FlashCard) => card.id)
    )
    setAnsweredCards(answered)

    setSession(updatedSession)
  }, [sessionId, router])

  // Save progress when component unmounts or sessionId changes
  useEffect(() => {
    return () => {
      if (session) {
        // Save current progress to localStorage
        const progressKey = `session-progress-${sessionId}`
        const progress = {
          currentCardIndex,
          answeredCards: Array.from(answeredCards),
          lastAccessed: new Date().toISOString()
        }
        localStorage.setItem(progressKey, JSON.stringify(progress))
      }
    }
  }, [session, sessionId, currentCardIndex, answeredCards])

  // Load saved progress when component mounts
  useEffect(() => {
    const progressKey = `session-progress-${sessionId}`
    const savedProgress = localStorage.getItem(progressKey)
    if (savedProgress) {
      try {
        const progress = JSON.parse(savedProgress)
        setCurrentCardIndex(progress.currentCardIndex || 0)
        setAnsweredCards(new Set(progress.answeredCards || []))
      } catch (error) {
        console.error('Error loading saved progress:', error)
      }
    }
  }, [sessionId])

  if (!session) {
    return <div>Loading...</div>
  }

  const currentCard = shuffledCards[currentCardIndex]

  const handleShowAnswer = () => {
    if (!currentCard) return

    const userAnswerValue = currentCard.type === 'text' ? userAnswer : selectedOption
    let actualIsCorrect = false

    if (currentCard.type === 'text') {
      // For text answers, we'll ask user later if it was correct
      actualIsCorrect = false
    } else {
      actualIsCorrect = selectedOption === currentCard.answer
    }

    // Update card with answer
    SessionStorage.updateCard(session.id, currentCard.id, {
      userAnswer: userAnswerValue,
      isCorrect: actualIsCorrect,
      lastReviewed: new Date(),
      reviewCount: currentCard.reviewCount + 1,
    })

    // Update local session state to reflect the change immediately
    const updatedSession = { ...session }
    const cardIndex = updatedSession.cards.findIndex(card => card.id === currentCard.id)
    if (cardIndex !== -1) {
      updatedSession.cards[cardIndex] = {
        ...updatedSession.cards[cardIndex],
        userAnswer: userAnswerValue,
        isCorrect: actualIsCorrect,
        lastReviewed: new Date(),
        reviewCount: updatedSession.cards[cardIndex].reviewCount + 1,
      }
      setSession(updatedSession)
    }

    // Mark this card as answered
    setAnsweredCards(prev => new Set([...prev, currentCard.id]))

    setShowAnswer(true)
  }

  const handleCorrectnessCheck = (correct: boolean) => {
    setIsCorrect(correct)

    // Update the card with the correct answer status
    SessionStorage.updateCard(session.id, currentCard.id, {
      isCorrect: correct,
    })

    // Update local session state
    const updatedSession = { ...session }
    const cardIndex = updatedSession.cards.findIndex(card => card.id === currentCard.id)
    if (cardIndex !== -1) {
      updatedSession.cards[cardIndex] = {
        ...updatedSession.cards[cardIndex],
        isCorrect: correct,
      }
      setSession(updatedSession)
    }
  }

  const handleRestartSession = () => {
    if (!session) return

    // Reset all cards to make them available again
    const resetCards = session.cards.map(card => ({
      ...card,
      userAnswer: undefined,
      isCorrect: undefined,
      difficulty: 'normal' as const,
      consecutiveEasy: 0,
      reviewCount: 0,
    }))

    const updatedSession = {
      ...session,
      cards: resetCards,
      studySessions: 0,
      completedCards: 0
    }

    SessionStorage.updateSession(sessionId, updatedSession)
    setSession(updatedSession)

    // Clear progress and restart
    const shuffled = [...resetCards].sort(() => Math.random() - 0.5)
    setShuffledCards(shuffled)
    setAnsweredCards(new Set())
    setCurrentCardIndex(0)
    setShowAnswer(false)
    setUserAnswer('')
    setSelectedOption('')
    setIsCorrect(null)
  }

  // Check if session is completed (no available cards)
  if (shuffledCards.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="mb-8">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              All Done!
            </h1>
            <p className="text-xl text-gray-600 mb-2">
              You&apos;ve completed all cards in
            </p>
            <p className="text-lg font-semibold text-indigo-600 mb-4">
              &quot;{session.name}&quot;
            </p>
            <div className="bg-white rounded-lg p-4 shadow-sm mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Study Sessions</p>
                  <p className="text-2xl font-bold text-gray-900">{session.studySessions}</p>
                </div>
                <div>
                  <p className="text-gray-500">Total Cards</p>
                  <p className="text-2xl font-bold text-gray-900">{session.cards.length}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <button
              onClick={handleRestartSession}
              className="w-full inline-flex items-center justify-center px-6 py-4 border border-transparent text-lg font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            >
              🔄 Try Again?
            </button>
            <Link
              href="/sessions"
              className="w-full inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
            >
              ← Back to Sessions
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const handleDifficulty = (difficulty: 'easy' | 'normal' | 'hard') => {
    if (!currentCard) return

    const now = new Date()
    let nextReview: Date

    // Simple spaced repetition logic
    switch (difficulty) {
      case 'easy':
        nextReview = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
        break
      case 'normal':
        nextReview = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 1 day
        break
      case 'hard':
        nextReview = new Date(now.getTime() + 4 * 60 * 60 * 1000) // 4 hours
        break
    }

    const consecutiveEasy = difficulty === 'easy' ? currentCard.consecutiveEasy + 1 : 0

    SessionStorage.updateCard(session.id, currentCard.id, {
      nextReview,
      consecutiveEasy,
      difficulty,
    })

    // Update local session state
    const updatedSession = { ...session }
    const cardIndex = updatedSession.cards.findIndex(card => card.id === currentCard.id)
    if (cardIndex !== -1) {
      updatedSession.cards[cardIndex] = {
        ...updatedSession.cards[cardIndex],
        nextReview,
        consecutiveEasy,
        difficulty,
      }
      setSession(updatedSession)
    }

    // Move to next card
    if (currentCardIndex < shuffledCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1)
    } else {
      setCurrentCardIndex(0)
    }

    setShowAnswer(false)
    setUserAnswer('')
    setSelectedOption('')
    setIsCorrect(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{session.name}</h1>
              <p className="text-sm text-gray-600">
                Card {currentCardIndex + 1} of {shuffledCards.length} •
                Answered: {answeredCards.size}/{shuffledCards.length} •
                Study Session: {session.studySessions}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/sessions"
                className="text-indigo-600 hover:text-indigo-500"
              >
                Back to Sessions
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="max-w-md mx-auto">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {currentCard.question}
                  </h3>

                  {!showAnswer ? (
                    <div className="space-y-4">
                      {currentCard.type === 'text' ? (
                        <textarea
                          value={userAnswer}
                          onChange={(e) => setUserAnswer(e.target.value)}
                          placeholder="Enter your answer..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                          rows={4}
                        />
                      ) : (
                        <div className="space-y-2">
                          {currentCard.options?.map((option, index) => (
                            <label key={index} className="flex items-center">
                              <input
                                type="radio"
                                name="answer"
                                value={option}
                                checked={selectedOption === option}
                                onChange={(e) => setSelectedOption(e.target.value)}
                                className="mr-2"
                              />
                              {option}
                            </label>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={handleShowAnswer}
                        disabled={currentCard.type === 'text' ? !userAnswer.trim() : !selectedOption}
                        className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        Show Answer
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-md">
                        <p className="text-sm font-medium text-gray-700 mb-2">Correct Answer:</p>
                        <p className="text-gray-900 mb-4">{currentCard.answer}</p>

                        {currentCard.source && currentCard.source.trim() ? (
                          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-r-lg">
                            <div className="flex items-start">
                              <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div className="ml-3">
                                <p className="text-sm font-semibold text-blue-800 mb-1">Source Reference:</p>
                                <p className="text-sm text-blue-700 italic leading-relaxed">&ldquo;{currentCard.source}&rdquo;</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 p-3 bg-gray-50 border-l-4 border-gray-300 rounded-r-lg">
                            <div className="flex items-start">
                              <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div className="ml-3">
                                <p className="text-sm font-medium text-gray-600">Source not available</p>
                                <p className="text-xs text-gray-500">The source reference could not be generated for this card.</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {currentCard.userAnswer && (
                          <div className="mt-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">Your Answer:</p>
                            <p className={`text-gray-900 ${currentCard.isCorrect !== undefined ? (currentCard.isCorrect ? 'text-green-600' : 'text-red-600') : ''}`}>
                              {currentCard.userAnswer}
                            </p>
                          </div>
                        )}
                      </div>

                      {currentCard.type === 'text' && isCorrect === null && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">Was your answer correct?</p>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleCorrectnessCheck(true)}
                              className="flex-1 py-2 px-4 border border-green-300 rounded-md shadow-sm text-sm font-medium text-green-700 bg-white hover:bg-green-50"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => handleCorrectnessCheck(false)}
                              className="flex-1 py-2 px-4 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                            >
                              No
                            </button>
                          </div>
                        </div>
                      )}

                      {(currentCard.type === 'multiple_choice' || isCorrect !== null) && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleDifficulty('hard')}
                            className="flex-1 py-2 px-4 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                          >
                            Hard
                          </button>
                          <button
                            onClick={() => handleDifficulty('normal')}
                            className="flex-1 py-2 px-4 border border-yellow-300 rounded-md shadow-sm text-sm font-medium text-yellow-700 bg-white hover:bg-yellow-50"
                          >
                            Normal
                          </button>
                          <button
                            onClick={() => handleDifficulty('easy')}
                            className="flex-1 py-2 px-4 border border-green-300 rounded-md shadow-sm text-sm font-medium text-green-700 bg-white hover:bg-green-50"
                          >
                            Easy
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}