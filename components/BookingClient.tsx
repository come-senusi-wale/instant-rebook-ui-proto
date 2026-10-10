'use client';
import './checkout.css';

import Script from 'next/script';
import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'next/navigation';

import { bookHotel, prebookHotel } from '@/lib/api';
import { formatDisplayDate } from '@/lib/date';

declare global {
  interface Window {
    LiteAPIPayment?: new (
      config: Record<string, unknown>,
    ) => {
      handlePayment: () => void;
    };
  }
}

interface PrebookApiResponse {
  success: boolean;
  data: {
    data: {
      prebookId: string;
      transactionId: string;
      secretKey: string;
      price?: number;
      currency?: string;
      sellingPriceToUser?: number;
      [key: string]: unknown;
    };
    guestLevel?: number;
    sandbox?: boolean;
  };
}

interface BookingResult {
  bookingId?: string;
  reference?: string;
  bookingReference?: string;
  status?: string;
  [key: string]: unknown;
}

export default function CheckoutClient() {
  const params = useSearchParams();

  // URL parameters from the selected hotel/room.
  const hotelName = params.get('hotelName') ?? 'Hotel';
  const roomName = params.get('roomName') ?? 'Selected room';
  const offerId = params.get('offerId') ?? '';
  const checkIn = params.get('checkIn') ?? '';
  const checkOut = params.get('checkOut') ?? '';
  const adults = Number(params.get('adults') ?? 1);
  const rooms = Math.max(1, Number(params.get('rooms') ?? 1));

  // LiteAPI payment redirect parameters.
  const returnPrebookId =
    params.get('pid') ?? params.get('prebookId') ?? '';

  const returnTransactionId =
    params.get('tid') ?? params.get('transactionId') ?? '';

  // Guest details.
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Prebook/payment details.
  const [prebookId, setPrebookId] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [price, setPrice] = useState<number | null>(null);
  const [currency, setCurrency] = useState('CAD');

  // Page state.
  const [loadingPrebook, setLoadingPrebook] = useState(true);
  const [sdkReady, setSdkReady] = useState(false);
  const [guestInfoRestored, setGuestInfoRestored] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [bookingResult, setBookingResult] =
    useState<BookingResult | null>(null);

  const paymentInitialized = useRef(false);

  const guestDetailsReady =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    phone.trim().length > 0;

  /*
   * Restore guest details after LiteAPI redirects back to checkout.
   */
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('hotelGuestDetails');

      if (saved) {
        const guest = JSON.parse(saved);

        setFirstName(guest.firstName ?? '');
        setLastName(guest.lastName ?? '');
        setEmail(guest.email ?? '');
        setPhone(guest.phone ?? '');
      }
    } catch (err) {
      console.error('Unable to restore guest details:', err);
    } finally {
      setGuestInfoRestored(true);
    }
  }, []);

  /*
   * Save guest details temporarily in this browser session.
   * This allows them to survive the payment redirect.
   */
  useEffect(() => {
    if (!guestInfoRestored || success) {
      return;
    }

    try {
      sessionStorage.setItem(
        'hotelGuestDetails',
        JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
        }),
      );
    } catch (err) {
      console.error('Unable to save guest details:', err);
    }
  }, [
    guestInfoRestored,
    firstName,
    lastName,
    email,
    phone,
    success,
  ]);


/*
 * Prebook the room and retrieve LiteAPI's payment credentials.
 * When LiteAPI redirects back with pid and tid, reuse those IDs
 * instead of creating another prebook.
 */
useEffect(() => {
  // First, handle the return from LiteAPI payment.
  // The shortened return URL does not contain offerId.
  if (returnPrebookId && returnTransactionId) {
    setPrebookId(returnPrebookId);
    setTransactionId(returnTransactionId);
    setPaymentComplete(true);
    setLoadingPrebook(false);
    setError('');
    return;
  }

  // Require offerId only when starting a new checkout.
  if (!offerId) {
    setError(
      'No room was selected. Please return to the hotel results.',
    );
    setLoadingPrebook(false);
    return;
  }

  let cancelled = false;

  async function createPrebook() {
    setLoadingPrebook(true);
    setError('');

    try {
      const response = (await prebookHotel(
        offerId,
      )) as PrebookApiResponse;

      const prebook = response.data?.data;

      if (
        !response.success ||
        !prebook?.prebookId ||
        !prebook?.transactionId ||
        !prebook?.secretKey
      ) {
        throw new Error(
          'LiteAPI did not return all required payment details.',
        );
      }

      if (cancelled) {
        return;
      }

      setPrebookId(prebook.prebookId);
      setTransactionId(prebook.transactionId);
      setSecretKey(prebook.secretKey);

      const sellingPrice =
        prebook.sellingPriceToUser ?? prebook.price;

      if (typeof sellingPrice === 'number') {
        setPrice(sellingPrice);
      }

      if (prebook.currency) {
        setCurrency(prebook.currency);
      }
    } catch (err) {
      if (cancelled) {
        return;
      }

      console.error('Prebook failed:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to reserve this room. Please try again.',
      );
    } finally {
      if (!cancelled) {
        setLoadingPrebook(false);
      }
    }
  }

  void createPrebook();

  return () => {
    cancelled = true;
  };
}, [offerId, returnPrebookId, returnTransactionId]);


  /*
   * Initialize LiteAPI's secure payment SDK after:
   * 1. The SDK script has loaded.
   * 2. Guest details are filled in.
   * 3. The prebook credentials are available.
   *
   * LiteAPI redirects the customer to the return URL after payment.
   */
  useEffect(() => {
    if (
      !sdkReady ||
      !guestDetailsReady ||
      !prebookId ||
      !transactionId ||
      !secretKey ||
      paymentComplete ||
      paymentInitialized.current ||
      !window.LiteAPIPayment
    ) {
      return;
    }

    // const returnUrl = new URL(window.location.href);

    // returnUrl.searchParams.set('pid', prebookId);
    // returnUrl.searchParams.set('tid', transactionId);

    const currentUrl = new URL(window.location.href);

    // Build a short return URL instead of copying the entire checkout URL.
    const returnUrl = new URL('/checkout', window.location.origin);

    // Preserve only the small details needed to display the booking summary.
    const keysToPreserve = [
      'hotelId',
      'hotelName',
      'roomName',
      'city',
      'checkIn',
      'checkOut',
      'adults',
      'rooms',
      'guestNationality',
    ];

    for (const key of keysToPreserve) {
      const value = currentUrl.searchParams.get(key);

      if (value) {
        returnUrl.searchParams.set(key, value);
      }
    }

    // Keep the payment identifiers returned by LiteAPI.
    returnUrl.searchParams.set('pid', prebookId);
    returnUrl.searchParams.set('tid', transactionId);

    const payment = new window.LiteAPIPayment({
      publicKey:
        process.env.NEXT_PUBLIC_LITEAPI_ENV === 'live'
          ? 'live'
          : 'sandbox',
      secretKey,
      targetElement: '#targetElement',
      returnUrl: returnUrl.toString(),
      appearance: {
        theme: 'flat',
      },
      options: {
        business: {
          name: 'Knowledge Chain',
        },
      },
    });

    paymentInitialized.current = true;

    try {
      payment.handlePayment();
    } catch (err) {
      paymentInitialized.current = false;

      console.error('Payment SDK initialization failed:', err);

      setError(
        'Unable to initialize secure card payment. Please refresh and try again.',
      );
    }
  }, [
    sdkReady,
    guestDetailsReady,
    prebookId,
    transactionId,
    secretKey,
    paymentComplete,
  ]);

  /*
   * Finalize the hotel booking after returning from payment.
   */
  async function handleBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!guestDetailsReady) {
      setError('Please complete all guest details.');
      return;
    }

    if (!paymentComplete) {
      setError('Please complete the secure card payment first.');
      return;
    }

    const finalPrebookId = returnPrebookId || prebookId;
    const finalTransactionId = returnTransactionId || transactionId;

    if (!finalPrebookId || !finalTransactionId) {
      setError(
        'Payment details are missing. Please restart the checkout process.',
      );
      return;
    }

    setBooking(true);

    try {
      const response = await bookHotel({
        prebookId: finalPrebookId,

        holder: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
        },

        guests: Array.from({ length: rooms }, (_, index) => ({
          occupancyNumber: index + 1,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
        })),

        payment: {
          method: 'TRANSACTION_ID',
          transactionId: finalTransactionId,
        },
      });

      if (!response) {
        throw new Error('The booking service returned an empty response.');
      }

      const result = (
        response as { data?: unknown }
      ).data;

      setBookingResult(
        (result && typeof result === 'object'
          ? result
          : response) as BookingResult,
      );

      setSuccess(true);

      try {
        sessionStorage.removeItem('hotelGuestDetails');
      } catch {
        // Booking succeeded; failure to clear session storage is non-fatal.
      }
    } catch (err) {
      console.error('Hotel booking failed:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to complete your booking. Please contact support before retrying.',
      );
    } finally {
      setBooking(false);
    }
  }

  const bookingReference =
    bookingResult?.bookingReference ??
    bookingResult?.bookingId ??
    bookingResult?.reference;

  /*
   * Booking confirmation.
   */
  if (success) {
    return (
      <main className="checkout-page">
        <div className="checkout-container">
          <section className="checkout-card success-card">
            <div className="success-icon" aria-hidden="true">
              ✓
            </div>

            <h1>Booking request completed</h1>

            <p>
              Thank you, {firstName}. Your booking request has been
              submitted successfully.
            </p>

            {bookingReference && (
              <div className="booking-reference">
                <span>Booking reference</span>
                <strong>{String(bookingReference)}</strong>
              </div>
            )}

            {bookingResult?.status && (
              <p>
                Status: {String(bookingResult.status)}
              </p>
            )}

            <div className="booking-summary">
              <h2>Booking summary</h2>

              <p>
                <strong>Hotel:</strong> {hotelName}
              </p>

              <p>
                <strong>Room:</strong> {roomName}
              </p>

              <p>
                <strong>Check-in:</strong>{' '}
                {checkIn ? formatDisplayDate(checkIn) : '—'}
              </p>

              <p>
                <strong>Check-out:</strong>{' '}
                {checkOut ? formatDisplayDate(checkOut) : '—'}
              </p>

              <p>
                <strong>Rooms:</strong> {rooms}
              </p>
            </div>

            <p className="confirmation-note">
              Please keep your booking reference for future enquiries.
            </p>
          </section>
        </div>
      </main>
    );
  }

  /*
   * Checkout form.
   */
  return (
    <main className="checkout-page">
      <Script
        src="https://payment-wrapper.liteapi.travel/dist/liteAPIPayment.js?v=a1"
        strategy="afterInteractive"
        onReady={() => setSdkReady(true)}
        onError={() => {
          setError(
            'Unable to load the secure payment service. Please refresh the page.',
          );
        }}
      />

      <div className="checkout-container">
        <header className="checkout-header">
          <h1>Complete your booking</h1>
          <p>Enter your details and pay securely to confirm your reservation.</p>
        </header>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        <div className="checkout-layout">
          <section className="checkout-card">
            <form onSubmit={handleBooking}>
              <section className="checkout-section">
                <h2>Guest details</h2>

                <p className="section-description">
                  Enter the lead guest’s details for this reservation.
                </p>

                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="firstName">First name</label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(event) =>
                        setFirstName(event.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="lastName">Last name</label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(event) =>
                        setLastName(event.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email address</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) =>
                        setEmail(event.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone">Phone number</label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(event) =>
                        setPhone(event.target.value)
                      }
                      required
                    />
                  </div>
                </div>
              </section>

              <section className="checkout-section payment-section">
                <h2>Payment details</h2>

                <p className="section-description">
                  Your card details are entered through LiteAPI’s secure
                  payment form.
                </p>

                {loadingPrebook ? (
                  <div className="info-message">
                    Preparing your room and payment session...
                  </div>
                ) : paymentComplete ? (
                  <div className="success-message">
                    Payment redirect completed. Submit your booking below
                    to finalize the reservation.
                  </div>
                ) : !guestDetailsReady ? (
                  <div className="info-message">
                    Complete all guest details above to load the secure
                    card-payment form.
                  </div>
                ) : !sdkReady ? (
                  <div className="info-message">
                    Loading secure payment form...
                  </div>
                ) : (
                  <div className="card-payment-container">
                    <div id="targetElement" />

                    <p className="payment-security-note">
                      Your card details are handled by the payment provider.
                      Do not enter card details into this website’s own
                      text fields.
                    </p>
                  </div>
                )}

                {process.env.NEXT_PUBLIC_LITEAPI_ENV !== 'live' && (
                  <p className="sandbox-note">
                    Sandbox testing: use card number{' '}
                    <strong>4242 4242 4242 4242</strong>, any future expiry
                    date, and any three-digit CVV.
                  </p>
                )}
              </section>

              <button
                type="submit"
                className="primary-button pay-button"
                disabled={
                  booking ||
                  loadingPrebook ||
                  !paymentComplete ||
                  !prebookId && !returnPrebookId
                }
              >
                {booking
                  ? 'Completing booking...'
                  : 'Complete booking'}
              </button>

              <p className="checkout-disclaimer">
                Your reservation is not finalized until the booking service
                confirms it.
              </p>
            </form>
          </section>

          <aside className="checkout-card booking-summary">
            <h2>Booking summary</h2>

            <div className="summary-hotel">
              <h3>{hotelName}</h3>
              <p>{roomName}</p>
            </div>

            <div className="summary-divider" />

            <div className="summary-row">
              <span>Check-in</span>
              <strong>
                {checkIn ? formatDisplayDate(checkIn) : '—'}
              </strong>
            </div>

            <div className="summary-row">
              <span>Check-out</span>
              <strong>
                {checkOut ? formatDisplayDate(checkOut) : '—'}
              </strong>
            </div>

            <div className="summary-row">
              <span>Adults</span>
              <strong>{adults}</strong>
            </div>

            <div className="summary-row">
              <span>Rooms</span>
              <strong>{rooms}</strong>
            </div>

            {price !== null && (
              <>
                <div className="summary-divider" />

                <div className="summary-row summary-total">
                  <span>Displayed price</span>
                  <strong>
                    {new Intl.NumberFormat('en-CA', {
                      style: 'currency',
                      currency,
                    }).format(price)}
                  </strong>
                </div>
              </>
            )}

            <p className="summary-footnote">
              Final pricing and availability are subject to the hotel
              provider’s booking confirmation.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
