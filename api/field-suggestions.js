// /api/field-suggestions.js - Vercel Serverless Function

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      type, // 'research' or 'generate'
      fieldName,
      query,
      prompt,
      currentValue,
      projectContext,
      sectionContext
    } = req.body;

    // Validate required fields
    if (!type || !fieldName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let suggestions = [];

    if (type === 'research') {
      suggestions = await getPerplexityResearch(query, fieldName, projectContext);
    } else if (type === 'generate') {
      suggestions = await getChatGPTGeneration(prompt, fieldName, currentValue, projectContext, sectionContext);
    } else {
      return res.status(400).json({ error: 'Invalid suggestion type' });
    }

    return res.status(200).json({ suggestions });

  } catch (error) {
    console.error('Field suggestions error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate suggestions',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Perplexity Research Function
async function getPerplexityResearch(query, fieldName, projectContext) {
  const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
  
  if (!perplexityApiKey) {
    console.warn('Perplexity API key not found, using fallback research');
    return getFallbackResearch(fieldName);
  }

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: `You are a business analyst expert. Provide 3-4 specific, actionable insights for the "${fieldName}" field in a business case. Focus on industry best practices, methodologies, and practical recommendations. Include credible sources when possible.`
          },
          {
            role: 'user',
            content: `Research query: ${query}
            
Project context: ${JSON.stringify(projectContext)}
            
Provide research-backed insights specifically for the "${fieldName}" field. Format as JSON array with objects containing:
- insight: (actionable recommendation)  
- source: (credible source if available)
- relevance: (why this applies to this field)`
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    // Parse JSON response or create structured fallback
    try {
      const insights = JSON.parse(content);
      return Array.isArray(insights) ? insights : [insights];
    } catch (parseError) {
      // If JSON parsing fails, create structured insights from text
      return parseTextToInsights(content, fieldName);
    }

  } catch (error) {
    console.error('Perplexity research error:', error);
    return getFallbackResearch(fieldName);
  }
}

// ChatGPT Generation Function
async function getChatGPTGeneration(prompt, fieldName, currentValue, projectContext, sectionContext) {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const systemPrompt = `You are a PMI-certified business analyst. Generate 2-3 specific, professional content suggestions for the "${fieldName}" field in a business case document.

Consider:
- PMI best practices and standards
- Professional business writing tone
- Measurable and specific language
- Industry-standard formatting

Current field value: "${currentValue || 'Empty'}"
Project context: ${JSON.stringify(projectContext)}
Section context: ${JSON.stringify(sectionContext)}

Return JSON array with objects containing:
- content: (the actual text to insert)
- reasoning: (brief explanation of why this approach works)
- confidence: (high/medium/low based on available context)`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 800,
        temperature: 0.4,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    try {
      const parsed = JSON.parse(content);
      return parsed.suggestions || parsed.content || [parsed];
    } catch (parseError) {
      // Fallback: create structured content from text
      return [{
        content: content,
        reasoning: "AI-generated content based on field requirements",
        confidence: "medium"
      }];
    }

  } catch (error) {
    console.error('ChatGPT generation error:', error);
    throw error;
  }
}

// Helper Functions
function getFallbackResearch(fieldName) {
  const fallbacks = {
    'Project Objectives': [
      {
        insight: "Use SMART criteria: Specific, Measurable, Achievable, Relevant, Time-bound objectives",
        source: "PMI Project Management Body of Knowledge (PMBOK Guide)",
        relevance: "Ensures objectives are clearly defined and trackable"
      },
      {
        insight: "Align objectives with organizational strategic goals and business outcomes",
        source: "Harvard Business Review - Project Management Best Practices",
        relevance: "Increases project success rate and stakeholder buy-in"
      }
    ],
    'Business Need': [
      {
        insight: "Define the gap between current state and desired future state with quantifiable metrics",
        source: "Business Analysis Body of Knowledge (BABOK Guide)",
        relevance: "Creates clear justification for project investment"
      },
      {
        insight: "Include stakeholder impact analysis and pain points to strengthen the case",
        source: "Standish Group - Project Success Factors",
        relevance: "Demonstrates understanding of broader organizational impact"
      }
    ],
    'Success Criteria': [
      {
        insight: "Define both quantitative KPIs (ROI, cost savings) and qualitative measures (satisfaction, efficiency)",
        source: "PMI - Measuring Project Success",
        relevance: "Provides comprehensive success evaluation framework"
      },
      {
        insight: "Set baseline measurements and target improvements with specific timeframes",
        source: "Balanced Scorecard Institute",
        relevance: "Enables objective measurement of project outcomes"
      }
    ]
  };

  return fallbacks[fieldName] || [
    {
      insight: `Research best practices for ${fieldName} in business case development`,
      source: "General business analysis guidance",
      relevance: "Standard approach for professional business cases"
    }
  ];
}

function parseTextToInsights(text, fieldName) {
  // Simple text parsing to create structured insights
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  return sentences.slice(0, 3).map((sentence, index) => ({
    insight: sentence.trim(),
    source: "Research analysis",
    relevance: `Applicable to ${fieldName} field development`
  }));
}