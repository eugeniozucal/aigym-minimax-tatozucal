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
        const { action, data } = await req.json();

        if (!action) {
            throw new Error('Action is required');
        }

        // Get the service role key
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Supabase configuration missing');
        }

        // Verify admin access
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('No authorization header');
        }

        const token = authHeader.replace('Bearer ', '');
        
        // Verify token and get user
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': serviceRoleKey
            }
        });

        if (!userResponse.ok) {
            throw new Error('Invalid token');
        }

        const userData = await userResponse.json();
        const userId = userData.id;

        // Check if user is admin
        const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=role`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        if (!profileResponse.ok) {
            throw new Error('Failed to verify admin access');
        }

        const profiles = await profileResponse.json();
        if (!profiles || profiles.length === 0 || profiles[0].role !== 'admin') {
            throw new Error('Access denied: Admin privileges required');
        }

        let result;
        
        switch (action) {
            case 'create_user':
                result = await createUser(data, supabaseUrl, serviceRoleKey);
                break;
            case 'update_user':
                result = await updateUser(data, supabaseUrl, serviceRoleKey);
                break;
            case 'get_conversation_transcript':
                result = await getConversationTranscript(data, supabaseUrl, serviceRoleKey);
                break;
            default:
                throw new Error(`Unknown action: ${action}`);
        }

        return new Response(JSON.stringify({ data: result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Admin operations error:', error);

        const errorResponse = {
            error: {
                code: 'ADMIN_OPERATION_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

async function createUser(data: any, supabaseUrl: string, serviceRoleKey: string) {
    const { email, password, full_name, role = 'user' } = data;
    
    if (!email || !password) {
        throw new Error('Email and password are required');
    }

    // Create user in Supabase Auth
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email,
            password,
            email_confirm: true
        })
    });

    if (!authResponse.ok) {
        const errorText = await authResponse.text();
        throw new Error(`Failed to create user: ${errorText}`);
    }

    const authUser = await authResponse.json();
    
    // Create profile
    const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: authUser.id,
            email: authUser.email,
            full_name,
            role
        })
    });

    if (!profileResponse.ok) {
        throw new Error('Failed to create user profile');
    }

    return { id: authUser.id, email: authUser.email, full_name, role };
}

async function updateUser(data: any, supabaseUrl: string, serviceRoleKey: string) {
    const { userId, updates } = data;
    
    if (!userId || !updates) {
        throw new Error('User ID and updates are required');
    }

    // Update profile
    const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
    });

    if (!profileResponse.ok) {
        throw new Error('Failed to update user profile');
    }

    return { success: true };
}

async function getConversationTranscript(data: any, supabaseUrl: string, serviceRoleKey: string) {
    const { conversationId } = data;
    
    if (!conversationId) {
        throw new Error('Conversation ID is required');
    }

    // Get conversation details
    const conversationResponse = await fetch(`${supabaseUrl}/rest/v1/conversations?id=eq.${conversationId}&select=*,profiles(full_name),agents(name)`, {
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
        }
    });

    if (!conversationResponse.ok) {
        throw new Error('Failed to get conversation details');
    }

    const conversations = await conversationResponse.json();
    if (!conversations || conversations.length === 0) {
        throw new Error('Conversation not found');
    }

    const conversation = conversations[0];

    // Get all messages in conversation
    const messagesResponse = await fetch(`${supabaseUrl}/rest/v1/messages?conversation_id=eq.${conversationId}&order=created_at.asc`, {
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
        }
    });

    if (!messagesResponse.ok) {
        throw new Error('Failed to get conversation messages');
    }

    const messages = await messagesResponse.json();

    // Format as transcript
    const transcript = messages.map((msg: any) => {
        const timestamp = new Date(msg.created_at).toLocaleString();
        const role = msg.role === 'user' ? 'User' : 'AI Agent';
        return `[${timestamp}] ${role}: ${msg.content}`;
    }).join('\n\n');

    return {
        conversation,
        transcript,
        messageCount: messages.length
    };
}