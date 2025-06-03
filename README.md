# CareSyncRx Development Platform

This is a [Next.js](https://nextjs.org) project for the CareSyncRx platform.

## Getting Started

First, run the development server:

```bash
# Run with automatic port 3000 availability check (recommended)
npm run dev:clean

# Or choose platform-specific scripts
npm run dev:win    # For Windows
npm run dev:unix   # For Mac/Linux

# Or run the standard Next.js dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Security Features

CareSyncRx implements multiple layers of security:

- **Security Headers**: Protection against common web vulnerabilities
- **Content Type Validation**: Ensures appropriate request content types
- **CSRF Protection**: Defends against Cross-Site Request Forgery attacks
- **Input/Output Sanitization**: Prevents XSS and injection attacks
- **Enhanced Rate Limiting**: Protects against abuse and brute force attacks
- **IP Blocking**: Blocks suspicious IP addresses
- **Mandatory 2FA**: Requires two-factor authentication for administrative access
- **Comprehensive Security Logging**: Dual-logging system for security events
- **Security Audit Reports**: Generates detailed reports with actionable insights

For more details, see the [comprehensive security guide](./docs/security-guide.md), [security logging documentation](./docs/security-logging.md), [security testing documentation](./docs/security-testing.md) and [middleware README](./src/shared/middleware/README.md).

### Security Tools

The system includes several security-related tools:

```bash
# Run a security audit report
npm run security:audit

# Test the security logging implementation
npm run security:test:logs

# Run security implementation tests
npm run security:test
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## GitHub Repository

This project is now available on GitHub. The repository has been cleaned up and optimized for better collaboration and development:

- **Circular Dependencies Resolved**: Fixed circular dependencies in the auth module
- **Improved Code Structure**: Better module organization and dependency management
- **Enhanced Documentation**: Added documentation for code structure and architectural decisions
- **Validation Scripts**: Included scripts to validate code structure and catch potential issues

For more information about the circular dependency resolution, see the [detailed documentation](./docs/circular-dependency-resolution.md).

### GitHub Preparation Scripts

We've included scripts to help with GitHub repository management:

```bash
# Validate auth module structure
npm run validate:auth

# Fix any remaining problematic imports
npm run fix:imports

# Clean up redundant and duplicate files
npm run cleanup:all

# Prepare the codebase for GitHub (basic cleanup)
npm run prepare:github

# Prepare the codebase for GitHub (enhanced cleanup)
npm run prepare:github:enhanced

# Complete GitHub preparation process (all-in-one)
npm run github:final
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
