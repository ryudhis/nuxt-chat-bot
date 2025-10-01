import { createError, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { file, type } = body

    if (!file) {
      throw createError({
        statusCode: 400,
        statusMessage: 'File is required'
      })
    }

    // File is expected to be in base64 format
    const base64Data = file.split(',')[1] // Remove data:mime;base64, prefix
    const buffer = Buffer.from(base64Data, 'base64')

    let processedData = {
      originalData: file,
      mimeType: type,
      fileName: '',
      extractedText: ''
    }

    // Process based on file type
    if (type === 'application/pdf') {
      try {
        console.log('Processing PDF, buffer size:', buffer.length)
        
        // Validate buffer size
        if (buffer.length === 0) {
          throw new Error('Empty PDF buffer')
        }

        // Use pdf2json for Node.js compatible PDF parsing
        const PDFParser = (await import('pdf2json')).default
        
        const extractedText = await new Promise<string>((resolve, reject) => {
          const pdfParser = new PDFParser()
          
          pdfParser.on('pdfParser_dataError', (errData: any) => {
            reject(new Error(`PDF parsing error: ${errData.parserError}`))
          })
          
          pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
            try {
              let text = ''
              
              // Extract text from all pages
              if (pdfData.Pages) {
                for (const page of pdfData.Pages) {
                  if (page.Texts) {
                    for (const textItem of page.Texts) {
                      if (textItem.R) {
                        for (const run of textItem.R) {
                          if (run.T) {
                            // Decode URI component and add to text
                            text += decodeURIComponent(run.T) + ' '
                          }
                        }
                      }
                    }
                  }
                  text += '\n\n' // Add page break
                }
              }
              
              resolve(text.trim())
            } catch (parseError: any) {
              reject(new Error(`Text extraction error: ${parseError.message}`))
            }
          })
          
          // Parse the PDF buffer
          pdfParser.parseBuffer(buffer)
        })
        
        processedData.extractedText = extractedText || '[No text found in PDF]'
        console.log('PDF text extracted successfully with pdf2json, length:', extractedText.length)
        console.log('PDF preview:', extractedText.substring(0, 200) + '...')
        
      } catch (error: any) {
        console.error('PDF processing error with pdf2json:', error)
        
        // Simple fallback - just mark as processed without text extraction
        processedData.extractedText = '[PDF upload successful - advanced text extraction failed. File contains PDF content but text could not be extracted.]'
        console.log('PDF uploaded successfully despite text extraction failure')
      }
    } else if (type.startsWith('image/')) {
      // For images, we'll pass the base64 data directly to Gemini Vision
      processedData.originalData = file
      console.log('Image processed for vision analysis')
    } else if (type.startsWith('audio/')) {
      // For audio, use OpenAI Whisper for speech-to-text
      processedData.originalData = file
      
      try {
        console.log('Processing audio file for speech-to-text...')
        
        // Check if OpenAI API key is configured
        const config = useRuntimeConfig()
        const openaiApiKey = config.openaiApiKey
        
        if (!openaiApiKey) {
          console.warn('OpenAI API key not configured, audio transcription unavailable')
          processedData.extractedText = '[Audio uploaded - OpenAI API key required for transcription]'
        } else {
          // Convert base64 to blob for OpenAI API
          const audioBlob = Buffer.from(base64Data, 'base64')
          
          // Create form data for OpenAI Whisper API
          const formData = new FormData()
          const audioFile = new File([audioBlob], 'audio.wav', { type: 'audio/wav' })
          formData.append('file', audioFile)
          formData.append('model', 'whisper-1')
          formData.append('language', 'id') // Indonesian language
          
          // Call OpenAI Whisper API
          const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
            },
            body: formData
          })
          
          if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`)
          }
          
          const transcription = await response.json()
          processedData.extractedText = transcription.text || '[No speech detected in audio]'
          console.log('Audio transcription successful:', transcription.text?.substring(0, 100) + '...')
        }
      } catch (error: any) {
        console.error('Audio transcription error:', error)
        processedData.extractedText = '[Audio upload successful - transcription failed]'
        console.log('Continuing with audio upload despite transcription failure')
      }
    }

    return {
      success: true,
      data: processedData
    }

  } catch (error: any) {
    console.error('File upload error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'File processing failed'
    })
  }
})