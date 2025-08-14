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
        console.log('=== CHAT HANDLER START ===');
        const { message, conversationId, agentId } = await req.json();
        console.log('Request body parsed:', { message: !!message, conversationId, agentId });

        if (!message || !conversationId || !agentId) {
            console.error('Missing required parameters:', { message: !!message, conversationId: !!conversationId, agentId: !!agentId });
            throw new Error('Message, conversation ID, and agent ID are required');
        }

        // Get the service role key
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        console.log('Environment variables:', { hasServiceKey: !!serviceRoleKey, hasUrl: !!supabaseUrl });

        if (!serviceRoleKey || !supabaseUrl) {
            console.error('Missing Supabase configuration');
            throw new Error('Supabase configuration missing');
        }

        // Get user from auth header
        const authHeader = req.headers.get('authorization');
        console.log('Auth header present:', !!authHeader);
        if (!authHeader) {
            console.error('No authorization header');
            throw new Error('No authorization header');
        }

        const token = authHeader.replace('Bearer ', '');
        console.log('Token extracted, length:', token.length);

        // Verify token and get user using the anon key, not service role key
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
        console.log('Anon key available:', !!anonKey);
        if (!anonKey) {
            console.error('Missing anon key');
            throw new Error('Supabase anon key missing');
        }
        
        console.log('Verifying user token...');
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': anonKey
            }
        });

        console.log('User verification response status:', userResponse.status);
        if (!userResponse.ok) {
            const errorData = await userResponse.text();
            console.error('User token verification failed:', userResponse.status, errorData);
            throw new Error(`Invalid token: ${userResponse.status} - ${errorData}`);
        }

        const userData = await userResponse.json();
        const userId = userData.id;
        console.log('User verified successfully:', userId);

        // Get agent information
        console.log('Fetching agent information for agentId:', agentId);
        const agentResponse = await fetch(`${supabaseUrl}/rest/v1/agents?id=eq.${agentId}&select=*`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        console.log('Agent fetch response status:', agentResponse.status);
        if (!agentResponse.ok) {
            const errorData = await agentResponse.text();
            console.error('Agent fetch failed:', agentResponse.status, errorData);
            throw new Error(`Failed to get agent information: ${agentResponse.status} - ${errorData}`);
        }

        const agents = await agentResponse.json();
        console.log('Agents fetched:', agents.length);
        if (!agents || agents.length === 0) {
            console.error('No agent found with id:', agentId);
            throw new Error('Agent not found');
        }

        const agent = agents[0];
        console.log('Agent found:', agent.name);

        // Save user message to database
        console.log('Saving user message to database...');
        const userMessageResponse = await fetch(`${supabaseUrl}/rest/v1/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                conversation_id: conversationId,
                role: 'user',
                content: message
            })
        });

        console.log('User message save response status:', userMessageResponse.status);
        if (!userMessageResponse.ok) {
            const errorData = await userMessageResponse.text();
            console.error('User message save failed:', userMessageResponse.status, errorData);
            throw new Error(`Failed to save user message: ${userMessageResponse.status} - ${errorData}`);
        }

        console.log('User message saved successfully');

        // Generate AI response using Gemini API
        console.log('Generating AI response...');
        const aiResponse = await generateGeminiResponse(message, agent.system_prompt, agent.name);
        console.log('AI response generated, length:', aiResponse.length);

        // Save AI response to database
        console.log('Saving AI response to database...');
        const aiMessageResponse = await fetch(`${supabaseUrl}/rest/v1/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                conversation_id: conversationId,
                role: 'assistant',
                content: aiResponse
            })
        });

        console.log('AI message save response status:', aiMessageResponse.status);
        if (!aiMessageResponse.ok) {
            const errorData = await aiMessageResponse.text();
            console.error('AI message save failed:', aiMessageResponse.status, errorData);
            throw new Error(`Failed to save AI response: ${aiMessageResponse.status} - ${errorData}`);
        }

        const aiMessage = await aiMessageResponse.json();
        console.log('AI message saved successfully, message ID:', aiMessage[0]?.id);
        console.log('=== CHAT HANDLER SUCCESS ===');

        return new Response(JSON.stringify({
            data: {
                message: aiResponse,
                messageId: aiMessage[0].id,
                timestamp: aiMessage[0].created_at
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('=== CHAT HANDLER ERROR ===');
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });

        const errorResponse = {
            error: {
                code: 'CHAT_HANDLER_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// Generate AI response using Google Gemini API
async function generateGeminiResponse(userMessage: string, systemPrompt: string, agentName: string): Promise<string> {
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!geminiApiKey) {
        console.error('GEMINI_API_KEY not found in environment variables');
        throw new Error('Gemini API key not configured');
    }
    
    try {
        console.log('Generating Gemini response for agent:', agentName);
        console.log('API Key found, length:', geminiApiKey.length);
        
        // Prepare the system and user messages properly
        const messages = [
            {
                parts: [{
                    text: `${systemPrompt}\n\nPlease respond as ${agentName}. User message: ${userMessage}`
                }]
            }
        ];
        
        // Call Gemini API with proper v1 endpoint
        const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
        
        const geminiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'AI-Agent-Chat/1.0'
            },
            body: JSON.stringify({
                contents: messages,
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000,
                    topP: 0.8,
                    topK: 40
                },
                safetySettings: [
                    {
                        category: "HARM_CATEGORY_HARASSMENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_HATE_SPEECH",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    }
                ]
            })
        });
        
        if (!geminiResponse.ok) {
            const errorData = await geminiResponse.text();
            console.error('Gemini API error response:', {
                status: geminiResponse.status,
                statusText: geminiResponse.statusText,
                error: errorData
            });
            
            // More specific error handling
            if (geminiResponse.status === 403) {
                throw new Error('API key invalid or quota exceeded');
            } else if (geminiResponse.status === 429) {
                throw new Error('Rate limit exceeded, please try again later');
            } else {
                throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorData}`);
            }
        }
        
        const data = await geminiResponse.json();
        console.log('Gemini API response:', JSON.stringify(data, null, 2));
        
        if (!data.candidates || data.candidates.length === 0) {
            console.error('No candidates in Gemini response:', data);
            throw new Error('No response generated from Gemini API');
        }
        
        const candidate = data.candidates[0];
        
        // Check if the response was blocked
        if (candidate.finishReason === 'SAFETY') {
            console.warn('Response blocked by safety filters');
            return `I apologize, but I cannot provide a response to that message due to safety considerations. Please try rephrasing your question, and I'll be happy to help as ${agentName}.`;
        }
        
        if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
            console.error('Invalid response structure:', candidate);
            throw new Error('Invalid response structure from Gemini API');
        }
        
        const responseText = candidate.content.parts[0].text;
        console.log('Gemini response generated successfully, length:', responseText.length);
        
        return responseText.trim();
        
    } catch (error) {
        console.error('Error generating Gemini response:', {
            error: error.message,
            stack: error.stack,
            agentName
        });
        
        // More specific fallback based on error type
        if (error.message.includes('API key')) {
            return `I'm experiencing an authentication issue with my AI service. Please contact support to resolve this issue. As ${agentName}, I'll be back online once this is fixed.`;
        } else if (error.message.includes('Rate limit') || error.message.includes('quota')) {
            return `I'm currently experiencing high demand. Please try again in a few moments. As ${agentName}, I'm still here to help once the service is available.`;
        } else {
            return `I apologize, but I'm experiencing technical difficulties connecting to my AI service right now. Please try again in a moment. As ${agentName}, I'm here to help you once the connection is restored.`;
        }
    }
}