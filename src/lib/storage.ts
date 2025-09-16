export interface FlashCard {
  id: string
  question: string
  answer: string
  type: 'text' | 'multiple_choice'
  options?: string[]
  difficulty: 'easy' | 'normal' | 'hard'
  userAnswer?: string
  isCorrect?: boolean
  lastReviewed?: Date
  nextReview?: Date
  reviewCount: number
  consecutiveEasy: number
  createdAt: Date
  source?: string
}

export interface Session {
  id: string
  name: string
  cards: FlashCard[]
  createdAt: Date
  totalCards: number
  completedCards: number
  studySessions: number
}

const STORAGE_KEY = 'flash-card-sessions'

export class SessionStorage {
  static getSessions(): Session[] {
    if (typeof window === 'undefined') return []
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    const parsedSessions = JSON.parse(stored) as any[]
    return parsedSessions.map((session: any) => ({
      ...session,
      createdAt: new Date(session.createdAt),
      cards: session.cards.map((card: any) => ({
        ...card,
        createdAt: new Date(card.createdAt),
        lastReviewed: card.lastReviewed ? new Date(card.lastReviewed) : undefined,
        nextReview: card.nextReview ? new Date(card.nextReview) : undefined,
      }))
    })) as Session[]
  }

  static saveSessions(sessions: Session[]): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  }

  static createSession(name: string, cards: Omit<FlashCard, 'id' | 'reviewCount' | 'consecutiveEasy' | 'createdAt' | 'difficulty'>[]): Session {
    const existingSessions = this.getSessions()
    const sessionCards: FlashCard[] = cards.map(card => ({
      ...card,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      reviewCount: 0,
      consecutiveEasy: 0,
      createdAt: new Date(),
      difficulty: 'normal',
    }))

    const newSession: Session = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name,
      cards: sessionCards,
      createdAt: new Date(),
      totalCards: sessionCards.length,
      completedCards: 0,
      studySessions: 0,
    }

    this.saveSessions([...existingSessions, newSession])
    return newSession
  }

  static updateSession(sessionId: string, updates: Partial<Session>): void {
    const sessions = this.getSessions()
    const index = sessions.findIndex(session => session.id === sessionId)
    if (index !== -1) {
      sessions[index] = { ...sessions[index], ...updates }
      this.saveSessions(sessions)
    }
  }

  static updateCard(sessionId: string, cardId: string, updates: Partial<FlashCard>): void {
    const sessions = this.getSessions()
    const sessionIndex = sessions.findIndex(session => session.id === sessionId)
    if (sessionIndex !== -1) {
      const cardIndex = sessions[sessionIndex].cards.findIndex(card => card.id === cardId)
      if (cardIndex !== -1) {
        sessions[sessionIndex].cards[cardIndex] = { ...sessions[sessionIndex].cards[cardIndex], ...updates }
        this.saveSessions(sessions)
      }
    }
  }

  static deleteSession(sessionId: string): void {
    const sessions = this.getSessions()
    const filteredSessions = sessions.filter(session => session.id !== sessionId)
    this.saveSessions(filteredSessions)
  }

  static getSession(sessionId: string): Session | null {
    const sessions = this.getSessions()
    return sessions.find(session => session.id === sessionId) || null
  }

  static getDueCards(sessionId: string): FlashCard[] {
    const session = this.getSession(sessionId)
    if (!session) return []
    const now = new Date()
    return session.cards.filter(card => !card.nextReview || card.nextReview <= now)
  }

  static getAllCards(): FlashCard[] {
    const sessions = this.getSessions()
    return sessions.flatMap(session => session.cards)
  }
}