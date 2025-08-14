Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
        
        console.log('Testing Gemini API directly...');
        console.log('API Key found:', !!geminiApiKey, 'Length:', geminiApiKey?.length);
        
        if (!geminiApiKey) {
            throw new Error('GEMINI_API_KEY not found');
        }
        
        // Prepare test message
        const messages = [
            {
                parts: [{
                    text: 'Hello, this is a test message. Please respond briefly with "API integration working!"'
                }]
            }
        ];
        
        console.log('Calling Gemini API...');
        
        // Call Gemini API
        const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
        
        const geminiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'AI-Agent-Chat-Test/1.0'
            },
            body: JSON.stringify({
                contents: messages,
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 100
                }
            })
        });
        
        console.log('Gemini API response status:', geminiResponse.status);
        
        if (!geminiResponse.ok) {
            const errorData = await geminiResponse.text();
            console.error('Gemini API error:', errorData);
            throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorData}`);
        }
        
        const data = await geminiResponse.json();
        console.log('Gemini API response received');
        
        if (!data.candidates || data.candidates.length === 0) {
            console.error('No candidates in response:', data);
            throw new Error('No response from Gemini API');
        }
        
        const responseText = data.candidates[0].content.parts[0].text;
        console.log('Generated response:', responseText);
        
        return new Response(JSON.stringify({
            success: true,
            data: {
                geminiResponse: responseText,
                apiKeyExists: true,
                apiKeyLength: geminiApiKey.length
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('Test failed:', error);
        
        return new Response(JSON.stringify({
            success: false,
            error: {
                code: 'GEMINI_TEST_FAILED',
                message: error.message
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
