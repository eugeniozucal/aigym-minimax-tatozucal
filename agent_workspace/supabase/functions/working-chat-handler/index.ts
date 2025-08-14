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
        console.log('=== WORKING CHAT HANDLER START ===');
        const { message, conversationId, agentId } = await req.json();
        console.log('Request received:', { hasMessage: !!message, conversationId, agentId });

        if (!message || !conversationId || !agentId) {
            throw new Error('Message, conversation ID, and agent ID are required');
        }

        // Get environment variables
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        
        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Supabase configuration missing');
        }

        // Get agent information (we know this works)
        console.log('Fetching agent...');
        const agentResponse = await fetch(`${supabaseUrl}/rest/v1/agents?id=eq.${agentId}&select=*`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        if (!agentResponse.ok) {
            throw new Error('Failed to get agent information');
        }

        const agents = await agentResponse.json();
        if (!agents || agents.length === 0) {
            throw new Error('Agent not found');
        }

        const agent = agents[0];
        console.log('Agent loaded:', agent.name);

        // Save user message to database (we know this works)
        console.log('Saving user message...');
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

        if (!userMessageResponse.ok) {
            const errorData = await userMessageResponse.text();
            console.error('User message save failed:', errorData);
            throw new Error(`Failed to save user message: ${userMessageResponse.status}`);
        }

        console.log('User message saved');

        // Get conversation history before generating AI response
        console.log('Retrieving conversation history...');
        const historyResponse = await fetch(`${supabaseUrl}/rest/v1/messages?conversation_id=eq.${conversationId}&order=created_at.asc`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        let conversationHistory = [];
        if (historyResponse.ok) {
            conversationHistory = await historyResponse.json();
            console.log('Retrieved conversation history:', conversationHistory.length, 'messages');
        } else {
            console.warn('Could not retrieve conversation history, continuing with empty history');
        }

        // Generate AI response using Gemini API with full conversation context
        console.log('Generating AI response with full context...');
        const aiResponse = await generateGeminiResponse(message, agent.system_prompt, agent.name, conversationHistory);
        console.log('AI response generated:', aiResponse.length, 'characters');

        // Save AI response to database
        console.log('Saving AI response...');
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

        if (!aiMessageResponse.ok) {
            const errorData = await aiMessageResponse.text();
            console.error('AI message save failed:', errorData);
            throw new Error(`Failed to save AI response: ${aiMessageResponse.status}`);
        }

        const aiMessage = await aiMessageResponse.json();
        console.log('AI message saved, ID:', aiMessage[0]?.id);
        console.log('=== WORKING CHAT HANDLER SUCCESS ===');

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
        console.error('=== WORKING CHAT HANDLER ERROR ===');
        console.error('Error:', error.message);

        const errorResponse = {
            error: {
                code: 'WORKING_CHAT_HANDLER_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// Generate AI response using Google Gemini API with conversation history
async function generateGeminiResponse(userMessage: string, systemPrompt: string, agentName: string, conversationHistory: any[] = []): Promise<string> {
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!geminiApiKey) {
        console.error('GEMINI_API_KEY not found in environment variables');
        throw new Error('Gemini API key not configured');
    }
    
    try {
        console.log('Calling Gemini API for agent:', agentName);
        console.log('Using conversation history:', conversationHistory.length, 'previous messages');
        
        // Build conversation context with history
        let conversationContext = `${systemPrompt}\n\nYou are ${agentName}. Here is the conversation history:\n\n`;
        
        // Add conversation history (excluding the current message which was just added)
        if (conversationHistory.length > 0) {
            // Only include messages before the current user message
            const historyMessages = conversationHistory.slice(0, -1); // Remove the last message (current user message)
            
            for (const msg of historyMessages) {
                const role = msg.role === 'user' ? 'Human' : agentName;
                conversationContext += `${role}: ${msg.content}\n\n`;
            }
        }
        
        // Add the current user message
        conversationContext += `Human: ${userMessage}\n\n${agentName}:`;
        
        console.log('Conversation context length:', conversationContext.length);
        
        // Prepare the message for Gemini API
        const messages = [
            {
                parts: [{
                    text: conversationContext
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
                }
            })
        });
        
        if (!geminiResponse.ok) {
            const errorData = await geminiResponse.text();
            console.error('Gemini API error:', errorData);
            throw new Error(`Gemini API error: ${geminiResponse.status}`);
        }
        
        const data = await geminiResponse.json();
        
        if (!data.candidates || data.candidates.length === 0) {
            console.error('No candidates in Gemini response');
            throw new Error('No response generated from Gemini API');
        }
        
        const candidate = data.candidates[0];
        
        if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
            console.error('Invalid response structure');
            throw new Error('Invalid response structure from Gemini API');
        }
        
        const responseText = candidate.content.parts[0].text;
        console.log('Gemini response generated successfully with conversation context');
        
        return responseText.trim();
        
    } catch (error) {
        console.error('Error generating Gemini response:', error.message);
        
        // Fallback response that acknowledges conversation state
        if (conversationHistory.length > 0) {
            return `I apologize, but I'm experiencing some technical difficulties right now. I remember we were talking, but I'm having trouble processing your message. Please try again in a moment, and I'll be happy to continue our conversation.`;
        } else {
            return `Hello! I'm ${agentName}. I apologize, but I'm experiencing some technical difficulties right now. Please try again in a moment, and I'll be happy to help you.`;
        }
    }
}
