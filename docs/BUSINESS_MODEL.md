# Business Model Clarification

## Tenant vs Owner Relationship

### Tenants
- **Definition**: Clients who host their website with us
- **Features**: 
  - Have a subdomain on our platform (e.g., `myvenue.yourplatform.com`)
  - Optionally can use a custom domain (e.g., `www.myvenue.com`)
  - Website is hosted and managed through our platform
  - All tenants have an associated owner

### Owners
- **Definition**: Venue owners who use our platform to manage their clients
- **Key Points**:
  - May or may not be a tenant (hosting website with us is optional)
  - If not a tenant, they have their own URL/website elsewhere
  - Use our platform for client management, bookings, events, etc.
  - Can manage customers, planners, and other staff

## Database Structure

### User Entity
- `ownerId` (nullable): Links customers/planners/staff to their owner
- `tenantId` (nullable): Only populated for owners who host their website with us

### Tenant Entity
- Represents the hosted website for owners
- `ownerId`: Links back to the owner user
- `subdomain`: Their subdomain on our platform
- `customDomain`: Optional custom domain
- `subscriptionStatus`: Tracks their hosting subscription

## User Roles
- **CUSTOMER**: End clients who book events (linked to an owner via `ownerId`)
- **OWNER**: Venue owners who manage their business (may have a `tenantId` if hosting with us)
- **PLANNER**: Event planners working for an owner (linked via `ownerId`)
- **ADMIN**: Platform administrators
