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
        
        const result = {
            geminiKeyExists: !!geminiApiKey,
            geminiKeyLength: geminiApiKey ? geminiApiKey.length : 0,
            geminiKeyPrefix: geminiApiKey ? geminiApiKey.substring(0, 8) + '...' : 'not found',
            allEnvVars: Object.keys(Deno.env.toObject()).filter(key => 
                key.toLowerCase().includes('gemini') || 
                key.toLowerCase().includes('google') ||
                key.toLowerCase().includes('api')
            )
        };

        return new Response(JSON.stringify({ data: result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Test error:', error);
        return new Response(JSON.stringify({
            error: { code: 'TEST_FAILED', message: error.message }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});