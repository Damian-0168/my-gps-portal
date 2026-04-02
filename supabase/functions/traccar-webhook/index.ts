import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const payload = await req.json()
    console.log("Traccar Webhook received:", payload)

    // Example: Forwarding position to a 'logs' table or triggering a notification
    // The payload usually contains 'device', 'position', and 'event' objects.
    
    /*
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    if (payload.event) {
       await supabase.from('geofence_events').insert({
         device_id: payload.device.id,
         type: payload.event.type,
         time: payload.event.eventTime
       })
    }
    */

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    })
  }
})
