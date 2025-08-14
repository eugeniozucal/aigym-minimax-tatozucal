// Direct test of the chat-handler function
const { createClient } = require('@supabase/supabase-js');

// Use the same Supabase configuration as the frontend
const supabaseUrl = 'https://hfqcbataezzfgavidhbe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcWNiYXRhZXp6ZmdhdmlkaGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NTk4NjksImV4cCI6MjA3MDUzNTg2OX0.vPzsikPkgLBKoPnDPiGY-y6dZRdgaHc2Ml4JjxL-Kl0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testChatHandler() {
  try {
    console.log('Testing chat-handler function...');
    
    // First, try to create a test user and sign in
    const testEmail = `test${Date.now()}@gmail.com`;
    const testPassword = 'testpassword123';
    
    console.log('Creating test user:', testEmail);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User'
        }
      }
    });
    
    if (signUpError) {
      console.error('Sign up failed:', signUpError);
      return;
    }
    
    console.log('Sign up successful:', signUpData.user?.email);
    
    // Now try to call the chat handler with a test message
    console.log('Calling chat-handler function...');
    
    const { data: chatData, error: chatError } = await supabase.functions.invoke('chat-handler', {
      body: {
        message: 'Hello, this is a test message',
        conversationId: '4c91774f-d5dc-40b1-bd98-810934cea080', // Use actual conversation UUID
        agentId: 'dd6a178c-4e94-4012-8d7f-88d42aea3e2a' // Use the actual agent UUID
      }
    });
    
    console.log('Chat handler response:', { data: chatData, error: chatError });
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testChatHandler();
