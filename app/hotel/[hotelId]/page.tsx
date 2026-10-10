
'use client';

import {
  useEffect,
  useState,
} from 'react';

import {
  useParams,
  useRouter,
} from 'next/navigation';

import {
  getHotelDetails,
} from '@/lib/api';
import { HotelDetail, HotelRoomDetail } from '@/types/hotel';

export default function HotelDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const hotelId = String(params.hotelId ?? '');

  const [hotel, setHotel] =
    useState<HotelDetail | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadHotel() {
      if (!hotelId) {
        setError('Hotel ID is missing.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response =
          await getHotelDetails(hotelId);

        if (!cancelled) {
          setHotel(response.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load hotel details.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadHotel();

    return () => {
      cancelled = true;
    };
  }, [hotelId]);

  if (loading) {
    return (
      <main className="hotel-detail-page">
        <div className="detail-loading">
          <div className="loading-spinner" />
          <p>Loading hotel details...</p>
        </div>
      </main>
    );
  }

  if (error || !hotel) {
    return (
      <main className="hotel-detail-page">
        <button
          type="button"
          className="back-button"
          onClick={() => router.back()}
        >
          ← Back to search
        </button>

        <div className="detail-error">
          <h2>Unable to load hotel</h2>
          <p>
            {error || 'Hotel details were not found.'}
          </p>

          <button
            type="button"
            className="detail-primary-button"
            onClick={() => router.back()}
          >
            Return to search
          </button>
        </div>
      </main>
    );
  }

  const hotelImages = hotel.images ?? [];

  const facilities = hotel.facilities ?? [];

  const roomList = hotel.rooms ?? [];

  return (
    <main className="hotel-detail-page">
      <header className="detail-header">
        <button
          type="button"
          className="back-button"
          onClick={() => router.back()}
        >
          ← Back to search
        </button>

        <div className="detail-brand">
          <span className="detail-brand-name">
            Knowledge Chain
          </span>
          <span className="detail-brand-subtitle">
            Hotel Booking
          </span>
        </div>
      </header>

      {/* Hotel information */}
      <section className="detail-hero">
        <div className="detail-title-row">
          <div>
            <span className="detail-eyebrow">
              HOTEL INFORMATION
            </span>

            <h1>{hotel.name}</h1>

            <p className="detail-address">
              <span aria-hidden="true">📍</span>{' '}
              {[
                hotel.address,
                hotel.city,
                hotel.country,
              ]
                .filter(Boolean)
                .filter(
                  (value, index, array) =>
                    array.indexOf(value) === index,
                )
                .join(', ')}
            </p>
          </div>

          <div className="detail-rating">
            {hotel.rating != null && (
              <>
                <strong>{hotel.rating}</strong>
                <span>Guest rating</span>
              </>
            )}

            {hotel.stars != null &&
              hotel.stars > 0 && (
                <div className="detail-stars">
                  {'★'.repeat(
                    Math.min(hotel.stars, 5),
                  )}
                </div>
              )}
          </div>
        </div>
      </section>

      {/* Hotel gallery */}
      <section className="detail-section">
        <div className="section-heading">
          <div>
            <h2>Hotel gallery</h2>
            <p>
              Photos available for this property
            </p>
          </div>
        </div>

        {hotelImages.length > 0 ? (
          <div className="hotel-gallery">
            {hotelImages.map((image, index) => (
              <div
                className="gallery-item"
                key={`${image.url}-${index}`}
              >
                <img
                  src={image.url}
                  alt={
                    image.description ||
                    `${hotel.name} photo ${index + 1}`
                  }
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="gallery-empty">
            <div className="gallery-empty-icon">
              <span aria-hidden="true">▧</span>
            </div>

            <div>
              <strong>
                No hotel gallery available
              </strong>
              <p>
                Room photos may still be available
                below.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Description */}
      {hotel.description && (
        <section className="detail-section">
          <div className="section-heading">
            <div>
              <h2>About this hotel</h2>
            </div>
          </div>

          <p className="hotel-description">
            {stripHtml(hotel.description)}
          </p>
        </section>
      )}

      {/* Facilities */}
      <section className="detail-section">
        <div className="section-heading">
          <div>
            <h2>Hotel facilities</h2>
            <p>
              {facilities.length} facilities listed
            </p>
          </div>
        </div>

        {facilities.length > 0 ? (
          <div className="facility-grid">
            {facilities.map((facility) => (
              <div
                className="facility-item"
                key={facility.facilityId}
              >
                <span
                  className="facility-check"
                  aria-hidden="true"
                >
                  ✓
                </span>

                <span>{facility.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted-text">
            No hotel facilities are available.
          </p>
        )}
      </section>

      {/* Rooms */}
      <section className="detail-section">
        <div className="section-heading">
          <div>
            <h2>Room types</h2>
            <p>
              {roomList.length} room types listed
            </p>
          </div>
        </div>

        {roomList.length > 0 ? (
          <div className="detail-room-list">
            {roomList.map((room) => (
              <RoomDetailCard
                key={room.id}
                room={room}
              />
            ))}
          </div>
        ) : (
          <div className="gallery-empty">
            No room details are available for this
            hotel.
          </div>
        )}
      </section>

      <footer className="detail-footer">
        <button
          type="button"
          className="detail-primary-button"
          onClick={() => router.back()}
        >
          Back to hotel search
        </button>
      </footer>
    </main>
  );
}

function RoomDetailCard({
  room,
}: {
  room: HotelRoomDetail;
}) {
  const [showAllAmenities, setShowAllAmenities] =
    useState(false);

  const images = room.images ?? [];
  const beds = room.beds ?? [];
  const amenities = room.amenities ?? [];

  const visibleAmenities = showAllAmenities
    ? amenities
    : amenities.slice(0, 8);

  return (
    <article className="detail-room-card">
      <div className="detail-room-heading">
        <div>
          <h3>{room.name}</h3>

          <div className="room-facts">
            {room.roomSize && (
              <span>
                {room.roomSize.value} {room.roomSize.unit}
              </span>
            )}

            {room.maxOccupancy != null && (
              <span>
                Up to {room.maxOccupancy} guests
              </span>
            )}

            {room.maxAdults != null && (
              <span>
                Up to {room.maxAdults} adults
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Room image gallery */}
      {images.length > 0 && (
        <div className="room-gallery">
          {images.map((image, index) => (
            <div
              className="room-gallery-item"
              key={`${image.url}-${index}`}
            >
              <img
                src={image.url}
                alt={
                  image.description ||
                  `${room.name} photo ${index + 1}`
                }
                loading="lazy"
              />

              {image.main && (
                <span className="main-photo-label">
                  Main photo
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Room description */}
      {room.description && (
        <div className="room-description">
          <h4>About this room</h4>
          <p>{stripHtml(room.description)}</p>
        </div>
      )}

      {/* Beds */}
      {beds.length > 0 && (
        <div className="room-subsection">
          <h4>Beds and sleeping arrangements</h4>

          <div className="bed-list">
            {beds.map((bed, index) => (
              <div
                className="bed-item"
                key={`${bed.id}-${index}`}
              >
                <span aria-hidden="true">🛏️</span>

                <div>
                  <strong>
                    {bed.quantity} × {bed.bedType}
                  </strong>

                  {bed.bedSize && (
                    <small>{bed.bedSize}</small>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Amenities */}
      {amenities.length > 0 && (
        <div className="room-subsection">
          <div className="amenities-heading">
            <h4>Room amenities</h4>

            <span>{amenities.length} amenities</span>
          </div>

          <div className="amenities-grid">
            {visibleAmenities.map((amenity) => (
              <div
                className="amenity-item"
                key={amenity.amenitiesId}
              >
                <span aria-hidden="true">✓</span>
                {amenity.name}
              </div>
            ))}
          </div>

          {amenities.length > 8 && (
            <button
              type="button"
              className="show-more-button"
              onClick={() =>
                setShowAllAmenities(!showAllAmenities)
              }
            >
              {showAllAmenities
                ? 'Show fewer amenities'
                : `Show all ${amenities.length} amenities`}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .trim();
}