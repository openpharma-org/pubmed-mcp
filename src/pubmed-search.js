const axios = require('axios');
const xml2js = require('xml2js');
const { promisify } = require('util');

const parseXML = promisify(xml2js.parseString);

function generatePubMedSearchUrl(term, numResults = 10) {
  const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
  const encodedTerm = encodeURIComponent(term);
  return `${baseUrl}?db=pubmed&term=${encodedTerm}&retmax=${numResults}&retmode=xml`;
}

async function searchPubMed(searchUrl) {
  try {
    const response = await axios.get(searchUrl, {
      timeout: 30000,
      headers: {
        'User-Agent': 'PubMed-MCP-Server/1.0.0 (uh-joan@github.com)'
      }
    });

    const result = await parseXML(response.data);
    const pmids = [];

    if (result?.eSearchResult?.IdList?.[0]?.Id) {
      const ids = result.eSearchResult.IdList[0].Id;
      for (const id of ids) {
        if (typeof id === 'string') {
          pmids.push(id);
        } else if (id?._) {
          pmids.push(id._);
        }
      }
    }

    return pmids;
  } catch (error) {
    console.error('Error searching PubMed:', error.message);
    return [];
  }
}

async function getPubMedMetadata(pmid) {
  try {
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmid}&retmode=xml`;
    
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'PubMed-MCP-Server/1.0.0 (uh-joan@github.com)'
      }
    });

    const result = await parseXML(response.data);
    const article = result?.PubmedArticleSet?.PubmedArticle?.[0];

    if (!article) return null;

    const medlineCitation = article.MedlineCitation?.[0];
    const pubmedData = article.PubmedData?.[0];

    if (!medlineCitation) return null;

    const title = medlineCitation.Article?.[0]?.ArticleTitle?.[0] || 'No title available';
    const journal = medlineCitation.Article?.[0]?.Journal?.[0]?.Title?.[0] || 'Unknown journal';

    const authors = [];
    const authorList = medlineCitation.Article?.[0]?.AuthorList?.[0]?.Author;
    if (authorList) {
      for (const author of authorList) {
        const lastName = author.LastName?.[0] || '';
        const foreName = author.ForeName?.[0] || '';
        if (lastName) {
          authors.push(`${lastName}, ${foreName}`.trim());
        }
      }
    }

    let publicationDate = 'Unknown date';
    const pubDate = medlineCitation.Article?.[0]?.Journal?.[0]?.JournalIssue?.[0]?.PubDate?.[0];
    if (pubDate) {
      const year = pubDate.Year?.[0] || '';
      const month = pubDate.Month?.[0] || '';
      const day = pubDate.Day?.[0] || '';
      publicationDate = [year, month, day].filter(Boolean).join('-');
    }

    const abstractTexts = medlineCitation.Article?.[0]?.Abstract?.[0]?.AbstractText;
    let abstract = '';
    if (abstractTexts) {
      abstract = abstractTexts.map(text => {
        if (typeof text === 'string') return text;
        if (text._) return text._;
        return '';
      }).join(' ');
    }

    let doi = '';
    const articleIds = pubmedData?.ArticleIdList?.[0]?.ArticleId;
    if (articleIds) {
      for (const id of articleIds) {
        if (id.$ && id.$.IdType === 'doi') {
          doi = id._;
          break;
        }
      }
    }

    let pmcid = '';
    if (articleIds) {
      for (const id of articleIds) {
        if (id.$ && id.$.IdType === 'pmc') {
          pmcid = id._;
          break;
        }
      }
    }

    const meshTerms = [];
    const meshHeadingList = medlineCitation.MeshHeadingList?.[0]?.MeshHeading;
    if (meshHeadingList) {
      for (const heading of meshHeadingList) {
        const descriptorName = heading.DescriptorName?.[0]?._;
        if (descriptorName) {
          meshTerms.push(descriptorName);
        }
      }
    }

    const keywords = [];
    const keywordList = medlineCitation.KeywordList?.[0]?.Keyword;
    if (keywordList) {
      for (const keyword of keywordList) {
        if (typeof keyword === 'string') {
          keywords.push(keyword);
        } else if (keyword._) {
          keywords.push(keyword._);
        }
      }
    }

    return {
      pmid,
      title,
      authors,
      journal,
      publication_date: publicationDate,
      abstract,
      doi,
      pmcid,
      keywords,
      mesh_terms: meshTerms,
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
    };

  } catch (error) {
    console.error(`Error fetching metadata for PMID ${pmid}:`, error.message);
    return null;
  }
}

async function searchKeywords(keywords, numResults = 10) {
  console.log(`Generated search URL for keywords: ${keywords}`);
  
  const searchUrl = generatePubMedSearchUrl(keywords, numResults);
  const pmids = await searchPubMed(searchUrl);
  
  const articles = [];
  for (const pmid of pmids) {
    const metadata = await getPubMedMetadata(pmid);
    if (metadata) {
      articles.push(metadata);
    }
  }
  
  return articles;
}

async function searchAdvanced(params) {
  let searchTerm = '';
  
  const terms = [];
  
  if (params.term) terms.push(params.term);
  if (params.title) terms.push(`${params.title}[Title]`);
  if (params.author) terms.push(`${params.author}[Author]`);
  if (params.journal) terms.push(`${params.journal}[Journal]`);
  
  if (params.start_date && params.end_date) {
    terms.push(`${params.start_date}:${params.end_date}[Date - Publication]`);
  } else if (params.start_date) {
    terms.push(`${params.start_date}:3000[Date - Publication]`);
  } else if (params.end_date) {
    terms.push(`1800:${params.end_date}[Date - Publication]`);
  }
  
  searchTerm = terms.join(' AND ');
  
  if (!searchTerm) {
    throw new Error('At least one search parameter is required');
  }
  
  console.log(`Generated advanced search URL: ${searchTerm}`);
  
  const searchUrl = generatePubMedSearchUrl(searchTerm, params.num_results || 10);
  const pmids = await searchPubMed(searchUrl);
  
  const articles = [];
  for (const pmid of pmids) {
    const metadata = await getPubMedMetadata(pmid);
    if (metadata) {
      articles.push(metadata);
    }
  }
  
  return articles;
}

async function getArticleMetadata(pmid) {
  const pmidStr = typeof pmid === 'number' ? pmid.toString() : pmid;
  console.log(`Fetching metadata for PMID: ${pmidStr}`);
  
  return await getPubMedMetadata(pmidStr);
}

async function downloadFullTextPdf(pmid) {
  const pmidStr = typeof pmid === 'number' ? pmid.toString() : pmid;
  console.log(`PDF download requested for PMID: ${pmidStr}`);
  
  const metadata = await getPubMedMetadata(pmidStr);
  
  if (metadata?.pmcid) {
    return {
      pdf_url: `https://www.ncbi.nlm.nih.gov/pmc/articles/${metadata.pmcid}/pdf/`,
      message: `PDF may be available at PMC: ${metadata.pmcid}`
    };
  }
  
  return {
    message: `PDF not directly available for PMID ${pmidStr}. Check publisher website.`
  };
}

module.exports = {
  searchKeywords,
  searchAdvanced,
  getArticleMetadata,
  downloadFullTextPdf
};
