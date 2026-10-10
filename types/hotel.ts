export interface HotelRate {
  rateId: string | null;
  occupancyNumber: number | null;

  name: string | null;

  maxOccupancy: number | null;

  adultCount: number | null;

  childCount: number | null;

  childrenAges: number[];

  boardType: string | null;

  boardName: string | null;

  price: {
    amount: number;
    currency: string;
  } | null;

  suggestedSellingPrice: {
    amount: number;
    currency: string;
  } | null;

  taxesAndFees: Array<{
    included: boolean;
    description: string;
    amount: number;
    currency: string;
  }>;

  cancellation: {
    refundable: boolean;

    policies: Array<{
      cancelTime?: string;
      amount?: number;
      currency?: string;
      type?: string;
      timezone?: string;
    }>;
  };

  paymentTypes: string[];

  perks: Array<{
    perkId?: number;
    name?: string;
    amount?: number;
    currency?: string;
    level?: string;
  }>;

  promotions: unknown[];
}

export interface HotelRoom {
  roomTypeId: string | null;

  offerId: string;

  name: string | null;

  supplier?: string | null;

  rates: HotelRate[];
}

export interface Hotel {
  hotelId: string;

  name: string;

  image?: string | null;

  address: string | null;

  city: string | null;

  country: string | null;

  rating: number | null;

  stars: number | null;

  rooms: HotelRoom[];
}

export interface HotelSearchResponse {
  searchId: string;

  location: {
    countryCode: string;
    city: string;
  };

  dates: {
    checkIn: string;
    checkOut: string;
  };

  occupancy: {
    adults: number;
    children: number[];
    rooms: number;
  };

  pagination: {
    page: number;
    limit: number;
    offset: number;
  };

  hotels: Hotel[];
}

export interface SearchApiResponse {
  success: boolean;
  data: HotelSearchResponse;
}

// export interface PrebookApiResponse {
//   success: boolean;
//   data: {
//     prebookId: string;
//     transactionId?: string;
//     secretKey?: string;
//     [key: string]: unknown;
//   };
// }

export interface PrebookApiResponse {
  success: boolean;

  data: {
    data: {
      prebookId: string;
      transactionId: string;
      secretKey: string;
      price?: number;
      currency?: string;
      [key: string]: unknown;
    };

    guestLevel?: number;
    sandbox?: boolean;
  };
}

export interface BookApiResponse {
  success: boolean;
  data: {
    clientReference?: string;
    bookingId?: string;
    [key: string]: unknown;
  };
}

export interface HotelCitiesResponse {
  success: boolean;
  data: {
    countryCode: string;
    total: number;
    cities: string[];
  };
}


export interface HotelDetailImage {
  url: string;
  description?: string;
  main?: boolean;
}

export interface HotelDetailFacility {
  facilityId: number;
  name: string;
}

export interface HotelRoomDetail {
  id: number;
  name: string;
  description?: string | null;
  maxOccupancy?: number;
  maxAdults?: number;
  maxChildren?: number;
  roomSize?: {
    value: number;
    unit: string;
  } | null;
  beds?: {
    quantity: number;
    bedType: string;
    bedSize?: string;
    id: number;
  }[];
  amenities?: {
    amenitiesId: number;
    name: string;
    sort?: number;
  }[];
  images?: HotelDetailImage[];
}

export interface HotelDetail {
  id: string;
  name: string;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  rating?: number | null;
  stars?: number | null;
  images?: HotelDetailImage[];
  facilities?: HotelDetailFacility[];
  rooms?: HotelRoomDetail[];
}

export interface HotelDetailResponse {
  success: boolean;
  data: HotelDetail;
}