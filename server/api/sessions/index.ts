import { prisma } from '~/lib/prisma'
import { logtoEventHandler } from "#logto";

export default defineEventHandler(async (event) => {
  try {
    const method = getMethod(event)
     await logtoEventHandler(event, useRuntimeConfig(event));

    if (method === 'GET') {
      // Get all sessions for the user
      const query = getQuery(event);
      const logtoId = query.userId as string;

      const userData = await prisma.user.findUnique({
        where: { logtoId },
        select: { id: true }
      });

      if (!userData) {
        throw createError({
          statusCode: 404,
          statusMessage: 'User not found'
        });
      }

      const sessions = await prisma.chatSession.findMany({
        where: { userId: userData.id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return {
        data: sessions
      };
    }

    if (method === 'POST') {
      // Create new session 
      const user = await event.context.logtoUser;
      
      if (!user || !user.sub) {
        throw createError({
          statusCode: 401,
          statusMessage: 'User not authenticated'
        });
      }
      
      // First, ensure user exists
      const userData = await prisma.user.upsert({
        where: { logtoId: user.sub },
        update: {},
        create: {
          email: user.email,
          logtoId: user.sub,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        select: { id: true }
      })

      const session = await prisma.chatSession.create({
        data: {
          userId: userData.id,
          title: 'New Chat'
        }
      })

      return {
        data: session
      }
    }

    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  } catch (error: any) {
    console.error('Sessions API error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error?.message || 'Internal server error'
    })
  }
})