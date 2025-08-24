# KowareyukuJapan Development with SuperClaude

This file configures Claude Code for the KowareyukuJapan project with SuperClaude framework.

## Project Context
- **Project**: KowareyukuJapan - A Next.js web application
- **Tech Stack**: Next.js, React, TypeScript, Tailwind CSS
- **Location**: C:\AI\KowareyukuJapan

## Development Guidelines

### Project-Specific Rules
- Always use TypeScript for new components
- Follow existing component patterns in the codebase
- Use Tailwind CSS for styling
- Maintain Japanese language support throughout the application
- Test components thoroughly before integration

### Code Quality Standards
- Run `npm run lint` and `npm run type-check` before marking tasks complete
- Follow existing ESLint and Prettier configurations
- Ensure accessibility (a11y) compliance for all UI components
- Maintain consistent naming conventions (camelCase for functions, PascalCase for components)

### Workflow
1. Check git status before starting work
2. Create feature branches for all changes
3. Write tests for new functionality
4. Validate changes with lint and type checking
5. Commit with descriptive messages

## Active Development Tasks
- Focus on maintaining and improving the existing Next.js application
- Ensure all Japanese content is properly handled with UTF-8 encoding
- Optimize performance and user experience
- Maintain responsive design across all devices

# ═══════════════════════════════════════════════════
# SuperClaude Framework Components
# ═══════════════════════════════════════════════════

# Core Framework
@FLAGS.md
@PRINCIPLES.md
@RULES.md

## Additional Context for KowareyukuJapan

### Development Environment
- **Node Version**: Use Node.js 18+ for compatibility
- **Package Manager**: npm (as configured in package.json)
- **Development Server**: `npm run dev` for local development
- **Build Command**: `npm run build` for production builds

### Project Structure
```
KowareyukuJapan/
├── src/               # Source code
│   ├── app/          # Next.js app directory
│   ├── components/   # React components
│   └── styles/       # Global styles
├── public/           # Static assets
├── tests/            # Test files
└── package.json      # Dependencies and scripts
```

### Git Workflow
- Main branch: `main`
- Feature branch naming: `feature/[feature-name]`
- Bugfix branch naming: `fix/[issue-description]`
- Always create pull requests for code review

### Testing Strategy
- Unit tests for utility functions
- Component tests for React components
- Integration tests for API routes
- E2E tests for critical user flows

### Performance Targets
- Lighthouse score > 90 for all metrics
- First Contentful Paint < 1.5s
- Time to Interactive < 3.5s
- Cumulative Layout Shift < 0.1

### Security Considerations
- Never commit sensitive data or API keys
- Use environment variables for configuration
- Validate and sanitize all user inputs
- Keep dependencies updated regularly

## Command Shortcuts for Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm test` - Run test suite

Remember: This project uses SuperClaude framework for enhanced development capabilities. Use the framework's features to maintain high code quality and efficient development workflow.