import {
  BookApiResponse,
  HotelCitiesResponse,
  HotelDetailResponse,
  HotelSearchResponse,
  PrebookApiResponse,
  SearchApiResponse,
} from '@/types/hotel';

// const API_URL = "http://localhost:8000/api/v2/hotel"
const API_URL = "https://instant-rebook.vercel.app/api/v2/hotel"

if (!API_URL) {
  throw new Error(
    'NEXT_PUBLIC_HOTEL_API_URL is not configured',
  );
}

async function request<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(
    url,
    {
      ...options,

      headers: {
        'Content-Type':
          'application/json',

        ...(options?.headers ?? {}),
      },

      cache: 'no-store',
    },
  );

  const data =
    await response.json().catch(
      () => null,
    );

  if (!response.ok) {
    throw new Error(
      data?.message ??
        data?.error ??
        'Something went wrong',
    );
  }

  return data;
}

export async function searchHotels(
  params: URLSearchParams,
) {
  return request<SearchApiResponse>(
    `${API_URL}/search?${params.toString()}`,
  );
}

export async function prebookHotel(
  offerId: string,
) {
  return request<PrebookApiResponse>(
    `${API_URL}/prebook`,
    {
      method: 'POST',

      body: JSON.stringify({
        offerId,

        usePaymentSdk: true,
      }),
    },
  );
}

export async function sendBookingLink(
  email: string,
  link: string,
) {
  return request<{
    success: boolean;
    data: {
      message: string;
    };
  }>(
    `${API_URL}/send-link`,
    {
      method: 'POST',

      body: JSON.stringify({
        email,
        link,
      }),
    },
  );
}

export async function bookHotel(
  payload: unknown,
) {
  return request<BookApiResponse>(
    `${API_URL}/book`,
    {
      method: 'POST',

      body: JSON.stringify(payload),
    },
  );
}



export async function getHotelCities(
  countryCode = 'CA',
): Promise<HotelCitiesResponse> {
  const params = new URLSearchParams({
    countryCode,
  });

  const response = await fetch(
    `${API_URL}/cities?${params.toString()}`,
  );

  const result =
    (await response.json()) as HotelCitiesResponse;

  if (!response.ok || !result.success) {
    throw new Error('Unable to fetch cities');
  }

  return result;
}


export async function getHotelDetails(
  hotelId: string,
): Promise<HotelDetailResponse> {
 
  const response = await fetch(
    `${API_URL}/hotel-deatil/${encodeURIComponent(hotelId)}`,
  );

  const result =
    (await response.json()) as HotelDetailResponse;

  if (!response.ok || !result.success) {
    throw new Error(
      'Unable to fetch hotel details',
    );
  }

  return result;
}