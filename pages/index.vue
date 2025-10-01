<template>
  <div class="min-h-screen bg-background">
    <!-- Login Page -->
    <div v-if="!isLoggedIn" class="flex items-center justify-center min-h-screen p-4">
      <Card class="w-full max-w-md">
        <CardHeader class="text-center space-y-2">
          <CardTitle class="text-3xl font-bold">AI Chatbot</CardTitle>
          <CardDescription class="text-base">
            Sign in to start your conversation with our AI assistant
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <Button @click="login" class="w-full" size="lg">
            <svg class="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-2 0V5H5v10h10v-1a1 1 0 112 0v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4z" clip-rule="evenodd" />
            </svg>
            Sign in with Logto
          </Button>
        </CardContent>
      </Card>
    </div>

    <!-- Main Chat Application -->
    <div v-else class="flex h-screen bg-background overflow-hidden">
      <!-- Mobile Sidebar Overlay -->
      <div 
        v-if="isMobileMenuOpen" 
        class="fixed inset-0 bg-black/50 z-40 md:hidden"
        @click="isMobileMenuOpen = false"
      ></div>
      
      <!-- Mobile Sidebar -->
      <div 
        class="fixed left-0 top-0 h-full w-80 bg-background border-r z-50 md:hidden transition-transform duration-300 ease-in-out"
        :class="isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'"
      >
        <div class="flex flex-col h-full">
          <!-- Sidebar Header -->
          <div class="flex-shrink-0 p-4 border-b">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold">Conversations</h2>
              <div class="flex items-center gap-2">
                <Button @click="createNewChat" size="sm" variant="default">
                  <Plus/>
                  New
                </Button>
                <Button 
                  @click="isMobileMenuOpen = false" 
                  variant="ghost" 
                  size="sm"
                >
                  <X/>
                </Button>
              </div>
            </div>
          </div>

          <!-- Chat Sessions -->
          <div class="flex-1 overflow-y-auto">
            <div class="p-2 space-y-1">
              <!-- Loading state -->
              <div v-if="isLoadingSessions" class="space-y-2 p-2">
                <div v-for="i in 3" :key="i" class="animate-pulse">
                  <div class="flex items-center space-x-3 p-3">
                    <div class="w-2 h-2 bg-muted rounded-full"></div>
                    <div class="flex-1">
                      <div class="h-4 bg-muted rounded mb-2"></div>
                      <div class="h-3 bg-muted/70 rounded w-3/4"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Chat sessions -->
              <div v-else>
                <div
                  v-for="session in chatSessions"
                  :key="session.id"
                  @click="selectSession(session.id)"
                  class="group relative flex items-center space-x-3 rounded-lg p-3 text-sm hover:bg-accent cursor-pointer transition-colors"
                  :class="{ 'bg-accent': currentSessionId === session.id }"
                >
                  <div class="flex-shrink-0">
                    <div class="w-2 h-2 bg-primary rounded-full opacity-60"></div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-medium truncate">{{ session.title }}</div>
                    <div class="text-xs text-muted-foreground">
                      {{ formatDate(session.createdAt) }}
                    </div>
                  </div>
                </div>
                
                <div v-if="chatSessions.length === 0 && !isLoadingSessions" class="text-center py-8 text-muted-foreground text-sm">
                  No conversations yet.<br>
                  <span class="text-xs">Start a new chat to get started.</span>
                </div>
              </div>
            </div>
          </div>

          <!-- User Profile -->
          <div class="flex-shrink-0 p-4 border-t">
            <div class="flex items-center space-x-3">
              <Avatar class="w-9 h-9">
                <AvatarFallback class="bg-primary/10 text-primary">
                  {{ user?.email?.charAt(0)?.toUpperCase() || 'U' }}
                </AvatarFallback>
              </Avatar>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium truncate">
                  {{ user?.email || 'User' }}
                </div>
                <div class="text-xs text-muted-foreground">Online</div>
              </div>
              <Button @click="logout" variant="ghost" size="sm">
                <LogOut/>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- Desktop Sidebar -->
      <div class="hidden md:flex md:w-80 md:flex-col border-r bg-muted/30 h-screen overflow-hidden">
        <!-- Sidebar Header -->
        <div class="flex-shrink-0 p-4 border-b">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">Conversations</h2>
            <Button @click="createNewChat" size="sm" variant="default">
              <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              New
            </Button>
          </div>
        </div>

        <!-- Chat Sessions -->
        <div class="flex-1 overflow-y-auto">
          <div class="p-2 space-y-1">
            <!-- Loading state -->
            <div v-if="isLoadingSessions" class="space-y-2 p-2">
              <div v-for="i in 3" :key="i" class="animate-pulse">
                <div class="flex items-center space-x-3 p-3">
                  <div class="w-2 h-2 bg-muted rounded-full"></div>
                  <div class="flex-1">
                    <div class="h-4 bg-muted rounded mb-2"></div>
                    <div class="h-3 bg-muted/70 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Chat sessions -->
            <div v-else>
              <div
                v-for="session in chatSessions"
                :key="session.id"
                @click="selectSession(session.id)"
                class="group relative flex items-center space-x-3 rounded-lg p-3 text-sm hover:bg-accent cursor-pointer transition-colors"
                :class="{ 'bg-accent': currentSessionId === session.id }"
              >
                <div class="flex-shrink-0">
                  <div class="w-2 h-2 bg-primary rounded-full opacity-60"></div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-medium truncate">{{ session.title }}</div>
                  <div class="text-xs text-muted-foreground">
                    {{ formatDate(session.createdAt) }}
                  </div>
                </div>
              </div>
              
              <div v-if="chatSessions.length === 0 && !isLoadingSessions" class="text-center py-8 text-muted-foreground text-sm">
                No conversations yet.<br>
                <span class="text-xs">Start a new chat to get started.</span>
              </div>
            </div>
          </div>
        </div>

        <!-- User Profile -->
        <div class="flex-shrink-0 p-4 border-t">
          <div class="flex items-center space-x-3">
            <Avatar class="w-9 h-9">
              <AvatarFallback class="bg-primary/10 text-primary">
                {{ user?.email?.charAt(0)?.toUpperCase() || 'U' }}
              </AvatarFallback>
            </Avatar>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">
                {{ user?.email || 'User' }}
              </div>
              <div class="text-xs text-muted-foreground">Online</div>
            </div>
            <Button @click="logout" variant="ghost" size="sm">
              <LogOut/>
            </Button>
          </div>
        </div>
      </div>

      <!-- Main Chat Area -->
      <div class="flex-1 flex flex-col min-w-0">
        <!-- Chat Header (Mobile) -->
        <div class="md:hidden flex items-center justify-between p-3 sm:p-4 border-b bg-background/95 backdrop-blur">
          <div class="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
            <Button 
              @click="isMobileMenuOpen = true"
              variant="ghost" 
              size="icon"
              class="flex-shrink-0"
            >
              <Menu/>
            </Button>
            <h1 class="font-semibold truncate text-sm sm:text-base">
              {{ currentSession?.title || 'AI Chatbot' }}
            </h1>
          </div>
          <Button @click="logout" variant="ghost" size="sm" class="flex-shrink-0">
            <LogOut/>
          </Button>
        </div>

        <!-- Welcome Screen -->
        <div v-if="!currentSessionId" class="flex-1 flex items-center justify-center p-8">
          <div class="text-center max-w-md mx-auto space-y-6">
            <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div class="space-y-2">
              <h2 class="text-2xl font-bold">Welcome to AI Chatbot</h2>
              <p class="text-muted-foreground">
                Start a new conversation or select an existing chat from the sidebar
              </p>
            </div>
            <Button @click="createNewChat" size="lg" class="md:hidden">
              <Plus/>
              Start New Chat
            </Button>
          </div>
        </div>

        <!-- Chat Messages and Input -->
        <div v-else class="flex flex-col h-full overflow-hidden">
          <!-- Messages Container -->
          <div ref="messagesContainer" class="flex-1 overflow-y-auto overflow-x-hidden px-2 sm:px-4 md:px-6">
            <div class="space-y-3 sm:space-y-4 py-4">
              <div
                v-for="message in messages"
                :key="message.id"
                class="flex message-appear"
                :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
              >
                <div class="flex w-full max-w-none sm:max-w-[85%] md:max-w-[70%]" :class="message.role === 'user' ? 'flex-row-reverse' : 'flex-row'">
                  <!-- Avatar -->
                  <div class="flex-shrink-0 avatar-appear" :class="message.role === 'user' ? 'ml-2 sm:ml-3' : 'mr-2 sm:mr-3'">
                    <Avatar class="w-7 h-7 sm:w-8 sm:h-8">
                      <AvatarFallback :class="message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'">
                        {{ message.role === 'user' ? (user?.email?.charAt(0)?.toUpperCase() || 'U') : 'AI' }}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  
                  <!-- Message Content -->
                  <div class="flex flex-col space-y-1 min-w-0 flex-1">
                    <div
                      class="rounded-lg px-3 py-2 sm:px-4 text-sm bubble-appear max-w-full overflow-hidden"
                      :class="[
                        message.role === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted',
                        message.role === 'assistant' && message.content ? 'streaming-content' : ''
                      ]"
                    >
                      <div 
                        v-if="message.role === 'assistant'"
                        class="markdown-content break-words streaming-text overflow-wrap-anywhere"
                        v-html="message.streaming && message.id === streamingMessageId ? renderMarkdown(streamingText) : getRenderedContent(message)"
                      ></div>
                      <div v-else class="whitespace-pre-wrap break-words overflow-wrap-anywhere">{{ message.content }}</div>
                      
                      <!-- Typing cursor for streaming messages -->
                      <span 
                        v-if="message.role === 'assistant' && message.streaming && isLastAIMessage(message.id)"
                        class="typing-cursor"
                      >|</span>
                    </div>
                    <div class="text-xs text-muted-foreground px-1 timestamp-appear" :class="message.role === 'user' ? 'text-right' : 'text-left'">
                      {{ formatTime(message.createdAt) }}
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Loading messages indicator -->
              <div v-if="isLoadingMessages" class="flex justify-center py-8">
                <div class="flex items-center space-x-2 text-muted-foreground">
                  <div class="w-4 h-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"></div>
                  <span class="text-sm">Loading messages...</span>
                </div>
              </div>
              
              <!-- Loading indicator - show when waiting for AI response -->
              <div v-if="isLoading" class="flex justify-start">
                <div class="flex max-w-[70%]">
                  <div class="mr-3">
                    <Avatar class="w-8 h-8">
                      <AvatarFallback class="bg-muted">AI</AvatarFallback>
                    </Avatar>
                  </div>
                  <div class="bg-muted rounded-lg px-4 py-2">
                    <div class="flex space-x-1">
                      <div class="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                      <div class="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                      <div class="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Error indicator -->
              <div v-if="error" class="flex justify-start">
                <div class="flex max-w-[85%] md:max-w-[70%]">
                  <div class="mr-3">
                    <Avatar class="w-8 h-8">
                      <AvatarFallback class="bg-destructive text-destructive-foreground">!</AvatarFallback>
                    </Avatar>
                  </div>
                  <div class="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2">
                    <p class="text-sm text-destructive">Error: {{ error.message }}</p>
                    <Button @click="clearError" size="sm" variant="outline" class="mt-2">
                      Try Again
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Input Area -->
          <div class="flex-shrink-0 border-t bg-background p-3 sm:p-4">
            <div class="flex space-x-2 w-full max-w-4xl mx-auto">
              <Input
                v-model="input"
                placeholder="Type your message..."
                @keydown.enter="handleSubmit"
                :disabled="isLoading || !currentSessionId"
                class="flex-1 min-w-0"
              />
              <Button @click="handleSubmit" :disabled="isLoading || !input.trim() || !currentSessionId" class="flex-shrink-0">
                <svg v-if="!isLoading" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { LogOut, Menu, X, Plus } from 'lucide-vue-next';
import MarkdownIt from 'markdown-it'

const { user, isLoggedIn, login, logout } = useAuth()

// Initialize markdown parser
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true
})

const chatSessions = ref([])
const currentSessionId = ref(null)
const isMobileMenuOpen = ref(false)
const messagesContainer = ref(null)
const isLoadingSessions = ref(false)
const isLoadingMessages = ref(false)

// Chat state
const messages = ref([])
const input = ref('')
const isLoading = ref(false)
const error = ref(null)
const streamingText = ref('')
const streamingMessageId = ref(null)

const clearError = () => {
  error.value = null
}

// Computed properties
const currentSession = computed(() => 
  chatSessions.value.find(session => session.id === currentSessionId.value)
)

// Markdown rendering function
const getRenderedContent = (message) => {
  if (message.role === 'assistant') {
    return renderMarkdown(message.content)
  }
  return message.content
}

// Fetch chat sessions when user is logged in
watch(
  [isLoggedIn, () => user],
  async ([loggedIn, u]) => {
    if (loggedIn && u && u.sub && u.email) {
      await fetchChatSessions(u.sub)
    } else {
      // Reset sessions if user is not properly authenticated
      chatSessions.value = []
      currentSessionId.value = null
      messages.value = []
    }
  },
  { immediate: true }
)



// Auto-scroll when messages change
watch(messages, () => {
  nextTick(() => {
    scrollToBottom()
  })
}, { deep: true, flush: 'post' })

// Auto-scroll when loading state changes
watch(isLoading, (newValue) => {
  if (!newValue) {
    // Scroll after loading completes
    setTimeout(() => {
      scrollToBottom()
    }, 100)
  }
})

// Handle body scroll prevention for mobile menu
watch(isMobileMenuOpen, (newValue) => {
  if (process.client) {
    if (newValue) {
      document.body.classList.add('mobile-menu-open')
    } else {
      document.body.classList.remove('mobile-menu-open')
    }
  }
})

// Cleanup on unmount
onUnmounted(() => {
  if (process.client) {
    document.body.classList.remove('mobile-menu-open')
  }
})

async function fetchChatSessions(logtoUserId) {
  if (isLoadingSessions.value) return // Prevent multiple concurrent fetches
  
  try {
    isLoadingSessions.value = true
    console.log('Fetching chat sessions...')
    const response = await $fetch(`/api/sessions?userId=${logtoUserId}`)
    console.log('Sessions response:', response)
    chatSessions.value = response.data || []
    console.log('Chat sessions loaded:', chatSessions.value.length)
  } catch (error) {
    console.error('Failed to fetch chat sessions:', error)
    chatSessions.value = []
    error.value = error
  } finally {
    isLoadingSessions.value = false
  }
}

async function createNewChat() {
  try {
    console.log('Creating new chat...')
    const response = await $fetch('/api/sessions', {
      method: 'POST'
    })
    console.log('New chat response:', response)
    chatSessions.value.unshift(response.data)
    currentSessionId.value = response.data.id
    
    // Clear messages for new chat
    messages.value = []
    
    isMobileMenuOpen.value = false // Close mobile menu after creating chat
    scrollToBottom() // Ensure we're at bottom for new chat
    console.log('New chat created with ID:', response.data.id)
  } catch (error) {
    console.error('Failed to create new chat:', error)
    error.value = error
  }
}

async function selectSession(sessionId) {
  console.log('Selecting session:', sessionId)
  currentSessionId.value = sessionId
  isMobileMenuOpen.value = false // Close mobile menu after selecting session
  
  try {
    isLoadingMessages.value = true
    messages.value = [] // Clear current messages while loading
    
    const response = await $fetch(`/api/sessions/${sessionId}`)
    console.log('Session data:', response)
    const sessionMessages = response.data.messages || []
    
    // Convert database messages to proper format
    const formattedMessages = sessionMessages.map(msg => ({
      id: msg.id.toString(),
      role: msg.role,
      content: msg.content,
      createdAt: new Date(msg.createdAt)
    }))
    
    console.log('Formatted messages:', formattedMessages)
    // Set messages
    messages.value = formattedMessages
    scrollToBottom() // Scroll to bottom when opening chat
  } catch (error) {
    console.error('Failed to fetch session messages:', error)
    messages.value = []
    error.value = error
  } finally {
    isLoadingMessages.value = false
  }
}

async function handleSubmit() {
  if (!input.value.trim() || isLoading.value || !currentSessionId.value) return
  
  const messageContent = input.value.trim()
  input.value = '' // Clear input immediately
  
  // Add user message to UI immediately
  const userMessage = {
    id: Date.now(),
    content: messageContent,
    role: 'user',
    createdAt: new Date()
  }
  messages.value.push(userMessage)

  // Scroll to show user message
  scrollToBottom()

  isLoading.value = true
  let aiMessage = null

  try {
    // Send message to API
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages.value,
        sessionId: currentSessionId.value
      })
    })

    if (!response.ok) throw new Error('Failed to send message')

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    // Stream the response
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            break
          }
          try {
            const parsed = JSON.parse(data)
            if (parsed.content) {
              // Create AI message only when we get the first content
              if (!aiMessage) {
                aiMessage = {
                  id: Date.now() + 1,
                  content: '',
                  role: 'assistant',
                  createdAt: new Date(),
                  streaming: true
                }
                messages.value.push(aiMessage)
                streamingMessageId.value = aiMessage.id
                streamingText.value = ''
                isLoading.value = false // Turn off loading when streaming starts
                
                // Small delay to let the bubble appear animation complete
                setTimeout(() => {
                  scrollToBottom()
                }, 100)
              }
              
              // Update streaming text
              streamingText.value += parsed.content
              
              // Also update the message content for final storage
              aiMessage.content += parsed.content
              
              // Ensure DOM updates and scroll
              await nextTick()
              scrollToBottom()
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
    
    // Mark streaming as complete
    if (aiMessage) {
      aiMessage.streaming = false
      streamingMessageId.value = null
      streamingText.value = ''
    }
    
    // If no content was received but stream ended, turn off loading
    if (isLoading.value) {
      isLoading.value = false
    }
  } catch (error) {
    console.error('Failed to send message:', error)
    // Remove the user message if failed
    messages.value = messages.value.slice(0, -1)
    isLoading.value = false
    error.value = error
    // Restore input on error
    input.value = messageContent
  }
}



function formatDate(date) {
  return new Date(date).toLocaleDateString()
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function renderMarkdown(content) {
  if (!content) return ''
  return md.render(content)
}

function scrollToBottom() {
  nextTick(() => {
    setTimeout(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    }, 10)
  })
}

function isLastAIMessage(messageId) {
  const aiMessages = messages.value.filter(m => m.role === 'assistant')
  return aiMessages.length > 0 && aiMessages[aiMessages.length - 1].id === messageId
}
</script>

<style scoped>
/* Markdown styling for AI messages */
:deep(.markdown-content) {
  line-height: 1.6;
}

:deep(.markdown-content h1),
:deep(.markdown-content h2), 
:deep(.markdown-content h3),
:deep(.markdown-content h4),
:deep(.markdown-content h5),
:deep(.markdown-content h6) {
  font-weight: 600;
  margin: 1rem 0 0.5rem 0;
}

:deep(.markdown-content h1) { font-size: 1.5rem; }
:deep(.markdown-content h2) { font-size: 1.3rem; }
:deep(.markdown-content h3) { font-size: 1.1rem; }

:deep(.markdown-content p) {
  margin: 0.5rem 0;
}

:deep(.markdown-content strong) {
  font-weight: 600;
}

:deep(.markdown-content em) {
  font-style: italic;
}

:deep(.markdown-content ul),
:deep(.markdown-content ol) {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

:deep(.markdown-content li) {
  margin: 0.25rem 0;
}

:deep(.markdown-content code) {
  background-color: rgba(0, 0, 0, 0.1);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-family: monospace;
  font-size: 0.875rem;
}

:deep(.markdown-content pre) {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 0.75rem;
  border-radius: 0.375rem;
  overflow-x: auto;
  margin: 0.5rem 0;
}

:deep(.markdown-content pre code) {
  background-color: transparent;
  padding: 0;
}

:deep(.markdown-content hr) {
  border: none;
  border-top: 1px solid rgba(0, 0, 0, 0.2);
  margin: 1rem 0;
}

:deep(.markdown-content blockquote) {
  border-left: 3px solid rgba(0, 0, 0, 0.2);
  padding-left: 1rem;
  margin: 0.5rem 0;
  font-style: italic;
}

/* Message animations */
.message-appear {
  animation: messageSlideIn 0.3s ease-out;
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.avatar-appear {
  animation: avatarFadeIn 0.4s ease-out;
}

@keyframes avatarFadeIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.bubble-appear {
  animation: bubbleExpand 0.3s ease-out;
  transform-origin: bottom left;
}

@keyframes bubbleExpand {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.timestamp-appear {
  animation: timestampFadeIn 0.5s ease-out 0.2s both;
}

@keyframes timestampFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Streaming content animations */
.streaming-content {
  position: relative;
  overflow: hidden;
}

.streaming-text {
  animation: textReveal 0.5s ease-out;
}

@keyframes textReveal {
  from {
    opacity: 0.7;
  }
  to {
    opacity: 1;
  }
}

/* Typing cursor animation */
.typing-cursor {
  display: inline-block;
  animation: cursorBlink 1s infinite;
  color: currentColor;
  font-weight: normal;
  margin-left: 2px;
}

@keyframes cursorBlink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
}

/* Smooth content transitions */
.markdown-content {
  transition: all 0.2s ease-out;
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
}

/* Mobile-specific improvements */
@media (max-width: 640px) {
  .markdown-content {
    font-size: 0.875rem;
    line-height: 1.4;
  }
  
  .markdown-content pre {
    overflow-x: auto;
    max-width: 100%;
    font-size: 0.75rem;
  }
  
  .markdown-content code {
    word-break: break-all;
    white-space: pre-wrap;
  }
  
  .markdown-content table {
    display: block;
    overflow-x: auto;
    white-space: nowrap;
  }
}

/* Prevent horizontal overflow */
.overflow-wrap-anywhere {
  overflow-wrap: anywhere;
  word-break: break-word;
  hyphens: auto;
}

/* Loading animation enhancements */
.animate-bounce {
  animation-duration: 0.6s;
}

/* Hover effects for messages */
.message-appear:hover .bubble-appear {
  transform: translateY(-1px);
  transition: transform 0.2s ease-out;
}

/* Mobile sidebar animations */
.mobile-sidebar-enter-active,
.mobile-sidebar-leave-active {
  transition: transform 0.3s ease-in-out;
}

.mobile-sidebar-enter-from {
  transform: translateX(-100%);
}

.mobile-sidebar-leave-to {
  transform: translateX(-100%);
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .message-appear {
    animation-duration: 0.25s;
  }
  
  .bubble-appear {
    animation-duration: 0.25s;
  }
  
  /* Prevent body scroll when mobile menu is open */
  body.mobile-menu-open {
    overflow: hidden;
  }
}
</style>

