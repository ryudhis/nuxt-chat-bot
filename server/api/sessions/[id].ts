import { prisma } from '~/lib/prisma'

export default defineEventHandler(async (event) => {
  try {
    const sessionId = getRouterParam(event, 'id')
    
    if (!sessionId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Session ID is required'
      })
    }

    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!session) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Session not found'
      })
    }

    return {
      data: session
    }
  } catch (error: any) {
    console.error('Session detail API error:', error)
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage: error?.message || 'Internal server error'
    })
  }
})