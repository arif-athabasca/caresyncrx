# CareSyncRx UI Component Library

This documentation provides a guide for using the CareSyncRx UI component library. These components are built with:

- Tailwind CSS for styling
- WCAG AA accessibility compliance
- Mobile-first responsive design
- Clinical blues color palette

## Component Overview

### Alert

Used for showing important messages to users with various severity levels.

```tsx
import { Alert } from '../components/ui';

<Alert 
  severity="error" 
  title="Authentication Error"
>
  <p>Your session has expired. Please log in again.</p>
</Alert>
```

Severity options: `info` (default), `success`, `warning`, `error`

### Badge

Used to highlight status, counts, or categories.

```tsx
import { Badge } from '../components/ui';

<Badge variant="success" rounded>Active</Badge>
```

Variant options: `primary` (default), `secondary`, `success`, `warning`, `error`, `info`, `neutral`

Size options: `xs`, `sm`, `md` (default), `lg`

### Button

Primary interaction component with multiple variants and states.

```tsx
import { Button } from '../components/ui';

<Button 
  variant="primary"
  size="md"
  isLoading={isSubmitting}
  onClick={handleClick}
  fullWidth
>
  Submit
</Button>

// Polymorphic usage (as Link)
<Button
  variant="outline"
  as={Link}
  href="/dashboard"
>
  Go to Dashboard
</Button>
```

Variant options: `primary` (default), `secondary`, `outline`, `text`, `critical`

Size options: `xs`, `sm`, `md` (default), `lg`, `xl`

### Card

Container for grouping related information.

```tsx
import { Card } from '../components/ui';

<Card 
  title="Patient Summary" 
  subtitle="Basic information"
  status="success"
>
  <p>Card content here</p>
</Card>
```

Status options: `default`, `success`, `warning`, `critical`, `info`

### Modal

Dialog that appears on top of the main content.

```tsx
import { Modal, Button } from '../components/ui';
import { useState } from 'react';

function Example() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      
      <Modal 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Confirm Action"
        footer={
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirm}>Confirm</Button>
          </div>
        }
      >
        <p>Are you sure you want to proceed with this action?</p>
      </Modal>
    </>
  );
}
```

Size options: `sm`, `md` (default), `lg`, `xl`, `full`

### Pagination

Navigation for multi-page data.

```tsx
import { Pagination } from '../components/ui';
import { useState } from 'react';

function ExamplePagination() {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 10;
  
  return (
    <Pagination 
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={setCurrentPage}
    />
  );
}
```

### Progress

Visual indicator for completion amount or status.

```tsx
import { Progress } from '../components/ui';

<Progress 
  value={75} 
  max={100}
  label="Upload progress"
  showValue
/>
```

Size options: `xs`, `sm`, `md` (default), `lg`

Color options: `primary` (default), `secondary`, `success`, `warning`, `error`, `info`

### Table

Display tabular data with sorting, selection, and more.

```tsx
import { Table } from '../components/ui';

const columns = [
  { header: 'Name', accessor: 'name' },
  { header: 'Email', accessor: 'email' },
  { header: 'Status', accessor: row => <Badge variant={row.status === 'active' ? 'success' : 'error'}>{row.status}</Badge> }
];

const data = [
  { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'inactive' }
];

<Table 
  data={data}
  columns={columns}
  keyField="id"
  striped
  bordered
/>
```

### Tooltip

Display additional context on hover.

```tsx
import { Tooltip, Button } from '../components/ui';

<Tooltip content="This will permanently delete the record">
  <Button variant="critical">Delete</Button>
</Tooltip>
```

Position options: `top` (default), `right`, `bottom`, `left`

## Hero & FeatureSection

Components for marketing and landing pages.

```tsx
import { Hero, FeatureSection } from '../components/ui';

<Hero
  title="CareSyncRx"
  subtitle="Streamlining healthcare prescription management"
  primaryCta={{ text: "Get Started", href: "/register" }}
  secondaryCta={{ text: "Learn More", href: "/about" }}
  imageUrl="/images/hero-image.svg"
/>

<FeatureSection
  title="Key Features"
  subtitle="Why healthcare providers choose CareSyncRx"
  features={[
    {
      title: "Secure Prescriptions",
      description: "End-to-end encrypted prescription management",
      icon: <LockIcon className="h-6 w-6 text-primary-600" />
    },
    {
      title: "Real-time Updates",
      description: "Instant notifications for prescription status changes",
      icon: <BellIcon className="h-6 w-6 text-primary-600" />
    }
  ]}
  columns={2}
/>
```
