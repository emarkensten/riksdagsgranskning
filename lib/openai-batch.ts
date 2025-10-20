import axios, { AxiosInstance } from 'axios'
import fs from 'fs'
import path from 'path'

interface BatchRequest {
  custom_id: string
  method: 'POST'
  url: string
  body: any
}

interface BatchResponse {
  id: string
  object: string
  endpoint: string
  errors?: Array<any>
  input_file_id: string
  completion_window: string
  status: string
  output_file_id?: string
  error_file_id?: string
  created_at: number
  in_progress_at?: number
  expires_at: number
  started_at?: number
  failed_at?: number
  completed_at?: number
  request_counts: {
    succeeded: number
    errored: number
    total: number
  }
}

interface BatchResult {
  custom_id: string
  result: {
    output: {
      choices: Array<{
        message: {
          content: string
        }
      }>
    }
  }
}

export class OpenAIBatchClient {
  private client: AxiosInstance
  private apiKey: string
  private baseUrl = 'https://api.openai.com/v1'

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || ''
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY environment variable not set')
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    })
  }

  /**
   * Upload a batch file to OpenAI
   */
  async uploadBatchFile(requests: BatchRequest[], filename: string): Promise<string> {
    console.log(`Uploading batch file with ${requests.length} requests...`)

    // Create JSONL content
    const jsonlContent = requests.map((req) => JSON.stringify(req)).join('\n')

    // Write to temporary file
    const tempPath = path.join('/tmp', filename)
    fs.writeFileSync(tempPath, jsonlContent)

    try {
      // Upload file
      const formData = new FormData()
      const fileStream = fs.readFileSync(tempPath)
      const blob = new Blob([fileStream], { type: 'application/json' })
      formData.append('file', blob, filename)
      formData.append('purpose', 'batch')

      const uploadResponse = await this.client.post('/files', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      console.log(`✓ File uploaded: ${uploadResponse.data.id}`)
      return uploadResponse.data.id
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath)
      }
    }
  }

  /**
   * Create a batch job
   */
  async createBatch(
    inputFileId: string,
    completionWindow: string = '24h'
  ): Promise<BatchResponse> {
    console.log('Creating batch job...')

    const response = await this.client.post('/batches', {
      input_file_id: inputFileId,
      endpoint: '/v1/chat/completions',
      completion_window: completionWindow,
    })

    console.log(`✓ Batch created: ${response.data.id}`)
    console.log(`Status: ${response.data.status}`)
    return response.data
  }

  /**
   * Check batch status
   */
  async getBatchStatus(batchId: string): Promise<BatchResponse> {
    const response = await this.client.get(`/batches/${batchId}`)
    return response.data
  }

  /**
   * Poll for batch completion
   */
  async waitForBatchCompletion(
    batchId: string,
    maxWaitMinutes: number = 1440 // 24 hours default
  ): Promise<BatchResponse> {
    const startTime = Date.now()
    const maxWaitMs = maxWaitMinutes * 60 * 1000

    console.log(`Polling batch ${batchId} for completion...`)

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.getBatchStatus(batchId)

      console.log(
        `Status: ${status.status} (${status.request_counts.succeeded}/${status.request_counts.total} completed)`
      )

      if (status.status === 'completed') {
        console.log('✓ Batch completed!')
        return status
      }

      if (status.status === 'failed') {
        throw new Error(`Batch failed: ${JSON.stringify(status.errors)}`)
      }

      // Wait 30 seconds before next poll
      await new Promise((resolve) => setTimeout(resolve, 30000))
    }

    throw new Error(`Batch did not complete within ${maxWaitMinutes} minutes`)
  }

  /**
   * Get batch results
   */
  async getBatchResults(batchId: string): Promise<Map<string, BatchResult>> {
    console.log('Fetching batch results...')

    const status = await this.getBatchStatus(batchId)

    if (!status.output_file_id) {
      throw new Error('No output file available')
    }

    const resultsMap = new Map<string, BatchResult>()

    try {
      const response = await this.client.get(
        `/files/${status.output_file_id}/content`,
        {
          responseType: 'stream',
        }
      )

      // Process JSONL response line by line
      let currentLine = ''

      response.data.on('data', (chunk: Buffer) => {
        const text = chunk.toString()
        currentLine += text

        const lines = currentLine.split('\n')
        currentLine = lines.pop() || ''

        for (const line of lines) {
          if (line.trim()) {
            const result: BatchResult = JSON.parse(line)
            resultsMap.set(result.custom_id, result)
          }
        }
      })

      await new Promise((resolve, reject) => {
        response.data.on('end', resolve)
        response.data.on('error', reject)
      })

      console.log(`✓ Retrieved ${resultsMap.size} results`)
      return resultsMap
    } catch (error) {
      console.error('Error fetching results:', error)
      throw error
    }
  }

  /**
   * Complete end-to-end batch process
   */
  async processBatch(requests: BatchRequest[], filename: string): Promise<Map<string, BatchResult>> {
    console.log(`\n=== Starting batch process ===`)
    console.log(`Processing ${requests.length} requests`)

    // Step 1: Upload
    const fileId = await this.uploadBatchFile(requests, filename)

    // Step 2: Create batch
    const batch = await this.createBatch(fileId)

    // Step 3: Wait for completion
    const completedBatch = await this.waitForBatchCompletion(batch.id)

    // Step 4: Get results
    const results = await this.getBatchResults(completedBatch.id)

    console.log(`\n✓ Batch process complete!`)
    console.log(`Total requests: ${requests.length}`)
    console.log(`Successful: ${completedBatch.request_counts.succeeded}`)
    console.log(`Failed: ${completedBatch.request_counts.errored}`)

    return results
  }
}

/**
 * Cost calculator for batch operations
 */
export function calculateBatchCost(requestCount: number, estimatedInputTokens = 500, estimatedOutputTokens = 200): {
  inputCost: number
  outputCost: number
  totalCost: number
} {
  // GPT-5 Nano Batch API pricing (50% discount from regular)
  // Regular: $0.000025 input, $0.0002 output
  // Batch (50% off): $0.0000125 input, $0.0001 output
  const batchInputPrice = 0.0000125 / 1 // $0.0000125 per token
  const batchOutputPrice = 0.0001 / 1 // $0.0001 per token

  const totalInputTokens = requestCount * estimatedInputTokens
  const totalOutputTokens = requestCount * estimatedOutputTokens

  const inputCost = totalInputTokens * batchInputPrice
  const outputCost = totalOutputTokens * batchOutputPrice

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  }
}

/**
 * Parse LLM response and extract JSON
 */
export function parseJsonResponse(content: string): any {
  // Try to extract JSON from content (may be wrapped in markdown code blocks)
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch (e) {
      console.error('Failed to parse JSON:', content)
      throw new Error('Invalid JSON in LLM response')
    }
  }
  throw new Error('No JSON found in response')
}
