import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getRideById, getRideRoute, validatePoint as apiValidatePoint, validatePoints as apiValidatePoints, bookRide, finishRide, upsertDriverLocation, getDriverLocation as getDriverLocationApi } from '../api/rides'
import { getDriverRoute } from '../api/route'
import {
  getBookingsForRide,
  getMyBookings,
  cancelBooking,
  approveBooking,
  rejectBooking,
} from '../api/bookings'
import { getConversation, sendMessage } from '../api/chat'
import { createRating } from '../api/ratings'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { RideMap } from '../components/RideMap'
import { PickupDropoffSelector } from '../components/PickupDropoffSelector'
import { RideBookingPanel } from '../components/RideBookingPanel'
import { StarRating } from '../components/StarRating'
import type { RideDto, BookingDto, MessageDto, ValidatePointsResponse, ValidatePointResponse, RideStopDto, DriverLocationDto } from '../types/api'

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('bg-BG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCityWithDistrict(city: string, district?: string | null) {
  return district && district.trim() ? `${city} (${district.trim()})` : city
}

export function RideDetail() {
  const { id } = useParams<{ id: string }>()
  const { token, user } = useAuth()
  const { addToast } = useToast()
  const [ride, setRide] = useState<RideDto | null>(null)
  const [bookings, setBookings] = useState<BookingDto[]>([])
  const [myBooking, setMyBooking] = useState<BookingDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [bookingActionId, setBookingActionId] = useState<number | null>(null)
  const [approveRejectBookingId, setApproveRejectBookingId] = useState<number | null>(null)
  const [chatOtherUserId, setChatOtherUserId] = useState<number | null>(null)
  const [chatMessages, setChatMessages] = useState<MessageDto[]>([])
  const [ratingToUserId, setRatingToUserId] = useState<number | null>(null)
  const [ratingScore, setRatingScore] = useState(5)
  const [ratingComment, setRatingComment] = useState('')
  const [ratingSubmitting, setRatingSubmitting] = useState(false)
  const [ratingSent, setRatingSent] = useState(false)
  const [routeData, setRouteData] = useState<{ coordinates: [number, number][]; stops: import('../types/api').RideStopDto[] } | null>(null)
  const [pickupDropoffPickup, setPickupDropoffPickup] = useState<{ lat: number; lng: number } | null>(null)
  const [pickupDropoffDropoff, setPickupDropoffDropoff] = useState<{ lat: number; lng: number } | null>(null)
  const [validatedPoints, setValidatedPoints] = useState<ValidatePointsResponse | null>(null)
  const [validatingPoints, setValidatingPoints] = useState(false)
  const [pickupValidation, setPickupValidation] = useState<ValidatePointResponse | null>(null)
  const [validatingPickupPoint, setValidatingPickupPoint] = useState(false)
  const [selectingModePickupDropoff, setSelectingModePickupDropoff] = useState<'pickup' | 'dropoff' | null>(null)
  const [driverRoute, setDriverRoute] = useState<{ coordinates: [number, number][] } | null>(null)
  const [driverRouteLoading, setDriverRouteLoading] = useState(false)
  const [driverPickedUpCount, setDriverPickedUpCount] = useState(0)
  const [driverComingToPassengerId, setDriverComingToPassengerId] = useState<number | null>(null)
  const [driverSharingTarget, setDriverSharingTarget] = useState<{ id: number; name: string } | null>(null)
  const [passengerDriverLocation, setPassengerDriverLocation] = useState<DriverLocationDto | null>(null)
  const [finishingRide, setFinishingRide] = useState(false)
  const chatScrollRef = useRef<HTMLDivElement | null>(null)
  const knownPendingBookingIdsRef = useRef<Set<number>>(new Set())
  const knownIncomingMessageIdRef = useRef<number | null>(null)
  const chatPollInFlightRef = useRef(false)
  const [, setUnreadByPartner] = useState<Record<number, number>>({})
  const lastKnownMessageByPartnerRef = useRef<Record<number, number>>({})
  const geolocationWatchIdRef = useRef<number | null>(null)
  const trackingIntervalRef = useRef<number | null>(null)
  const latestDriverCoordsRef = useRef<{ lat: number; lng: number } | null>(null)

  const rideId = id ? parseInt(id, 10) : NaN
  const isDriver = Boolean(user && ride && Number(ride.driverId) === Number(user.id))
  const hasActiveBooking = myBooking && (myBooking.status === 'PENDING' || myBooking.status === 'PENDING_PAYMENT' || myBooking.status === 'APPROVED')
  const canBookThisRide = !isDriver && ride?.status === 'OPEN' && ride.availableSeats > 0
  const canChat = token && user && ride && (isDriver || hasActiveBooking)
  const canRate = ride?.status === 'FINISHED' && token && user && (isDriver || myBooking)
  const activeTrackingPassengerId = driverSharingTarget?.id ?? null
  const locationUpdatedAgoSec = passengerDriverLocation
    ? Math.max(0, Math.floor((Date.now() - new Date(passengerDriverLocation.updatedAt).getTime()) / 1000))
    : null
  const chatPartners = useMemo(
    () =>
      isDriver
        ? bookings
            .filter((b) => b.status === 'PENDING' || b.status === 'APPROVED')
            .map((b) => ({ id: b.passengerId, name: b.passengerName ?? 'Пътник' }))
        : ride
          ? [{ id: ride.driverId, name: 'Шофьор' }]
          : [],
    [isDriver, bookings, ride]
  )
  const otherUserId = isDriver ? chatOtherUserId : (ride ? ride.driverId : null)
  const passengerVisibleStops = useMemo((): RideStopDto[] => {
    const allStops = routeData?.stops ?? []
    if (isDriver) return allStops
    const baseStops = allStops.filter((s) => s.type === 'START' || s.type === 'END')
    if (!myBooking) return baseStops
    return allStops.filter((s) =>
      s.type === 'START'
      || s.type === 'END'
      || (myBooking.pickupStopId != null && s.id === myBooking.pickupStopId)
      || (myBooking.dropoffStopId != null && s.id === myBooking.dropoffStopId)
    )
  }, [routeData?.stops, isDriver, myBooking])

  /** Одобрени/чакащи резервации с pickup точки, подредени по разстояние от старта (като backend). */
  const orderedPickups = useMemo(() => {
    if (!ride?.fromLat || !ride?.fromLng) return []
    const withPickup = bookings.filter(
      (b) => (b.status === 'APPROVED' || b.status === 'PENDING_PAYMENT') && b.pickupLat != null && b.pickupLng != null
    )
    const distSq = (lat: number, lng: number) => {
      const dLat = lat - ride.fromLat!
      const dLng = lng - ride.fromLng!
      return dLat * dLat + dLng * dLng
    }
    return [...withPickup].sort((a, b) => distSq(a.pickupLat!, a.pickupLng!) - distSq(b.pickupLat!, b.pickupLng!))
  }, [ride, bookings])

  /** Точки по маршрута в реда на backend: старт → забиране 1, 2, … → край. */
  const driverWaypoints = useMemo((): [number, number][] => {
    if (!ride?.fromLat || !ride?.fromLng || !ride?.toLat || !ride?.toLng) return []
    const pts: [number, number][] = [[ride.fromLat, ride.fromLng]]
    orderedPickups.forEach((b) => pts.push([b.pickupLat!, b.pickupLng!]))
    pts.push([ride.toLat, ride.toLng])
    return pts
  }, [ride, orderedPickups])

  /** Индекси в driverRoute.coordinates, съответстващи на всяка точка от driverWaypoints. */
  const driverWaypointIndices = useMemo(() => {
    if (!driverRoute?.coordinates?.length || !driverWaypoints.length) return []
    const coords = driverRoute.coordinates
    const findClosest = (lat: number, lng: number) => {
      let best = 0
      let bestD = Infinity
      coords.forEach((c, i) => {
        const d = (c[0] - lat) ** 2 + (c[1] - lng) ** 2
        if (d < bestD) {
          bestD = d
          best = i
        }
      })
      return best
    }
    const indices = driverWaypoints.map(([lat, lng]) => findClosest(lat, lng))
    return indices
  }, [driverRoute?.coordinates, driverWaypoints])

  /** Синтетични спирки за целия маршрут: Старт, Забраване 1, 2, …, Край. */
  const stopById = useMemo(() => {
    const map = new Map<number, RideStopDto>()
    ;(routeData?.stops ?? []).forEach((s) => {
      if (typeof s.id === 'number') map.set(s.id, s)
    })
    return map
  }, [routeData?.stops])

  /** Последователност от точки по резервации: pickup + dropoff за всеки пътник. */
  const bookingLegStops = useMemo((): RideStopDto[] => {
    if (!ride) return []
    const result: RideStopDto[] = []
    orderedPickups.forEach((b, i) => {
      const pickupFromRoute = b.pickupStopId != null ? stopById.get(b.pickupStopId) : undefined
      const dropoffFromRoute = b.dropoffStopId != null ? stopById.get(b.dropoffStopId) : undefined
      if (pickupFromRoute) {
        result.push(pickupFromRoute)
      } else if (b.pickupLat != null && b.pickupLng != null) {
        result.push({
          id: -(2000 + i),
          rideId: ride.id,
          name: `Качване ${i + 1}`,
          latitude: b.pickupLat,
          longitude: b.pickupLng,
          stopOrder: i + 1,
          type: 'PICKUP',
        })
      }
      if (dropoffFromRoute) {
        result.push(dropoffFromRoute)
      }
    })
    return result
  }, [orderedPickups, stopById, ride])

  const driverRouteFullStops = useMemo((): RideStopDto[] => {
    if (!ride) return []
    const stops: RideStopDto[] = []
    stops.push({
      id: -1,
      rideId: ride.id,
      name: 'Старт',
      latitude: ride.fromLat!,
      longitude: ride.fromLng!,
      stopOrder: 0,
      type: 'START',
    })
    stops.push(...bookingLegStops)
    stops.push({
      id: -1000,
      rideId: ride.id,
      name: 'Край',
      latitude: ride.toLat!,
      longitude: ride.toLng!,
      stopOrder: bookingLegStops.length + 1,
      type: 'END',
    })
    return stops
  }, [ride, bookingLegStops])

  /** Оставащ маршрут след „взех го“ за N пътника: координати и спирки за картата. */
  const driverRouteSliced = useMemo(() => {
    if (!driverRoute?.coordinates?.length || driverWaypointIndices.length === 0) return null
    const fromIdx = driverWaypointIndices[driverPickedUpCount] ?? 0
    const coordinates = driverRoute.coordinates.slice(fromIdx) as [number, number][]
    const stops =
      driverPickedUpCount === 0
        ? driverRouteFullStops
        : driverRouteFullStops.slice(driverPickedUpCount + 1)
    return { coordinates, stops }
  }, [driverRoute?.coordinates, driverWaypointIndices, driverPickedUpCount, driverRouteFullStops])

  const stopDriverTrackingLocal = () => {
    if (trackingIntervalRef.current != null) {
      window.clearInterval(trackingIntervalRef.current)
      trackingIntervalRef.current = null
    }
    if (geolocationWatchIdRef.current != null) {
      navigator.geolocation.clearWatch(geolocationWatchIdRef.current)
      geolocationWatchIdRef.current = null
    }
    latestDriverCoordsRef.current = null
    setDriverSharingTarget(null)
  }

  useEffect(() => {
    if (!rideId || isNaN(rideId)) {
      setError('Невалидно пътуване')
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    getRideById(rideId, token)
      .then((data) => {
        if (!cancelled) setRide(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Грешка при зареждане')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [rideId, token])

  useEffect(() => {
    if (!rideId || isNaN(rideId) || !token) return
    let cancelled = false

    const refreshBookings = async () => {
      try {
        const [rideBookings, myBookings] = await Promise.all([
          getBookingsForRide(rideId, token),
          getMyBookings(token),
        ])
        if (cancelled) return
        setBookings(rideBookings)
        const b = myBookings.find((x) => x.rideId === rideId)
        setMyBooking(b ?? null)

        if (isDriver) {
          const pendingIds = new Set(rideBookings.filter((x) => x.status === 'PENDING').map((x) => x.id))
          if (knownPendingBookingIdsRef.current.size > 0) {
            for (const id of pendingIds) {
              if (!knownPendingBookingIdsRef.current.has(id)) {
                addToast('Имате нова чакаща резервация.', 'info')
                break
              }
            }
          }
          knownPendingBookingIdsRef.current = pendingIds
        }
      } catch {
        // ignore polling failures
      }
    }

    void refreshBookings()
    const intervalId = setInterval(() => {
      void refreshBookings()
    }, 10000)

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [rideId, token, isDriver, addToast])

  useEffect(() => {
    return () => {
      stopDriverTrackingLocal()
    }
  }, [])

  useEffect(() => {
    if (isDriver && chatPartners.length > 0 && (chatOtherUserId == null || !chatPartners.some((p) => p.id === chatOtherUserId))) {
      setChatOtherUserId(chatPartners[0].id)
    }
    if (!isDriver && ride) setChatOtherUserId(null)
  }, [isDriver, ride, chatPartners, chatOtherUserId])

  useEffect(() => {
    if (!isDriver) return
    setUnreadByPartner((prev) => {
      const next: Record<number, number> = {}
      chatPartners.forEach((p) => {
        next[p.id] = prev[p.id] ?? 0
        if (lastKnownMessageByPartnerRef.current[p.id] == null) {
          lastKnownMessageByPartnerRef.current[p.id] = 0
        }
      })
      const prevKeys = Object.keys(prev).sort().join(',')
      const nextKeys = Object.keys(next).sort().join(',')
      if (prevKeys === nextKeys && Object.keys(next).every((k) => prev[Number(k)] === next[Number(k)])) {
        return prev
      }
      return next
    })
  }, [isDriver, chatPartners])

  useEffect(() => {
    if (!canRate || ratingSent || ratingToUserId != null) return
    if (!ride) return
    if (isDriver) {
      const b = bookings.find((x) => x.status === 'APPROVED' || x.status === 'FINISHED')
      if (b) setRatingToUserId(b.passengerId)
    } else {
      setRatingToUserId(ride.driverId)
    }
  }, [canRate, ratingSent, ride, isDriver, bookings, ratingToUserId])

  useEffect(() => {
    if (!canChat || !rideId || !token || otherUserId == null) {
      setChatMessages([])
      return
    }
    let cancelled = false

    const refreshConversation = async () => {
      if (chatPollInFlightRef.current) return
      chatPollInFlightRef.current = true
      try {
        const messages = await getConversation(rideId, otherUserId, token)
        if (cancelled) return
        setChatMessages(messages)
        const latest = messages[messages.length - 1]
        const latestId = latest?.id ?? 0
        const prevLatest = knownIncomingMessageIdRef.current
        if (prevLatest != null && latestId > prevLatest && user && latest?.senderId !== user.id) {
          addToast('Ново съобщение в чата.', 'info')
        }
        knownIncomingMessageIdRef.current = latestId
        lastKnownMessageByPartnerRef.current[otherUserId] = latestId
        if (isDriver) {
          setUnreadByPartner((prev) => ({ ...prev, [otherUserId]: 0 }))
        }
      } catch {
        if (!cancelled) setChatMessages([])
      } finally {
        chatPollInFlightRef.current = false
      }
    }

    void refreshConversation()
    const intervalId = setInterval(() => {
      void refreshConversation()
    }, 5000)

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [canChat, rideId, token, otherUserId, addToast, user, isDriver, chatPartners])

  useEffect(() => {
    if (!chatScrollRef.current) return
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
  }, [chatMessages])

  useEffect(() => {
    if (!rideId || isNaN(rideId) || !token) return
    getRideRoute(rideId, token).then(setRouteData).catch(() => setRouteData(null))
  }, [rideId, token])

  useEffect(() => {
    if (!isDriver || !rideId || isNaN(rideId) || !token || !ride) return
    const hasCoords = ride.fromLat != null && ride.fromLng != null && ride.toLat != null && ride.toLng != null
    if (!hasCoords) return
    setDriverRouteLoading(true)
    getDriverRoute(rideId, token)
      .then((data) => setDriverRoute(data?.coordinates?.length ? { coordinates: data.coordinates } : null))
      .catch(() => setDriverRoute(null))
      .finally(() => setDriverRouteLoading(false))
  }, [isDriver, rideId, token, ride?.id, bookings])

  const handleSubmitRating = async () => {
    if (!token || ratingToUserId == null) return
    setRatingSubmitting(true)
    try {
      await createRating(
        { toUserId: ratingToUserId, rideId, score: ratingScore, comment: ratingComment.trim() || undefined },
        token
      )
      addToast('Оценката е изпратена.', 'success')
      setRatingSent(true)
      setRatingToUserId(null)
      setRatingComment('')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Грешка при изпращане на оценка', 'error')
    } finally {
      setRatingSubmitting(false)
    }
  }

  const handleCancel = async () => {
    if (!myBooking || !token) return
    setBookingActionId(myBooking.id)
    try {
      await cancelBooking(myBooking.id, token)
      setMyBooking(null)
      setBookings(await getBookingsForRide(rideId, token))
      setRide((r) => r ? { ...r, availableSeats: r.availableSeats + 1 } : null)
    } finally {
      setBookingActionId(null)
    }
  }

  const handleApprove = async (bookingId: number) => {
    if (!token) return
    setApproveRejectBookingId(bookingId)
    try {
      await approveBooking(bookingId, token)
      setBookings(await getBookingsForRide(rideId, token))
      setRide((r) => r ? { ...r, availableSeats: Math.max(0, (r.availableSeats ?? 0) - 1) } : null)
      addToast('Резервацията е одобрена.', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Грешка при одобряване', 'error')
    } finally {
      setApproveRejectBookingId(null)
    }
  }

  const handleReject = async (bookingId: number) => {
    if (!token) return
    setApproveRejectBookingId(bookingId)
    try {
      await rejectBooking(bookingId, token)
      setBookings(await getBookingsForRide(rideId, token))
      addToast('Резервацията е отхвърлена.', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Грешка при отхвърляне', 'error')
    } finally {
      setApproveRejectBookingId(null)
    }
  }

  const handleDriverComingTo = async (passengerId: number) => {
    if (!token || !user) return
    const passenger = orderedPickups.find((b) => b.passengerId === passengerId)
    const passengerName = passenger?.passengerName ?? 'пътника'
    setDriverComingToPassengerId(passengerId)
    try {
      await sendMessage(
        { rideId, receiverId: passengerId, content: 'Идвам към теб, приготви се.' },
        token
      )
      setChatOtherUserId(passengerId)
      addToast('Съобщението „Идвам към теб“ е изпратено.', 'success')

      if (!('geolocation' in navigator)) {
        addToast('Браузърът не поддържа geolocation.', 'error')
        return
      }

      stopDriverTrackingLocal()
      setDriverSharingTarget({ id: passengerId, name: passengerName })

      const postActiveLocation = async (lat: number, lng: number) => {
        await upsertDriverLocation(
          rideId,
          { latitude: lat, longitude: lng, targetPassengerId: passengerId, isActive: true },
          token
        )
      }

      geolocationWatchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const coords = { lat: position.coords.latitude, lng: position.coords.longitude }
          latestDriverCoordsRef.current = coords
          void postActiveLocation(coords.lat, coords.lng)
        },
        (geoError) => {
          addToast(`Грешка при геолокация: ${geoError.message}`, 'error')
          stopDriverTrackingLocal()
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 10000,
        }
      )

      trackingIntervalRef.current = window.setInterval(() => {
        const coords = latestDriverCoordsRef.current
        if (!coords) return
        void postActiveLocation(coords.lat, coords.lng)
      }, 5000)
      addToast(`Споделяте местоположение с ${passengerName}.`, 'info')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Грешка при изпращане', 'error')
    } finally {
      setDriverComingToPassengerId(null)
    }
  }

  const handleStopSharing = async () => {
    if (!token || !driverSharingTarget) return
    try {
      await upsertDriverLocation(
        rideId,
        {
          latitude: latestDriverCoordsRef.current?.lat ?? ride?.fromLat ?? 0,
          longitude: latestDriverCoordsRef.current?.lng ?? ride?.fromLng ?? 0,
          targetPassengerId: driverSharingTarget.id,
          isActive: false,
        },
        token
      )
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Грешка при спиране на споделянето', 'error')
    } finally {
      stopDriverTrackingLocal()
      addToast('Споделянето на местоположение е спряно.', 'info')
    }
  }

  useEffect(() => {
    if (!token || isDriver || !hasActiveBooking) {
      setPassengerDriverLocation(null)
      return
    }
    let cancelled = false
    const poll = async () => {
      try {
        const data = await getDriverLocationApi(rideId, token)
        if (cancelled) return
        setPassengerDriverLocation(data)
      } catch {
        if (!cancelled) setPassengerDriverLocation(null)
      }
    }
    void poll()
    const intervalId = window.setInterval(() => {
      void poll()
    }, 5000)
    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [token, isDriver, hasActiveBooking, rideId])

  const handleFinishRide = async () => {
    if (!token || !isDriver || !ride) return
    setFinishingRide(true)
    try {
      const updated = await finishRide(ride.id, token)
      setRide(updated)
      addToast('Пътуването е маркирано като приключило.', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Грешка при приключване на пътуването', 'error')
    } finally {
      setFinishingRide(false)
    }
  }

  const handleValidatePoints = async () => {
    if (!pickupDropoffPickup || !pickupDropoffDropoff || !token) return
    setValidatingPoints(true)
    setValidatedPoints(null)
    try {
      let coords = routeData?.coordinates
      if (!coords?.length) {
        addToast('Зареждане на маршрут…', 'info')
        const route = await getRideRoute(rideId, token)
        setRouteData(route)
        coords = route?.coordinates
      }
      if (!coords?.length) {
        addToast('Маршрутът не е наличен за това пътуване. Опитайте по-късно.', 'error')
        return
      }
      const res = await apiValidatePoints(
        rideId,
        {
          pickupLat: pickupDropoffPickup.lat,
          pickupLng: pickupDropoffPickup.lng,
          dropoffLat: pickupDropoffDropoff.lat,
          dropoffLng: pickupDropoffDropoff.lng,
        },
        token
      )
      setValidatedPoints(res)
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Грешка при валидиране', 'error')
    } finally {
      setValidatingPoints(false)
    }
  }

  const handleBookWithStops = async (
    pickupLat: number,
    pickupLng: number,
    dropoffLat: number,
    dropoffLng: number,
    seatsReserved: number,
    paymentMethod: 'CASH' | 'CARD'
  ) => {
    if (!token) return
    try {
      const created = await bookRide(
        rideId,
        { pickupLat, pickupLng, dropoffLat, dropoffLng, seatsReserved, paymentMethod },
        token
      )
      setMyBooking(created)
      setPickupDropoffPickup(null)
      setPickupDropoffDropoff(null)
      setValidatedPoints(null)
      setRouteData(null)
      getRideRoute(rideId, token).then(setRouteData).catch(() => {})
      const list = await getMyBookings(token)
      const b = list.find((x) => x.rideId === rideId)
      if (b) setMyBooking(b)
      setBookings(await getBookingsForRide(rideId, token))
      if (paymentMethod === 'CARD') {
        addToast('Резервацията е изпратена за одобрение. След одобрение ще можете да платите с карта.', 'success')
      } else {
        addToast('Резервацията е създадена. Плащане в кеш при качване.', 'success')
      }
    } catch (err) {
      throw err
    }
  }

  if (loading) {
    return (
      <div className="app-main">
        <p>Зареждане...</p>
      </div>
    )
  }

  if (error || !ride) {
    return (
      <div className="app-main">
        <p className="form-error">{error || 'Пътуването не е намерено.'}</p>
        <Link to="/rides">← Обратно към пътуванията</Link>
      </div>
    )
  }

  return (
    <div className="app-main page-content">
      <h1>{formatCityWithDistrict(ride.fromCity, ride.fromDistrict)} → {formatCityWithDistrict(ride.toCity, ride.toDistrict)}</h1>
      <p style={{ marginBottom: 16 }}>
        <Link to="/rides">← Обратно към пътуванията</Link>
      </p>
      <div className="ride-meta">
        {formatDateTime(ride.departureTime)} · {ride.availableSeats} места · {ride.price} €
        {ride.carDetails && <> · {ride.carDetails}</>}
      </div>
      {!isDriver && myBooking && (
        <p style={{ marginTop: 8, color: '#475569', fontSize: 14 }}>
          Плащане:{' '}
          {myBooking.paymentMethod === 'CARD'
            ? (myBooking.paymentStatus === 'PAID' ? 'Платено с карта' : 'Карта (в обработка)')
            : 'Кеш при качване'}
        </p>
      )}

      {/* Един блок: за пътник показва карта + резервация; за шофьор показва само резервации */}
      <div style={{ marginTop: 24, padding: 16, border: '1px solid #e2e8f0', borderRadius: 12, background: '#f8fafc' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>{isDriver ? 'Резервации' : 'Карта и резервации'}</h2>

        {!isDriver && canBookThisRide && !hasActiveBooking && (
          <p style={{ marginBottom: 12, fontSize: 14, color: '#64748b' }}>
            Изберете място за качване и слизане на картата (бутоните по-долу), натиснете „Провери точките“, след което „Резервирай място“.
          </p>
        )}

        {!isDriver && (
        <div style={{ position: 'relative' }}>
          {!isDriver && canBookThisRide && !hasActiveBooking && selectingModePickupDropoff && (
            <p style={{ marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#2563eb' }}>
              {selectingModePickupDropoff === 'pickup' ? 'Режим: избор на място за качване – кликнете на картата' : 'Режим: избор на място за слизане – кликнете на картата'}
            </p>
          )}
          <RideMap
            routeCoordinates={routeData?.coordinates ?? []}
            stops={passengerVisibleStops}
            driverLocation={passengerDriverLocation ? { lat: passengerDriverLocation.latitude, lng: passengerDriverLocation.longitude } : null}
            pickupPoint={pickupDropoffPickup}
            suggestedPoint={
              pickupValidation && !pickupValidation.valid && pickupValidation.suggestedLat != null && pickupValidation.suggestedLng != null
                ? { lat: pickupValidation.suggestedLat, lng: pickupValidation.suggestedLng }
                : validatedPoints && !validatedPoints.valid && validatedPoints.suggestedPickupLat != null && validatedPoints.suggestedPickupLng != null
                  ? { lat: validatedPoints.suggestedPickupLat, lng: validatedPoints.suggestedPickupLng }
                  : null
            }
          onPickupChange={(lat, lng) => {
            setPickupDropoffPickup({ lat, lng })
            setValidatedPoints(null)
            setPickupValidation(null)
            if (!token) return
            setValidatingPickupPoint(true)
            apiValidatePoint(rideId, { lat, lng, type: 'PICKUP' }, token)
              .then((res) => setPickupValidation(res))
              .catch(() => setPickupValidation(null))
              .finally(() => setValidatingPickupPoint(false))
          }}
          onUseSuggestedPoint={() => {
            if (pickupValidation?.suggestedLat != null && pickupValidation?.suggestedLng != null) {
              setPickupDropoffPickup({ lat: pickupValidation.suggestedLat, lng: pickupValidation.suggestedLng })
              setPickupValidation(null)
            } else if (validatedPoints?.suggestedPickupLat != null && validatedPoints?.suggestedPickupLng != null) {
              setPickupDropoffPickup({ lat: validatedPoints.suggestedPickupLat, lng: validatedPoints.suggestedPickupLng })
              setValidatedPoints(null)
            }
          }}
            dropoffPoint={pickupDropoffDropoff}
            onDropoffChange={(lat, lng) => {
              setPickupDropoffDropoff({ lat, lng })
              setValidatedPoints(null)
            }}
            selectingMode={selectingModePickupDropoff}
            allowPickupSelection={!isDriver && Boolean(canBookThisRide) && !hasActiveBooking}
            height={320}
          />
          {!routeData && (
            <p style={{ position: 'absolute', top: 12, left: 12, margin: 0, padding: '8px 12px', background: 'rgba(255,255,255,0.95)', borderRadius: 8, fontSize: 14, zIndex: 1000, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
              Маршрутът се зарежда…
            </p>
          )}
          {routeData && (!routeData.coordinates || routeData.coordinates.length === 0) && (
            <p style={{ position: 'absolute', top: 12, left: 12, margin: 0, padding: '8px 12px', background: 'rgba(255,255,255,0.95)', borderRadius: 8, fontSize: 14, zIndex: 1000, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
              Няма маршрут за това пътуване (липсват координати).
            </p>
          )}
        </div>
        )}
        {!isDriver && validatingPickupPoint && (
          <p style={{ marginTop: 8, fontSize: 14, color: '#64748b' }}>Проверка на точката за качване…</p>
        )}
        {!isDriver && pickupValidation && !validatingPickupPoint && (
          <p style={{ marginTop: 8, fontSize: 14, color: pickupValidation.valid ? '#166534' : '#b91c1c' }}>
            {pickupValidation.valid ? 'Точката е близо до маршрута.' : pickupValidation.message}
          </p>
        )}
        {!isDriver && hasActiveBooking && passengerDriverLocation && (
          <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: '#ecfeff', border: '1px solid #a5f3fc', color: '#0f766e', fontSize: 14 }}>
            <strong>Шофьорът идва към вас.</strong>{' '}
            {locationUpdatedAgoSec != null && <span>Обновено преди {locationUpdatedAgoSec} сек.</span>}
          </div>
        )}

          {!isDriver && !canBookThisRide && ride.status === 'OPEN' && (
            <p style={{ marginTop: 12, color: '#b91c1c', fontWeight: 500 }}>Няма свободни места. Резервациите са затворени за това пътуване.</p>
          )}
          {!isDriver && ride.status === 'FINISHED' && (
            <p style={{ marginTop: 12, color: '#475569', fontWeight: 500 }}>Пътуването е приключило. Нови резервации не са възможни.</p>
          )}
          {!isDriver && ride.status === 'CANCELED' && (
            <p style={{ marginTop: 12, color: '#b91c1c', fontWeight: 500 }}>Пътуването е отменено. Резервации не са възможни.</p>
          )}

          {!isDriver && canBookThisRide && !hasActiveBooking && (
            <>
              {routeData === null && (
                <p style={{ marginTop: 12, fontSize: 14, color: '#f59e0b' }}>
                  Маршрутът се зарежда. След зареждане изберете точки за качване и слизане на картата.
                </p>
              )}
              {routeData && (!routeData.coordinates || routeData.coordinates.length === 0) && (
                <p style={{ marginTop: 12, fontSize: 14, color: '#b91c1c' }}>
                  Няма наличен маршрут за това пътуване (липсват координати). Резервация с избор на точки не е възможна.
                </p>
              )}
              <PickupDropoffSelector
                pickup={pickupDropoffPickup}
                dropoff={pickupDropoffDropoff}
                validated={validatedPoints}
                validating={validatingPoints}
                onValidate={handleValidatePoints}
                selectingMode={selectingModePickupDropoff}
                onSetSelectingMode={setSelectingModePickupDropoff}
                canValidate={!!pickupDropoffPickup && !!pickupDropoffDropoff}
                routeLoaded={!!routeData?.coordinates?.length}
                onSwapPickupDropoff={() => {
                  if (pickupDropoffPickup && pickupDropoffDropoff) {
                    setPickupDropoffPickup(pickupDropoffDropoff)
                    setPickupDropoffDropoff(pickupDropoffPickup)
                    setValidatedPoints(null)
                  }
                }}
                showSwapButton={Boolean(validatedPoints && !validatedPoints.valid && validatedPoints.message?.includes('преди мястото за слизане'))}
              />
              <RideBookingPanel
                validated={validatedPoints}
                suggestedPickup={
                  validatedPoints?.valid
                    ? pickupDropoffPickup
                    : null
                }
                suggestedDropoff={
                  validatedPoints?.valid
                    ? pickupDropoffDropoff
                    : null
                }
                onBook={handleBookWithStops}
                disabled={!token}
                cardPaymentAvailable={Boolean(ride.cardPaymentAvailable)}
              />
            </>
          )}

          {!isDriver && hasActiveBooking && (
            <div style={{ marginTop: 16 }}>
              <p style={{ marginBottom: 8, color: '#166534' }}>
                Имате резервация (статус: {myBooking!.status === 'PENDING' ? 'Чака одобрение' : myBooking!.status === 'PENDING_PAYMENT' ? 'Одобрена, чака плащане' : 'Одобрена'}).
              </p>
              <button
                type="button"
                onClick={handleCancel}
                disabled={bookingActionId !== null}
                style={{ padding: '8px 16px', cursor: 'pointer', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 8 }}
              >
                {bookingActionId !== null ? 'Отмяна…' : 'Отмени резервацията'}
              </button>
            </div>
          )}

          {isDriver && (
            <div style={{ marginTop: 16 }}>
              <p style={{ marginBottom: 8, fontWeight: 600 }}>Чакащи резервации</p>
              {bookings.filter((b) => b.status === 'PENDING').length === 0 ? (
                <p style={{ fontSize: 14, color: '#64748b' }}>Няма чакащи резервации.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {bookings.filter((b) => b.status === 'PENDING').map((b) => (
                    <li key={b.id} style={{ marginBottom: 12, padding: 12, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                      <span>
                        {b.passengerName ?? 'Пътник'} – чака одобрение
                        {' · '}
                        {b.paymentMethod === 'CARD'
                          ? (b.paymentStatus === 'PAID' ? 'Платено с карта' : 'Карта')
                          : 'Кеш'}
                      </span>
                      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => handleApprove(b.id)}
                          disabled={approveRejectBookingId !== null}
                          style={{ padding: '6px 12px', fontSize: 14, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: approveRejectBookingId !== null ? 'not-allowed' : 'pointer' }}
                        >
                          {approveRejectBookingId === b.id ? 'Одобряване…' : 'Одобри'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(b.id)}
                          disabled={approveRejectBookingId !== null}
                          style={{ padding: '6px 12px', fontSize: 14, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: approveRejectBookingId !== null ? 'not-allowed' : 'pointer' }}
                        >
                          {approveRejectBookingId === b.id ? 'Отхвърляне…' : 'Отхвърли'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

      {isDriver && (
        <div style={{ marginTop: 24, padding: 16, border: '1px solid #e2e8f0', borderRadius: 12, background: '#f0f9ff' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>Маршрут при тръгване</h2>
          {ride.fromLat == null || ride.fromLng == null || ride.toLat == null || ride.toLng == null ? (
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 0 }}>
              За да се покаже картата и маршрутът при забиране, пътуването трябва да има зададени начална и крайна точка (координати). Те се попълват автоматично при създаване на пътуване от „Създай пътуване“ при избор на градове. Ако това пътуване е създадено без координати, създайте ново пътуване с избрани градове или редактирайте това.
            </p>
          ) : (
            <>
          {driverRouteLoading && <p style={{ marginBottom: 12, fontSize: 14, color: '#64748b' }}>Зареждане на маршрута…</p>}
          {!driverRouteLoading && driverRoute && driverRouteSliced && (
            <>
              <div style={{ marginBottom: 16 }}>
                <RideMap
                  mapKey="driver-route-map"
                  routeCoordinates={driverRouteSliced.coordinates}
                  stops={driverRouteSliced.stops}
                  passengerPickupPoints={orderedPickups
                    .filter((b) => b.pickupLat != null && b.pickupLng != null)
                    .map((b, idx) => ({
                      lat: b.pickupLat as number,
                      lng: b.pickupLng as number,
                      title: `Качване ${idx + 1}: ${b.passengerName ?? 'Пътник'}${b.pickupAddress ? ` (${b.pickupAddress})` : ''}`,
                    }))}
                  pickupPoint={null}
                  suggestedPoint={null}
                  onPickupChange={() => {}}
                  allowPickupSelection={false}
                  height={320}
                  driverLocation={null}
                />
              </div>
              {driverSharingTarget && (
                <div style={{ marginBottom: 12, padding: '8px 10px', borderRadius: 8, background: '#ecfeff', border: '1px solid #a5f3fc', color: '#0f766e', fontSize: 14 }}>
                  Споделяте местоположение с {driverSharingTarget.name}
                </div>
              )}
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: 12 }}>
                <li style={{ marginBottom: 8, fontSize: 14, color: '#64748b' }}>
                  Старт: {formatCityWithDistrict(ride.fromCity, ride.fromDistrict)}
                </li>
                {orderedPickups.map((b, i) => (
                  <li
                    key={b.id}
                    style={{
                      marginBottom: 8,
                      padding: 10,
                      background: i < driverPickedUpCount ? '#f0fdf4' : '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <span style={{ fontWeight: i === driverPickedUpCount ? 600 : 400 }}>
                      {i + 1}. {i < driverPickedUpCount ? 'Готово ✓ ' : 'Забраване: '}
                      {b.passengerName ?? 'Пътник'}
                      {i >= driverPickedUpCount && (b.pickupAddress || b.pickupNeighborhood) && ` – ${b.pickupAddress || b.pickupNeighborhood}`}
                      {i >= driverPickedUpCount && !b.pickupAddress && !b.pickupNeighborhood && ' – на картата'}
                    </span>
                    <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {i >= driverPickedUpCount && (
                        <button
                          type="button"
                          onClick={() => handleDriverComingTo(b.passengerId)}
                          disabled={driverComingToPassengerId !== null}
                          style={{
                            padding: '6px 12px',
                            fontSize: 14,
                            background: '#0ea5e9',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            cursor: driverComingToPassengerId !== null ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {driverComingToPassengerId === b.passengerId ? 'Изпращане…' : 'Идвам към теб'}
                        </button>
                      )}
                      {activeTrackingPassengerId === b.passengerId && (
                        <button
                          type="button"
                          onClick={handleStopSharing}
                          style={{
                            padding: '6px 12px',
                            fontSize: 14,
                            background: '#fff',
                            color: '#b91c1c',
                            border: '1px solid #fca5a5',
                            borderRadius: 8,
                            cursor: 'pointer',
                          }}
                        >
                          Спри споделянето
                        </button>
                      )}
                      {i === driverPickedUpCount && (
                        <button
                          type="button"
                          onClick={() => setDriverPickedUpCount((c) => c + 1)}
                          style={{
                            padding: '6px 14px',
                            fontSize: 14,
                            background: '#16a34a',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            cursor: 'pointer',
                          }}
                        >
                          Взех го
                        </button>
                      )}
                    </span>
                  </li>
                ))}
                <li style={{ marginTop: 8, fontSize: 14, color: '#64748b' }}>
                  Край: {formatCityWithDistrict(ride.toCity, ride.toDistrict)}
                </li>
              </ul>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (!ride?.fromLat || !ride?.fromLng || !ride?.toLat || !ride?.toLng) {
                      addToast('Липсват координати за старт/край на пътуването.', 'error')
                      return
                    }
                    // Използваме същите pickup точки, които се визуализират в картата на шофьора,
                    // за да няма разминаване между "вътрешната" карта и външната Google навигация.
                    const bookingStopPoints = bookingLegStops
                      .filter((s) => s.type === 'PICKUP' || s.type === 'DROPOFF')
                      .sort((a, b) => a.stopOrder - b.stopOrder)
                      .map((s) => `${s.latitude},${s.longitude}`)
                    // Fallback: ако по някаква причина няма booking точки, ползваме route stops.
                    const stopPoints = bookingStopPoints.length > 0
                      ? bookingStopPoints
                      : (routeData?.stops ?? [])
                          .filter((s) => s.type === 'PICKUP' || s.type === 'DROPOFF')
                          .sort((a, b) => a.stopOrder - b.stopOrder)
                          .map((s) => `${s.latitude},${s.longitude}`)
                    if (stopPoints.length === 0) {
                      addToast('Все още няма точки за качване/слизане от пътници.', 'info')
                    }
                    const [dLat, dLng] = [ride.toLat, ride.toLng]
                    const waypoints = stopPoints.join('|')
                    const url = new URL('https://www.google.com/maps/dir/')
                    url.searchParams.set('api', '1')
                    // Не фиксираме origin, за да започне от текущата локация на шофьора.
                    // Ако няма достъп до локация, Google ще покаже избор на старт.
                    url.searchParams.set('destination', `${dLat},${dLng}`)
                    url.searchParams.set('travelmode', 'driving')
                    url.searchParams.set('dir_action', 'navigate')
                    if (waypoints) url.searchParams.set('waypoints', waypoints)
                    window.open(url.toString(), '_blank')
                  }}
                  style={{
                    padding: '10px 20px',
                    fontSize: 15,
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  Тръгвам – отвори в навигация
                </button>
                {ride.status !== 'FINISHED' && (
                  <button
                    type="button"
                    onClick={handleFinishRide}
                    disabled={finishingRide}
                    style={{
                      padding: '10px 20px',
                      fontSize: 15,
                      background: '#16a34a',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      cursor: finishingRide ? 'not-allowed' : 'pointer',
                      opacity: finishingRide ? 0.8 : 1,
                    }}
                  >
                    {finishingRide ? 'Приключване…' : 'Приключи пътуване'}
                  </button>
                )}
              </div>
            </>
          )}
          {!driverRouteLoading && driverRoute && !driverRoute.coordinates?.length && (
            <p style={{ fontSize: 14, color: '#64748b' }}>Няма наличен маршрут за зареждане (липсват координати или точки).</p>
          )}
            </>
          )}
        </div>
      )}

      {canRate && !ratingSent && ratingToUserId != null && (
        <div style={{ marginTop: 32, padding: 16, background: '#f0fdf4', borderRadius: 12, border: '1px solid #86efac' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>Оцени пътуването</h2>
          <p style={{ marginBottom: 8, fontSize: 14 }}>
            {isDriver ? 'Оценете пътника си:' : 'Оценете шофьора:'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, fontSize: 14 }}>
            <span>Оценка:</span>
            <StarRating value={ratingScore} onChange={setRatingScore} />
            <span style={{ color: '#6b7280' }}>{ratingScore} ★</span>
          </div>
          <label style={{ display: 'block', marginBottom: 12, fontSize: 14 }}>
            Коментар (по желание):
            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              rows={2}
              style={{
                display: 'block',
                width: '100%',
                maxWidth: 400,
                marginTop: 4,
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 8,
              }}
            />
          </label>
          <button
            type="button"
            onClick={handleSubmitRating}
            disabled={ratingSubmitting}
            style={{ padding: '8px 16px', cursor: 'pointer' }}
          >
            {ratingSubmitting ? 'Изпращане...' : 'Изпрати оценка'}
          </button>
        </div>
      )}
    </div>
  )
}
