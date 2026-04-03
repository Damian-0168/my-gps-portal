import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

interface TraccarPosition {
  id: number;
  deviceId: number;
  protocol: string;
  serverTime: string;
  deviceTime: string;
  fixTime: string;
  outdated: boolean;
  valid: boolean;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  course: number;
  address: string | null;
  accuracy: number;
  attributes: Record<string, any>;
}

interface TraccarDevice {
  id: number;
  name: string;
  uniqueId: string;
  status: string;
  lastUpdate: string;
}

interface TraccarEvent {
  id: number;
  type: string;
  eventTime: string;
  deviceId: number;
  positionId: number;
  geofenceId?: number;
  attributes: Record<string, any>;
}

interface WebhookPayload {
  device?: TraccarDevice;
  position?: TraccarPosition;
  event?: TraccarEvent;
  positions?: TraccarPosition[];
  events?: TraccarEvent[];
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: WebhookPayload = await req.json()
    console.log("Traccar Webhook received:", JSON.stringify(payload, null, 2))

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const results = {
      positionsInserted: 0,
      eventsInserted: 0,
      errors: [] as string[]
    }

    // Handle single position
    if (payload.position && payload.device) {
      const pos = payload.position
      
      // Look up vehicle by traccar_device_id
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('id')
        .eq('traccar_device_id', pos.deviceId)
        .single()

      const { error } = await supabase.from('position_history').insert({
        vehicle_id: vehicle?.id || null,
        traccar_device_id: pos.deviceId,
        traccar_position_id: pos.id,
        latitude: pos.latitude,
        longitude: pos.longitude,
        altitude: pos.altitude,
        speed: pos.speed,
        course: pos.course,
        accuracy: pos.accuracy,
        address: pos.address,
        attributes: pos.attributes,
        fix_time: pos.fixTime,
        server_time: pos.serverTime
      })

      if (error) {
        results.errors.push(`Position insert error: ${error.message}`)
      } else {
        results.positionsInserted++
      }
    }

    // Handle batch positions
    if (payload.positions && payload.positions.length > 0) {
      for (const pos of payload.positions) {
        const { data: vehicle } = await supabase
          .from('vehicles')
          .select('id')
          .eq('traccar_device_id', pos.deviceId)
          .single()

        const { error } = await supabase.from('position_history').insert({
          vehicle_id: vehicle?.id || null,
          traccar_device_id: pos.deviceId,
          traccar_position_id: pos.id,
          latitude: pos.latitude,
          longitude: pos.longitude,
          altitude: pos.altitude,
          speed: pos.speed,
          course: pos.course,
          accuracy: pos.accuracy,
          address: pos.address,
          attributes: pos.attributes,
          fix_time: pos.fixTime,
          server_time: pos.serverTime
        })

        if (error) {
          results.errors.push(`Position insert error: ${error.message}`)
        } else {
          results.positionsInserted++
        }
      }
    }

    // Handle single event (geofence, etc.)
    if (payload.event && payload.device) {
      const event = payload.event
      
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('id')
        .eq('traccar_device_id', event.deviceId)
        .single()

      // Get position if available
      let posLat = null, posLng = null
      if (payload.position) {
        posLat = payload.position.latitude
        posLng = payload.position.longitude
      }

      const { error } = await supabase.from('geofence_events').insert({
        vehicle_id: vehicle?.id || null,
        traccar_device_id: event.deviceId,
        event_type: event.type,
        geofence_id: event.geofenceId,
        event_time: event.eventTime,
        position_latitude: posLat,
        position_longitude: posLng,
        attributes: event.attributes
      })

      if (error) {
        results.errors.push(`Event insert error: ${error.message}`)
      } else {
        results.eventsInserted++
      }
    }

    // Handle batch events
    if (payload.events && payload.events.length > 0) {
      for (const event of payload.events) {
        const { data: vehicle } = await supabase
          .from('vehicles')
          .select('id')
          .eq('traccar_device_id', event.deviceId)
          .single()

        const { error } = await supabase.from('geofence_events').insert({
          vehicle_id: vehicle?.id || null,
          traccar_device_id: event.deviceId,
          event_type: event.type,
          geofence_id: event.geofenceId,
          event_time: event.eventTime,
          attributes: event.attributes
        })

        if (error) {
          results.errors.push(`Event insert error: ${error.message}`)
        } else {
          results.eventsInserted++
        }
      }
    }

    console.log("Webhook processing results:", results)

    return new Response(
      JSON.stringify({ 
        success: true, 
        ...results 
      }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    )
  } catch (error) {
    console.error("Webhook error:", error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    )
  }
})
