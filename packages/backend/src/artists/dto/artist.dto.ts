export class CreateArtistDto {
  artistName: string;
  stageName?: string;
  agentName?: string;
  bookingContactName?: string;
  bookingEmail?: string;
  bookingPhone?: string;
  agency?: string;
  location?: string;
  artistType: string;
  genres?: string[];
  description?: string;
  performanceFeeMin?: number;
  performanceFeeMax?: number;
  travelAvailability?: string;
  setLengthMinutes?: number;
  equipmentNeeds?: string;
  hospitalityRequirements?: string;
  profileImageUrl?: string;
  coverImageUrl?: string;
  website?: string;
  instagram?: string;
  youtube?: string;
  spotify?: string;
  epkUrl?: string;
}

export class UpdateArtistDto {
  artistName?: string;
  stageName?: string;
  agentName?: string;
  bookingContactName?: string;
  bookingEmail?: string;
  bookingPhone?: string;
  agency?: string;
  location?: string;
  artistType?: string;
  genres?: string[];
  description?: string;
  performanceFeeMin?: number;
  performanceFeeMax?: number;
  travelAvailability?: string;
  setLengthMinutes?: number;
  equipmentNeeds?: string;
  hospitalityRequirements?: string;
  profileImageUrl?: string;
  coverImageUrl?: string;
  website?: string;
  instagram?: string;
  youtube?: string;
  spotify?: string;
  epkUrl?: string;
  availableForBooking?: boolean;
}

export class ArtistSearchDto {
  artistType?: string;
  genre?: string;
  location?: string;
  availableForBooking?: boolean;
}
