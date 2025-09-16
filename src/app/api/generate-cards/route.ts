import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'

interface GeneratedCard {
  question: string
  answer: string
  type: string
  source: string
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

async function extractTextFromFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const fileType = file.type

  if (fileType === 'text/plain') {
    return new TextDecoder().decode(buffer)
  } else {
    // For demo purposes, try to decode as text
    // In production, add proper parsing for PDF/DOCX
    return new TextDecoder().decode(buffer)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Skip auth check in development mode unless FORCE_AUTH is set
    if (process.env.NODE_ENV !== 'development' || process.env.FORCE_AUTH) {
      const session = await getServerSession(authOptions)
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Extract text from file
    const text = await extractTextFromFile(file)

    // Generate flash cards using OpenAI
    const prompt = `You are a flash card generator. Generate 10-15 flash cards from book content only.

IMPORTANT: Return ONLY valid JSON. No explanations, no markdown, just JSON.

Format: Return a JSON array of objects with these exact fields:
- question: string (the question)
- answer: string (the answer)  
- source: string (exact quote from the book text)

Example:
[
  {
    "question": "What does the book say about climate change?",
    "answer": "The book states that climate change is caused by human activities.",
    "source": "Climate change is primarily caused by human activities such as burning fossil fuels."
  }
]

TEXT TO PROCESS:
${text.substring(0, 3000)}

Return ONLY the JSON array:`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // Best balance of quality, speed, and cost for flash card generation
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3, // Lower temperature for more consistent JSON output
    })

    const cardsText = completion.choices[0]?.message?.content
    if (!cardsText) {
      return NextResponse.json({ error: 'Failed to generate cards' }, { status: 500 })
    }

    let cards
    try {
      // Clean the response by removing markdown code blocks
      let cleanCardsText = cardsText.trim()
      
      // Remove markdown code block formatting if present
      if (cleanCardsText.startsWith('```json')) {
        cleanCardsText = cleanCardsText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanCardsText.startsWith('```')) {
        cleanCardsText = cleanCardsText.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      cards = JSON.parse(cleanCardsText)
    } catch (parseError) {
      console.error('AI returned non-JSON response:', cardsText, 'Error:', parseError)
      return NextResponse.json({ 
        error: 'AI returned an invalid response format. Please try with a different text file or ensure the file contains readable book content.',
        details: 'The AI response was not in the expected JSON format'
      }, { status: 500 })
    }

    // Validate that we got an array
    if (!Array.isArray(cards)) {
      console.error('AI returned non-array response:', cards)
      return NextResponse.json({ 
        error: 'AI returned an invalid response format. Expected an array of cards.',
        details: 'The AI response was not in the expected array format'
      }, { status: 500 })
    }

    // Validate that we have at least some cards
    if (cards.length === 0) {
      return NextResponse.json({ 
        error: 'No flash cards could be generated from the provided text. Please ensure the file contains substantial book content.',
        details: 'The AI could not generate any cards from the text'
      }, { status: 500 })
    }

    // Validate and clean up cards
    const validatedCards = cards.map((card: GeneratedCard, index: number) => ({
      id: `card-${index + 1}`,
      question: card.question || 'Question not generated',
      answer: card.answer || 'Answer not generated',
      type: 'text', // Default type since it's not in the AI response
      source: card.source || '',
      difficulty: 'medium' as const,
      studySessions: 0,
      lastReviewed: null,
      nextReview: new Date().toISOString(),
    }))

    return NextResponse.json({ cards: validatedCards })
  } catch (error) {
    console.error('Error generating cards:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}