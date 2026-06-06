export type Ticket = {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  ticketType: string;
  quantity: number;
  qrCodeValue: string;
  status: 'active' | 'used' | 'cancelled' | 'expired';
  isVip?: boolean;
};

export type VipPackage = {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  includedTickets: number;
  tableAssignment?: string;
  sectionName?: string;
  serviceItems?: string[];
  conciergeName?: string;
  status: 'pending' | 'assigned' | 'checked_in' | 'completed';
};
