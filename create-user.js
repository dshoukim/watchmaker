// Temporary script to create a user record
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qouppyvbepiccepacxne.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvdXBweXZiZXBpY2NlcGFjeG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NDI1NDIsImV4cCI6MjA2MzUxODU0Mn0.uYvLjL7X4cP8Q3j0W7LWvEwsJTt6-8-34Xb0vkq-79E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createUser() {
  // Get the user ID from your browser console logs
  const supabaseUserId = 'YOUR_SUPABASE_USER_ID_HERE'; // Replace with actual ID from logs
  
  const userData = {
    supabase_id: supabaseUserId,
    email: 'your-email@example.com', // Replace with your actual email
    name: 'Your Name', // Replace with your actual name
    avatar: null,
    preferences: {}
  };
  
  console.log('Creating user with data:', userData);
  
  const { data, error } = await supabase
    .from('users')
    .insert([userData])
    .select()
    .single();
    
  if (error) {
    console.error('Error creating user:', error);
  } else {
    console.log('User created successfully:', data);
  }
}

createUser(); 