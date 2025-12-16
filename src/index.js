#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { searchKeywords, searchAdvanced, getArticleMetadata, downloadFullTextPdf } from './pubmed-search.js';

const server = new Server(
  {
    name: 'pubmed-mcp-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'pubmed_articles',
        description: 'Unified tool for PubMed operations: search biomedical literature, retrieve article metadata, and download PDFs. Access over 35 million citations from the world\'s largest biomedical database. Use the method parameter to specify the operation type: search with keywords, advanced filtered search, get detailed metadata, or download full-text PDFs when available.',
        inputSchema: {
          type: 'object',
          properties: {
            method: {
              type: 'string',
              enum: ['search_keywords', 'search_advanced', 'get_article_metadata', 'get_article_pdf'],
              description: 'The operation to perform: search_keywords (search with keywords), search_advanced (search with filters), get_article_metadata (get detailed metadata), or get_article_pdf (download full-text PDF)'
            },
            keywords: {
              type: 'string',
              description: 'For search_keywords: Search query string with keywords, medical terms, drug names, diseases, or any biomedical research terms. Can include multiple terms separated by spaces (implicit AND logic) or use PubMed search operators like OR, AND, NOT.'
            },
            num_results: {
              type: 'integer',
              default: 10,
              minimum: 1,
              description: 'For search methods: Maximum number of results to return (default: 10). Note: PubMed API may have its own limits and may return fewer results than requested.'
            },
            pmid: {
              oneOf: [
                { type: 'string' },
                { type: 'integer' }
              ],
              description: 'For get_article_metadata and get_article_pdf: PubMed ID (PMID) of the article - the unique identifier for PubMed articles (e.g., "12345678" or 12345678)'
            },
            term: {
              type: 'string',
              description: 'For search_advanced: General search term for title, abstract, and keywords'
            },
            title: {
              type: 'string', 
              description: 'For search_advanced: Search specifically in article titles'
            },
            author: {
              type: 'string',
              description: 'For search_advanced: Author name(s) to search for (e.g., "Smith J", "John Smith")'
            },
            journal: {
              type: 'string',
              description: 'For search_advanced: Journal name or abbreviation (e.g., "Nature", "N Engl J Med", "Science")'
            },
            start_date: {
              type: 'string',
              description: 'For search_advanced: Start date for publication date range in format YYYY/MM/DD (e.g., "2020/01/01")'
            },
            end_date: {
              type: 'string',
              description: 'For search_advanced: End date for publication date range in format YYYY/MM/DD (e.g., "2024/12/31")'
            }
          },
          required: ['method'],
          additionalProperties: false
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name !== 'pubmed_articles') {
    throw new Error(`Unknown tool: ${name}`);
  }

  try {
    const { method, ...params } = args;

    switch (method) {
      case 'search_keywords': {
        const { keywords, num_results = 10 } = params;
        if (!keywords) {
          throw new Error('keywords parameter is required for search_keywords');
        }
        
        const results = await searchKeywords(keywords, num_results);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
      }

      case 'search_advanced': {
        const { num_results = 10, ...searchParams } = params;
        const advancedParams = { 
          method,
          num_results,
          ...searchParams 
        };
        
        const results = await searchAdvanced(advancedParams);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
      }

      case 'get_article_metadata': {
        const { pmid } = params;
        if (!pmid) {
          throw new Error('pmid parameter is required for get_article_metadata');
        }
        
        const result = await getArticleMetadata(pmid);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'get_article_pdf': {
        const { pmid } = params;
        if (!pmid) {
          throw new Error('pmid parameter is required for get_article_pdf');
        }
        
        const result = await downloadFullTextPdf(pmid);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown method: ${method}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: errorMessage }, null, 2)
        }
      ]
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // Log to stderr so it doesn't interfere with JSON-RPC
  process.stderr.write('PubMed MCP server running on stdio\n');
}

main().catch((error) => {
  process.stderr.write(`Server error: ${error}\n`);
  process.exit(1);
});
