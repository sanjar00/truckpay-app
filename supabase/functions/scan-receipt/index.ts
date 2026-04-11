import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { imageBase64, mode } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'imageBase64 is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prompt differs by mode: 'fuel' extracts IFTA fuel purchase data; default extracts expense data
    const promptText = mode === 'fuel'
      ? `Analyze this fuel receipt for a truck driver filing an IFTA report.
Return ONLY a valid JSON object, no markdown, no explanation:
{
  "state": "TX",
  "gallons": 123.4,
  "pricePerGallon": 3.89,
  "amount": 480.15,
  "date": "YYYY-MM-DD"
}
Rules:
- state must be a valid 2-letter US state abbreviation where the fuel was purchased (look for the station address)
- gallons is the total gallons purchased (a number)
- pricePerGallon is the price per gallon (a number)
- amount is the total amount paid (a number)
- If date is not visible, use null
- If a value cannot be determined, use null`
      : `Analyze this receipt or invoice for a truck driver.
Return ONLY a valid JSON object, no markdown, no explanation:
{
  "merchant": "name of business or service provider",
  "category": "FUEL or TOLL or MAINTENANCE or PARTS or FOOD or LODGING or OTHER",
  "amount": 123.45,
  "date": "YYYY-MM-DD",
  "notes": "brief description of what was purchased"
}
Rules:
- category must be exactly one of the listed options
- amount must be a number (the total paid, not subtotal)
- If date is not visible, use null
- If amount is not clear, use null
- merchant should be the business name only, not address`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
              },
              {
                type: 'text',
                text: promptText,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return new Response(JSON.stringify({ error: `OpenAI error: ${response.status}`, detail: err }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const cleaned = text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
    const receipt = JSON.parse(cleaned);

    return new Response(JSON.stringify(receipt), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error in scan-receipt function:', err);
    return new Response(JSON.stringify({ error: String(err), detail: 'Failed to process receipt' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
