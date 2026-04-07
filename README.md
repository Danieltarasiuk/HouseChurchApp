# HouseChurchApp

A bilingual (EN/ES) web app for managing a network of house churches — discipleship tracking, pastor training, attendance, prayer requests, and member management.

Built with Next.js, Neon PostgreSQL, and NextAuth.js.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Neon PostgreSQL
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS + Custom CSS Variables
- **Icons**: Lucide React
- **Internationalization**: Custom context-based i18n (EN/ES)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Neon PostgreSQL database account
- Environment variables configured

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Fill in:
- `DATABASE_URL`: Your Neon PostgreSQL connection string
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `NEXTAUTH_URL`: Your application URL (http://localhost:3000 for development)

4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Authentication pages
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/         # Dashboard pages
│   │   ├── dashboard/
│   │   ├── discipleship/
│   │   ├── incubator/
│   │   ├── house-churches/
│   │   ├── members/
│   │   ├── attendance/
│   │   └── prayer/
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page redirect
│   └── globals.css          # Global styles
├── components/              # Reusable components
│   └── Sidebar.tsx
├── context/                 # React context
│   └── LangContext.tsx      # Language/i18n context
└── lib/                     # Utilities
    ├── auth.ts              # NextAuth configuration
    └── db.ts                # Database connection
```

## Features (Planned/In Progress)

- [x] Project scaffolding
- [x] Authentication UI (login/register)
- [x] Bilingual interface (EN/ES)
- [x] Dashboard layout with sidebar
- [x] Database schema (src/lib/schema.sql)
- [ ] Full authentication implementation
- [ ] 7&7 Discipleship tracking
- [ ] Pastor Incubator program
- [ ] House church management
- [ ] Member management
- [ ] Attendance tracking
- [ ] Prayer request system

## Development Notes

### Design System

The app uses custom CSS variables for colors, spacing, and typography:

- **Colors**: `--accent`, `--sidebar-bg`, `--text-primary`, etc.
- **Font**: DM Sans (imported from Google Fonts)
- **Spacing**: `--radius-sm`, `--radius-md`, etc.

All styles are defined in `src/app/globals.css` and can be referenced using CSS custom properties.

### Internationalization

Language switching is handled via `LangContext`. To add new translations:

1. Edit `src/context/LangContext.tsx`
2. Add new keys to both `en` and `es` objects
3. Use `useLang()` hook in components: `const { t } = useLang()`
4. Reference keys: `t('nav.dashboard')`

### Demo Credentials

For testing the login flow:
- Email: `danny@housechurch.local`
- Password: `password123`

(Currently hardcoded for demo purposes - will be connected to database)

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repo to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy!

```bash
npm run build  # Build locally first to test
```

### Environment Variables for Production

- Set `NEXTAUTH_URL` to your production domain
- Ensure `NEXTAUTH_SECRET` is set to a strong value
- Update `DATABASE_URL` for production database

## Contributing

When adding new pages:

1. Create folder in `src/app/(dashboard)/`
2. Add `page.tsx` with proper layout
3. Update `Sidebar.tsx` navigation if needed
4. Add translations to `LangContext.tsx`

## License

TBD

## Support

For questions or issues, please contact Danny (Senior Pastor) or open an issue in the project repository.
