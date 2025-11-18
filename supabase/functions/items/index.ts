import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Item {
  id: string;
  title: string;
  category: string;
  description: string | null;
  price: number;
  estimated_value: number | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const authHeader = req.headers.get('Authorization');
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader || '' } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch user's liked items to understand preferences
    const { data: interests, error: interestsError } = await supabase
      .from('interests')
      .select('item_id, items(id, title, category, description, price, estimated_value)')
      .eq('user_id', user.id)
      .limit(20);

    if (interestsError) {
      console.error('Error fetching interests:', interestsError);
    }

    // Fetch all available items
    const { data: allItems, error: itemsError } = await supabase
      .from('items')
      .select('*')
      .eq('status', 'active')
      .neq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (itemsError) throw itemsError;

    // If user has no interests yet, return items as-is
    if (!interests || interests.length === 0) {
      return new Response(JSON.stringify(allItems?.slice(0, 20) || []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Analyze user preferences with AI
    const likedItems = interests
      .map(i => i.items)
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .map((item: any) => ({
        category: item.category,
        title: item.title,
        description: item.description || '',
      }));

    const aiPrompt = `Based on these items a user has liked:
${JSON.stringify(likedItems, null, 2)}

Analyze the user's preferences and identify:
1. Preferred categories
2. Price range preferences
3. Common themes or interests
4. Item characteristics they value

Now, score the following items from 0-10 based on how well they match the user's preferences:
${JSON.stringify(allItems?.map(item => ({
  id: item.id,
  category: item.category,
  title: item.title,
  description: item.description,
  price: item.price,
})), null, 2)}

Return ONLY a JSON array of objects with format: [{"id": "item-id", "score": 8.5, "reason": "brief explanation"}]`;

    try {
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: 'You are a recommendation engine. Analyze user preferences and score items accordingly. Always respond with valid JSON only.',
            },
            { role: 'user', content: aiPrompt },
          ],
        }),
      });

      if (!aiResponse.ok) {
        console.error('AI API error:', await aiResponse.text());
        // Fallback to chronological order
        return new Response(JSON.stringify(allItems?.slice(0, 20) || []), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const aiData = await aiResponse.json();
      const aiContent = aiData.choices?.[0]?.message?.content || '[]';
      
      // Extract JSON from potential markdown code blocks
      const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || aiContent.match(/\[[\s\S]*\]/);
      const scoresData = jsonMatch ? JSON.parse(jsonMatch[1] || jsonMatch[0]) : [];

      // Create a score map
      const scoreMap = new Map(
        scoresData.map((item: any) => [item.id, item.score || 0])
      );

      // Sort items by AI-generated scores
      const sortedItems = allItems?.sort((a, b) => {
        const scoreA = Number(scoreMap.get(a.id)) || 0;
        const scoreB = Number(scoreMap.get(b.id)) || 0;
        return scoreB - scoreA;
      }).slice(0, 20) || [];

      return new Response(JSON.stringify(sortedItems), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (aiError) {
      console.error('AI recommendation error:', aiError);
      // Fallback to chronological order
      return new Response(JSON.stringify(allItems?.slice(0, 20) || []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    console.error('Error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
