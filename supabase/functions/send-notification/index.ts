import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  user_id: number;
  type: 'NEW_OPPORTUNITY' | 'OPPORTUNITY_ASSIGNED' | 'PROPOSAL_STATUS_CHANGED' | 'DOCUMENT_UPLOADED' | 'DEADLINE_APPROACHING' | 'SYSTEM_MAINTENANCE';
  title: string;
  message: string;
  data?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('PROJECT_URL')!
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse notification payload
    const payload: NotificationPayload = await req.json()
    console.log('Notification request:', JSON.stringify(payload, null, 2))

    // Validate required fields
    if (!payload.user_id || !payload.type || !payload.title || !payload.message) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing required notification fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create notification record
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: payload.user_id,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        data: payload.data,
        read: false
      })
      .select()
      .single()

    if (notificationError) {
      console.error('Error creating notification:', notificationError)
      return new Response(
        JSON.stringify({ ok: false, error: 'Failed to create notification' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Send real-time notification via Supabase Realtime
    const channel = supabase.channel(`user_${payload.user_id}`)
    await channel.send({
      type: 'broadcast',
      event: 'notification',
      payload: notification
    })

    console.log(`Notification sent successfully: ID ${notification.id} to user ${payload.user_id}`)

    return new Response(
      JSON.stringify({ 
        ok: true, 
        notification_id: notification.id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Notification processing error:', error)
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})