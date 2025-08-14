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
        console.log('=== SIMPLE CHAT TEST START ===');
        
        // Get environment variables
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
        
        console.log('Environment check:', {
            hasServiceKey: !!serviceRoleKey,
            hasUrl: !!supabaseUrl,
            hasGeminiKey: !!geminiApiKey
        });
        
        if (!serviceRoleKey || !supabaseUrl || !geminiApiKey) {
            throw new Error('Missing environment variables');
        }
        
        // Test 1: Fetch an agent
        console.log('Testing agent fetch...');
        const agentResponse = await fetch(`${supabaseUrl}/rest/v1/agents?id=eq.dd6a178c-4e94-4012-8d7f-88d42aea3e2a&select=*`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Agent fetch status:', agentResponse.status);
        if (!agentResponse.ok) {
            const errorData = await agentResponse.text();
            console.error('Agent fetch failed:', errorData);
            throw new Error(`Agent fetch failed: ${agentResponse.status}`);
        }
        
        const agents = await agentResponse.json();
        console.log('Agent fetch result:', { count: agents.length, hasAgent: agents.length > 0 });
        
        if (agents.length === 0) {
            throw new Error('No agent found');
        }
        
        const agent = agents[0];
        console.log('Agent loaded:', { name: agent.name, hasPrompt: !!agent.system_prompt });
        
        // Test 2: Call Gemini API
        console.log('Testing Gemini API...');
        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: 'Hello, respond with "Test successful!"'
                    }]
                }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 50
                }
            })
        });
        
        console.log('Gemini API status:', geminiResponse.status);
        if (!geminiResponse.ok) {
            const errorData = await geminiResponse.text();
            console.error('Gemini API failed:', errorData);
            throw new Error(`Gemini API failed: ${geminiResponse.status}`);
        }
        
        const geminiData = await geminiResponse.json();
        const geminiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
        console.log('Gemini response:', geminiText);
        
        // Test 3: Try to insert a test message (to a known conversation)
        console.log('Testing message insert...');
        const messageResponse = await fetch(`${supabaseUrl}/rest/v1/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                conversation_id: '4c91774f-d5dc-40b1-bd98-810934cea080',
                role: 'user',
                content: 'Test message from simple chat test'
            })
        });
        
        console.log('Message insert status:', messageResponse.status);
        if (!messageResponse.ok) {
            const errorData = await messageResponse.text();
            console.error('Message insert failed:', errorData);
            return new Response(JSON.stringify({
                success: false,
                tests: {
                    agentFetch: 'PASS',
                    geminiApi: 'PASS',
                    messageInsert: 'FAIL',
                    messageInsertError: errorData
                }
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        
        const messageData = await messageResponse.json();
        console.log('Message inserted successfully:', messageData[0]?.id);
        
        return new Response(JSON.stringify({
            success: true,
            tests: {
                agentFetch: 'PASS',
                geminiApi: 'PASS',
                messageInsert: 'PASS'
            },
            results: {
                agentName: agent.name,
                geminiResponse: geminiText,
                messageId: messageData[0]?.id
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('Simple chat test error:', error);
        
        return new Response(JSON.stringify({
            success: false,
            error: {
                code: 'SIMPLE_CHAT_TEST_FAILED',
                message: error.message
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
