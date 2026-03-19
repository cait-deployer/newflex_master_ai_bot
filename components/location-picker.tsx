"use client"

import { useState, useRef, useCallback } from "react"
import { GoogleMap, Marker, Autocomplete, useJsApiLoader } from "@react-google-maps/api"
import { MapPin, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export type LocationResult = {
  latitude: number
  longitude: number
  fullAddress: string
  address: string
  city: string
  state: string
  zip_code: string
}

type Props = {
  // Called when main address (marker 1) changes
  onLocationSelected: (loc: LocationResult) => void
  // Called when address line 2 (marker 2) changes — just the formatted address string
  onLine2Changed?: (value: string) => void
  defaultLat?: number
  defaultLng?: number
  defaultAddress?: string   // pre-fill search input when editing
  line2Value?: string
}

const LIBRARIES: ("places")[] = ["places"]
const MAP_STYLES = [
  { featureType: "poi" as const, elementType: "labels" as const, stylers: [{ visibility: "off" }] },
]

export function GoogleLocationPicker({
  onLocationSelected,
  onLine2Changed,
  defaultLat,
  defaultLng,
  defaultAddress = "",
  line2Value = "",
}: Props) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: LIBRARIES,
  })

  const [addressInput, setAddressInput] = useState(defaultAddress)
  const [marker1, setMarker1] = useState<{ lat: number; lng: number } | null>(
    defaultLat && defaultLng ? { lat: defaultLat, lng: defaultLng } : null
  )
  const [marker2, setMarker2] = useState<{ lat: number; lng: number } | null>(null)
  const [center, setCenter] = useState(
    defaultLat && defaultLng ? { lat: defaultLat, lng: defaultLng } : { lat: 32.7767, lng: -96.797 }
  )
  const [zoom, setZoom] = useState(defaultLat ? 15 : 11)
  const [confirmed, setConfirmed] = useState(!!defaultLat)
  const [line2Input, setLine2Input] = useState(line2Value)

  const ac1Ref = useRef<google.maps.places.Autocomplete | null>(null)
  const ac2Ref = useRef<google.maps.places.Autocomplete | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)

  // ── Parse components ──────────────────────────────────────────────────────
  const parseComponents = useCallback((
    components: google.maps.GeocoderAddressComponent[],
    lat: number, lng: number, formatted: string
  ): LocationResult => {
    const c: Record<string, string> = {}
    components.forEach((comp) => {
      comp.types.forEach((t) => { c[t] = comp.long_name })
      if (comp.types.includes("administrative_area_level_1")) c["state_short"] = comp.short_name
    })
    return {
      latitude: lat, longitude: lng, fullAddress: formatted,
      address: [c["street_number"] ?? "", c["route"] ?? ""].filter(Boolean).join(" "),
      city: c["locality"] ?? c["sublocality"] ?? c["administrative_area_level_2"] ?? "",
      state: c["state_short"] ?? c["administrative_area_level_1"] ?? "",
      zip_code: c["postal_code"] ?? "",
    }
  }, [])

  // ── Reverse geocode helpers ───────────────────────────────────────────────
  const reverseMain = useCallback((lat: number, lng: number) => {
    new google.maps.Geocoder().geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        setAddressInput(results[0].formatted_address)
        onLocationSelected(parseComponents(results[0].address_components, lat, lng, results[0].formatted_address))
        setConfirmed(true)
      }
    })
  }, [parseComponents, onLocationSelected])

  const reverseLine2 = useCallback((lat: number, lng: number) => {
    new google.maps.Geocoder().geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        const addr = results[0].formatted_address
        setLine2Input(addr)
        onLine2Changed?.(addr)
      }
    })
  }, [onLine2Changed])

  // ── Autocomplete 1 → marker 1 ─────────────────────────────────────────────
  const onPlace1Changed = useCallback(() => {
    const place = ac1Ref.current?.getPlace()
    if (!place?.geometry?.location) return
    const lat = place.geometry.location.lat()
    const lng = place.geometry.location.lng()
    setMarker1({ lat, lng })
    setCenter({ lat, lng })
    setZoom(16)
    setConfirmed(true)
    setAddressInput(place.formatted_address ?? "")
    onLocationSelected(parseComponents(place.address_components ?? [], lat, lng, place.formatted_address ?? ""))
  }, [parseComponents, onLocationSelected])

  // Autocomplete 2 → marker 2 (does NOT move map center)
  const onPlace2Changed = useCallback(() => {
    const place = ac2Ref.current?.getPlace()
    if (!place?.geometry?.location) return
    const lat = place.geometry.location.lat()
    const lng = place.geometry.location.lng()
    const addr = place.formatted_address ?? ""
    setMarker2({ lat, lng })
    setLine2Input(addr)
    onLine2Changed?.(addr)
  }, [onLine2Changed])

  // Map click → moves marker 1
  const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return
    const lat = e.latLng.lat()
    const lng = e.latLng.lng()
    setMarker1({ lat, lng })
    reverseMain(lat, lng)
  }, [reverseMain])

  // Drags
  const onDrag1End = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return
    const lat = e.latLng.lat(); const lng = e.latLng.lng()
    setMarker1({ lat, lng })
    reverseMain(lat, lng)
  }, [reverseMain])

  const onDrag2End = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return
    const lat = e.latLng.lat(); const lng = e.latLng.lng()
    setMarker2({ lat, lng })
    reverseLine2(lat, lng)
  }, [reverseLine2])

  if (!isLoaded) {
    return (
      <div className="flex items-center gap-2 h-10 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading Google Maps…
      </div>
    )
  }

  return (
    <div className="space-y-3">

      {/* Main address search */}
      <Autocomplete
        onLoad={(ac) => { ac1Ref.current = ac }}
        onPlaceChanged={onPlace1Changed}
        options={{ types: ["address"], fields: ["address_components", "geometry", "formatted_address"] }}
        className="w-full"
      >
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
          <input
            type="text"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            placeholder="Search main address…"
            autoComplete="off"
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
              "ring-offset-background placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "pl-9 pr-3 transition-colors",
              confirmed && "border-green-500/50 bg-green-50/20 dark:bg-green-950/10",
            )}
          />
        </div>
      </Autocomplete>

      {/* ONE map with both markers */}
      <div className="relative w-full h-[280px] rounded-xl border border-border overflow-hidden">
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={center}
          zoom={zoom}
          onClick={onMapClick}
          onLoad={(m) => { mapRef.current = m }}
          options={{
            disableDefaultUI: false,
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            styles: MAP_STYLES,
          }}
        >
          {/* Marker 1 — main address (red) */}
          {marker1 && (
            <Marker
              position={marker1}
              draggable
              onDragEnd={onDrag1End}
              animation={google.maps.Animation.DROP}
              title="Main address"
            />
          )}

          {/* Marker 2 — address line 2 (blue), only when set */}
          {marker2 && (
            <Marker
              position={marker2}
              draggable
              onDragEnd={onDrag2End}
              animation={google.maps.Animation.DROP}
              title="Address line 2"
              icon={{ url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png" }}
            />
          )}
        </GoogleMap>

        {!confirmed && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur border border-border/50 text-xs text-muted-foreground shadow">
              <MapPin className="w-3 h-3" /> Search above, or click map / drag pin
            </div>
          </div>
        )}
        {confirmed && (
          <div className="absolute top-2 left-2 z-10 pointer-events-none">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500 text-white text-xs font-medium shadow">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Location set
            </div>
          </div>
        )}
      </div>

      {/* Address Line 2 — autocomplete input, below the map */}
      <Autocomplete
        onLoad={(ac) => { ac2Ref.current = ac }}
        onPlaceChanged={onPlace2Changed}
        options={{ types: ["address"], fields: ["geometry", "formatted_address"] }}
        className="w-full"
      >
        <input
          type="text"
          value={line2Input}
          onChange={(e) => {
            setLine2Input(e.target.value)
            onLine2Changed?.(e.target.value)
            // Clear marker 2 if field is cleared
            if (!e.target.value) setMarker2(null)
          }}
          placeholder="Address Line 2 (Suite, Floor…)"
          autoComplete="off"
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
            "ring-offset-background placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "transition-colors",
            marker2 && "border-blue-400/60 bg-blue-50/20 dark:bg-blue-950/10",
          )}
        />
      </Autocomplete>

    </div>
  )
}
