# Unofficial PubMed MCP Server

A Model Context Protocol (MCP) server that provides access to PubMed's vast database of over 35 million biomedical citations. This server enables AI assistants and applications to search, retrieve metadata, and access full-text research articles from the world's largest biomedical literature database.

## Features

- **Keyword Search**: Search PubMed with natural language queries and medical terms
- **Advanced Search**: Filter by author, journal, publication date, and more
- **Rich Metadata**: Get comprehensive article information including abstracts, MeSH terms, and DOIs
- **PDF Access**: Download full-text PDFs when available through PMC
- **Fast & Reliable**: Built on NCBI's official E-utilities API
- **MCP Compatible**: Works seamlessly with Claude Desktop and other MCP clients

## Usage

### Claude Desktop Integration

```json
{
  "mcpServers": {
    "pubmed": {
      "command": "npx",
      "args": ["-y","/path/to/pubmed-mcp-server/src/index.js"]
    }
  }
}
```

## API Reference

The server provides a single unified tool `pubmed_articles` with four methods:

### 1. Search Keywords (`search_keywords`)

Search PubMed using keywords and natural language queries.

**Parameters:**
- `method`: `"search_keywords"`
- `keywords` (required): Search query string
- `num_results` (optional): Number of results (1-100, default: 10)

**Example:**
```json
{
  "method": "search_keywords",
  "keywords": "CRISPR gene editing cancer therapy",
  "num_results": 5
}
```

### 2. Advanced Search (`search_advanced`)

Perform filtered searches with specific criteria.

**Parameters:**
- `method`: `"search_advanced"`
- `term` (optional): General search term
- `title` (optional): Search in article titles
- `author` (optional): Author name(s)
- `journal` (optional): Journal name or abbreviation
- `start_date` (optional): Start date (YYYY/MM/DD format)
- `end_date` (optional): End date (YYYY/MM/DD format)
- `num_results` (optional): Number of results (1-100, default: 10)

**Example:**
```json
{
  "method": "search_advanced",
  "author": "Smith J",
  "journal": "Nature",
  "start_date": "2023/01/01",
  "end_date": "2024/12/31",
  "num_results": 10
}
```

### 3. Get Article Metadata (`get_article_metadata`)

Retrieve detailed metadata for a specific article.

**Parameters:**
- `method`: `"get_article_metadata"`
- `pmid` (required): PubMed ID (string or integer)

**Example:**
```json
{
  "method": "get_article_metadata",
  "pmid": "12345678"
}
```

### 4. Download PDF (`get_article_pdf`)

Attempt to access the full-text PDF of an article.

**Parameters:**
- `method`: `"get_article_pdf"`
- `pmid` (required): PubMed ID (string or integer)

**Example:**
```json
{
  "method": "get_article_pdf",
  "pmid": "12345678"
}
```

## Response Format

All methods return detailed article information including:

```json
{
  "pmid": "12345678",
  "title": "Article Title",
  "authors": ["Smith, John", "Doe, Jane"],
  "journal": "Nature Medicine",
  "publication_date": "2024-03-15",
  "abstract": "Article abstract...",
  "doi": "10.1038/s41591-024-12345-6",
  "pmcid": "PMC1234567",
  "keywords": ["keyword1", "keyword2"],
  "mesh_terms": ["MeSH Term 1", "MeSH Term 2"],
  "url": "https://pubmed.ncbi.nlm.nih.gov/12345678/"
}
```

## Search Tips

### Keyword Search Best Practices

- Use medical terminology and standardized terms when possible
- Combine multiple concepts: `"diabetes AND insulin AND therapy"`
- Use wildcards for variations: `"cardi*"` (matches cardiac, cardiology, etc.)
- Include drug names, disease names, and intervention types

### Advanced Search Examples

**Find recent COVID-19 vaccine studies:**
```json
{
  "method": "search_advanced",
  "term": "COVID-19 vaccine",
  "start_date": "2023/01/01",
  "num_results": 20
}
```

**Search specific author's work in high-impact journals:**
```json
{
  "method": "search_advanced",
  "author": "Smith JA",
  "journal": "New England Journal of Medicine",
  "start_date": "2020/01/01"
}
```

**Note**: This is an unofficial tool. Please respect PubMed's usage guidelines and rate limits when using this server. 